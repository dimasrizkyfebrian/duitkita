package service_test

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/repository"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
)

func newReportService(t *testing.T) (service.ReportService, *mocks.ReportRepository, *mocks.BudgetRepository, *mocks.CoupleRepository) {
	reportRepo := mocks.NewReportRepository(t)
	budgetRepo := mocks.NewBudgetRepository(t)
	coupleRepo := mocks.NewCoupleRepository(t)
	return service.NewReportService(reportRepo, budgetRepo, coupleRepo), reportRepo, budgetRepo, coupleRepo
}

func TestReportService_MonthlyReport(t *testing.T) {
	svc, reportRepo, _, _ := newReportService(t)
	reportRepo.EXPECT().SpentByCategoryForPeriod(context.Background(), "user-1", 2026, 1).Return([]repository.CategoryTotal{
		{CategoryID: "cat-1", Name: "Food", Spent: 100, Budget: 200},
		{CategoryID: "cat-2", Name: "Transport", Spent: 50, Budget: 50},
	}, nil)

	res, err := svc.MonthlyReport(context.Background(), "user-1", 2026, 1)

	require.NoError(t, err)
	require.Equal(t, int64(150), res.TotalSpent)
	require.Equal(t, int64(250), res.TotalBudget)
	require.Len(t, res.ByCategory, 2)
}

func TestReportService_CoupleReport(t *testing.T) {
	t.Run("merges own and partner totals", func(t *testing.T) {
		svc, reportRepo, _, coupleRepo := newReportService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(&domain.Couple{User1ID: "user-1", User2ID: "partner-1"}, nil)
		reportRepo.EXPECT().SpentByCategoryForPeriod(context.Background(), "user-1", 2026, 1).Return([]repository.CategoryTotal{{CategoryID: "cat-1", Spent: 100, Budget: 200}}, nil)
		reportRepo.EXPECT().SpentByCategoryForPeriod(context.Background(), "partner-1", 2026, 1).Return([]repository.CategoryTotal{{CategoryID: "cat-2", Spent: 30, Budget: 40}}, nil)

		res, err := svc.CoupleReport(context.Background(), "user-1", 2026, 1)

		require.NoError(t, err)
		require.Equal(t, int64(130), res.TotalSpent)
		require.Equal(t, int64(240), res.TotalBudget)
		require.Len(t, res.ByCategory, 2)
	})

	t.Run("no linked partner", func(t *testing.T) {
		svc, _, _, coupleRepo := newReportService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(nil, nil)

		_, err := svc.CoupleReport(context.Background(), "user-1", 2026, 1)

		requireAppError(t, err, http.StatusNotFound, "no linked partner")
	})
}

func TestReportService_Trend(t *testing.T) {
	t.Run("non-positive months defaults to 6", func(t *testing.T) {
		svc, reportRepo, _, _ := newReportService(t)
		reportRepo.EXPECT().MonthlyTrend(context.Background(), "user-1", 6).Return([]repository.MonthTotal{{Year: 2026, Month: 1, Total: 100}}, nil)

		res, err := svc.Trend(context.Background(), "user-1", 0)

		require.NoError(t, err)
		require.Len(t, res.Points, 1)
	})

	t.Run("positive months passed through", func(t *testing.T) {
		svc, reportRepo, _, _ := newReportService(t)
		reportRepo.EXPECT().MonthlyTrend(context.Background(), "user-1", 3).Return(nil, nil)

		_, err := svc.Trend(context.Background(), "user-1", 3)

		require.NoError(t, err)
	})
}

func TestReportService_TrendByCategory(t *testing.T) {
	t.Run("non-positive months defaults to 6", func(t *testing.T) {
		svc, reportRepo, _, _ := newReportService(t)
		reportRepo.EXPECT().MonthlyTrendByCategory(context.Background(), "user-1", "cat-1", 6).Return([]repository.MonthTotal{{Year: 2026, Month: 1, Total: 50}}, nil)

		res, err := svc.TrendByCategory(context.Background(), "user-1", "cat-1", 0)

		require.NoError(t, err)
		require.Len(t, res.Points, 1)
	})

	t.Run("repo error wrapped as internal", func(t *testing.T) {
		svc, reportRepo, _, _ := newReportService(t)
		reportRepo.EXPECT().MonthlyTrendByCategory(context.Background(), "user-1", "cat-1", 3).Return(nil, errors.New("db down"))

		_, err := svc.TrendByCategory(context.Background(), "user-1", "cat-1", 3)

		requireAppError(t, err, http.StatusInternalServerError, "failed to compute category trend")
	})
}

func TestReportService_Rollover(t *testing.T) {
	t.Run("leftover clamped to zero when overspent", func(t *testing.T) {
		svc, reportRepo, budgetRepo, _ := newReportService(t)
		budgetRepo.EXPECT().FindByUserCategoryPeriod(context.Background(), "user-1", "cat-1", 2026, 1).Return(&domain.MonthlyBudget{TotalAmount: 100}, nil)
		reportRepo.EXPECT().SumExpensesByUserAndPeriod(context.Background(), "user-1", 2026, 1).Return(int64(150), nil)

		leftover, err := svc.Rollover(context.Background(), "user-1", "cat-1", 2026, 1)

		require.NoError(t, err)
		require.Equal(t, int64(0), leftover)
	})

	t.Run("no budget for period", func(t *testing.T) {
		svc, _, budgetRepo, _ := newReportService(t)
		budgetRepo.EXPECT().FindByUserCategoryPeriod(context.Background(), "user-1", "cat-1", 2026, 1).Return(nil, nil)

		_, err := svc.Rollover(context.Background(), "user-1", "cat-1", 2026, 1)

		requireAppError(t, err, http.StatusNotFound, "no budget found for this category and period")
	})

	t.Run("positive leftover returned as-is", func(t *testing.T) {
		svc, reportRepo, budgetRepo, _ := newReportService(t)
		budgetRepo.EXPECT().FindByUserCategoryPeriod(context.Background(), "user-1", "cat-1", 2026, 1).Return(&domain.MonthlyBudget{TotalAmount: 100}, nil)
		reportRepo.EXPECT().SumExpensesByUserAndPeriod(context.Background(), "user-1", 2026, 1).Return(int64(40), nil)

		leftover, err := svc.Rollover(context.Background(), "user-1", "cat-1", 2026, 1)

		require.NoError(t, err)
		require.Equal(t, int64(60), leftover)
	})
}
