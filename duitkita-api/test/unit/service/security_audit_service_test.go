package service_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
)

func TestSecurityAuditService_LogEvent(t *testing.T) {
	repo := mocks.NewSecurityAuditRepository(t)
	userID := "user-1"
	repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.SecurityAuditLog]()).RunAndReturn(func(_ context.Context, l *domain.SecurityAuditLog) error {
		require.Equal(t, &userID, l.UserID)
		require.Equal(t, domain.SecurityAuditEventLoginSuccess, l.EventType)
		require.NotNil(t, l.IPAddress)
		require.Equal(t, "1.2.3.4", *l.IPAddress)
		return nil
	})

	svc := service.NewSecurityAuditService(repo)
	svc.LogEvent(context.Background(), &userID, domain.SecurityAuditEventLoginSuccess, "1.2.3.4", "curl", map[string]interface{}{"k": "v"})
}

func TestSecurityAuditService_ListByUser(t *testing.T) {
	t.Run("non-positive limit defaults to 50", func(t *testing.T) {
		repo := mocks.NewSecurityAuditRepository(t)
		repo.EXPECT().FindByUserID(context.Background(), "user-1", 50).Return(nil, nil)

		svc := service.NewSecurityAuditService(repo)
		_, err := svc.ListByUser(context.Background(), "user-1", 0)

		require.NoError(t, err)
	})

	t.Run("positive limit passed through unchanged", func(t *testing.T) {
		repo := mocks.NewSecurityAuditRepository(t)
		repo.EXPECT().FindByUserID(context.Background(), "user-1", 10).Return(nil, nil)

		svc := service.NewSecurityAuditService(repo)
		_, err := svc.ListByUser(context.Background(), "user-1", 10)

		require.NoError(t, err)
	})
}
