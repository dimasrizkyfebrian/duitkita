package service

import (
	"context"

	"duitkita-api/model/dto/response"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

type ReportService interface {
	MonthlyReport(ctx context.Context, userID string, year, month int) (*response.MonthlyReportResponse, error)
	CoupleReport(ctx context.Context, userID string, year, month int) (*response.MonthlyReportResponse, error)
	Trend(ctx context.Context, userID string, months int) (*response.TrendResponse, error)
	TrendByCategory(ctx context.Context, userID, categoryID string, months int) (*response.TrendResponse, error)
	Rollover(ctx context.Context, userID, categoryID string, year, month int) (int64, error)
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

func (s *reportService) CoupleReport(ctx context.Context, userID string, year, month int) (*response.MonthlyReportResponse, error) {
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

	return &response.MonthlyReportResponse{
		Year:        year,
		Month:       month,
		TotalSpent:  own.TotalSpent + partner.TotalSpent,
		TotalBudget: own.TotalBudget + partner.TotalBudget,
		ByCategory:  append(own.ByCategory, partner.ByCategory...),
	}, nil
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
