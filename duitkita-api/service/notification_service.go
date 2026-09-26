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
	List(ctx context.Context, userID string, limit, offset int) ([]response.NotificationResponse, error)
	MarkRead(ctx context.Context, userID, id string) error
	MarkAllRead(ctx context.Context, userID string) error
	GetPreferences(ctx context.Context, userID string) (*response.NotificationPreferenceResponse, error)
	UpdatePreferences(ctx context.Context, userID string, req request.UpdateNotificationPreferenceRequest) (*response.NotificationPreferenceResponse, error)
	Create(ctx context.Context, userID string, notifType domain.NotificationType, title, body string) error
}

type notificationService struct {
	repo     repository.NotificationRepository
	prefRepo repository.NotificationPreferenceRepository
}

func NewNotificationService(repo repository.NotificationRepository, prefRepo repository.NotificationPreferenceRepository) NotificationService {
	return &notificationService{repo: repo, prefRepo: prefRepo}
}

func (s *notificationService) List(ctx context.Context, userID string, limit, offset int) ([]response.NotificationResponse, error) {
	items, err := s.repo.FindAllByUserID(ctx, userID, limit, offset)
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
	rows, err := s.prefRepo.FindAllByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to load preferences")
	}
	return buildPreferenceResponse(rows), nil
}

func (s *notificationService) UpdatePreferences(ctx context.Context, userID string, req request.UpdateNotificationPreferenceRequest) (*response.NotificationPreferenceResponse, error) {
	changes := map[domain.NotificationPreferenceKey]*bool{
		domain.PreferenceBudgetAlert:     req.BudgetAlert,
		domain.PreferencePartnerActivity: req.PartnerActivity,
		domain.PreferenceWeeklySummary:   req.WeeklySummary,
		domain.PreferenceReminderAlert:   req.ReminderAlert,
		domain.PreferenceRecurringAlert:  req.RecurringAlert,
	}

	for key, val := range changes {
		if val == nil {
			continue
		}
		if err := s.prefRepo.Upsert(ctx, &domain.NotificationPreference{UserID: userID, Key: key, Enabled: *val}); err != nil {
			return nil, utils.ErrInternal("failed to save preferences")
		}
	}

	return s.GetPreferences(ctx, userID)
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

func buildPreferenceResponse(rows []domain.NotificationPreference) *response.NotificationPreferenceResponse {
	values := make(map[domain.NotificationPreferenceKey]bool, len(domain.AllNotificationPreferenceKeys))
	for _, key := range domain.AllNotificationPreferenceKeys {
		values[key] = true
	}
	for _, row := range rows {
		values[row.Key] = row.Enabled
	}

	return &response.NotificationPreferenceResponse{
		BudgetAlert:     values[domain.PreferenceBudgetAlert],
		PartnerActivity: values[domain.PreferencePartnerActivity],
		WeeklySummary:   values[domain.PreferenceWeeklySummary],
		ReminderAlert:   values[domain.PreferenceReminderAlert],
		RecurringAlert:  values[domain.PreferenceRecurringAlert],
	}
}
