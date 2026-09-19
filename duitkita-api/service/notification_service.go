package service

import (
	"context"

	"github.com/google/uuid"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/model/dto/response"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

type NotificationService interface {
	List(ctx context.Context, userID string) ([]response.NotificationResponse, error)
	MarkRead(ctx context.Context, userID, id string) error
	MarkAllRead(ctx context.Context, userID string) error
	GetPreferences(ctx context.Context, userID string) (*response.NotificationPreferenceResponse, error)
	UpdatePreferences(ctx context.Context, userID string, req request.UpdateNotificationPreferenceRequest) (*response.NotificationPreferenceResponse, error)
	// Create is used internally by other services/workers (reminders,
	// recurring expenses, budget alerts) to push a notification — there is
	// no public endpoint for creating notifications directly.
	Create(ctx context.Context, userID string, notifType domain.NotificationType, title, body string) error
}

type notificationService struct {
	repo     repository.NotificationRepository
	prefRepo repository.NotificationPreferenceRepository
}

func NewNotificationService(repo repository.NotificationRepository, prefRepo repository.NotificationPreferenceRepository) NotificationService {
	return &notificationService{repo: repo, prefRepo: prefRepo}
}

func (s *notificationService) List(ctx context.Context, userID string) ([]response.NotificationResponse, error) {
	items, err := s.repo.FindAllByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to list notifications")
	}

	out := make([]response.NotificationResponse, 0, len(items))
	for _, n := range items {
		out = append(out, response.NotificationResponse{
			ID:        n.ID,
			Type:      string(n.Type),
			Title:     n.Title,
			Body:      n.Body,
			IsRead:    n.IsRead,
			ReadAt:    n.ReadAt,
			CreatedAt: n.CreatedAt,
		})
	}
	return out, nil
}

func (s *notificationService) MarkRead(ctx context.Context, userID, id string) error {
	if err := s.repo.MarkRead(ctx, id, userID); err != nil {
		return utils.ErrInternal("failed to mark notification as read")
	}
	return nil
}

func (s *notificationService) MarkAllRead(ctx context.Context, userID string) error {
	if err := s.repo.MarkAllRead(ctx, userID); err != nil {
		return utils.ErrInternal("failed to mark notifications as read")
	}
	return nil
}

func (s *notificationService) GetPreferences(ctx context.Context, userID string) (*response.NotificationPreferenceResponse, error) {
	pref, err := s.prefRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to load preferences")
	}
	if pref == nil {
		// Default preferences (all enabled) for a user who hasn't saved any yet.
		pref = &domain.NotificationPreference{
			UserID:          userID,
			BudgetAlert:     true,
			PartnerActivity: true,
			WeeklySummary:   true,
			ReminderAlert:   true,
			RecurringAlert:  true,
		}
	}
	return toPreferenceResponse(pref), nil
}

func (s *notificationService) UpdatePreferences(ctx context.Context, userID string, req request.UpdateNotificationPreferenceRequest) (*response.NotificationPreferenceResponse, error) {
	pref, err := s.prefRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to load preferences")
	}
	if pref == nil {
		pref = &domain.NotificationPreference{
			UserID:          userID,
			BudgetAlert:     true,
			PartnerActivity: true,
			WeeklySummary:   true,
			ReminderAlert:   true,
			RecurringAlert:  true,
		}
	}

	if req.BudgetAlert != nil {
		pref.BudgetAlert = *req.BudgetAlert
	}
	if req.PartnerActivity != nil {
		pref.PartnerActivity = *req.PartnerActivity
	}
	if req.WeeklySummary != nil {
		pref.WeeklySummary = *req.WeeklySummary
	}
	if req.ReminderAlert != nil {
		pref.ReminderAlert = *req.ReminderAlert
	}
	if req.RecurringAlert != nil {
		pref.RecurringAlert = *req.RecurringAlert
	}

	if err := s.prefRepo.Upsert(ctx, pref); err != nil {
		return nil, utils.ErrInternal("failed to save preferences")
	}
	return toPreferenceResponse(pref), nil
}

func (s *notificationService) Create(ctx context.Context, userID string, notifType domain.NotificationType, title, body string) error {
	notification := &domain.Notification{
		ID:     uuid.NewString(),
		UserID: userID,
		Type:   notifType,
		Title:  title,
		Body:   body,
	}
	return s.repo.Create(ctx, notification)
}

func toPreferenceResponse(pref *domain.NotificationPreference) *response.NotificationPreferenceResponse {
	return &response.NotificationPreferenceResponse{
		BudgetAlert:     pref.BudgetAlert,
		PartnerActivity: pref.PartnerActivity,
		WeeklySummary:   pref.WeeklySummary,
		ReminderAlert:   pref.ReminderAlert,
		RecurringAlert:  pref.RecurringAlert,
	}
}
