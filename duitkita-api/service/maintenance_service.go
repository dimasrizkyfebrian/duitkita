package service

import (
	"context"
	"time"

	"duitkita-api/config"
	"duitkita-api/repository"
)

type CleanupResult struct {
	SessionsDeleted      int64
	NotificationsDeleted int64
	ActivitiesDeleted    int64
	SecurityAuditDeleted int64
}

type MaintenanceService interface {
	RunCleanup(ctx context.Context) (CleanupResult, error)
}

type maintenanceService struct {
	sessionRepo      repository.UserSessionRepository
	notificationRepo repository.NotificationRepository
	activityRepo     repository.ActivityRepository
	auditRepo        repository.SecurityAuditRepository
	retention        config.RetentionConfig
}

func NewMaintenanceService(sessionRepo repository.UserSessionRepository, notificationRepo repository.NotificationRepository, activityRepo repository.ActivityRepository, auditRepo repository.SecurityAuditRepository, retention config.RetentionConfig) MaintenanceService {
	return &maintenanceService{
		sessionRepo:      sessionRepo,
		notificationRepo: notificationRepo,
		activityRepo:     activityRepo,
		auditRepo:        auditRepo,
		retention:        retention,
	}
}

func (s *maintenanceService) RunCleanup(ctx context.Context) (CleanupResult, error) {
	var result CleanupResult
	now := time.Now()

	sessionsDeleted, err := s.sessionRepo.DeleteStale(ctx, now.AddDate(0, 0, -s.retention.SessionDays))
	if err != nil {
		return result, err
	}
	result.SessionsDeleted = sessionsDeleted

	notificationsDeleted, err := s.notificationRepo.DeleteReadBefore(ctx, now.AddDate(0, 0, -s.retention.NotificationDays))
	if err != nil {
		return result, err
	}
	result.NotificationsDeleted = notificationsDeleted

	activitiesDeleted, err := s.activityRepo.DeleteOlderThan(ctx, now.AddDate(0, 0, -s.retention.ActivityDays))
	if err != nil {
		return result, err
	}
	result.ActivitiesDeleted = activitiesDeleted

	auditDeleted, err := s.auditRepo.DeleteOlderThan(ctx, now.AddDate(0, 0, -s.retention.SecurityAuditDays))
	if err != nil {
		return result, err
	}
	result.SecurityAuditDeleted = auditDeleted

	return result, nil
}
