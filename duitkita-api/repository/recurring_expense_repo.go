package repository

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

type RecurringExpenseRepository interface {
	Create(ctx context.Context, re *domain.RecurringExpense) error
	FindByID(ctx context.Context, id string) (*domain.RecurringExpense, error)
	FindAllByUserID(ctx context.Context, userID string) ([]domain.RecurringExpense, error)
	FindDue(ctx context.Context, asOf time.Time) ([]domain.RecurringExpense, error)
	Update(ctx context.Context, re *domain.RecurringExpense) error
	Delete(ctx context.Context, id string) error
}

type recurringExpenseRepository struct {
	db *gorm.DB
}

func NewRecurringExpenseRepository(db *gorm.DB) RecurringExpenseRepository {
	return &recurringExpenseRepository{db: db}
}

func (r *recurringExpenseRepository) Create(ctx context.Context, re *domain.RecurringExpense) error {
	return r.db.WithContext(ctx).Create(re).Error
}

func (r *recurringExpenseRepository) FindByID(ctx context.Context, id string) (*domain.RecurringExpense, error) {
	var re domain.RecurringExpense
	err := r.db.WithContext(ctx).First(&re, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &re, nil
}

func (r *recurringExpenseRepository) FindAllByUserID(ctx context.Context, userID string) ([]domain.RecurringExpense, error) {
	var items []domain.RecurringExpense
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("next_run_at ASC").Find(&items).Error
	return items, err
}

func (r *recurringExpenseRepository) FindDue(ctx context.Context, asOf time.Time) ([]domain.RecurringExpense, error) {
	var items []domain.RecurringExpense
	err := r.db.WithContext(ctx).
		Where("is_active = ? AND next_run_at <= ?", true, asOf).
		Find(&items).Error
	return items, err
}

func (r *recurringExpenseRepository) Update(ctx context.Context, re *domain.RecurringExpense) error {
	return r.db.WithContext(ctx).Save(re).Error
}

func (r *recurringExpenseRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.RecurringExpense{}, "id = ?", id).Error
}
