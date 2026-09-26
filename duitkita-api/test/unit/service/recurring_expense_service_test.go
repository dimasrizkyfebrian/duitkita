package service_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
)

func newRecurringExpenseService(t *testing.T) (service.RecurringExpenseService, *mocks.RecurringExpenseRepository, *mocks.CategoryRepository, *mocks.BudgetRepository, *mocks.ExpenseRepository) {
	repo := mocks.NewRecurringExpenseRepository(t)
	categoryRepo := mocks.NewCategoryRepository(t)
	budgetRepo := mocks.NewBudgetRepository(t)
	expenseRepo := mocks.NewExpenseRepository(t)
	return service.NewRecurringExpenseService(repo, categoryRepo, budgetRepo, expenseRepo), repo, categoryRepo, budgetRepo, expenseRepo
}

func TestRecurringExpenseService_Create(t *testing.T) {
	t.Run("weekly schedule computes next occurrence within 7 days", func(t *testing.T) {
		svc, repo, categoryRepo, _, _ := newRecurringExpenseService(t)
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
		svc, repo, categoryRepo, _, _ := newRecurringExpenseService(t)
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

	t.Run("category not owned", func(t *testing.T) {
		svc, _, categoryRepo, _, _ := newRecurringExpenseService(t)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(nil, nil)

		_, err := svc.Create(context.Background(), "user-1", request.CreateRecurringExpenseRequest{CategoryID: "cat-1", ScheduleType: "monthly", ScheduleDay: 1})

		requireAppError(t, err, http.StatusNotFound, "category not found")
	})
}

func daysIn(year int, month time.Month) int {
	return time.Date(year, month+1, 0, 0, 0, 0, 0, time.UTC).Day()
}

func TestRecurringExpenseService_List(t *testing.T) {
	svc, repo, _, _, _ := newRecurringExpenseService(t)
	repo.EXPECT().FindAllByUserID(context.Background(), "user-1", 20, 0).Return([]domain.RecurringExpense{{ID: "re-1"}}, nil)

	res, err := svc.List(context.Background(), "user-1", 20, 0)

	require.NoError(t, err)
	require.Len(t, res, 1)
}

func TestRecurringExpenseService_GetByID(t *testing.T) {
	t.Run("owner can fetch", func(t *testing.T) {
		svc, repo, _, _, _ := newRecurringExpenseService(t)
		repo.EXPECT().FindByID(context.Background(), "re-1").Return(&domain.RecurringExpense{ID: "re-1", UserID: "user-1"}, nil)

		res, err := svc.GetByID(context.Background(), "user-1", "re-1")

		require.NoError(t, err)
		require.Equal(t, "re-1", res.ID)
	})

	t.Run("not owner", func(t *testing.T) {
		svc, repo, _, _, _ := newRecurringExpenseService(t)
		repo.EXPECT().FindByID(context.Background(), "re-1").Return(&domain.RecurringExpense{ID: "re-1", UserID: "someone-else"}, nil)

		_, err := svc.GetByID(context.Background(), "user-1", "re-1")

		requireAppError(t, err, http.StatusNotFound, "recurring expense not found")
	})
}

func TestRecurringExpenseService_Update(t *testing.T) {
	t.Run("recomputes next run only when schedule_day changes", func(t *testing.T) {
		svc, repo, _, _, _ := newRecurringExpenseService(t)
		original := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)
		re := &domain.RecurringExpense{ID: "re-1", UserID: "user-1", Amount: 100, ScheduleType: domain.RecurringScheduleMonthly, ScheduleDay: 1, NextRunAt: original}
		repo.EXPECT().FindByID(context.Background(), "re-1").Return(re, nil)
		repo.EXPECT().Update(context.Background(), re).Return(nil)

		res, err := svc.Update(context.Background(), "user-1", "re-1", request.UpdateRecurringExpenseRequest{Amount: 500})

		require.NoError(t, err)
		require.Equal(t, int64(500), res.Amount)
		require.Equal(t, original, res.NextRunAt)
	})

	t.Run("not owner", func(t *testing.T) {
		svc, repo, _, _, _ := newRecurringExpenseService(t)
		repo.EXPECT().FindByID(context.Background(), "re-1").Return(&domain.RecurringExpense{ID: "re-1", UserID: "someone-else"}, nil)

		_, err := svc.Update(context.Background(), "user-1", "re-1", request.UpdateRecurringExpenseRequest{Amount: 1})

		requireAppError(t, err, http.StatusNotFound, "recurring expense not found")
	})
}

func TestRecurringExpenseService_Delete(t *testing.T) {
	svc, repo, _, _, _ := newRecurringExpenseService(t)
	repo.EXPECT().FindByID(context.Background(), "re-1").Return(&domain.RecurringExpense{ID: "re-1", UserID: "user-1"}, nil)
	repo.EXPECT().Delete(context.Background(), "re-1").Return(nil)

	err := svc.Delete(context.Background(), "user-1", "re-1")

	require.NoError(t, err)
}

func TestRecurringExpenseService_PauseResume(t *testing.T) {
	t.Run("pause deactivates", func(t *testing.T) {
		svc, repo, _, _, _ := newRecurringExpenseService(t)
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
		svc, repo, _, _, _ := newRecurringExpenseService(t)
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
	t.Run("creates expense when a matching budget exists", func(t *testing.T) {
		svc, repo, _, budgetRepo, expenseRepo := newRecurringExpenseService(t)
		now := time.Now()
		due := []domain.RecurringExpense{{ID: "re-1", UserID: "user-1", CategoryID: "cat-1", Amount: 500, ScheduleType: domain.RecurringScheduleMonthly, ScheduleDay: 1}}
		repo.EXPECT().FindDue(context.Background(), mockMatchByType[time.Time]()).Return(due, nil)
		budgetRepo.EXPECT().FindByUserCategoryPeriod(context.Background(), "user-1", "cat-1", now.Year(), int(now.Month())).Return(&domain.MonthlyBudget{ID: "budget-1"}, nil)
		expenseRepo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Expense]()).Return(nil)
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.RecurringExpense]()).Return(nil)

		processed, err := svc.RunDue(context.Background())

		require.NoError(t, err)
		require.Equal(t, 1, processed)
	})

	t.Run("skips expense creation when no matching budget, still advances schedule", func(t *testing.T) {
		svc, repo, _, budgetRepo, _ := newRecurringExpenseService(t)
		due := []domain.RecurringExpense{{ID: "re-1", UserID: "user-1", CategoryID: "cat-1", ScheduleType: domain.RecurringScheduleMonthly, ScheduleDay: 1}}
		repo.EXPECT().FindDue(context.Background(), mockMatchByType[time.Time]()).Return(due, nil)
		budgetRepo.EXPECT().FindByUserCategoryPeriod(context.Background(), "user-1", "cat-1", mockMatchByType[int](), mockMatchByType[int]()).Return(nil, nil)
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.RecurringExpense]()).Return(nil)

		processed, err := svc.RunDue(context.Background())

		require.NoError(t, err)
		require.Equal(t, 1, processed)
	})
}
