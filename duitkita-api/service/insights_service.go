package service

import (
	"context"

	"duitkita-api/model/dto/response"
)

type InsightsService interface {
	Forecast(ctx context.Context, userID string) (*response.ForecastResponse, error)
	HealthScore(ctx context.Context, userID string, year, month int) (*response.HealthScoreResponse, error)
}

type insightsService struct {
	reportSvc ReportService
}

func NewInsightsService(reportSvc ReportService) InsightsService {
	return &insightsService{reportSvc: reportSvc}
}

// Forecast goes through ReportService.Trend (cached) rather than the repo
// directly, so it shares a cache entry with /reports/trend instead of
// re-running the same 3-month query on every page load.
func (s *insightsService) Forecast(ctx context.Context, userID string) (*response.ForecastResponse, error) {
	trend, err := s.reportSvc.Trend(ctx, userID, 3)
	if err != nil {
		return nil, err
	}
	points := trend.Points
	if len(points) == 0 {
		return &response.ForecastResponse{Confidence: 0}, nil
	}

	var sum int64
	for _, p := range points {
		sum += p.Total
	}
	avg := sum / int64(len(points))

	last := points[len(points)-1]
	nextMonth := last.Month + 1
	nextYear := last.Year
	if nextMonth > 12 {
		nextMonth = 1
		nextYear++
	}

	confidence := 0.4
	if len(points) >= 3 {
		confidence = 0.6
	}

	return &response.ForecastResponse{
		Year:           nextYear,
		Month:          nextMonth,
		ProjectedTotal: avg,
		Confidence:     confidence,
	}, nil
}

func (s *insightsService) HealthScore(ctx context.Context, userID string, year, month int) (*response.HealthScoreResponse, error) {
	report, err := s.reportSvc.MonthlyReport(ctx, userID, year, month)
	if err != nil {
		return nil, err
	}

	if report.TotalBudget == 0 {
		return &response.HealthScoreResponse{Score: 0, Grade: "n/a", Reasons: []string{"no budget set for this period"}}, nil
	}

	ratio := float64(report.TotalSpent) / float64(report.TotalBudget)
	score := int((1 - ratio) * 100)
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	grade := "A"
	reasons := []string{}
	switch {
	case ratio > 1:
		grade = "D"
		reasons = append(reasons, "spending exceeded total budget")
	case ratio > 0.9:
		grade = "C"
		reasons = append(reasons, "spending is close to the budget limit")
	case ratio > 0.7:
		grade = "B"
		reasons = append(reasons, "spending is within a healthy range")
	default:
		reasons = append(reasons, "spending is well under budget")
	}

	return &response.HealthScoreResponse{Score: score, Grade: grade, Reasons: reasons}, nil
}
