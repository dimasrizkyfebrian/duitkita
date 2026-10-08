package service

import (
	"context"
	"sort"

	"duitkita-api/model/dto/response"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

type ReportService interface {
	MonthlyReport(ctx context.Context, userID string, year, month int) (*response.MonthlyReportResponse, error)
	CoupleReport(ctx context.Context, userID string, year, month int) (*response.CoupleReportResponse, error)
	Trend(ctx context.Context, userID string, months int) (*response.TrendResponse, error)
	CoupleTrend(ctx context.Context, userID string, months int) (*response.TrendResponse, error)
	TrendByCategory(ctx context.Context, userID, categoryID string, months int) (*response.TrendResponse, error)
	Rollover(ctx context.Context, userID, categoryID string, year, month int) (int64, error)
	DailyBreakdown(ctx context.Context, userID string, year, month int) (*response.DailyReportResponse, error)
}

type reportService struct {
	reportRepo repository.ReportRepository
	budgetRepo repository.BudgetRepository
	coupleRepo repository.CoupleRepository
}

func NewReportService(reportRepo repository.ReportRepository, budgetRepo repository.BudgetRepository, coupleRepo repository.CoupleRepository) ReportService {
	return &reportService{reportRepo: reportRepo, budgetRepo: budgetRepo, coupleRepo: coupleRepo}
}

func (s *reportService) MonthlyReport(ctx context.Context, userID string, year, month int) (*response.MonthlyReportResponse, error) {
	return s.buildMonthlyReport(ctx, userID, year, month)
}

func (s *reportService) CoupleReport(ctx context.Context, userID string, year, month int) (*response.CoupleReportResponse, error) {
	couple, err := s.coupleRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up partner")
	}
	if couple == nil {
		return nil, utils.ErrNotFound("no linked partner")
	}

	partnerID := couple.User2ID
	if partnerID == userID {
		partnerID = couple.User1ID
	}

	own, err := s.buildMonthlyReport(ctx, userID, year, month)
	if err != nil {
		return nil, err
	}
	partner, err := s.buildMonthlyReport(ctx, partnerID, year, month)
	if err != nil {
		return nil, err
	}

	byCategory := make([]response.CoupleCategorySpend, 0, len(own.ByCategory)+len(partner.ByCategory))
	for _, c := range own.ByCategory {
		byCategory = append(byCategory, response.CoupleCategorySpend{CategorySpend: c, Owner: "me"})
	}
	for _, c := range partner.ByCategory {
		byCategory = append(byCategory, response.CoupleCategorySpend{CategorySpend: c, Owner: "partner"})
	}

	return &response.CoupleReportResponse{
		Year:         year,
		Month:        month,
		MyTotal:      own.TotalSpent,
		PartnerTotal: partner.TotalSpent,
		TotalSpent:   own.TotalSpent + partner.TotalSpent,
		TotalBudget:  own.TotalBudget + partner.TotalBudget,
		ByCategory:   byCategory,
	}, nil
}

// CoupleTrend merges both partners' monthly totals the same way CoupleReport
// merges a single period — two independent trend queries (the repo has no
// notion of "couple"), summed per (year, month). Either side having a sparse
// history (a month with no rows at all) is the normal case, not an error.
func (s *reportService) CoupleTrend(ctx context.Context, userID string, months int) (*response.TrendResponse, error) {
	couple, err := s.coupleRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up partner")
	}
	if couple == nil {
		return nil, utils.ErrNotFound("no linked partner")
	}

	partnerID := couple.User2ID
	if partnerID == userID {
		partnerID = couple.User1ID
	}

	if months <= 0 {
		months = 6
	}

	ownPoints, err := s.reportRepo.MonthlyTrend(ctx, userID, months)
	if err != nil {
		return nil, utils.ErrInternal("failed to compute trend")
	}
	partnerPoints, err := s.reportRepo.MonthlyTrend(ctx, partnerID, months)
	if err != nil {
		return nil, utils.ErrInternal("failed to compute trend")
	}

	type key struct{ year, month int }
	totals := make(map[key]int64, len(ownPoints)+len(partnerPoints))
	order := make([]key, 0, len(ownPoints)+len(partnerPoints))
	add := func(points []repository.MonthTotal) {
		for _, p := range points {
			k := key{p.Year, p.Month}
			if _, seen := totals[k]; !seen {
				order = append(order, k)
			}
			totals[k] += p.Total
		}
	}
	add(ownPoints)
	add(partnerPoints)

	sort.Slice(order, func(i, j int) bool {
		if order[i].year != order[j].year {
			return order[i].year < order[j].year
		}
		return order[i].month < order[j].month
	})

	out := make([]response.TrendPoint, 0, len(order))
	for _, k := range order {
		out = append(out, response.TrendPoint{Year: k.year, Month: k.month, Total: totals[k]})
	}
	return &response.TrendResponse{Points: out}, nil
}

func (s *reportService) Trend(ctx context.Context, userID string, months int) (*response.TrendResponse, error) {
	if months <= 0 {
		months = 6
	}
	points, err := s.reportRepo.MonthlyTrend(ctx, userID, months)
	if err != nil {
		return nil, utils.ErrInternal("failed to compute trend")
	}

	out := make([]response.TrendPoint, 0, len(points))
	for _, p := range points {
		out = append(out, response.TrendPoint{Year: p.Year, Month: p.Month, Total: p.Total})
	}
	return &response.TrendResponse{Points: out}, nil
}

func (s *reportService) TrendByCategory(ctx context.Context, userID, categoryID string, months int) (*response.TrendResponse, error) {
	if months <= 0 {
		months = 6
	}
	points, err := s.reportRepo.MonthlyTrendByCategory(ctx, userID, categoryID, months)
	if err != nil {
		return nil, utils.ErrInternal("failed to compute category trend")
	}

	out := make([]response.TrendPoint, 0, len(points))
	for _, p := range points {
		out = append(out, response.TrendPoint{Year: p.Year, Month: p.Month, Total: p.Total})
	}
	return &response.TrendResponse{Points: out}, nil
}

func (s *reportService) DailyBreakdown(ctx context.Context, userID string, year, month int) (*response.DailyReportResponse, error) {
	totals, err := s.reportRepo.SpentByDayForPeriod(ctx, userID, year, month)
	if err != nil {
		return nil, utils.ErrInternal("failed to compute daily breakdown")
	}

	points := make([]response.DayPoint, 0, len(totals))
	for _, t := range totals {
		points = append(points, response.DayPoint{Day: t.Day, Total: t.Total})
	}
	return &response.DailyReportResponse{Year: year, Month: month, Points: points}, nil
}

func (s *reportService) Rollover(ctx context.Context, userID, categoryID string, year, month int) (int64, error) {
	budget, err := s.budgetRepo.FindByUserCategoryPeriod(ctx, userID, categoryID, year, month)
	if err != nil {
		return 0, utils.ErrInternal("failed to look up budget")
	}
	if budget == nil {
		return 0, utils.ErrNotFound("no budget found for this category and period")
	}

	spent, err := s.reportRepo.SumExpensesByUserAndPeriod(ctx, userID, year, month)
	if err != nil {
		return 0, utils.ErrInternal("failed to compute spent amount")
	}

	leftover := budget.TotalAmount - spent
	if leftover < 0 {
		leftover = 0
	}
	return leftover, nil
}

func (s *reportService) buildMonthlyReport(ctx context.Context, userID string, year, month int) (*response.MonthlyReportResponse, error) {
	totals, err := s.reportRepo.SpentByCategoryForPeriod(ctx, userID, year, month)
	if err != nil {
		return nil, utils.ErrInternal("failed to compute monthly report")
	}

	var totalSpent, totalBudget int64
	byCategory := make([]response.CategorySpend, 0, len(totals))
	for _, t := range totals {
		totalSpent += t.Spent
		totalBudget += t.Budget
		byCategory = append(byCategory, response.CategorySpend{
			CategoryID: t.CategoryID,
			Name:       t.Name,
			Spent:      t.Spent,
			Budget:     t.Budget,
		})
	}

	return &response.MonthlyReportResponse{
		Year:        year,
		Month:       month,
		TotalSpent:  totalSpent,
		TotalBudget: totalBudget,
		ByCategory:  byCategory,
	}, nil
}
