package service_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"duitkita-api/config"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
)

func newMaintenanceService(t *testing.T) (service.MaintenanceService, *mocks.UserSessionRepository, *mocks.NotificationRepository, *mocks.ActivityRepository, *mocks.SecurityAuditRepository) {
	sessionRepo := mocks.NewUserSessionRepository(t)
	notificationRepo := mocks.NewNotificationRepository(t)
	activityRepo := mocks.NewActivityRepository(t)
	auditRepo := mocks.NewSecurityAuditRepository(t)
	retention := config.RetentionConfig{SessionDays: 30, NotificationDays: 60, ActivityDays: 90, SecurityAuditDays: 180}
	return service.NewMaintenanceService(sessionRepo, notificationRepo, activityRepo, auditRepo, retention), sessionRepo, notificationRepo, activityRepo, auditRepo
}

func TestMaintenanceService_RunCleanup(t *testing.T) {
	t.Run("runs all four deletions and aggregates counts", func(t *testing.T) {
		svc, sessionRepo, notificationRepo, activityRepo, auditRepo := newMaintenanceService(t)
		sessionRepo.EXPECT().DeleteStale(context.Background(), mockMatchByType[time.Time]()).Return(int64(2), nil)
		notificationRepo.EXPECT().DeleteReadBefore(context.Background(), mockMatchByType[time.Time]()).Return(int64(3), nil)
		activityRepo.EXPECT().DeleteOlderThan(context.Background(), mockMatchByType[time.Time]()).Return(int64(4), nil)
		auditRepo.EXPECT().DeleteOlderThan(context.Background(), mockMatchByType[time.Time]()).Return(int64(5), nil)

		result, err := svc.RunCleanup(context.Background())

		require.NoError(t, err)
		require.Equal(t, int64(2), result.SessionsDeleted)
		require.Equal(t, int64(3), result.NotificationsDeleted)
		require.Equal(t, int64(4), result.ActivitiesDeleted)
		require.Equal(t, int64(5), result.SecurityAuditDeleted)
	})

	t.Run("stops at the first failing step", func(t *testing.T) {
		svc, sessionRepo, _, _, _ := newMaintenanceService(t)
		sessionRepo.EXPECT().DeleteStale(context.Background(), mockMatchByType[time.Time]()).Return(int64(0), errors.New("db down"))

		_, err := svc.RunCleanup(context.Background())

		require.Error(t, err)
	})
}
