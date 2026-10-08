package service_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"duitkita-api/model/dto/response"
	"duitkita-api/service"
	svcmocks "duitkita-api/service/mocks"
	"duitkita-api/utils"
)

func newInsightsService(t *testing.T) (service.InsightsService, *svcmocks.ReportService) {
	reportSvc := svcmocks.NewReportService(t)
	return service.NewInsightsService(reportSvc), reportSvc
}

func TestInsightsService_Forecast(t *testing.T) {
	t.Run("no history yields zero confidence", func(t *testing.T) {
		svc, reportSvc := newInsightsService(t)
		reportSvc.EXPECT().Trend(context.Background(), "user-1", 3).Return(&response.TrendResponse{}, nil)

		res, err := svc.Forecast(context.Background(), "user-1")

		require.NoError(t, err)
		require.Equal(t, 0.0, res.Confidence)
	})

	t.Run("averages totals and rolls over into next year at december", func(t *testing.T) {
		svc, reportSvc := newInsightsService(t)
		reportSvc.EXPECT().Trend(context.Background(), "user-1", 3).Return(&response.TrendResponse{Points: []response.TrendPoint{
			{Year: 2025, Month: 10, Total: 100},
			{Year: 2025, Month: 11, Total: 200},
			{Year: 2025, Month: 12, Total: 300},
		}}, nil)

		res, err := svc.Forecast(context.Background(), "user-1")

		require.NoError(t, err)
		require.Equal(t, int64(200), res.ProjectedTotal)
		require.Equal(t, 2026, res.Year)
		require.Equal(t, 1, res.Month)
		require.Equal(t, 0.6, res.Confidence)
	})

	t.Run("fewer than 3 points yields lower confidence", func(t *testing.T) {
		svc, reportSvc := newInsightsService(t)
		reportSvc.EXPECT().Trend(context.Background(), "user-1", 3).Return(&response.TrendResponse{Points: []response.TrendPoint{
			{Year: 2026, Month: 1, Total: 100},
		}}, nil)

		res, err := svc.Forecast(context.Background(), "user-1")

		require.NoError(t, err)
		require.Equal(t, 0.4, res.Confidence)
	})

	t.Run("propagates the underlying trend error", func(t *testing.T) {
		svc, reportSvc := newInsightsService(t)
		reportSvc.EXPECT().Trend(context.Background(), "user-1", 3).Return(nil, utils.ErrInternal("db down"))

		_, err := svc.Forecast(context.Background(), "user-1")

		require.Error(t, err)
	})
}

func TestInsightsService_HealthScore(t *testing.T) {
	cases := []struct {
		name          string
		spent, budget int64
		expectGrade   string
		expectScore   int
	}{
		{"well under budget grades A", 30, 100, "A", 70},
		{"near limit grades B", 75, 100, "B", 25},
		{"close to limit grades C", 95, 100, "C", 5},
		{"over budget grades D", 120, 100, "D", 0},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			svc, reportSvc := newInsightsService(t)
			reportSvc.EXPECT().MonthlyReport(context.Background(), "user-1", 2026, 1).Return(&response.MonthlyReportResponse{
				TotalSpent: tc.spent, TotalBudget: tc.budget,
			}, nil)

			res, err := svc.HealthScore(context.Background(), "user-1", 2026, 1)

			require.NoError(t, err)
			require.Equal(t, tc.expectGrade, res.Grade)
			require.Equal(t, tc.expectScore, res.Score)
			require.NotEmpty(t, res.Reasons)
		})
	}

	t.Run("no budget set for the period", func(t *testing.T) {
		svc, reportSvc := newInsightsService(t)
		reportSvc.EXPECT().MonthlyReport(context.Background(), "user-1", 2026, 1).Return(&response.MonthlyReportResponse{TotalBudget: 0}, nil)

		res, err := svc.HealthScore(context.Background(), "user-1", 2026, 1)

		require.NoError(t, err)
		require.Equal(t, "n/a", res.Grade)
		require.Equal(t, 0, res.Score)
	})

	t.Run("propagates the underlying report error", func(t *testing.T) {
		svc, reportSvc := newInsightsService(t)
		reportSvc.EXPECT().MonthlyReport(context.Background(), "user-1", 2026, 1).Return(nil, utils.ErrNotFound("no report"))

		_, err := svc.HealthScore(context.Background(), "user-1", 2026, 1)

		require.Error(t, err)
	})
}
