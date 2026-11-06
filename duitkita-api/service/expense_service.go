package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/model/dto/response"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

type ExpenseListFilter struct {
	CategoryID string
	AccountID  string
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
	accountRepo repository.AccountRepository
	activitySvc ActivityService
	redis       *redis.Client
}

func NewExpenseService(repo repository.ExpenseRepository, budgetRepo repository.BudgetRepository, coupleRepo repository.CoupleRepository, accountRepo repository.AccountRepository, activitySvc ActivityService, redisClient *redis.Client) ExpenseService {
	return &expenseService{repo: repo, budgetRepo: budgetRepo, coupleRepo: coupleRepo, accountRepo: accountRepo, activitySvc: activitySvc, redis: redisClient}
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

	var account *domain.Account
	if req.AccountID != "" {
		account, err = requireTaggableAccount(ctx, s.accountRepo, userID, req.AccountID)
		if err != nil {
			return nil, err
		}
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
		AccountID:       utils.StringPtr(req.AccountID),
		Amount:          req.Amount,
		Note:            utils.StringPtr(req.Note),
		ExpenseDate:     expenseDate,
	}
	if err := s.repo.Create(ctx, expense); err != nil {
		return nil, utils.ErrInternal("failed to create expense")
	}
	invalidateReportCache(ctx, s.redis, userID)

	s.activitySvc.LogActivity(ctx, userID, domain.ActivityActionCreated, domain.ActivityEntityTypeExpense, expense.ID, nil)

	expense.Account = account
	res := toExpenseResponse(expense, true)
	return &res, nil
}

func (s *expenseService) List(ctx context.Context, userID string, filter ExpenseListFilter) ([]response.ExpenseResponse, error) {
	// account_id is compared against a uuid column; a malformed one would
	// surface as a Postgres cast error (500) instead of a bad request.
	if filter.AccountID != "" {
		if _, err := uuid.Parse(filter.AccountID); err != nil {
			return nil, utils.ErrBadRequest("invalid account_id")
		}
	}
	expenses, err := s.repo.FindAllByUserID(ctx, userID, toRepoExpenseFilter(filter, true))
	if err != nil {
		return nil, utils.ErrInternal("failed to list expenses")
	}
	return toExpenseResponses(expenses, true), nil
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
	return toExpenseResponses(expenses, true), nil
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

	expenses, err := s.repo.FindAllByUserID(ctx, partnerID, toRepoExpenseFilter(filter, false))
	if err != nil {
		return nil, utils.ErrInternal("failed to list partner expenses")
	}
	// Accounts are private: never part of what a partner gets to see.
	return toExpenseResponses(expenses, false), nil
}

func (s *expenseService) GetByID(ctx context.Context, userID, id string) (*response.ExpenseResponse, error) {
	expense, err := s.mustOwnExpense(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	s.attachAccount(ctx, expense)
	res := toExpenseResponse(expense, true)
	return &res, nil
}

func (s *expenseService) Update(ctx context.Context, userID, id string, req request.UpdateExpenseRequest) (*response.ExpenseResponse, error) {
	expense, err := s.mustOwnExpense(ctx, userID, id)
	if err != nil {
		return nil, err
	}

	accountID, account, err := resolveAccountChange(ctx, s.accountRepo, userID, expense.AccountID, req.AccountID)
	if err != nil {
		return nil, err
	}

	// Category and date are resolved together before anything is written,
	// because the budget this expense belongs to is derived from both.
	categoryID := expense.CategoryID
	if req.CategoryID != "" {
		categoryID = req.CategoryID
	}

	expenseDate := expense.ExpenseDate
	if req.ExpenseDate != "" {
		date, err := utils.ParseDateOnly(req.ExpenseDate)
		if err != nil {
			return nil, utils.ErrBadRequest("invalid expense_date")
		}
		expenseDate = date
	}

	// Moving to another category, or into another month, puts the expense
	// under a different monthly budget. Without re-pointing it the spend
	// stays attached to a budget it no longer counts against — visible via
	// GET /expenses/by-budget/:budgetId, which reads that link directly.
	categoryChanged := categoryID != expense.CategoryID
	periodChanged := expenseDate.Year() != expense.ExpenseDate.Year() ||
		expenseDate.Month() != expense.ExpenseDate.Month()

	if categoryChanged || periodChanged {
		if categoryChanged {
			categoryOwned, _, err := s.repo.ValidateOwnership(ctx, userID, categoryID, expense.MonthlyBudgetID)
			if err != nil {
				return nil, utils.ErrInternal("failed to validate ownership")
			}
			if !categoryOwned {
				return nil, utils.ErrNotFound("category not found")
			}
		}

		budget, err := s.budgetRepo.FindByUserCategoryPeriod(ctx, userID, categoryID, expenseDate.Year(), int(expenseDate.Month()))
		if err != nil {
			return nil, utils.ErrInternal("failed to look up budget")
		}
		if budget == nil {
			return nil, utils.ErrNotFound("budget not set for that category and period")
		}
		expense.MonthlyBudgetID = budget.ID
	}

	expense.CategoryID = categoryID
	expense.ExpenseDate = expenseDate
	expense.AccountID = accountID
	if req.Amount != 0 {
		expense.Amount = req.Amount
	}
	if req.Note != nil {
		expense.Note = utils.StringPtr(*req.Note)
	}

	if err := s.repo.Update(ctx, expense); err != nil {
		return nil, utils.ErrInternal("failed to update expense")
	}
	invalidateReportCache(ctx, s.redis, userID)

	s.activitySvc.LogActivity(ctx, userID, domain.ActivityActionUpdated, domain.ActivityEntityTypeExpense, expense.ID, nil)

	if account != nil {
		expense.Account = account
	} else {
		s.attachAccount(ctx, expense)
	}
	res := toExpenseResponse(expense, true)
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
	invalidateReportCache(ctx, s.redis, userID)

	s.activitySvc.LogActivity(ctx, userID, domain.ActivityActionDeleted, domain.ActivityEntityTypeExpense, expense.ID, nil)
	return nil
}

func (s *expenseService) mustOwnExpense(ctx context.Context, userID, id string) (*domain.Expense, error) {
	expense, err := s.repo.FindByID(ctx, id)
	return mustOwn(expense, err, userID, "expense not found")
}

// attachAccount loads the expense's account, for the summary in a
// single-expense response. Best-effort: the expense itself is already
// saved or found, so a failed lookup only means the summary is missing.
func (s *expenseService) attachAccount(ctx context.Context, expense *domain.Expense) {
	if expense.AccountID == nil || expense.Account != nil {
		return
	}
	account, err := s.accountRepo.FindByID(ctx, *expense.AccountID)
	if err == nil && account != nil {
		expense.Account = account
	}
}

// withAccount is false for anything shown to a partner — accounts are
// private to their owner, so both fields are left out rather than just
// blanked.
func toExpenseResponse(expense *domain.Expense, withAccount bool) response.ExpenseResponse {
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
	if withAccount {
		res.AccountID = expense.AccountID
		res.Account = toAccountSummary(expense.Account)
	}
	return res
}

func toExpenseResponses(expenses []domain.Expense, withAccount bool) []response.ExpenseResponse {
	out := make([]response.ExpenseResponse, 0, len(expenses))
	for i := range expenses {
		out = append(out, toExpenseResponse(&expenses[i], withAccount))
	}
	return out
}

func toRepoExpenseFilter(f ExpenseListFilter, withAccount bool) repository.ExpenseFilter {
	return repository.ExpenseFilter{
		CategoryID:  f.CategoryID,
		AccountID:   f.AccountID,
		From:        f.From,
		To:          f.To,
		Limit:       f.Limit,
		Offset:      f.Offset,
		WithAccount: withAccount,
	}
}
