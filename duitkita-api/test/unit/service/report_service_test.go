package service_test

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/response"
	"duitkita-api/repository"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
)

func newReportService(t *testing.T) (service.ReportService, *mocks.ReportRepository, *mocks.BudgetRepository, *mocks.CoupleRepository) {
	reportRepo := mocks.NewReportRepository(t)
	budgetRepo := mocks.NewBudgetRepository(t)
	coupleRepo := mocks.NewCoupleRepository(t)
	// Unreachable rather than mocked — every call here reads as a cache
	// miss, so these tests see exactly the repo-call pattern they'd see
	// with caching turned off. The caching behavior itself is covered
	// separately by TestReportService_Caching below, against a real
	// miniredis instance.
	redisClient := redis.NewClient(&redis.Options{
		Addr:        "127.0.0.1:1",
		MaxRetries:  -1,
		DialTimeout: 100 * time.Millisecond,
	})
	t.Cleanup(func() { _ = redisClient.Close() })
	return service.NewReportService(reportRepo, budgetRepo, coupleRepo, redisClient), reportRepo, budgetRepo, coupleRepo
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
	t.Run("merges own and partner totals, tagging each row's owner", func(t *testing.T) {
		svc, reportRepo, _, coupleRepo := newReportService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(&domain.Couple{User1ID: "user-1", User2ID: "partner-1"}, nil)
		reportRepo.EXPECT().SpentByCategoryForPeriod(context.Background(), "user-1", 2026, 1).Return([]repository.CategoryTotal{{CategoryID: "cat-1", Spent: 100, Budget: 200}}, nil)
		reportRepo.EXPECT().SpentByCategoryForPeriod(context.Background(), "partner-1", 2026, 1).Return([]repository.CategoryTotal{{CategoryID: "cat-2", Spent: 30, Budget: 40}}, nil)

		res, err := svc.CoupleReport(context.Background(), "user-1", 2026, 1)

		require.NoError(t, err)
		require.Equal(t, int64(100), res.MyTotal)
		require.Equal(t, int64(30), res.PartnerTotal)
		require.Equal(t, int64(130), res.TotalSpent)
		require.Equal(t, int64(240), res.TotalBudget)
		require.Len(t, res.ByCategory, 2)
		require.Equal(t, "me", res.ByCategory[0].Owner)
		require.Equal(t, "cat-1", res.ByCategory[0].CategoryID)
		require.Equal(t, "partner", res.ByCategory[1].Owner)
		require.Equal(t, "cat-2", res.ByCategory[1].CategoryID)
	})

	t.Run("works out which id is the partner when called from the other side of the couple", func(t *testing.T) {
		svc, reportRepo, _, coupleRepo := newReportService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-2").Return(&domain.Couple{User1ID: "user-1", User2ID: "user-2"}, nil)
		reportRepo.EXPECT().SpentByCategoryForPeriod(context.Background(), "user-2", 2026, 1).Return(nil, nil)
		reportRepo.EXPECT().SpentByCategoryForPeriod(context.Background(), "user-1", 2026, 1).Return(nil, nil)

		_, err := svc.CoupleReport(context.Background(), "user-2", 2026, 1)

		require.NoError(t, err)
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

func TestReportService_CoupleTrend(t *testing.T) {
	t.Run("sums both partners' months, filling in whichever side has no row", func(t *testing.T) {
		svc, reportRepo, _, coupleRepo := newReportService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(&domain.Couple{User1ID: "user-1", User2ID: "partner-1"}, nil)
		reportRepo.EXPECT().MonthlyTrend(context.Background(), "user-1", 3).Return([]repository.MonthTotal{
			{Year: 2026, Month: 1, Total: 100},
			{Year: 2026, Month: 2, Total: 50},
		}, nil)
		reportRepo.EXPECT().MonthlyTrend(context.Background(), "partner-1", 3).Return([]repository.MonthTotal{
			{Year: 2026, Month: 1, Total: 20},
			// No February row for the partner at all — shouldn't drop the month.
			{Year: 2026, Month: 3, Total: 10},
		}, nil)

		res, err := svc.CoupleTrend(context.Background(), "user-1", 3)

		require.NoError(t, err)
		require.Equal(t, []response.TrendPoint{
			{Year: 2026, Month: 1, Total: 120},
			{Year: 2026, Month: 2, Total: 50},
			{Year: 2026, Month: 3, Total: 10},
		}, res.Points)
	})

	t.Run("non-positive months defaults to 6", func(t *testing.T) {
		svc, reportRepo, _, coupleRepo := newReportService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(&domain.Couple{User1ID: "user-1", User2ID: "partner-1"}, nil)
		reportRepo.EXPECT().MonthlyTrend(context.Background(), "user-1", 6).Return(nil, nil)
		reportRepo.EXPECT().MonthlyTrend(context.Background(), "partner-1", 6).Return(nil, nil)

		_, err := svc.CoupleTrend(context.Background(), "user-1", 0)

		require.NoError(t, err)
	})

	t.Run("no linked partner", func(t *testing.T) {
		svc, _, _, coupleRepo := newReportService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(nil, nil)

		_, err := svc.CoupleTrend(context.Background(), "user-1", 6)

		requireAppError(t, err, http.StatusNotFound, "no linked partner")
	})
}

func TestReportService_DailyBreakdown(t *testing.T) {
	t.Run("maps repo rows to day points", func(t *testing.T) {
		svc, reportRepo, _, _ := newReportService(t)
		reportRepo.EXPECT().SpentByDayForPeriod(context.Background(), "user-1", 2026, 1).Return([]repository.DayTotal{
			{Day: 1, Total: 20},
			{Day: 15, Total: 80},
		}, nil)

		res, err := svc.DailyBreakdown(context.Background(), "user-1", 2026, 1)

		require.NoError(t, err)
		require.Equal(t, 2026, res.Year)
		require.Equal(t, 1, res.Month)
		require.Equal(t, []response.DayPoint{{Day: 1, Total: 20}, {Day: 15, Total: 80}}, res.Points)
	})

	t.Run("repo error wrapped as internal", func(t *testing.T) {
		svc, reportRepo, _, _ := newReportService(t)
		reportRepo.EXPECT().SpentByDayForPeriod(context.Background(), "user-1", 2026, 1).Return(nil, errors.New("db down"))

		_, err := svc.DailyBreakdown(context.Background(), "user-1", 2026, 1)

		requireAppError(t, err, http.StatusInternalServerError, "failed to compute daily breakdown")
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

func TestReportService_CachingAndInvalidation(t *testing.T) {
	t.Run("MonthlyReport and CoupleReport share one cache entry per user", func(t *testing.T) {
		mr := miniredis.RunT(t)
		redisClient := redis.NewClient(&redis.Options{Addr: mr.Addr()})
		t.Cleanup(func() { _ = redisClient.Close() })

		reportRepo := mocks.NewReportRepository(t)
		budgetRepo := mocks.NewBudgetRepository(t)
		coupleRepo := mocks.NewCoupleRepository(t)
		svc := service.NewReportService(reportRepo, budgetRepo, coupleRepo, redisClient)

		// Exactly one call each for user-1 and partner-1, despite three
		// report calls touching user-1's data below.
		reportRepo.EXPECT().SpentByCategoryForPeriod(context.Background(), "user-1", 2026, 1).
			Return([]repository.CategoryTotal{{CategoryID: "cat-1", Spent: 100, Budget: 200}}, nil).Once()
		reportRepo.EXPECT().SpentByCategoryForPeriod(context.Background(), "partner-1", 2026, 1).
			Return([]repository.CategoryTotal{{CategoryID: "cat-2", Spent: 30, Budget: 40}}, nil).Once()
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").
			Return(&domain.Couple{User1ID: "user-1", User2ID: "partner-1"}, nil)

		_, err := svc.MonthlyReport(context.Background(), "user-1", 2026, 1)
		require.NoError(t, err)

		// Same call again — should come from cache, not hit the repo (the
		// .Once() above would fail this test if it did).
		res2, err := svc.MonthlyReport(context.Background(), "user-1", 2026, 1)
		require.NoError(t, err)
		require.Equal(t, int64(100), res2.TotalSpent)

		// CoupleReport's "own" half reuses the same cache entry; only the
		// partner's half is a fresh repo call.
		coupleRes, err := svc.CoupleReport(context.Background(), "user-1", 2026, 1)
		require.NoError(t, err)
		require.Equal(t, int64(100), coupleRes.MyTotal)
		require.Equal(t, int64(30), coupleRes.PartnerTotal)
	})

	t.Run("trend cache is shared between Trend and CoupleTrend", func(t *testing.T) {
		mr := miniredis.RunT(t)
		redisClient := redis.NewClient(&redis.Options{Addr: mr.Addr()})
		t.Cleanup(func() { _ = redisClient.Close() })

		reportRepo := mocks.NewReportRepository(t)
		budgetRepo := mocks.NewBudgetRepository(t)
		coupleRepo := mocks.NewCoupleRepository(t)
		svc := service.NewReportService(reportRepo, budgetRepo, coupleRepo, redisClient)

		reportRepo.EXPECT().MonthlyTrend(context.Background(), "user-1", 6).
			Return([]repository.MonthTotal{{Year: 2026, Month: 1, Total: 100}}, nil).Once()
		reportRepo.EXPECT().MonthlyTrend(context.Background(), "partner-1", 6).
			Return([]repository.MonthTotal{{Year: 2026, Month: 1, Total: 20}}, nil).Once()
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").
			Return(&domain.Couple{User1ID: "user-1", User2ID: "partner-1"}, nil)

		_, err := svc.Trend(context.Background(), "user-1", 6)
		require.NoError(t, err)

		// CoupleTrend's "own" half reuses Trend's cache entry.
		res, err := svc.CoupleTrend(context.Background(), "user-1", 6)
		require.NoError(t, err)
		require.Equal(t, []response.TrendPoint{{Year: 2026, Month: 1, Total: 120}}, res.Points)
	})

	t.Run("bumping the cache version makes the next read recompute", func(t *testing.T) {
		mr := miniredis.RunT(t)
		redisClient := redis.NewClient(&redis.Options{Addr: mr.Addr()})
		t.Cleanup(func() { _ = redisClient.Close() })

		reportRepo := mocks.NewReportRepository(t)
		budgetRepo := mocks.NewBudgetRepository(t)
		coupleRepo := mocks.NewCoupleRepository(t)
		svc := service.NewReportService(reportRepo, budgetRepo, coupleRepo, redisClient)

		reportRepo.EXPECT().SpentByCategoryForPeriod(context.Background(), "user-1", 2026, 1).
			Return([]repository.CategoryTotal{{CategoryID: "cat-1", Spent: 100, Budget: 200}}, nil).Once()

		res1, err := svc.MonthlyReport(context.Background(), "user-1", 2026, 1)
		require.NoError(t, err)
		require.Equal(t, int64(100), res1.TotalSpent)

		// Recording an expense bumps user-1's version (same mechanism
		// ExpenseService.Create uses — see expense_service_test.go for
		// that call site). Simulated directly here against the same
		// Redis instance, so the next report read misses the stale entry.
		redisClient.Incr(context.Background(), "report_cache_version:user-1")

		reportRepo.EXPECT().SpentByCategoryForPeriod(context.Background(), "user-1", 2026, 1).
			Return([]repository.CategoryTotal{{CategoryID: "cat-1", Spent: 150, Budget: 200}}, nil).Once()

		res2, err := svc.MonthlyReport(context.Background(), "user-1", 2026, 1)
		require.NoError(t, err)
		require.Equal(t, int64(150), res2.TotalSpent)
	})
}
