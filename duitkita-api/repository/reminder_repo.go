package repository

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

type ReminderRepository interface {
	Create(ctx context.Context, reminder *domain.BillReminder) error
	FindByID(ctx context.Context, id string) (*domain.BillReminder, error)
	FindAllByUserID(ctx context.Context, userID string) ([]domain.BillReminder, error)
	FindDueForNotification(ctx context.Context, asOf time.Time) ([]domain.BillReminder, error)
	Update(ctx context.Context, reminder *domain.BillReminder) error
	Delete(ctx context.Context, id string) error
}

type reminderRepository struct {
	db *gorm.DB
}

func NewReminderRepository(db *gorm.DB) ReminderRepository {
	return &reminderRepository{db: db}
}

func (r *reminderRepository) Create(ctx context.Context, reminder *domain.BillReminder) error {
	return r.db.WithContext(ctx).Create(reminder).Error
}

func (r *reminderRepository) FindByID(ctx context.Context, id string) (*domain.BillReminder, error) {
	var reminder domain.BillReminder
	err := r.db.WithContext(ctx).First(&reminder, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &reminder, nil
}

func (r *reminderRepository) FindAllByUserID(ctx context.Context, userID string) ([]domain.BillReminder, error) {
	var reminders []domain.BillReminder
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("due_date ASC").Find(&reminders).Error
	return reminders, err
}

func (r *reminderRepository) FindDueForNotification(ctx context.Context, asOf time.Time) ([]domain.BillReminder, error) {
	var reminders []domain.BillReminder
	err := r.db.WithContext(ctx).
		Where("status <> ? AND (snoozed_until IS NULL OR snoozed_until <= ?) AND (due_date - (remind_before_days || ' days')::interval) <= ?",
			domain.BillReminderStatusDone, asOf, asOf).
		Find(&reminders).Error
	return reminders, err
}

func (r *reminderRepository) Update(ctx context.Context, reminder *domain.BillReminder) error {
	return r.db.WithContext(ctx).Save(reminder).Error
}

func (r *reminderRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.BillReminder{}, "id = ?", id).Error
}
