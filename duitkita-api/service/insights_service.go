package service

import (
	"context"
	"time"

	"duitkita-api/insights"
	"duitkita-api/model/domain"
	"duitkita-api/model/dto/response"
	"duitkita-api/pdfreport"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

type InsightsService interface {
	Forecast(ctx context.Context, userID string) (*response.ForecastResponse, error)
	HealthScore(ctx context.Context, userID string, year, month int) (*response.HealthScoreResponse, error)
}

// insightsService gathers inputs for the insights package — the math lives
// there so the PDF export gets exactly the same numbers. Month totals and
// days come from ReportService, which caches them.
type insightsService struct {
	reportSvc     ReportService
	recurringRepo repository.RecurringExpenseRepository
	now           func() time.Time
}

func NewInsightsService(reportSvc ReportService, recurringRepo repository.RecurringExpenseRepository, now func() time.Time) InsightsService {
	return &insightsService{reportSvc: reportSvc, recurringRepo: recurringRepo, now: now}
}

func (s *insightsService) HealthScore(ctx context.Context, userID string, year, month int) (*response.HealthScoreResponse, error) {
	today := s.now().In(pdfreport.WIB)
	state, _, _ := insights.Progress(year, month, today)

	report, err := s.reportSvc.MonthlyReport(ctx, userID, year, month)
	if err != nil {
		return nil, err
	}
	in := insights.ScoreInput{Year: year, Month: month, Today: today, Categories: toCategoryInputs(report)}

	if state != insights.PeriodFuture {
		days, err := s.reportSvc.DailyBreakdown(ctx, userID, year, month)
		if err != nil {
			return nil, err
		}
		for _, p := range days.Points {
			if p.Total > 0 {
				in.DaysWithSpend = append(in.DaysWithSpend, p.Day)
			}
		}
	}
	// Schedules only shape the running month's projection.
	if state == insights.PeriodCurrent {
		if in.Schedules, err = s.schedules(ctx, userID); err != nil {
			return nil, err
		}
	}

	return toHealthScoreResponse(insights.ComputeScore(in)), nil
}

// Forecast always looks forward from today: where this month is heading,
// and next month predicted from the three full months before this one.
func (s *insightsService) Forecast(ctx context.Context, userID string) (*response.ForecastResponse, error) {
	today := s.now().In(pdfreport.WIB)
	year, month := today.Year(), int(today.Month())

	schedules, err := s.schedules(ctx, userID)
	if err != nil {
		return nil, err
	}

	current, err := s.reportSvc.MonthlyReport(ctx, userID, year, month)
	if err != nil {
		return nil, err
	}
	projected, recurringRemaining := insights.ProjectSpent(insights.ScoreInput{
		Year: year, Month: month, Today: today, Categories: toCategoryInputs(current), Schedules: schedules,
	})

	in := insights.NextMonthInput{Schedules: schedules}
	in.LastYear, in.LastMonth = addMonths(year, month, -1)
	in.Year, in.Month = addMonths(year, month, 1)
	for i := range in.Totals {
		y, m := addMonths(year, month, i-3)
		report, err := s.reportSvc.MonthlyReport(ctx, userID, y, m)
		if err != nil {
			return nil, err
		}
		in.Totals[i] = report.TotalSpent
	}
	next := insights.ForecastNextMonth(in)

	return &response.ForecastResponse{
		Year:           in.Year,
		Month:          in.Month,
		ProjectedTotal: next.Projected,
		ProjectedLow:   next.Low,
		ProjectedHigh:  next.High,
		RecurringTotal: next.RecurringTotal,
		MonthsWithData: next.MonthsWithData,
		Confidence:     next.Confidence,
		CurrentMonth: &response.CurrentMonthProjection{
			Year:               year,
			Month:              month,
			Spent:              current.TotalSpent,
			ProjectedTotal:     projected,
			Budget:             current.TotalBudget,
			RecurringRemaining: recurringRemaining,
		},
	}, nil
}

func (s *insightsService) schedules(ctx context.Context, userID string) ([]insights.Schedule, error) {
	items, err := s.recurringRepo.FindActiveByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to load recurring expenses")
	}
	out := make([]insights.Schedule, 0, len(items))
	for i := range items {
		out = append(out, toSchedule(items[i].CategoryID, items[i].Amount, string(items[i].ScheduleType), items[i].ScheduleDay, items[i].CreatedAt))
	}
	return out, nil
}

func toSchedule(categoryID string, amount int64, scheduleType string, day int, createdAt time.Time) insights.Schedule {
	return insights.Schedule{
		CategoryID: categoryID,
		Amount:     amount,
		Weekly:     scheduleType == string(domain.RecurringScheduleWeekly),
		Day:        day,
		CreatedAt:  createdAt,
	}
}

func toCategoryInputs(report *response.MonthlyReportResponse) []insights.CategoryInput {
	out := make([]insights.CategoryInput, 0, len(report.ByCategory))
	for _, c := range report.ByCategory {
		out = append(out, insights.CategoryInput{ID: c.CategoryID, Name: c.Name, Budget: c.Budget, Spent: c.Spent})
	}
	return out
}

func addMonths(year, month, n int) (int, int) {
	t := time.Date(year, time.Month(month)+time.Month(n), 1, 0, 0, 0, 0, time.UTC)
	return t.Year(), int(t.Month())
}

// legacyReasons keeps the plain-English line older clients read.
var legacyReasons = map[string]string{
	"A":   "spending is well within budget",
	"B":   "spending is within a healthy range",
	"C":   "spending is close to the budget limit",
	"D":   "spending is over budget",
	"n/a": "the score can't be computed for this period",
}

func toHealthScoreResponse(s insights.Score) *response.HealthScoreResponse {
	res := &response.HealthScoreResponse{
		Score:          s.Score,
		Grade:          s.Grade,
		Reasons:        []string{legacyReasons[s.Grade]},
		Provisional:    s.Provisional,
		Period:         string(s.Period),
		ProjectedSpent: s.ProjectedSpent,
		TotalBudget:    s.TotalBudget,
		Components:     make([]response.ScoreComponent, 0, len(s.Components)),
		Tips:           make([]response.ScoreTip, 0, len(s.Tips)),
	}
	for _, c := range s.Components {
		res.Components = append(res.Components, response.ScoreComponent{Key: c.Key, Points: c.Points, Max: c.Max})
	}
	for _, t := range s.Tips {
		res.Tips = append(res.Tips, response.ScoreTip{
			Code: t.Code, CategoryName: t.CategoryName, Percent: t.Percent, Amount: t.Amount, Budget: t.Budget, Weeks: t.Weeks,
		})
	}
	return res
}
