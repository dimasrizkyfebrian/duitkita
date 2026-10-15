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
	servicemocks "duitkita-api/service/mocks"
)

func newRecurringExpenseService(t *testing.T) (service.RecurringExpenseService, *mocks.RecurringExpenseRepository, *mocks.CategoryRepository, *mocks.BudgetRepository, *mocks.ExpenseRepository, *servicemocks.NotificationService) {
	repo := mocks.NewRecurringExpenseRepository(t)
	categoryRepo := mocks.NewCategoryRepository(t)
	budgetRepo := mocks.NewBudgetRepository(t)
	expenseRepo := mocks.NewExpenseRepository(t)
	notifSvc := servicemocks.NewNotificationService(t)
	return service.NewRecurringExpenseService(repo, categoryRepo, budgetRepo, expenseRepo, notifSvc), repo, categoryRepo, budgetRepo, expenseRepo, notifSvc
}

func TestRecurringExpenseService_Create(t *testing.T) {
	t.Run("weekly schedule computes next occurrence within 7 days", func(t *testing.T) {
		svc, repo, categoryRepo, _, _, _ := newRecurringExpenseService(t)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "user-1"}, nil)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.RecurringExpense]()).RunAndReturn(func(_ context.Context, re *domain.RecurringExpense) error {
			require.True(t, re.NextRunAt.After(time.Now()))
			require.WithinDuration(t, time.Now(), re.NextRunAt, 8*24*time.Hour)
			return nil
		})

		res, err := svc.Create(context.Background(), "user-1", request.CreateRecurringExpenseRequest{
			CategoryID: "cat-1", Amount: 1000, ScheduleType: "weekly", ScheduleDay: int(time.Now().Weekday()),
		})

		require.NoError(t, err)
		require.True(t, res.IsActive)
	})

	t.Run("monthly schedule clamps day to last day of month", func(t *testing.T) {
		svc, repo, categoryRepo, _, _, _ := newRecurringExpenseService(t)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "user-1"}, nil)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.RecurringExpense]()).RunAndReturn(func(_ context.Context, re *domain.RecurringExpense) error {
			require.LessOrEqual(t, re.NextRunAt.Day(), 31)
			require.Equal(t, re.NextRunAt.Day(), daysIn(re.NextRunAt.Year(), re.NextRunAt.Month()))
			return nil
		})

		_, err := svc.Create(context.Background(), "user-1", request.CreateRecurringExpenseRequest{
			CategoryID: "cat-1", Amount: 1000, ScheduleType: "monthly", ScheduleDay: 31,
		})

		require.NoError(t, err)
	})

	// Sunday is weekday 0, which is also Go's zero value — the binding tag
	// used to be `required`, so this one weekday was rejected at the edge
	// while every other day went through.
	t.Run("weekly schedule accepts Sunday (day 0)", func(t *testing.T) {
		svc, repo, categoryRepo, _, _, _ := newRecurringExpenseService(t)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "user-1"}, nil)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.RecurringExpense]()).RunAndReturn(func(_ context.Context, re *domain.RecurringExpense) error {
			require.Equal(t, time.Sunday, re.NextRunAt.Weekday())
			return nil
		})

		res, err := svc.Create(context.Background(), "user-1", request.CreateRecurringExpenseRequest{
			CategoryID: "cat-1", Amount: 1000, ScheduleType: "weekly", ScheduleDay: 0,
		})

		require.NoError(t, err)
		require.Equal(t, 0, res.ScheduleDay)
	})

	t.Run("rejects a weekly day outside 0-6", func(t *testing.T) {
		svc, _, categoryRepo, _, _, _ := newRecurringExpenseService(t)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "user-1"}, nil)

		_, err := svc.Create(context.Background(), "user-1", request.CreateRecurringExpenseRequest{
			CategoryID: "cat-1", Amount: 1000, ScheduleType: "weekly", ScheduleDay: 20,
		})

		requireAppError(t, err, http.StatusBadRequest, "schedule_day must be 0-6 (Sunday-Saturday) for a weekly schedule")
	})

	t.Run("rejects monthly day 0", func(t *testing.T) {
		svc, _, categoryRepo, _, _, _ := newRecurringExpenseService(t)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "user-1"}, nil)

		_, err := svc.Create(context.Background(), "user-1", request.CreateRecurringExpenseRequest{
			CategoryID: "cat-1", Amount: 1000, ScheduleType: "monthly", ScheduleDay: 0,
		})

		requireAppError(t, err, http.StatusBadRequest, "schedule_day must be 1-31 for a monthly schedule")
	})

	t.Run("category not owned", func(t *testing.T) {
		svc, _, categoryRepo, _, _, _ := newRecurringExpenseService(t)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(nil, nil)

		_, err := svc.Create(context.Background(), "user-1", request.CreateRecurringExpenseRequest{CategoryID: "cat-1", ScheduleType: "monthly", ScheduleDay: 1})

		requireAppError(t, err, http.StatusNotFound, "category not found")
	})
}

// Monthly next-run used to jump unconditionally to the following month, so
// setting "every 20th" on the 16th skipped the 20th the user was looking at
// and waited five weeks. Driven through Create since computeNextRun is
// unexported — the tests assert against the clock, so both branches
// (this month still ahead vs already past) are covered by construction.
func TestRecurringExpenseService_MonthlyNextRun(t *testing.T) {
	t.Run("keeps this month's date when it hasn't passed yet", func(t *testing.T) {
		now := time.Now()
		daysThisMonth := daysIn(now.Year(), now.Month())
		if now.Day() >= daysThisMonth {
			t.Skip("no later day left in the current month to assert against")
		}
		targetDay := now.Day() + 1

		svc, repo, categoryRepo, _, _, _ := newRecurringExpenseService(t)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "user-1"}, nil)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.RecurringExpense]()).RunAndReturn(func(_ context.Context, re *domain.RecurringExpense) error {
			require.Equal(t, now.Month(), re.NextRunAt.Month(), "should fire this month, not next")
			require.Equal(t, targetDay, re.NextRunAt.Day())
			return nil
		})

		_, err := svc.Create(context.Background(), "user-1", request.CreateRecurringExpenseRequest{
			CategoryID: "cat-1", Amount: 1000, ScheduleType: "monthly", ScheduleDay: targetDay,
		})

		require.NoError(t, err)
	})

	t.Run("rolls to next month once this month's date has passed", func(t *testing.T) {
		now := time.Now()
		if now.Day() == 1 {
			t.Skip("no earlier day in the current month to assert against")
		}
		targetDay := now.Day() - 1

		svc, repo, categoryRepo, _, _, _ := newRecurringExpenseService(t)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "user-1"}, nil)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.RecurringExpense]()).RunAndReturn(func(_ context.Context, re *domain.RecurringExpense) error {
			require.True(t, re.NextRunAt.After(now), "next run must always be in the future")
			require.NotEqual(t, now.Month(), re.NextRunAt.Month(), "this month's date already passed")
			return nil
		})

		_, err := svc.Create(context.Background(), "user-1", request.CreateRecurringExpenseRequest{
			CategoryID: "cat-1", Amount: 1000, ScheduleType: "monthly", ScheduleDay: targetDay,
		})

		require.NoError(t, err)
	})
}

func daysIn(year int, month time.Month) int {
	return time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

func TestRecurringExpenseService_List(t *testing.T) {
	svc, repo, _, _, _, _ := newRecurringExpenseService(t)
	repo.EXPECT().FindAllByUserID(context.Background(), "user-1", 20, 0).Return([]domain.RecurringExpense{{ID: "re-1"}}, nil)

	res, err := svc.List(context.Background(), "user-1", 20, 0)

	require.NoError(t, err)
	require.Len(t, res, 1)
}

func TestRecurringExpenseService_GetByID(t *testing.T) {
	t.Run("owner can fetch", func(t *testing.T) {
		svc, repo, _, _, _, _ := newRecurringExpenseService(t)
		repo.EXPECT().FindByID(context.Background(), "re-1").Return(&domain.RecurringExpense{ID: "re-1", UserID: "user-1"}, nil)

		res, err := svc.GetByID(context.Background(), "user-1", "re-1")

		require.NoError(t, err)
		require.Equal(t, "re-1", res.ID)
	})

	t.Run("not owner", func(t *testing.T) {
		svc, repo, _, _, _, _ := newRecurringExpenseService(t)
		repo.EXPECT().FindByID(context.Background(), "re-1").Return(&domain.RecurringExpense{ID: "re-1", UserID: "someone-else"}, nil)

		_, err := svc.GetByID(context.Background(), "user-1", "re-1")

		requireAppError(t, err, http.StatusNotFound, "recurring expense not found")
	})
}

func TestRecurringExpenseService_Update(t *testing.T) {
	t.Run("recomputes next run only when schedule_day changes", func(t *testing.T) {
		svc, repo, _, _, _, _ := newRecurringExpenseService(t)
		original := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)
		re := &domain.RecurringExpense{ID: "re-1", UserID: "user-1", Amount: 100, ScheduleType: domain.RecurringScheduleMonthly, ScheduleDay: 1, NextRunAt: original}
		repo.EXPECT().FindByID(context.Background(), "re-1").Return(re, nil)
		repo.EXPECT().Update(context.Background(), re).Return(nil)

		res, err := svc.Update(context.Background(), "user-1", "re-1", request.UpdateRecurringExpenseRequest{Amount: 500})

		require.NoError(t, err)
		require.Equal(t, int64(500), res.Amount)
		require.Equal(t, original, res.NextRunAt)
	})

	// schedule_day and note are pointers precisely so these two cases are
	// distinguishable from "field omitted" — with plain zero-value
	// sentinels, moving a weekly item to Sunday and clearing a note were
	// both indistinguishable from leaving the field alone.
	t.Run("can move a weekly schedule to Sunday (day 0)", func(t *testing.T) {
		svc, repo, _, _, _, _ := newRecurringExpenseService(t)
		re := &domain.RecurringExpense{ID: "re-1", UserID: "user-1", ScheduleType: domain.RecurringScheduleWeekly, ScheduleDay: 3}
		repo.EXPECT().FindByID(context.Background(), "re-1").Return(re, nil)
		repo.EXPECT().Update(context.Background(), re).Return(nil)

		sunday := 0
		res, err := svc.Update(context.Background(), "user-1", "re-1", request.UpdateRecurringExpenseRequest{ScheduleDay: &sunday})

		require.NoError(t, err)
		require.Equal(t, 0, res.ScheduleDay)
		require.Equal(t, time.Sunday, res.NextRunAt.Weekday())
	})

	t.Run("an explicit empty note clears it, an omitted note keeps it", func(t *testing.T) {
		svc, repo, _, _, _, _ := newRecurringExpenseService(t)
		existing := "token listrik"
		re := &domain.RecurringExpense{ID: "re-1", UserID: "user-1", ScheduleType: domain.RecurringScheduleMonthly, ScheduleDay: 1, Note: &existing}
		repo.EXPECT().FindByID(context.Background(), "re-1").Return(re, nil).Twice()
		repo.EXPECT().Update(context.Background(), re).Return(nil).Twice()

		res, err := svc.Update(context.Background(), "user-1", "re-1", request.UpdateRecurringExpenseRequest{Amount: 500})
		require.NoError(t, err)
		require.Equal(t, "token listrik", res.Note)

		empty := ""
		res, err = svc.Update(context.Background(), "user-1", "re-1", request.UpdateRecurringExpenseRequest{Note: &empty})
		require.NoError(t, err)
		require.Empty(t, res.Note)
	})

	t.Run("rejects a schedule_day the item's own type can't use", func(t *testing.T) {
		svc, repo, _, _, _, _ := newRecurringExpenseService(t)
		repo.EXPECT().FindByID(context.Background(), "re-1").
			Return(&domain.RecurringExpense{ID: "re-1", UserID: "user-1", ScheduleType: domain.RecurringScheduleWeekly, ScheduleDay: 3}, nil)

		day := 25
		_, err := svc.Update(context.Background(), "user-1", "re-1", request.UpdateRecurringExpenseRequest{ScheduleDay: &day})

		requireAppError(t, err, http.StatusBadRequest, "schedule_day must be 0-6 (Sunday-Saturday) for a weekly schedule")
	})

	t.Run("not owner", func(t *testing.T) {
		svc, repo, _, _, _, _ := newRecurringExpenseService(t)
		repo.EXPECT().FindByID(context.Background(), "re-1").Return(&domain.RecurringExpense{ID: "re-1", UserID: "someone-else"}, nil)

		_, err := svc.Update(context.Background(), "user-1", "re-1", request.UpdateRecurringExpenseRequest{Amount: 1})

		requireAppError(t, err, http.StatusNotFound, "recurring expense not found")
	})
}

func TestRecurringExpenseService_Delete(t *testing.T) {
	svc, repo, _, _, _, _ := newRecurringExpenseService(t)
	repo.EXPECT().FindByID(context.Background(), "re-1").Return(&domain.RecurringExpense{ID: "re-1", UserID: "user-1"}, nil)
	repo.EXPECT().Delete(context.Background(), "re-1").Return(nil)

	err := svc.Delete(context.Background(), "user-1", "re-1")

	require.NoError(t, err)
}

func TestRecurringExpenseService_PauseResume(t *testing.T) {
	t.Run("pause deactivates", func(t *testing.T) {
		svc, repo, _, _, _, _ := newRecurringExpenseService(t)
		re := &domain.RecurringExpense{ID: "re-1", UserID: "user-1", IsActive: true}
		repo.EXPECT().FindByID(context.Background(), "re-1").Return(re, nil)
		repo.EXPECT().Update(context.Background(), re).RunAndReturn(func(_ context.Context, r *domain.RecurringExpense) error {
			require.False(t, r.IsActive)
			return nil
		})

		err := svc.Pause(context.Background(), "user-1", "re-1")
		require.NoError(t, err)
	})

	t.Run("resume reactivates and recomputes schedule", func(t *testing.T) {
		svc, repo, _, _, _, _ := newRecurringExpenseService(t)
		re := &domain.RecurringExpense{ID: "re-1", UserID: "user-1", IsActive: false, ScheduleType: domain.RecurringScheduleMonthly, ScheduleDay: 5}
		repo.EXPECT().FindByID(context.Background(), "re-1").Return(re, nil)
		repo.EXPECT().Update(context.Background(), re).RunAndReturn(func(_ context.Context, r *domain.RecurringExpense) error {
			require.True(t, r.IsActive)
			require.False(t, r.NextRunAt.IsZero())
			return nil
		})

		err := svc.Resume(context.Background(), "user-1", "re-1")
		require.NoError(t, err)
	})
}

func TestRecurringExpenseService_RunDue(t *testing.T) {
	t.Run("creates expense when a matching budget exists, and notifies the user it ran", func(t *testing.T) {
		svc, repo, categoryRepo, budgetRepo, expenseRepo, notifSvc := newRecurringExpenseService(t)
		now := time.Now()
		due := []domain.RecurringExpense{{ID: "re-1", UserID: "user-1", CategoryID: "cat-1", Amount: 500, ScheduleType: domain.RecurringScheduleMonthly, ScheduleDay: 1}}
		repo.EXPECT().FindDue(context.Background(), mockMatchByType[time.Time]()).Return(due, nil)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", Name: "Listrik"}, nil)
		budgetRepo.EXPECT().FindByUserCategoryPeriod(context.Background(), "user-1", "cat-1", now.Year(), int(now.Month())).Return(&domain.MonthlyBudget{ID: "budget-1"}, nil)
		expenseRepo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Expense]()).Return(nil)
		notifSvc.EXPECT().Create(context.Background(), "user-1", domain.NotificationTypeRecurringExpense, mockMatchByType[string](), mockMatchByType[string]()).Return(nil)
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.RecurringExpense]()).Return(nil)

		processed, err := svc.RunDue(context.Background())

		require.NoError(t, err)
		require.Equal(t, 1, processed)
	})

	t.Run("skips expense creation when no matching budget, notifies instead, still advances schedule", func(t *testing.T) {
		svc, repo, categoryRepo, budgetRepo, _, notifSvc := newRecurringExpenseService(t)
		due := []domain.RecurringExpense{{ID: "re-1", UserID: "user-1", CategoryID: "cat-1", ScheduleType: domain.RecurringScheduleMonthly, ScheduleDay: 1}}
		repo.EXPECT().FindDue(context.Background(), mockMatchByType[time.Time]()).Return(due, nil)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", Name: "Listrik"}, nil)
		budgetRepo.EXPECT().FindByUserCategoryPeriod(context.Background(), "user-1", "cat-1", mockMatchByType[int](), mockMatchByType[int]()).Return(nil, nil)
		notifSvc.EXPECT().Create(context.Background(), "user-1", domain.NotificationTypeRecurringExpense, mockMatchByType[string](), mockMatchByType[string]()).RunAndReturn(func(_ context.Context, _ string, _ domain.NotificationType, _, body string) error {
			require.Contains(t, body, "Listrik")
			return nil
		})
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.RecurringExpense]()).Return(nil)

		processed, err := svc.RunDue(context.Background())

		require.NoError(t, err)
		require.Equal(t, 1, processed)
	})

	t.Run("a failure to send the notification doesn't undo the expense already created", func(t *testing.T) {
		svc, repo, categoryRepo, budgetRepo, expenseRepo, notifSvc := newRecurringExpenseService(t)
		now := time.Now()
		due := []domain.RecurringExpense{{ID: "re-1", UserID: "user-1", CategoryID: "cat-1", Amount: 500, ScheduleType: domain.RecurringScheduleMonthly, ScheduleDay: 1}}
		repo.EXPECT().FindDue(context.Background(), mockMatchByType[time.Time]()).Return(due, nil)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", Name: "Listrik"}, nil)
		budgetRepo.EXPECT().FindByUserCategoryPeriod(context.Background(), "user-1", "cat-1", now.Year(), int(now.Month())).Return(&domain.MonthlyBudget{ID: "budget-1"}, nil)
		expenseRepo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Expense]()).Return(nil)
		notifSvc.EXPECT().Create(context.Background(), "user-1", domain.NotificationTypeRecurringExpense, mockMatchByType[string](), mockMatchByType[string]()).Return(errors.New("notifications down"))
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.RecurringExpense]()).Return(nil)

		processed, err := svc.RunDue(context.Background())

		require.NoError(t, err)
		require.Equal(t, 1, processed)
	})
}

func TestRecurringExpenseService_RunDueForUser(t *testing.T) {
	t.Run("only processes the calling user's own due items, not every user's", func(t *testing.T) {
		svc, repo, categoryRepo, budgetRepo, expenseRepo, notifSvc := newRecurringExpenseService(t)
		now := time.Now()
		due := []domain.RecurringExpense{{ID: "re-1", UserID: "user-1", CategoryID: "cat-1", Amount: 500, ScheduleType: domain.RecurringScheduleMonthly, ScheduleDay: 1}}
		repo.EXPECT().FindDueByUserID(context.Background(), "user-1", mockMatchByType[time.Time]()).Return(due, nil)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", Name: "Listrik"}, nil)
		budgetRepo.EXPECT().FindByUserCategoryPeriod(context.Background(), "user-1", "cat-1", now.Year(), int(now.Month())).Return(&domain.MonthlyBudget{ID: "budget-1"}, nil)
		expenseRepo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Expense]()).Return(nil)
		notifSvc.EXPECT().Create(context.Background(), "user-1", domain.NotificationTypeRecurringExpense, mockMatchByType[string](), mockMatchByType[string]()).Return(nil)
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.RecurringExpense]()).Return(nil)

		processed, err := svc.RunDueForUser(context.Background(), "user-1")

		require.NoError(t, err)
		require.Equal(t, 1, processed)
		repo.AssertNotCalled(t, "FindDue")
	})
}
