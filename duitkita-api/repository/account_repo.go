package repository

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"duitkita-api/model/domain"
)

type AccountRepository interface {
	Create(ctx context.Context, account *domain.Account) error
	// FindByID preloads Institution — every caller ends up rendering it.
	FindByID(ctx context.Context, id string) (*domain.Account, error)
	FindAllByUserID(ctx context.Context, userID string, includeArchived bool) ([]domain.Account, error)
	Update(ctx context.Context, account *domain.Account) error
	// Balances computes the current balance of each given account that has
	// an opening balance; accounts without one are simply absent from the
	// map. See balanceSQL for the formula.
	Balances(ctx context.Context, accountIDs []string) (map[string]int64, error)
	// AdjustBalance records a "Sesuaikan saldo" to newBalance. The balance
	// it diffs against is computed inside the same transaction, with the
	// account row locked, so two adjustments racing each other can't both
	// diff against the same stale balance.
	AdjustBalance(ctx context.Context, accountID string, newBalance int64, note *string) (*domain.AccountBalanceAdjustment, error)
	FindAdjustments(ctx context.Context, accountID string) ([]domain.AccountBalanceAdjustment, error)
	// ListTransactions is the account's mutasi: expenses, incomes and
	// adjustments in one list, at most limit rows, newest first (date, then
	// created_at, then id, all descending). after is the last row of the
	// previous page, nil for the first. Amounts are already signed.
	ListTransactions(ctx context.Context, accountID string, limit int, after *TransactionCursor) ([]AccountTransactionRow, error)
}

// AccountTransactionRow is one line of an account's mutasi. Kind is
// "expense", "income" or "adjustment"; Amount is the effect on the account's
// balance (expense negative, income positive, adjustment its delta); Label is
// the category name, the income source code, or empty for an adjustment.
type AccountTransactionRow struct {
	ID        string    `gorm:"column:id"`
	Kind      string    `gorm:"column:kind"`
	Date      time.Time `gorm:"column:tx_date"`
	CreatedAt time.Time `gorm:"column:created_at"`
	Amount    int64     `gorm:"column:amount"`
	Label     string    `gorm:"column:label"`
	Note      *string   `gorm:"column:note"`
}

// TransactionCursor is the sort key of a row: the three columns the list is
// ordered by, which together are unique.
type TransactionCursor struct {
	Date      time.Time
	CreatedAt time.Time
	ID        string
}

// transactionsSQL unions the three sources into one shape. The id is cast to
// text so the three uuid columns share a type and the cursor can compare it;
// an adjustment has no date of its own, so it is dated by its created_at in
// Jakarta time, the zone the user lives in.
const transactionsSQL = `
	SELECT id, kind, tx_date, created_at, amount, label, note FROM (
		SELECT e.id::text AS id, 'expense'::text AS kind, e.expense_date AS tx_date, e.created_at AS created_at,
			-e.amount AS amount, c.name::text AS label, e.note AS note
		FROM expenses e
		JOIN categories c ON c.id = e.category_id
		WHERE e.account_id = ?
		UNION ALL
		SELECT i.id::text, 'income'::text, i.income_date, i.created_at,
			i.amount, i.source::text, i.note
		FROM incomes i
		WHERE i.account_id = ?
		UNION ALL
		SELECT adj.id::text, 'adjustment'::text, (adj.created_at AT TIME ZONE 'Asia/Jakarta')::date, adj.created_at,
			adj.delta, ''::text, adj.note
		FROM account_balance_adjustments adj
		WHERE adj.account_id = ?
	) t
`

// balanceSQL is the one definition of an account's balance: the opening
// balance, plus every adjustment, plus every income, minus every expense,
// the incomes and expenses being those dated on or after the opening balance
// date. Earlier ones can still be tagged with the account (expenses show up
// in per-account reports), but the opening balance already reflects them, so
// they must not be applied again.
//
// Nothing is stored, so editing, deleting, or backdating an income or expense
// — or the recurring-expense job creating one — is reflected automatically.
const balanceSQL = `
	SELECT
		a.id AS account_id,
		a.opening_balance
			+ COALESCE((SELECT SUM(adj.delta) FROM account_balance_adjustments adj WHERE adj.account_id = a.id), 0)
			+ COALESCE((SELECT SUM(i.amount) FROM incomes i WHERE i.account_id = a.id AND i.income_date >= a.opening_balance_date), 0)
			- COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.account_id = a.id AND e.expense_date >= a.opening_balance_date), 0)
			AS balance
	FROM accounts a
	WHERE a.id IN ? AND a.opening_balance IS NOT NULL
`

type accountBalanceRow struct {
	AccountID string `gorm:"column:account_id"`
	Balance   int64  `gorm:"column:balance"`
}

type accountRepository struct {
	db *gorm.DB
}

func NewAccountRepository(db *gorm.DB) AccountRepository {
	return &accountRepository{db: db}
}

func (r *accountRepository) Create(ctx context.Context, account *domain.Account) error {
	return r.db.WithContext(ctx).Omit(clause.Associations).Create(account).Error
}

func (r *accountRepository) FindByID(ctx context.Context, id string) (*domain.Account, error) {
	var account domain.Account
	err := r.db.WithContext(ctx).Preload("Institution").First(&account, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &account, nil
}

// FindAllByUserID lists active accounts before archived ones, each group in
// the order they were created. The service re-sorts by balance; this order
// is what breaks ties there.
func (r *accountRepository) FindAllByUserID(ctx context.Context, userID string, includeArchived bool) ([]domain.Account, error) {
	query := r.db.WithContext(ctx).Preload("Institution").Where("user_id = ?", userID)
	if !includeArchived {
		query = query.Where("archived_at IS NULL")
	}
	var accounts []domain.Account
	err := query.Order("archived_at IS NOT NULL, created_at ASC").Find(&accounts).Error
	return accounts, err
}

// Update omits associations: the preloaded Institution must never be
// written back through an account save.
func (r *accountRepository) Update(ctx context.Context, account *domain.Account) error {
	return r.db.WithContext(ctx).Omit(clause.Associations).Save(account).Error
}

func (r *accountRepository) Balances(ctx context.Context, accountIDs []string) (map[string]int64, error) {
	return balances(ctx, r.db, accountIDs)
}

func balances(ctx context.Context, db *gorm.DB, accountIDs []string) (map[string]int64, error) {
	out := make(map[string]int64, len(accountIDs))
	if len(accountIDs) == 0 {
		return out, nil
	}
	var rows []accountBalanceRow
	if err := db.WithContext(ctx).Raw(balanceSQL, accountIDs).Scan(&rows).Error; err != nil {
		return nil, err
	}
	for _, row := range rows {
		out[row.AccountID] = row.Balance
	}
	return out, nil
}

func (r *accountRepository) AdjustBalance(ctx context.Context, accountID string, newBalance int64, note *string) (*domain.AccountBalanceAdjustment, error) {
	var adjustment *domain.AccountBalanceAdjustment
	err := r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var locked domain.Account
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&locked, "id = ?", accountID).Error; err != nil {
			return err
		}
		current, err := balances(ctx, tx, []string{accountID})
		if err != nil {
			return err
		}
		previous, ok := current[accountID]
		if !ok {
			return errors.New("account has no opening balance")
		}
		adjustment = &domain.AccountBalanceAdjustment{
			ID:              uuid.NewString(),
			AccountID:       accountID,
			PreviousBalance: previous,
			NewBalance:      newBalance,
			Delta:           newBalance - previous,
			Note:            note,
		}
		return tx.Omit(clause.Associations).Create(adjustment).Error
	})
	if err != nil {
		return nil, err
	}
	return adjustment, nil
}

func (r *accountRepository) FindAdjustments(ctx context.Context, accountID string) ([]domain.AccountBalanceAdjustment, error) {
	var adjustments []domain.AccountBalanceAdjustment
	err := r.db.WithContext(ctx).
		Where("account_id = ?", accountID).
		Order("created_at DESC").
		Find(&adjustments).Error
	return adjustments, err
}

func (r *accountRepository) ListTransactions(ctx context.Context, accountID string, limit int, after *TransactionCursor) ([]AccountTransactionRow, error) {
	query := transactionsSQL
	args := []any{accountID, accountID, accountID}
	if after != nil {
		// A row comparison, not three ANDed ones: it is "strictly after this
		// row in (date, created_at, id) order" in one expression.
		query += ` WHERE (tx_date, created_at, id) < (?::date, ?::timestamptz, ?::text)`
		args = append(args, after.Date.Format("2006-01-02"), after.CreatedAt, after.ID)
	}
	query += ` ORDER BY tx_date DESC, created_at DESC, id DESC LIMIT ?`
	args = append(args, limit)

	rows := []AccountTransactionRow{}
	if err := r.db.WithContext(ctx).Raw(query, args...).Scan(&rows).Error; err != nil {
		return nil, err
	}
	return rows, nil
}
