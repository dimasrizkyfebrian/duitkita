package service_test

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
	svcmocks "duitkita-api/service/mocks"
)

func newReminderService(t *testing.T) (service.ReminderService, *mocks.ReminderRepository, *svcmocks.NotificationService) {
	repo := mocks.NewReminderRepository(t)
	notifSvc := svcmocks.NewNotificationService(t)
	return service.NewReminderService(repo, notifSvc), repo, notifSvc
}

func TestReminderService_Create(t *testing.T) {
	t.Run("defaults remind_before_days to 1 when omitted", func(t *testing.T) {
		svc, repo, _ := newReminderService(t)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.BillReminder]()).RunAndReturn(func(_ context.Context, r *domain.BillReminder) error {
			require.Equal(t, 1, r.RemindBeforeDays)
			require.Equal(t, domain.BillReminderStatusUpcoming, r.Status)
			return nil
		})

		res, err := svc.Create(context.Background(), "user-1", request.CreateReminderRequest{Title: "Rent", DueDate: "2026-02-01"})

		require.NoError(t, err)
		require.Equal(t, "Rent", res.Title)
	})

	t.Run("invalid due_date rejected", func(t *testing.T) {
		svc, _, _ := newReminderService(t)

		_, err := svc.Create(context.Background(), "user-1", request.CreateReminderRequest{Title: "Rent", DueDate: "not-a-date"})

		requireAppError(t, err, http.StatusBadRequest, "invalid due_date")
	})
}

func TestReminderService_List(t *testing.T) {
	svc, repo, _ := newReminderService(t)
	repo.EXPECT().FindAllByUserID(context.Background(), "user-1", 20, 0).Return([]domain.BillReminder{{ID: "r-1"}}, nil)

	res, err := svc.List(context.Background(), "user-1", 20, 0)

	require.NoError(t, err)
	require.Len(t, res, 1)
}

func TestReminderService_GetByID(t *testing.T) {
	t.Run("owner can fetch", func(t *testing.T) {
		svc, repo, _ := newReminderService(t)
		repo.EXPECT().FindByID(context.Background(), "r-1").Return(&domain.BillReminder{ID: "r-1", UserID: "user-1"}, nil)

		res, err := svc.GetByID(context.Background(), "user-1", "r-1")

		require.NoError(t, err)
		require.Equal(t, "r-1", res.ID)
	})

	t.Run("not owner", func(t *testing.T) {
		svc, repo, _ := newReminderService(t)
		repo.EXPECT().FindByID(context.Background(), "r-1").Return(&domain.BillReminder{ID: "r-1", UserID: "someone-else"}, nil)

		_, err := svc.GetByID(context.Background(), "user-1", "r-1")

		requireAppError(t, err, http.StatusNotFound, "reminder not found")
	})
}

func TestReminderService_Update(t *testing.T) {
	t.Run("only overwrites provided fields", func(t *testing.T) {
		svc, repo, _ := newReminderService(t)
		reminder := &domain.BillReminder{ID: "r-1", UserID: "user-1", Title: "Rent", RemindBeforeDays: 1}
		repo.EXPECT().FindByID(context.Background(), "r-1").Return(reminder, nil)
		repo.EXPECT().Update(context.Background(), reminder).Return(nil)

		res, err := svc.Update(context.Background(), "user-1", "r-1", request.UpdateReminderRequest{Title: "Electricity"})

		require.NoError(t, err)
		require.Equal(t, "Electricity", res.Title)
	})

	t.Run("invalid due_date on update rejected", func(t *testing.T) {
		svc, repo, _ := newReminderService(t)
		repo.EXPECT().FindByID(context.Background(), "r-1").Return(&domain.BillReminder{ID: "r-1", UserID: "user-1"}, nil)

		_, err := svc.Update(context.Background(), "user-1", "r-1", request.UpdateReminderRequest{DueDate: "bad"})

		requireAppError(t, err, http.StatusBadRequest, "invalid due_date")
	})

	t.Run("not owner", func(t *testing.T) {
		svc, repo, _ := newReminderService(t)
		repo.EXPECT().FindByID(context.Background(), "r-1").Return(&domain.BillReminder{ID: "r-1", UserID: "someone-else"}, nil)

		_, err := svc.Update(context.Background(), "user-1", "r-1", request.UpdateReminderRequest{Title: "x"})

		requireAppError(t, err, http.StatusNotFound, "reminder not found")
	})
}

func TestReminderService_Delete(t *testing.T) {
	svc, repo, _ := newReminderService(t)
	repo.EXPECT().FindByID(context.Background(), "r-1").Return(&domain.BillReminder{ID: "r-1", UserID: "user-1"}, nil)
	repo.EXPECT().Delete(context.Background(), "r-1").Return(nil)

	err := svc.Delete(context.Background(), "user-1", "r-1")

	require.NoError(t, err)
}

func TestReminderService_Snooze(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		svc, repo, _ := newReminderService(t)
		reminder := &domain.BillReminder{ID: "r-1", UserID: "user-1"}
		repo.EXPECT().FindByID(context.Background(), "r-1").Return(reminder, nil)
		repo.EXPECT().Update(context.Background(), reminder).Return(nil)

		res, err := svc.Snooze(context.Background(), "user-1", "r-1", request.SnoozeReminderRequest{SnoozedUntil: "2026-03-01"})

		require.NoError(t, err)
		require.NotNil(t, res.SnoozedUntil)
		require.Equal(t, "2026-03-01", res.SnoozedUntil.Format("2006-01-02"))
	})

	t.Run("invalid snoozed_until rejected", func(t *testing.T) {
		svc, repo, _ := newReminderService(t)
		repo.EXPECT().FindByID(context.Background(), "r-1").Return(&domain.BillReminder{ID: "r-1", UserID: "user-1"}, nil)

		_, err := svc.Snooze(context.Background(), "user-1", "r-1", request.SnoozeReminderRequest{SnoozedUntil: "bad"})

		requireAppError(t, err, http.StatusBadRequest, "invalid snoozed_until")
	})
}

func TestReminderService_MarkDone(t *testing.T) {
	svc, repo, _ := newReminderService(t)
	reminder := &domain.BillReminder{ID: "r-1", UserID: "user-1", Status: domain.BillReminderStatusUpcoming}
	repo.EXPECT().FindByID(context.Background(), "r-1").Return(reminder, nil)
	repo.EXPECT().Update(context.Background(), reminder).RunAndReturn(func(_ context.Context, r *domain.BillReminder) error {
		require.Equal(t, domain.BillReminderStatusDone, r.Status)
		return nil
	})

	res, err := svc.MarkDone(context.Background(), "user-1", "r-1")

	require.NoError(t, err)
	require.Equal(t, "done", res.Status)
}

func TestReminderService_ProcessDue(t *testing.T) {
	t.Run("flips overdue status and notifies owner", func(t *testing.T) {
		svc, repo, notifSvc := newReminderService(t)
		past := time.Now().AddDate(0, 0, -1)
		due := []domain.BillReminder{{ID: "r-1", UserID: "user-1", Title: "Rent", DueDate: past, Status: domain.BillReminderStatusUpcoming}}
		repo.EXPECT().FindDueForNotification(context.Background(), mockMatchByType[time.Time]()).Return(due, nil)
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.BillReminder]()).RunAndReturn(func(_ context.Context, r *domain.BillReminder) error {
			require.Equal(t, domain.BillReminderStatusOverdue, r.Status)
			return nil
		})
		notifSvc.EXPECT().Create(context.Background(), "user-1", domain.NotificationTypeBillReminder, "Bill reminder", mockMatchByType[string]()).Return(nil)

		processed, err := svc.ProcessDue(context.Background())

		require.NoError(t, err)
		require.Equal(t, 1, processed)
	})

	t.Run("notification failure does not count as processed", func(t *testing.T) {
		svc, repo, notifSvc := newReminderService(t)
		due := []domain.BillReminder{{ID: "r-1", UserID: "user-1", Title: "Rent", DueDate: time.Now(), Status: domain.BillReminderStatusUpcoming}}
		repo.EXPECT().FindDueForNotification(context.Background(), mockMatchByType[time.Time]()).Return(due, nil)
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.BillReminder]()).Return(nil)
		notifSvc.EXPECT().Create(context.Background(), "user-1", domain.NotificationTypeBillReminder, "Bill reminder", mockMatchByType[string]()).Return(errors.New("smtp down"))

		processed, err := svc.ProcessDue(context.Background())

		require.NoError(t, err)
		require.Equal(t, 0, processed)
	})
}
