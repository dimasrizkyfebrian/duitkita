package service

import (
	"context"

	"github.com/google/uuid"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/model/dto/response"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

type BudgetService interface {
	Create(ctx context.Context, userID string, req request.CreateBudgetRequest) (*response.BudgetResponse, error)
	List(ctx context.Context, userID string, year, month int) ([]response.BudgetResponse, error)
	GetByID(ctx context.Context, userID, id string) (*response.BudgetResponse, error)
	Update(ctx context.Context, userID, id string, req request.UpdateBudgetRequest) (*response.BudgetResponse, error)
	Delete(ctx context.Context, userID, id string) error
	GetPartnerBudgets(ctx context.Context, userID string, year, month int) ([]response.BudgetResponse, error)
	Finalize(ctx context.Context, userID, id string) (*response.BudgetResponse, error)
}

type budgetService struct {
	repo         repository.BudgetRepository
	categoryRepo repository.CategoryRepository
	coupleRepo   repository.CoupleRepository
}

func NewBudgetService(repo repository.BudgetRepository, categoryRepo repository.CategoryRepository, coupleRepo repository.CoupleRepository) BudgetService {
	return &budgetService{repo: repo, categoryRepo: categoryRepo, coupleRepo: coupleRepo}
}

func (s *budgetService) Create(ctx context.Context, userID string, req request.CreateBudgetRequest) (*response.BudgetResponse, error) {
	category, err := s.categoryRepo.FindByID(ctx, req.CategoryID)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up category")
	}
	if category == nil || category.UserID != userID {
		return nil, utils.ErrNotFound("category not found")
	}

	if existing, err := s.repo.FindByUserCategoryPeriod(ctx, userID, req.CategoryID, req.Year, req.Month); err != nil {
		return nil, utils.ErrInternal("failed to check existing budget")
	} else if existing != nil {
		return nil, utils.ErrConflict("budget already exists for this category and period")
	}

	budget := &domain.MonthlyBudget{
		ID:          uuid.NewString(),
		UserID:      userID,
		CategoryID:  req.CategoryID,
		Year:        req.Year,
		Month:       req.Month,
		BaseAmount:  req.BaseAmount,
		TotalAmount: req.BaseAmount,
	}
	if err := s.repo.Create(ctx, budget); err != nil {
		return nil, utils.ErrInternal("failed to create budget")
	}

	res := toBudgetResponse(budget)
	return &res, nil
}

func (s *budgetService) List(ctx context.Context, userID string, year, month int) ([]response.BudgetResponse, error) {
	budgets, err := s.repo.FindAllByUserID(ctx, userID, year, month)
	if err != nil {
		return nil, utils.ErrInternal("failed to list budgets")
	}
	return toBudgetResponses(budgets), nil
}

func (s *budgetService) GetByID(ctx context.Context, userID, id string) (*response.BudgetResponse, error) {
	budget, err := s.mustOwnBudget(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	res := toBudgetResponse(budget)
	return &res, nil
}

func (s *budgetService) Update(ctx context.Context, userID, id string, req request.UpdateBudgetRequest) (*response.BudgetResponse, error) {
	budget, err := s.mustOwnBudget(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	if budget.IsFinalized {
		return nil, utils.ErrConflict("budget is already finalized")
	}

	budget.BaseAmount = req.BaseAmount
	budget.TotalAmount = budget.BaseAmount + budget.RolloverAmount
	if err := s.repo.Update(ctx, budget); err != nil {
		return nil, utils.ErrInternal("failed to update budget")
	}

	res := toBudgetResponse(budget)
	return &res, nil
}

func (s *budgetService) Delete(ctx context.Context, userID, id string) error {
	if _, err := s.mustOwnBudget(ctx, userID, id); err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return utils.ErrInternal("failed to delete budget")
	}
	return nil
}

func (s *budgetService) GetPartnerBudgets(ctx context.Context, userID string, year, month int) ([]response.BudgetResponse, error) {
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

	budgets, err := s.repo.FindAllByUserID(ctx, partnerID, year, month)
	if err != nil {
		return nil, utils.ErrInternal("failed to list partner budgets")
	}
	return toBudgetResponses(budgets), nil
}

func (s *budgetService) Finalize(ctx context.Context, userID, id string) (*response.BudgetResponse, error) {
	budget, err := s.mustOwnBudget(ctx, userID, id)
	if err != nil {
		return nil, err
	}

	budget.IsFinalized = true
	if err := s.repo.Update(ctx, budget); err != nil {
		return nil, utils.ErrInternal("failed to finalize budget")
	}

	res := toBudgetResponse(budget)
	return &res, nil
}

func (s *budgetService) mustOwnBudget(ctx context.Context, userID, id string) (*domain.MonthlyBudget, error) {
	budget, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up budget")
	}
	if budget == nil || budget.UserID != userID {
		return nil, utils.ErrNotFound("budget not found")
	}
	return budget, nil
}

func toBudgetResponse(budget *domain.MonthlyBudget) response.BudgetResponse {
	return response.BudgetResponse{
		ID:             budget.ID,
		CategoryID:     budget.CategoryID,
		Year:           budget.Year,
		Month:          budget.Month,
		BaseAmount:     budget.BaseAmount,
		RolloverAmount: budget.RolloverAmount,
		TotalAmount:    budget.TotalAmount,
		IsFinalized:    budget.IsFinalized,
		CreatedAt:      budget.CreatedAt,
		UpdatedAt:      budget.UpdatedAt,
	}
}

func toBudgetResponses(budgets []domain.MonthlyBudget) []response.BudgetResponse {
	out := make([]response.BudgetResponse, 0, len(budgets))
	for i := range budgets {
		out = append(out, toBudgetResponse(&budgets[i]))
	}
	return out
}
