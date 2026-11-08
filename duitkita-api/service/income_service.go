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

type IncomeListFilter struct {
	AccountID string
	Source    string
	From      string
	To        string
	Limit     int
	Offset    int
}

type IncomeService interface {
	Create(ctx context.Context, userID string, req request.CreateIncomeRequest) (*response.IncomeResponse, error)
	List(ctx context.Context, userID string, filter IncomeListFilter) (*response.IncomeListResponse, error)
	GetByID(ctx context.Context, userID, id string) (*response.IncomeResponse, error)
	Update(ctx context.Context, userID, id string, req request.UpdateIncomeRequest) (*response.IncomeResponse, error)
	Delete(ctx context.Context, userID, id string) error
}

// Deliberately has no ActivityService and no Redis client: incomes are
// private to their owner, so they stay out of the activity feed the partner
// sees, and they don't feed the cached spending reports.
type incomeService struct {
	repo        repository.IncomeRepository
	accountRepo repository.AccountRepository
}

func NewIncomeService(repo repository.IncomeRepository, accountRepo repository.AccountRepository) IncomeService {
	return &incomeService{repo: repo, accountRepo: accountRepo}
}

func (s *incomeService) Create(ctx context.Context, userID string, req request.CreateIncomeRequest) (*response.IncomeResponse, error) {
	source := domain.IncomeSource(req.Source)
	if !source.Valid() {
		return nil, utils.ErrBadRequest("invalid source")
	}
	if req.Amount < 1 {
		return nil, utils.ErrBadRequest("amount must be positive")
	}
	incomeDate, err := utils.ParseDateOnly(req.IncomeDate)
	if err != nil {
		return nil, utils.ErrBadRequest("invalid income_date")
	}

	var account *domain.Account
	if req.AccountID != "" {
		account, err = requireTaggableAccount(ctx, s.accountRepo, userID, req.AccountID)
		if err != nil {
			return nil, err
		}
	}

	income := &domain.Income{
		ID:         uuid.NewString(),
		UserID:     userID,
		AccountID:  utils.StringPtr(req.AccountID),
		Source:     source,
		Amount:     req.Amount,
		Note:       utils.StringPtr(req.Note),
		IncomeDate: incomeDate,
	}
	if err := s.repo.Create(ctx, income); err != nil {
		return nil, utils.ErrInternal("failed to create income")
	}

	income.Account = account
	res := toIncomeResponse(income)
	return &res, nil
}

func (s *incomeService) List(ctx context.Context, userID string, filter IncomeListFilter) (*response.IncomeListResponse, error) {
	// account_id is compared against a uuid column; a malformed one would
	// surface as a Postgres cast error (500) instead of a bad request.
	if filter.AccountID != "" {
		if _, err := uuid.Parse(filter.AccountID); err != nil {
			return nil, utils.ErrBadRequest("invalid account_id")
		}
	}
	if filter.Source != "" && !domain.IncomeSource(filter.Source).Valid() {
		return nil, utils.ErrBadRequest("invalid source")
	}
	// from/to are compared against a date column; a malformed one would
	// surface as a Postgres error (500) instead of a bad request.
	if filter.From != "" {
		if _, err := utils.ParseDateOnly(filter.From); err != nil {
			return nil, utils.ErrBadRequest("invalid from")
		}
	}
	if filter.To != "" {
		if _, err := utils.ParseDateOnly(filter.To); err != nil {
			return nil, utils.ErrBadRequest("invalid to")
		}
	}

	repoFilter := repository.IncomeFilter(filter)
	incomes, err := s.repo.FindAllByUserID(ctx, userID, repoFilter)
	if err != nil {
		return nil, utils.ErrInternal("failed to list incomes")
	}
	total, err := s.repo.Total(ctx, userID, repoFilter)
	if err != nil {
		return nil, utils.ErrInternal("failed to total incomes")
	}

	items := make([]response.IncomeResponse, 0, len(incomes))
	for i := range incomes {
		items = append(items, toIncomeResponse(&incomes[i]))
	}
	return &response.IncomeListResponse{Items: items, Total: total}, nil
}

func (s *incomeService) GetByID(ctx context.Context, userID, id string) (*response.IncomeResponse, error) {
	income, err := s.mustOwnIncome(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	res := toIncomeResponse(income)
	return &res, nil
}

func (s *incomeService) Update(ctx context.Context, userID, id string, req request.UpdateIncomeRequest) (*response.IncomeResponse, error) {
	income, err := s.mustOwnIncome(ctx, userID, id)
	if err != nil {
		return nil, err
	}

	source := income.Source
	if req.Source != "" {
		source = domain.IncomeSource(req.Source)
		if !source.Valid() {
			return nil, utils.ErrBadRequest("invalid source")
		}
	}

	// 0 means "not provided"; anything below is an invalid amount, same
	// invariant as Create.
	if req.Amount < 0 {
		return nil, utils.ErrBadRequest("amount must be positive")
	}

	incomeDate := income.IncomeDate
	if req.IncomeDate != "" {
		incomeDate, err = utils.ParseDateOnly(req.IncomeDate)
		if err != nil {
			return nil, utils.ErrBadRequest("invalid income_date")
		}
	}

	accountID, account, err := resolveAccountChange(ctx, s.accountRepo, userID, income.AccountID, req.AccountID)
	if err != nil {
		return nil, err
	}

	income.Source = source
	income.IncomeDate = incomeDate
	income.AccountID = accountID
	if req.Amount != 0 {
		income.Amount = req.Amount
	}
	if req.Note != nil {
		income.Note = utils.StringPtr(*req.Note)
	}

	if err := s.repo.Update(ctx, income); err != nil {
		return nil, utils.ErrInternal("failed to update income")
	}

	// The account shown must match the account saved: none when it was
	// removed, the looked-up one when it was moved, and otherwise the one the
	// repo preloaded.
	if accountID == nil {
		income.Account = nil
	} else if account != nil {
		income.Account = account
	}
	res := toIncomeResponse(income)
	return &res, nil
}

func (s *incomeService) Delete(ctx context.Context, userID, id string) error {
	if _, err := s.mustOwnIncome(ctx, userID, id); err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return utils.ErrInternal("failed to delete income")
	}
	return nil
}

func (s *incomeService) mustOwnIncome(ctx context.Context, userID, id string) (*domain.Income, error) {
	income, err := s.repo.FindByID(ctx, id)
	return mustOwn(income, err, userID, "income not found")
}

func toIncomeResponse(income *domain.Income) response.IncomeResponse {
	res := response.IncomeResponse{
		ID:         income.ID,
		Source:     string(income.Source),
		Amount:     income.Amount,
		IncomeDate: income.IncomeDate.Format("2006-01-02"),
		AccountID:  income.AccountID,
		Account:    toAccountSummary(income.Account),
		CreatedAt:  income.CreatedAt,
	}
	if income.Note != nil {
		res.Note = *income.Note
	}
	return res
}
