package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

type ActivityRepository interface {
	Create(ctx context.Context, activity *domain.Activity) error
	FindByCoupleID(ctx context.Context, coupleID string, limit, offset int) ([]domain.Activity, error)
	FindRecentByCoupleID(ctx context.Context, coupleID string, limit int) ([]domain.Activity, error)
	DeleteOlderThan(ctx context.Context, cutoff time.Time) (int64, error)
}

type activityRepository struct {
	db *gorm.DB
}

func NewActivityRepository(db *gorm.DB) ActivityRepository {
	return &activityRepository{db: db}
}

func (r *activityRepository) Create(ctx context.Context, activity *domain.Activity) error {
	return r.db.WithContext(ctx).Create(activity).Error
}

func (r *activityRepository) FindByCoupleID(ctx context.Context, coupleID string, limit, offset int) ([]domain.Activity, error) {
	var items []domain.Activity
	err := r.db.WithContext(ctx).
		Preload("Actor").
		Where("couple_id = ?", coupleID).
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&items).Error
	return items, err
}

func (r *activityRepository) FindRecentByCoupleID(ctx context.Context, coupleID string, limit int) ([]domain.Activity, error) {
	return r.FindByCoupleID(ctx, coupleID, limit, 0)
}

func (r *activityRepository) DeleteOlderThan(ctx context.Context, cutoff time.Time) (int64, error) {
	result := r.db.WithContext(ctx).Where("created_at < ?", cutoff).Delete(&domain.Activity{})
	return result.RowsAffected, result.Error
}
