package service

import (
	"context"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/model/dto/response"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

type AccountService interface {
	ListInstitutions(ctx context.Context) ([]response.InstitutionResponse, error)
	List(ctx context.Context, userID string, includeArchived bool) (*response.AccountListResponse, error)
	Create(ctx context.Context, userID string, req request.CreateAccountRequest) (*response.AccountResponse, error)
	GetByID(ctx context.Context, userID, id string) (*response.AccountResponse, error)
	Update(ctx context.Context, userID, id string, req request.UpdateAccountRequest) (*response.AccountResponse, error)
	Archive(ctx context.Context, userID, id string) (*response.AccountResponse, error)
	Unarchive(ctx context.Context, userID, id string) (*response.AccountResponse, error)
	AdjustBalance(ctx context.Context, userID, id string, req request.AdjustBalanceRequest) (*response.BalanceAdjustmentResponse, error)
	ListAdjustments(ctx context.Context, userID, id string) ([]response.BalanceAdjustmentResponse, error)
}

type accountService struct {
	repo            repository.AccountRepository
	institutionRepo repository.InstitutionRepository
	redis           *redis.Client
}

func NewAccountService(repo repository.AccountRepository, institutionRepo repository.InstitutionRepository, redisClient *redis.Client) AccountService {
	return &accountService{repo: repo, institutionRepo: institutionRepo, redis: redisClient}
}

func (s *accountService) ListInstitutions(ctx context.Context) ([]response.InstitutionResponse, error) {
	institutions, err := s.institutionRepo.FindAllActive(ctx)
	if err != nil {
		return nil, utils.ErrInternal("failed to list institutions")
	}
	out := make([]response.InstitutionResponse, 0, len(institutions))
	for i := range institutions {
		out = append(out, toInstitutionResponse(&institutions[i]))
	}
	return out, nil
}

func (s *accountService) List(ctx context.Context, userID string, includeArchived bool) (*response.AccountListResponse, error) {
	accounts, err := s.repo.FindAllByUserID(ctx, userID, includeArchived)
	if err != nil {
		return nil, utils.ErrInternal("failed to list accounts")
	}

	res := &response.AccountListResponse{Accounts: make([]response.AccountResponse, 0, len(accounts))}
	if len(accounts) == 0 {
		return res, nil
	}

	ids := make([]string, 0, len(accounts))
	for i := range accounts {
		ids = append(ids, accounts[i].ID)
	}
	balances, err := s.repo.Balances(ctx, ids)
	if err != nil {
		return nil, utils.ErrInternal("failed to compute balances")
	}

	for i := range accounts {
		acc := &accounts[i]
		var balance *int64
		if b, ok := balances[acc.ID]; ok {
			balance = &b
			if !acc.IsArchived() {
				res.TotalBalance += b
			}
		}
		res.Accounts = append(res.Accounts, toAccountResponse(acc, balance))
	}
	sortAccountsByBalance(res.Accounts)
	return res, nil
}

// sortAccountsByBalance puts the biggest balance first, then accounts with
// no balance, with archived accounts last whatever their balance. Stable,
// so ties keep the repo's creation order.
func sortAccountsByBalance(accounts []response.AccountResponse) {
	sort.SliceStable(accounts, func(i, j int) bool {
		a, b := accounts[i], accounts[j]
		if a.Archived != b.Archived {
			return !a.Archived
		}
		if (a.Balance == nil) != (b.Balance == nil) {
			return a.Balance != nil
		}
		if a.Balance == nil {
			return false
		}
		return *a.Balance > *b.Balance
	})
}

func (s *accountService) Create(ctx context.Context, userID string, req request.CreateAccountRequest) (*response.AccountResponse, error) {
	name := strings.TrimSpace(req.Name)
	if name == "" {
		return nil, utils.ErrBadRequest("name is required")
	}
	openingBalance, openingDate, err := resolveOpeningBalance(req.OpeningBalance, req.OpeningBalanceDate)
	if err != nil {
		return nil, err
	}

	institution, err := s.institutionRepo.FindByID(ctx, req.InstitutionID)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up institution")
	}
	if institution == nil || !institution.IsActive {
		return nil, utils.ErrNotFound("institution not found")
	}

	account := &domain.Account{
		ID:                 uuid.NewString(),
		UserID:             userID,
		InstitutionID:      institution.ID,
		Name:               name,
		OpeningBalance:     openingBalance,
		OpeningBalanceDate: openingDate,
	}
	if err := s.repo.Create(ctx, account); err != nil {
		return nil, utils.ErrInternal("failed to create account")
	}
	account.Institution = *institution

	// Nothing can be tagged with an account that didn't exist a moment ago,
	// so its balance is exactly its opening balance — no query needed.
	res := toAccountResponse(account, account.OpeningBalance)
	return &res, nil
}

func (s *accountService) GetByID(ctx context.Context, userID, id string) (*response.AccountResponse, error) {
	account, err := s.mustOwnAccount(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	return s.respondWithBalance(ctx, account)
}

func (s *accountService) Update(ctx context.Context, userID, id string, req request.UpdateAccountRequest) (*response.AccountResponse, error) {
	account, err := s.mustOwnAccount(ctx, userID, id)
	if err != nil {
		return nil, err
	}

	if req.OpeningBalance != nil || req.OpeningBalanceDate != "" {
		if account.HasOpeningBalance() {
			return nil, utils.ErrConflict("opening balance already set, use balance adjustment instead")
		}
		openingBalance, openingDate, err := resolveOpeningBalance(req.OpeningBalance, req.OpeningBalanceDate)
		if err != nil {
			return nil, err
		}
		account.OpeningBalance = openingBalance
		account.OpeningBalanceDate = openingDate
	}

	if req.Name != "" {
		name := strings.TrimSpace(req.Name)
		if name == "" {
			return nil, utils.ErrBadRequest("name is required")
		}
		account.Name = name
	}

	if err := s.repo.Update(ctx, account); err != nil {
		return nil, utils.ErrInternal("failed to update account")
	}
	// Per-account reports show the account's name.
	invalidateReportCache(ctx, s.redis, userID)

	return s.respondWithBalance(ctx, account)
}

func (s *accountService) Archive(ctx context.Context, userID, id string) (*response.AccountResponse, error) {
	return s.setArchived(ctx, userID, id, true)
}

func (s *accountService) Unarchive(ctx context.Context, userID, id string) (*response.AccountResponse, error) {
	return s.setArchived(ctx, userID, id, false)
}

func (s *accountService) setArchived(ctx context.Context, userID, id string, archived bool) (*response.AccountResponse, error) {
	account, err := s.mustOwnAccount(ctx, userID, id)
	if err != nil {
		return nil, err
	}

	// Idempotent: archiving an archived account keeps its original date.
	if archived != account.IsArchived() {
		if archived {
			now := time.Now()
			account.ArchivedAt = &now
		} else {
			account.ArchivedAt = nil
		}
		if err := s.repo.Update(ctx, account); err != nil {
			return nil, utils.ErrInternal("failed to update account")
		}
		invalidateReportCache(ctx, s.redis, userID)
	}

	return s.respondWithBalance(ctx, account)
}

func (s *accountService) AdjustBalance(ctx context.Context, userID, id string, req request.AdjustBalanceRequest) (*response.BalanceAdjustmentResponse, error) {
	account, err := s.mustOwnAccount(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	if !account.HasOpeningBalance() {
		return nil, utils.ErrBadRequest("account has no opening balance")
	}
	if account.IsArchived() {
		return nil, utils.ErrBadRequest("account is archived")
	}

	adjustment, err := s.repo.AdjustBalance(ctx, account.ID, *req.NewBalance, utils.StringPtr(strings.TrimSpace(req.Note)))
	if err != nil {
		return nil, utils.ErrInternal("failed to adjust balance")
	}
	invalidateReportCache(ctx, s.redis, userID)

	res := toBalanceAdjustmentResponse(adjustment)
	return &res, nil
}

func (s *accountService) ListAdjustments(ctx context.Context, userID, id string) ([]response.BalanceAdjustmentResponse, error) {
	if _, err := s.mustOwnAccount(ctx, userID, id); err != nil {
		return nil, err
	}
	adjustments, err := s.repo.FindAdjustments(ctx, id)
	if err != nil {
		return nil, utils.ErrInternal("failed to list balance adjustments")
	}
	out := make([]response.BalanceAdjustmentResponse, 0, len(adjustments))
	for i := range adjustments {
		out = append(out, toBalanceAdjustmentResponse(&adjustments[i]))
	}
	return out, nil
}

func (s *accountService) mustOwnAccount(ctx context.Context, userID, id string) (*domain.Account, error) {
	account, err := s.repo.FindByID(ctx, id)
	return mustOwn(account, err, userID, "account not found")
}

// respondWithBalance only queries for a balance when there can be one.
func (s *accountService) respondWithBalance(ctx context.Context, account *domain.Account) (*response.AccountResponse, error) {
	var balance *int64
	if account.HasOpeningBalance() {
		balances, err := s.repo.Balances(ctx, []string{account.ID})
		if err != nil {
			return nil, utils.ErrInternal("failed to compute balance")
		}
		if b, ok := balances[account.ID]; ok {
			balance = &b
		}
	}
	res := toAccountResponse(account, balance)
	return &res, nil
}

// resolveOpeningBalance applies the "both or neither" rule: a balance
// without a date gets today, a date without a balance is rejected.
func resolveOpeningBalance(amount *int64, date string) (*int64, *time.Time, error) {
	if amount == nil {
		if date != "" {
			return nil, nil, utils.ErrBadRequest("opening_balance_date requires opening_balance")
		}
		return nil, nil, nil
	}
	if date == "" {
		today := time.Now().UTC().Truncate(24 * time.Hour)
		return amount, &today, nil
	}
	parsed, err := utils.ParseDateOnly(date)
	if err != nil {
		return nil, nil, utils.ErrBadRequest("invalid opening_balance_date")
	}
	return amount, &parsed, nil
}

// requireTaggableAccount is the check every place that tags something with
// an account goes through (creating an expense or recurring expense, or
// moving one to a different account): the account must belong to the user
// and not be archived.
func requireTaggableAccount(ctx context.Context, repo repository.AccountRepository, userID, accountID string) (*domain.Account, error) {
	if _, err := uuid.Parse(accountID); err != nil {
		return nil, utils.ErrBadRequest("invalid account_id")
	}
	account, err := repo.FindByID(ctx, accountID)
	account, err = mustOwn(account, err, userID, "account not found")
	if err != nil {
		return nil, err
	}
	if account.IsArchived() {
		return nil, utils.ErrBadRequest("account is archived")
	}
	return account, nil
}

// resolveAccountChange applies the three-way account_id of an update
// request: nil keeps the current account, "" removes it, and anything else
// moves to that account — which then has to pass requireTaggableAccount.
// Re-sending the current account is "keep", not "move": an expense must stay
// editable after its account is archived, without the edit being rejected
// for pointing at that archived account. The returned *domain.Account is set
// only when it had to be looked up.
func resolveAccountChange(ctx context.Context, repo repository.AccountRepository, userID string, current, requested *string) (*string, *domain.Account, error) {
	if requested == nil {
		return current, nil, nil
	}
	if *requested == "" {
		return nil, nil, nil
	}
	if current != nil && *current == *requested {
		return current, nil, nil
	}
	account, err := requireTaggableAccount(ctx, repo, userID, *requested)
	if err != nil {
		return nil, nil, err
	}
	return &account.ID, account, nil
}

func toInstitutionResponse(institution *domain.FinancialInstitution) response.InstitutionResponse {
	return response.InstitutionResponse{
		ID:       institution.ID,
		Code:     institution.Code,
		Name:     institution.Name,
		Type:     string(institution.Type),
		LogoPath: institution.LogoPath,
	}
}

func toAccountResponse(account *domain.Account, balance *int64) response.AccountResponse {
	res := response.AccountResponse{
		ID:             account.ID,
		Name:           account.Name,
		Institution:    toInstitutionResponse(&account.Institution),
		OpeningBalance: account.OpeningBalance,
		Balance:        balance,
		Archived:       account.IsArchived(),
		ArchivedAt:     account.ArchivedAt,
		CreatedAt:      account.CreatedAt,
	}
	if account.OpeningBalanceDate != nil {
		date := account.OpeningBalanceDate.Format("2006-01-02")
		res.OpeningBalanceDate = &date
	}
	return res
}

func toAccountSummary(account *domain.Account) *response.AccountSummary {
	if account == nil {
		return nil
	}
	return &response.AccountSummary{
		ID:          account.ID,
		Name:        account.Name,
		Archived:    account.IsArchived(),
		Institution: toInstitutionResponse(&account.Institution),
	}
}

func toBalanceAdjustmentResponse(adjustment *domain.AccountBalanceAdjustment) response.BalanceAdjustmentResponse {
	res := response.BalanceAdjustmentResponse{
		ID:              adjustment.ID,
		AccountID:       adjustment.AccountID,
		PreviousBalance: adjustment.PreviousBalance,
		NewBalance:      adjustment.NewBalance,
		Delta:           adjustment.Delta,
		CreatedAt:       adjustment.CreatedAt,
	}
	if adjustment.Note != nil {
		res.Note = *adjustment.Note
	}
	return res
}
