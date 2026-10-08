package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

type ExpenseFilter struct {
	CategoryID string
	From       string // YYYY-MM-DD
	To         string // YYYY-MM-DD
	Limit      int
	Offset     int
}

type ExpenseRepository interface {
	Create(ctx context.Context, expense *domain.Expense) error
	FindByID(ctx context.Context, id string) (*domain.Expense, error)
	FindAllByUserID(ctx context.Context, userID string, filter ExpenseFilter) ([]domain.Expense, error)
	FindAllByBudgetID(ctx context.Context, budgetID string) ([]domain.Expense, error)
	Update(ctx context.Context, expense *domain.Expense) error
	Delete(ctx context.Context, id string) error
	// ValidateOwnership checks category and budget ownership in a single
	// round trip instead of two separate FindByID calls — used by
	// ExpenseService.Create, which previously queried each one separately.
	ValidateOwnership(ctx context.Context, userID, categoryID, budgetID string) (categoryOwned, budgetOwned bool, err error)
}

// expense_date alone leaves same-day rows in whatever order the planner
// happens to produce, which then decides arbitrarily which ones a LIMIT
// keeps — the dashboard's "latest expenses" feed merges two people's lists
// and needs the newest-recorded to win a same-day tie deterministically.
const expenseListOrder = "expense_date DESC, created_at DESC"

type expenseRepository struct {
	db *gorm.DB
}

func NewExpenseRepository(db *gorm.DB) ExpenseRepository {
	return &expenseRepository{db: db}
}

func (r *expenseRepository) Create(ctx context.Context, expense *domain.Expense) error {
	return r.db.WithContext(ctx).Create(expense).Error
}

func (r *expenseRepository) FindByID(ctx context.Context, id string) (*domain.Expense, error) {
	var expense domain.Expense
	err := r.db.WithContext(ctx).First(&expense, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &expense, nil
}

func (r *expenseRepository) FindAllByUserID(ctx context.Context, userID string, filter ExpenseFilter) ([]domain.Expense, error) {
	query := r.db.WithContext(ctx).Where("user_id = ?", userID)
	if filter.CategoryID != "" {
		query = query.Where("category_id = ?", filter.CategoryID)
	}
	if filter.From != "" {
		query = query.Where("expense_date >= ?", filter.From)
	}
	if filter.To != "" {
		query = query.Where("expense_date <= ?", filter.To)
	}
	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	if filter.Offset > 0 {
		query = query.Offset(filter.Offset)
	}

	var expenses []domain.Expense
	err := query.Order(expenseListOrder).Find(&expenses).Error
	return expenses, err
}

func (r *expenseRepository) FindAllByBudgetID(ctx context.Context, budgetID string) ([]domain.Expense, error) {
	var expenses []domain.Expense
	err := r.db.WithContext(ctx).Where("monthly_budget_id = ?", budgetID).Order(expenseListOrder).Find(&expenses).Error
	return expenses, err
}

func (r *expenseRepository) Update(ctx context.Context, expense *domain.Expense) error {
	return r.db.WithContext(ctx).Save(expense).Error
}

func (r *expenseRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.Expense{}, "id = ?", id).Error
}

func (r *expenseRepository) ValidateOwnership(ctx context.Context, userID, categoryID, budgetID string) (categoryOwned, budgetOwned bool, err error) {
	var result struct {
		CategoryOwned bool `gorm:"column:category_owned"`
		BudgetOwned   bool `gorm:"column:budget_owned"`
	}
	err = r.db.WithContext(ctx).Raw(`
		SELECT
			EXISTS (SELECT 1 FROM categories WHERE id = ? AND user_id = ?) AS category_owned,
			EXISTS (SELECT 1 FROM monthly_budgets WHERE id = ? AND user_id = ?) AS budget_owned
	`, categoryID, userID, budgetID, userID).Scan(&result).Error
	return result.CategoryOwned, result.BudgetOwned, err
}
