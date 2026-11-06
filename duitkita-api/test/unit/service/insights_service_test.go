package service_test

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"duitkita-api/insights"
	"duitkita-api/model/domain"
	"duitkita-api/model/dto/response"
	"duitkita-api/pdfreport"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
	svcmocks "duitkita-api/service/mocks"
	"duitkita-api/utils"
)

// 10 Nov 2026 in Jakarta.
var insightsNow = time.Date(2026, 11, 10, 12, 0, 0, 0, pdfreport.WIB)

func newInsightsService(t *testing.T, now time.Time) (service.InsightsService, *svcmocks.ReportService, *mocks.RecurringExpenseRepository) {
	reportSvc := svcmocks.NewReportService(t)
	recurringRepo := mocks.NewRecurringExpenseRepository(t)
	return service.NewInsightsService(reportSvc, recurringRepo, func() time.Time { return now }), reportSvc, recurringRepo
}

func monthly(budget, spent int64) *response.MonthlyReportResponse {
	return &response.MonthlyReportResponse{
		TotalSpent: spent, TotalBudget: budget,
		ByCategory: []response.CategorySpend{{CategoryID: "makan", Name: "Makan", Spent: spent, Budget: budget}},
	}
}

func daily(days ...int) *response.DailyReportResponse {
	res := &response.DailyReportResponse{}
	for _, d := range days {
		res.Points = append(res.Points, response.DayPoint{Day: d, Total: 10_000})
	}
	return res
}

func tipCodes(tips []response.ScoreTip) []string {
	out := []string{}
	for _, tip := range tips {
		out = append(out, tip.Code)
	}
	return out
}

func TestInsightsService_HealthScore(t *testing.T) {
	ctx := context.Background()

	t.Run("judges the running month on its pace", func(t *testing.T) {
		svc, reportSvc, recurringRepo := newInsightsService(t, insightsNow)
		reportSvc.EXPECT().MonthlyReport(ctx, "user-1", 2026, 11).Return(monthly(3_000_000, 1_500_000), nil)
		reportSvc.EXPECT().DailyBreakdown(ctx, "user-1", 2026, 11).Return(daily(2, 5, 9), nil)
		recurringRepo.EXPECT().FindActiveByUserID(ctx, "user-1").Return(nil, nil)

		res, err := svc.HealthScore(ctx, "user-1", 2026, 11)

		require.NoError(t, err)
		require.Equal(t, "current", res.Period)
		require.Equal(t, int64(4_500_000), res.ProjectedSpent)
		require.Equal(t, int64(3_000_000), res.TotalBudget)
		require.Len(t, res.Components, 3)
		require.Contains(t, res.Tips, response.ScoreTip{Code: "pace_over_budget", Amount: 4_500_000, Budget: 3_000_000})
		require.Equal(t, res.Score, res.Components[0].Points+res.Components[1].Points+res.Components[2].Points)
		require.NotEmpty(t, res.Reasons)
	})

	t.Run("keeps scheduled rent out of the pace", func(t *testing.T) {
		svc, reportSvc, recurringRepo := newInsightsService(t, time.Date(2026, 11, 5, 9, 0, 0, 0, pdfreport.WIB))
		reportSvc.EXPECT().MonthlyReport(ctx, "user-1", 2026, 11).Return(monthly(3_000_000, 3_000_000), nil)
		reportSvc.EXPECT().DailyBreakdown(ctx, "user-1", 2026, 11).Return(daily(1), nil)
		recurringRepo.EXPECT().FindActiveByUserID(ctx, "user-1").Return([]domain.RecurringExpense{{
			CategoryID: "makan", Amount: 3_000_000, ScheduleType: domain.RecurringScheduleMonthly, ScheduleDay: 1,
			CreatedAt: time.Date(2026, 10, 1, 0, 0, 0, 0, pdfreport.WIB),
		}}, nil)

		res, err := svc.HealthScore(ctx, "user-1", 2026, 11)

		require.NoError(t, err)
		require.Equal(t, int64(3_000_000), res.ProjectedSpent)
	})

	t.Run("a past month uses actual spending and needs no schedules", func(t *testing.T) {
		svc, reportSvc, _ := newInsightsService(t, insightsNow)
		reportSvc.EXPECT().MonthlyReport(ctx, "user-1", 2026, 10).Return(monthly(3_000_000, 2_400_000), nil)
		reportSvc.EXPECT().DailyBreakdown(ctx, "user-1", 2026, 10).Return(daily(1, 8, 15, 22, 29), nil)

		res, err := svc.HealthScore(ctx, "user-1", 2026, 10)

		require.NoError(t, err)
		require.Equal(t, "past", res.Period)
		require.Equal(t, 100, res.Score)
		require.Equal(t, "A", res.Grade)
		require.Equal(t, []string{"all_good"}, tipCodes(res.Tips))
	})

	t.Run("no budget", func(t *testing.T) {
		svc, reportSvc, _ := newInsightsService(t, insightsNow)
		reportSvc.EXPECT().MonthlyReport(ctx, "user-1", 2026, 10).Return(&response.MonthlyReportResponse{}, nil)
		reportSvc.EXPECT().DailyBreakdown(ctx, "user-1", 2026, 10).Return(daily(), nil)

		res, err := svc.HealthScore(ctx, "user-1", 2026, 10)

		require.NoError(t, err)
		require.Equal(t, "n/a", res.Grade)
		require.Equal(t, []string{"no_budget"}, tipCodes(res.Tips))
		require.NotNil(t, res.Components)
	})

	t.Run("a future month hasn't started", func(t *testing.T) {
		svc, reportSvc, _ := newInsightsService(t, insightsNow)
		reportSvc.EXPECT().MonthlyReport(ctx, "user-1", 2026, 12).Return(monthly(3_000_000, 0), nil)

		res, err := svc.HealthScore(ctx, "user-1", 2026, 12)

		require.NoError(t, err)
		require.Equal(t, "future", res.Period)
		require.Equal(t, []string{"period_not_started"}, tipCodes(res.Tips))
	})

	t.Run("propagates report errors", func(t *testing.T) {
		svc, reportSvc, _ := newInsightsService(t, insightsNow)
		reportSvc.EXPECT().MonthlyReport(ctx, "user-1", 2026, 10).Return(nil, utils.ErrInternal("db down"))

		_, err := svc.HealthScore(ctx, "user-1", 2026, 10)

		requireAppError(t, err, http.StatusInternalServerError, "db down")
	})

	t.Run("a schedule lookup failure is an internal error", func(t *testing.T) {
		svc, reportSvc, recurringRepo := newInsightsService(t, insightsNow)
		reportSvc.EXPECT().MonthlyReport(ctx, "user-1", 2026, 11).Return(monthly(3_000_000, 1_500_000), nil)
		reportSvc.EXPECT().DailyBreakdown(ctx, "user-1", 2026, 11).Return(daily(2), nil)
		recurringRepo.EXPECT().FindActiveByUserID(ctx, "user-1").Return(nil, errors.New("db down"))

		_, err := svc.HealthScore(ctx, "user-1", 2026, 11)

		requireAppError(t, err, http.StatusInternalServerError, "failed to load recurring expenses")
	})
}

func TestInsightsService_Forecast(t *testing.T) {
	ctx := context.Background()

	t.Run("predicts next month from the three full months before this one", func(t *testing.T) {
		svc, reportSvc, recurringRepo := newInsightsService(t, insightsNow)
		recurringRepo.EXPECT().FindActiveByUserID(ctx, "user-1").Return(nil, nil)
		// The running month only feeds the end-of-month projection.
		reportSvc.EXPECT().MonthlyReport(ctx, "user-1", 2026, 11).Return(monthly(3_000_000, 1_500_000), nil)
		reportSvc.EXPECT().MonthlyReport(ctx, "user-1", 2026, 8).Return(monthly(0, 0), nil)
		reportSvc.EXPECT().MonthlyReport(ctx, "user-1", 2026, 9).Return(monthly(0, 3_000_000), nil)
		reportSvc.EXPECT().MonthlyReport(ctx, "user-1", 2026, 10).Return(monthly(0, 3_000_000), nil)

		res, err := svc.Forecast(ctx, "user-1")

		require.NoError(t, err)
		require.Equal(t, 2026, res.Year)
		require.Equal(t, 12, res.Month)
		require.Equal(t, int64(2_000_000), res.ProjectedTotal)
		require.Equal(t, 2, res.MonthsWithData)
		require.LessOrEqual(t, res.ProjectedLow, res.ProjectedTotal)
		require.GreaterOrEqual(t, res.ProjectedHigh, res.ProjectedTotal)

		projected, _ := insights.ProjectSpent(insights.ScoreInput{
			Year: 2026, Month: 11, Today: insightsNow,
			Categories: []insights.CategoryInput{{ID: "makan", Name: "Makan", Budget: 3_000_000, Spent: 1_500_000}},
		})
		require.Equal(t, &response.CurrentMonthProjection{
			Year: 2026, Month: 11, Spent: 1_500_000, ProjectedTotal: projected, Budget: 3_000_000,
		}, res.CurrentMonth)
	})

	t.Run("in January it reads October to December of the year before", func(t *testing.T) {
		svc, reportSvc, recurringRepo := newInsightsService(t, time.Date(2027, 1, 10, 12, 0, 0, 0, pdfreport.WIB))
		recurringRepo.EXPECT().FindActiveByUserID(ctx, "user-1").Return(nil, nil)
		for _, ym := range [][2]int{{2027, 1}, {2026, 10}, {2026, 11}, {2026, 12}} {
			reportSvc.EXPECT().MonthlyReport(ctx, "user-1", ym[0], ym[1]).Return(monthly(0, 0), nil)
		}

		res, err := svc.Forecast(ctx, "user-1")

		require.NoError(t, err)
		require.Equal(t, 2027, res.Year)
		require.Equal(t, 2, res.Month)
		require.Equal(t, 0.0, res.Confidence)
	})

	t.Run("a schedule lookup failure is an internal error", func(t *testing.T) {
		svc, _, recurringRepo := newInsightsService(t, insightsNow)
		recurringRepo.EXPECT().FindActiveByUserID(ctx, "user-1").Return(nil, errors.New("db down"))

		_, err := svc.Forecast(ctx, "user-1")

		requireAppError(t, err, http.StatusInternalServerError, "failed to load recurring expenses")
	})
}
