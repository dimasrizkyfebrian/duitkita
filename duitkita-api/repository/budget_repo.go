package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

type BudgetRepository interface {
	Create(ctx context.Context, budget *domain.MonthlyBudget) error
	FindByID(ctx context.Context, id string) (*domain.MonthlyBudget, error)
	FindByUserCategoryPeriod(ctx context.Context, userID, categoryID string, year, month int) (*domain.MonthlyBudget, error)
	FindAllByUserID(ctx context.Context, userID string, year, month, limit, offset int) ([]domain.MonthlyBudget, error)
	Update(ctx context.Context, budget *domain.MonthlyBudget) error
	Delete(ctx context.Context, id string) error
	ExistsByCategoryID(ctx context.Context, categoryID string) (bool, error)
}

type budgetRepository struct {
	db *gorm.DB
}

func NewBudgetRepository(db *gorm.DB) BudgetRepository {
	return &budgetRepository{db: db}
}

func (r *budgetRepository) Create(ctx context.Context, budget *domain.MonthlyBudget) error {
	return r.db.WithContext(ctx).Create(budget).Error
}

func (r *budgetRepository) FindByID(ctx context.Context, id string) (*domain.MonthlyBudget, error) {
	var budget domain.MonthlyBudget
	err := r.db.WithContext(ctx).First(&budget, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &budget, nil
}

func (r *budgetRepository) FindByUserCategoryPeriod(ctx context.Context, userID, categoryID string, year, month int) (*domain.MonthlyBudget, error) {
	var budget domain.MonthlyBudget
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND category_id = ? AND year = ? AND month = ?", userID, categoryID, year, month).
		First(&budget).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &budget, nil
}

func (r *budgetRepository) FindAllByUserID(ctx context.Context, userID string, year, month, limit, offset int) ([]domain.MonthlyBudget, error) {
	query := r.db.WithContext(ctx).Where("user_id = ?", userID)
	if year > 0 {
		query = query.Where("year = ?", year)
	}
	if month > 0 {
		query = query.Where("month = ?", month)
	}
	if limit > 0 {
		query = query.Limit(limit)
	}
	if offset > 0 {
		query = query.Offset(offset)
	}

	var budgets []domain.MonthlyBudget
	err := query.Order("year DESC, month DESC").Find(&budgets).Error
	return budgets, err
}

func (r *budgetRepository) Update(ctx context.Context, budget *domain.MonthlyBudget) error {
	return r.db.WithContext(ctx).Save(budget).Error
}

func (r *budgetRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.MonthlyBudget{}, "id = ?", id).Error
}

func (r *budgetRepository) ExistsByCategoryID(ctx context.Context, categoryID string) (bool, error) {
	var exists bool
	err := r.db.WithContext(ctx).
		Raw(`SELECT EXISTS (SELECT 1 FROM monthly_budgets WHERE category_id = ?)`, categoryID).
		Scan(&exists).Error
	return exists, err
}
