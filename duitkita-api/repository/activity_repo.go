package repository

import (
	"context"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

type ActivityRepository interface {
	Create(ctx context.Context, activity *domain.Activity) error
	FindByCoupleID(ctx context.Context, coupleID string, limit, offset int) ([]domain.Activity, error)
	FindRecentByCoupleID(ctx context.Context, coupleID string, limit int) ([]domain.Activity, error)
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
