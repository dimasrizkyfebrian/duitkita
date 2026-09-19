package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/model/dto/response"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

type ReminderService interface {
	Create(ctx context.Context, userID string, req request.CreateReminderRequest) (*response.ReminderResponse, error)
	List(ctx context.Context, userID string) ([]response.ReminderResponse, error)
	GetByID(ctx context.Context, userID, id string) (*response.ReminderResponse, error)
	Update(ctx context.Context, userID, id string, req request.UpdateReminderRequest) (*response.ReminderResponse, error)
	Delete(ctx context.Context, userID, id string) error
	MarkDone(ctx context.Context, userID, id string) (*response.ReminderResponse, error)
	Snooze(ctx context.Context, userID, id string, req request.SnoozeReminderRequest) (*response.ReminderResponse, error)
	// ProcessDue flags overdue reminders and notifies their owners. Called
	// by worker/reminder_job.go on the cron tick.
	ProcessDue(ctx context.Context) (int, error)
}

type reminderService struct {
	repo     repository.ReminderRepository
	notifSvc NotificationService
}

func NewReminderService(repo repository.ReminderRepository, notifSvc NotificationService) ReminderService {
	return &reminderService{repo: repo, notifSvc: notifSvc}
}

func (s *reminderService) Create(ctx context.Context, userID string, req request.CreateReminderRequest) (*response.ReminderResponse, error) {
	dueDate, err := utils.ParseDateOnly(req.DueDate)
	if err != nil {
		return nil, utils.ErrBadRequest("invalid due_date")
	}

	remindBefore := req.RemindBeforeDays
	if remindBefore == 0 {
		remindBefore = 1
	}

	reminder := &domain.BillReminder{
		ID:               uuid.NewString(),
		UserID:           userID,
		Title:            req.Title,
		Amount:           req.Amount,
		DueDate:          dueDate,
		RemindBeforeDays: remindBefore,
		Status:           domain.BillReminderStatusUpcoming,
		IsRecurring:      req.IsRecurring,
		RecurringRule:    utils.StringPtr(req.RecurringRule),
	}
	if err := s.repo.Create(ctx, reminder); err != nil {
		return nil, utils.ErrInternal("failed to create reminder")
	}

	res := toReminderResponse(reminder)
	return &res, nil
}

func (s *reminderService) List(ctx context.Context, userID string) ([]response.ReminderResponse, error) {
	items, err := s.repo.FindAllByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to list reminders")
	}
	out := make([]response.ReminderResponse, 0, len(items))
	for i := range items {
		out = append(out, toReminderResponse(&items[i]))
	}
	return out, nil
}

func (s *reminderService) GetByID(ctx context.Context, userID, id string) (*response.ReminderResponse, error) {
	reminder, err := s.mustOwn(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	res := toReminderResponse(reminder)
	return &res, nil
}

func (s *reminderService) Update(ctx context.Context, userID, id string, req request.UpdateReminderRequest) (*response.ReminderResponse, error) {
	reminder, err := s.mustOwn(ctx, userID, id)
	if err != nil {
		return nil, err
	}

	if req.Title != "" {
		reminder.Title = req.Title
	}
	if req.Amount != nil {
		reminder.Amount = req.Amount
	}
	if req.DueDate != "" {
		dueDate, err := utils.ParseDateOnly(req.DueDate)
		if err != nil {
			return nil, utils.ErrBadRequest("invalid due_date")
		}
		reminder.DueDate = dueDate
	}
	if req.RemindBeforeDays != 0 {
		reminder.RemindBeforeDays = req.RemindBeforeDays
	}

	if err := s.repo.Update(ctx, reminder); err != nil {
		return nil, utils.ErrInternal("failed to update reminder")
	}
	res := toReminderResponse(reminder)
	return &res, nil
}

func (s *reminderService) Delete(ctx context.Context, userID, id string) error {
	if _, err := s.mustOwn(ctx, userID, id); err != nil {
		return err
	}
	return s.repo.Delete(ctx, id)
}

func (s *reminderService) MarkDone(ctx context.Context, userID, id string) (*response.ReminderResponse, error) {
	reminder, err := s.mustOwn(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	reminder.Status = domain.BillReminderStatusDone
	if err := s.repo.Update(ctx, reminder); err != nil {
		return nil, utils.ErrInternal("failed to mark reminder as done")
	}
	res := toReminderResponse(reminder)
	return &res, nil
}

func (s *reminderService) Snooze(ctx context.Context, userID, id string, req request.SnoozeReminderRequest) (*response.ReminderResponse, error) {
	reminder, err := s.mustOwn(ctx, userID, id)
	if err != nil {
		return nil, err
	}

	snoozedUntil, err := utils.ParseDateOnly(req.SnoozedUntil)
	if err != nil {
		return nil, utils.ErrBadRequest("invalid snoozed_until")
	}
	reminder.SnoozedUntil = &snoozedUntil

	if err := s.repo.Update(ctx, reminder); err != nil {
		return nil, utils.ErrInternal("failed to snooze reminder")
	}
	res := toReminderResponse(reminder)
	return &res, nil
}

func (s *reminderService) ProcessDue(ctx context.Context) (int, error) {
	now := time.Now()
	due, err := s.repo.FindDueForNotification(ctx, now)
	if err != nil {
		return 0, utils.ErrInternal("failed to load due reminders")
	}

	processed := 0
	for i := range due {
		reminder := &due[i]

		if reminder.DueDate.Before(now) && reminder.Status != domain.BillReminderStatusOverdue {
			reminder.Status = domain.BillReminderStatusOverdue
		}
		if err := s.repo.Update(ctx, reminder); err != nil {
			log.Error().Err(err).Str("reminder_id", reminder.ID).Msg("failed to update reminder status")
			continue
		}

		body := fmt.Sprintf("%s is due on %s", reminder.Title, reminder.DueDate.Format("2 Jan 2006"))
		if err := s.notifSvc.Create(ctx, reminder.UserID, domain.NotificationTypeBillReminder, "Bill reminder", body); err != nil {
			log.Error().Err(err).Str("reminder_id", reminder.ID).Msg("failed to send reminder notification")
			continue
		}
		processed++
	}

	return processed, nil
}

func (s *reminderService) mustOwn(ctx context.Context, userID, id string) (*domain.BillReminder, error) {
	reminder, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up reminder")
	}
	if reminder == nil || reminder.UserID != userID {
		return nil, utils.ErrNotFound("reminder not found")
	}
	return reminder, nil
}

func toReminderResponse(reminder *domain.BillReminder) response.ReminderResponse {
	return response.ReminderResponse{
		ID:               reminder.ID,
		Title:            reminder.Title,
		Amount:           reminder.Amount,
		DueDate:          reminder.DueDate,
		RemindBeforeDays: reminder.RemindBeforeDays,
		Status:           string(reminder.Status),
		SnoozedUntil:     reminder.SnoozedUntil,
		IsRecurring:      reminder.IsRecurring,
		CreatedAt:        reminder.CreatedAt,
	}
}
