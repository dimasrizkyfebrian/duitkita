package service_test

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
	servicemocks "duitkita-api/service/mocks"
)

// newNotificationService wires a mock TaskEnqueuer so Create's push-dispatch
// enqueue never falls through to the real inline (goroutine) fallback in
// tests that don't care about it — callers that do (TestNotificationService_Create)
// set their own expectation on the returned enqueuer instead of relying on
// this default.
func newNotificationService(t *testing.T) (service.NotificationService, *mocks.NotificationRepository, *mocks.NotificationPreferenceRepository, *servicemocks.TaskEnqueuer) {
	repo := mocks.NewNotificationRepository(t)
	prefRepo := mocks.NewNotificationPreferenceRepository(t)
	enqueuer := servicemocks.NewTaskEnqueuer(t)
	return service.NewNotificationService(repo, prefRepo, nil, enqueuer), repo, prefRepo, enqueuer
}

func TestNotificationService_GetPreferences(t *testing.T) {
	t.Run("defaults every key to enabled when no rows saved", func(t *testing.T) {
		svc, _, prefRepo, _ := newNotificationService(t)
		prefRepo.EXPECT().FindAllByUserID(context.Background(), "user-1").Return(nil, nil)

		res, err := svc.GetPreferences(context.Background(), "user-1")

		require.NoError(t, err)
		require.True(t, res.BudgetAlert)
		require.True(t, res.PartnerActivity)
		require.True(t, res.WeeklySummary)
		require.True(t, res.ReminderAlert)
		require.True(t, res.RecurringAlert)
	})

	t.Run("saved row overrides the default for its key only", func(t *testing.T) {
		svc, _, prefRepo, _ := newNotificationService(t)
		prefRepo.EXPECT().FindAllByUserID(context.Background(), "user-1").Return([]domain.NotificationPreference{
			{UserID: "user-1", Key: domain.PreferenceBudgetAlert, Enabled: false},
		}, nil)

		res, err := svc.GetPreferences(context.Background(), "user-1")

		require.NoError(t, err)
		require.False(t, res.BudgetAlert)
		require.True(t, res.PartnerActivity)
	})
}

func TestNotificationService_UpdatePreferences(t *testing.T) {
	t.Run("only upserts keys explicitly present in the request", func(t *testing.T) {
		svc, _, prefRepo, _ := newNotificationService(t)
		falseVal := false
		prefRepo.EXPECT().Upsert(context.Background(), &domain.NotificationPreference{UserID: "user-1", Key: domain.PreferenceBudgetAlert, Enabled: false}).Return(nil)
		prefRepo.EXPECT().FindAllByUserID(context.Background(), "user-1").Return([]domain.NotificationPreference{
			{UserID: "user-1", Key: domain.PreferenceBudgetAlert, Enabled: false},
		}, nil)

		res, err := svc.UpdatePreferences(context.Background(), "user-1", request.UpdateNotificationPreferenceRequest{BudgetAlert: &falseVal})

		require.NoError(t, err)
		require.False(t, res.BudgetAlert)
	})

	t.Run("upsert failure is surfaced as internal error", func(t *testing.T) {
		svc, _, prefRepo, _ := newNotificationService(t)
		trueVal := true
		prefRepo.EXPECT().Upsert(context.Background(), mockMatchByType[*domain.NotificationPreference]()).Return(errors.New("db down"))

		_, err := svc.UpdatePreferences(context.Background(), "user-1", request.UpdateNotificationPreferenceRequest{BudgetAlert: &trueVal})

		requireAppError(t, err, http.StatusInternalServerError, "failed to save preferences")
	})
}

func TestNotificationService_List(t *testing.T) {
	svc, repo, _, _ := newNotificationService(t)
	repo.EXPECT().FindAllByUserID(context.Background(), "user-1", 20, 0).Return([]domain.Notification{{ID: "n-1"}}, nil)

	res, err := svc.List(context.Background(), "user-1", 20, 0)

	require.NoError(t, err)
	require.Len(t, res, 1)
}

func TestNotificationService_MarkRead(t *testing.T) {
	svc, repo, _, _ := newNotificationService(t)
	repo.EXPECT().MarkRead(context.Background(), "n-1", "user-1").Return(nil)

	err := svc.MarkRead(context.Background(), "user-1", "n-1")

	require.NoError(t, err)
}

func TestNotificationService_MarkAllRead(t *testing.T) {
	svc, repo, _, _ := newNotificationService(t)
	repo.EXPECT().MarkAllRead(context.Background(), "user-1").Return(nil)

	err := svc.MarkAllRead(context.Background(), "user-1")

	require.NoError(t, err)
}

func TestNotificationService_Create(t *testing.T) {
	t.Run("saves the notification and enqueues a push dispatch for it", func(t *testing.T) {
		svc, repo, _, enqueuer := newNotificationService(t)
		var createdID string
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Notification]()).RunAndReturn(func(_ context.Context, n *domain.Notification) error {
			require.Equal(t, "user-1", n.UserID)
			require.Equal(t, domain.NotificationTypeBillReminder, n.Type)
			createdID = n.ID
			return nil
		})
		enqueuer.EXPECT().EnqueuePushDispatch(context.Background(), mockMatchByType[string]()).RunAndReturn(func(_ context.Context, notificationID string) error {
			require.Equal(t, createdID, notificationID)
			return nil
		})

		err := svc.Create(context.Background(), "user-1", domain.NotificationTypeBillReminder, "Bill reminder", "Rent is due")

		require.NoError(t, err)
	})

	t.Run("a failed enqueue does not fail Create — the in-app row is already saved", func(t *testing.T) {
		svc, repo, _, enqueuer := newNotificationService(t)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Notification]()).Return(nil)
		enqueuer.EXPECT().EnqueuePushDispatch(context.Background(), mockMatchByType[string]()).Return(errors.New("cloud tasks unavailable"))

		err := svc.Create(context.Background(), "user-1", domain.NotificationTypeBillReminder, "Bill reminder", "Rent is due")

		require.NoError(t, err)
	})
}
