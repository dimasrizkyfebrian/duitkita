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
}

type ExpenseRepository interface {
	Create(ctx context.Context, expense *domain.Expense) error
	FindByID(ctx context.Context, id string) (*domain.Expense, error)
	FindAllByUserID(ctx context.Context, userID string, filter ExpenseFilter) ([]domain.Expense, error)
	FindAllByBudgetID(ctx context.Context, budgetID string) ([]domain.Expense, error)
	Update(ctx context.Context, expense *domain.Expense) error
	Delete(ctx context.Context, id string) error
}

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

	var expenses []domain.Expense
	err := query.Order("expense_date DESC").Find(&expenses).Error
	return expenses, err
}

func (r *expenseRepository) FindAllByBudgetID(ctx context.Context, budgetID string) ([]domain.Expense, error) {
	var expenses []domain.Expense
	err := r.db.WithContext(ctx).Where("monthly_budget_id = ?", budgetID).Order("expense_date DESC").Find(&expenses).Error
	return expenses, err
}

func (r *expenseRepository) Update(ctx context.Context, expense *domain.Expense) error {
	return r.db.WithContext(ctx).Save(expense).Error
}

func (r *expenseRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.Expense{}, "id = ?", id).Error
}
