package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"duitkita-api/model/domain"
)

// Field-for-field identical to service.IncomeListFilter, which is converted
// into this type directly — keep the two in the same order.
type IncomeFilter struct {
	AccountID string
	Source    string
	From      string // YYYY-MM-DD
	To        string // YYYY-MM-DD
	Limit     int
	Offset    int
}

type IncomeRepository interface {
	Create(ctx context.Context, income *domain.Income) error
	// FindByID preloads the account and its institution; nil when not found.
	FindByID(ctx context.Context, id string) (*domain.Income, error)
	FindAllByUserID(ctx context.Context, userID string, filter IncomeFilter) ([]domain.Income, error)
	// Total is the sum of amount (rupiah) over every row FindAllByUserID
	// would match without paging, 0 when none match. Limit and Offset are
	// ignored.
	Total(ctx context.Context, userID string, filter IncomeFilter) (int64, error)
	Update(ctx context.Context, income *domain.Income) error
	Delete(ctx context.Context, id string) error
}

// income_date alone leaves same-day rows in an arbitrary order, which then
// decides which ones a LIMIT/OFFSET page keeps.
const incomeListOrder = "income_date DESC, created_at DESC"

type incomeRepository struct {
	db *gorm.DB
}

func NewIncomeRepository(db *gorm.DB) IncomeRepository {
	return &incomeRepository{db: db}
}

// Create and Update omit associations: an income may carry a preloaded
// Account (with its Institution), which must never be written back through
// an income save.
func (r *incomeRepository) Create(ctx context.Context, income *domain.Income) error {
	return r.db.WithContext(ctx).Omit(clause.Associations).Create(income).Error
}

func (r *incomeRepository) FindByID(ctx context.Context, id string) (*domain.Income, error) {
	var income domain.Income
	err := r.db.WithContext(ctx).Preload("Account.Institution").First(&income, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &income, nil
}

func (r *incomeRepository) FindAllByUserID(ctx context.Context, userID string, filter IncomeFilter) ([]domain.Income, error) {
	query := r.filtered(ctx, userID, filter).Preload("Account.Institution")
	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		query = query.Offset(filter.Offset)
	}

	var incomes []domain.Income
	err := query.Order(incomeListOrder).Find(&incomes).Error
	return incomes, err
}

func (r *incomeRepository) Total(ctx context.Context, userID string, filter IncomeFilter) (int64, error) {
	var total int64
	err := r.filtered(ctx, userID, filter).Model(&domain.Income{}).
		Select("COALESCE(SUM(amount), 0)").Scan(&total).Error
	return total, err
}

// filtered applies the user and the filter's conditions — everything except
// preloads and paging — so the list and its total can never disagree on
// which rows match.
func (r *incomeRepository) filtered(ctx context.Context, userID string, filter IncomeFilter) *gorm.DB {
	query := r.db.WithContext(ctx).Where("user_id = ?", userID)
	if filter.AccountID != "" {
		query = query.Where("account_id = ?", filter.AccountID)
	}
	if filter.Source != "" {
		query = query.Where("source = ?", filter.Source)
	}
	if filter.From != "" {
		query = query.Where("income_date >= ?", filter.From)
	}
	if filter.To != "" {
		query = query.Where("income_date <= ?", filter.To)
	}
	return query
}

func (r *incomeRepository) Update(ctx context.Context, income *domain.Income) error {
	return r.db.WithContext(ctx).Omit(clause.Associations).Save(income).Error
}

func (r *incomeRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.Income{}, "id = ?", id).Error
}
