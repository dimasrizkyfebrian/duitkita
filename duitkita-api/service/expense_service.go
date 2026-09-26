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

type ExpenseListFilter struct {
	CategoryID string
	From       string
	To         string
	Limit      int
	Offset     int
}

type ExpenseService interface {
	Create(ctx context.Context, userID string, req request.CreateExpenseRequest) (*response.ExpenseResponse, error)
	List(ctx context.Context, userID string, filter ExpenseListFilter) ([]response.ExpenseResponse, error)
	ListByBudget(ctx context.Context, userID, budgetID string) ([]response.ExpenseResponse, error)
	ListPartnerExpenses(ctx context.Context, userID string, filter ExpenseListFilter) ([]response.ExpenseResponse, error)
	GetByID(ctx context.Context, userID, id string) (*response.ExpenseResponse, error)
	Update(ctx context.Context, userID, id string, req request.UpdateExpenseRequest) (*response.ExpenseResponse, error)
	Delete(ctx context.Context, userID, id string) error
}

type expenseService struct {
	repo        repository.ExpenseRepository
	budgetRepo  repository.BudgetRepository
	coupleRepo  repository.CoupleRepository
	activitySvc ActivityService
}

func NewExpenseService(repo repository.ExpenseRepository, budgetRepo repository.BudgetRepository, coupleRepo repository.CoupleRepository, activitySvc ActivityService) ExpenseService {
	return &expenseService{repo: repo, budgetRepo: budgetRepo, coupleRepo: coupleRepo, activitySvc: activitySvc}
}

func (s *expenseService) Create(ctx context.Context, userID string, req request.CreateExpenseRequest) (*response.ExpenseResponse, error) {
	// One round trip validating both category and budget ownership,
	// instead of two separate FindByID lookups.
	categoryOwned, budgetOwned, err := s.repo.ValidateOwnership(ctx, userID, req.CategoryID, req.MonthlyBudgetID)
	if err != nil {
		return nil, utils.ErrInternal("failed to validate ownership")
	}
	if !categoryOwned {
		return nil, utils.ErrNotFound("category not found")
	}
	if !budgetOwned {
		return nil, utils.ErrNotFound("budget not found")
	}

	expenseDate, err := utils.ParseDateOnly(req.ExpenseDate)
	if err != nil {
		return nil, utils.ErrBadRequest("invalid expense_date")
	}

	expense := &domain.Expense{
		ID:              uuid.NewString(),
		UserID:          userID,
		CategoryID:      req.CategoryID,
		MonthlyBudgetID: req.MonthlyBudgetID,
		Amount:          req.Amount,
		Note:            utils.StringPtr(req.Note),
		ExpenseDate:     expenseDate,
	}
	if err := s.repo.Create(ctx, expense); err != nil {
		return nil, utils.ErrInternal("failed to create expense")
	}

	s.activitySvc.LogActivity(ctx, userID, domain.ActivityActionCreated, domain.ActivityEntityTypeExpense, expense.ID, nil)

	res := toExpenseResponse(expense)
	return &res, nil
}

func (s *expenseService) List(ctx context.Context, userID string, filter ExpenseListFilter) ([]response.ExpenseResponse, error) {
	expenses, err := s.repo.FindAllByUserID(ctx, userID, repository.ExpenseFilter(filter))
	if err != nil {
		return nil, utils.ErrInternal("failed to list expenses")
	}
	return toExpenseResponses(expenses), nil
}

func (s *expenseService) ListByBudget(ctx context.Context, userID, budgetID string) ([]response.ExpenseResponse, error) {
	budget, err := s.budgetRepo.FindByID(ctx, budgetID)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up budget")
	}
	if budget == nil || budget.UserID != userID {
		return nil, utils.ErrNotFound("budget not found")
	}

	expenses, err := s.repo.FindAllByBudgetID(ctx, budgetID)
	if err != nil {
		return nil, utils.ErrInternal("failed to list expenses")
	}
	return toExpenseResponses(expenses), nil
}

func (s *expenseService) ListPartnerExpenses(ctx context.Context, userID string, filter ExpenseListFilter) ([]response.ExpenseResponse, error) {
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

	expenses, err := s.repo.FindAllByUserID(ctx, partnerID, repository.ExpenseFilter(filter))
	if err != nil {
		return nil, utils.ErrInternal("failed to list partner expenses")
	}
	return toExpenseResponses(expenses), nil
}

func (s *expenseService) GetByID(ctx context.Context, userID, id string) (*response.ExpenseResponse, error) {
	expense, err := s.mustOwnExpense(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	res := toExpenseResponse(expense)
	return &res, nil
}

func (s *expenseService) Update(ctx context.Context, userID, id string, req request.UpdateExpenseRequest) (*response.ExpenseResponse, error) {
	expense, err := s.mustOwnExpense(ctx, userID, id)
	if err != nil {
		return nil, err
	}

	if req.CategoryID != "" {
		expense.CategoryID = req.CategoryID
	}
	if req.Amount != 0 {
		expense.Amount = req.Amount
	}
	if req.Note != "" {
		expense.Note = utils.StringPtr(req.Note)
	}
	if req.ExpenseDate != "" {
		date, err := utils.ParseDateOnly(req.ExpenseDate)
		if err != nil {
			return nil, utils.ErrBadRequest("invalid expense_date")
		}
		expense.ExpenseDate = date
	}

	if err := s.repo.Update(ctx, expense); err != nil {
		return nil, utils.ErrInternal("failed to update expense")
	}

	s.activitySvc.LogActivity(ctx, userID, domain.ActivityActionUpdated, domain.ActivityEntityTypeExpense, expense.ID, nil)

	res := toExpenseResponse(expense)
	return &res, nil
}

func (s *expenseService) Delete(ctx context.Context, userID, id string) error {
	expense, err := s.mustOwnExpense(ctx, userID, id)
	if err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return utils.ErrInternal("failed to delete expense")
	}

	s.activitySvc.LogActivity(ctx, userID, domain.ActivityActionDeleted, domain.ActivityEntityTypeExpense, expense.ID, nil)
	return nil
}

func (s *expenseService) mustOwnExpense(ctx context.Context, userID, id string) (*domain.Expense, error) {
	expense, err := s.repo.FindByID(ctx, id)
	return mustOwn(expense, err, userID, "expense not found")
}

func toExpenseResponse(expense *domain.Expense) response.ExpenseResponse {
	res := response.ExpenseResponse{
		ID:              expense.ID,
		CategoryID:      expense.CategoryID,
		MonthlyBudgetID: expense.MonthlyBudgetID,
		Amount:          expense.Amount,
		ExpenseDate:     expense.ExpenseDate,
		CreatedAt:       expense.CreatedAt,
	}
	if expense.Note != nil {
		res.Note = *expense.Note
	}
	return res
}

func toExpenseResponses(expenses []domain.Expense) []response.ExpenseResponse {
	out := make([]response.ExpenseResponse, 0, len(expenses))
	for i := range expenses {
		out = append(out, toExpenseResponse(&expenses[i]))
	}
	return out
}
