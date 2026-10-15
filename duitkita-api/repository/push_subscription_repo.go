package repository

import (
	"context"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"duitkita-api/model/domain"
)

type PushSubscriptionRepository interface {
	// Upsert keys off Endpoint (unique) rather than ID: re-subscribing from
	// the same browser (e.g. after the backend rotated VAPID keys, or the
	// user re-enabled notifications) should refresh the existing row, and a
	// device handed off to a different account should reassign it rather
	// than leave two rows pointing at one endpoint.
	Upsert(ctx context.Context, sub *domain.PushSubscription) error
	FindAllByUserID(ctx context.Context, userID string) ([]domain.PushSubscription, error)
	DeleteByEndpoint(ctx context.Context, userID, endpoint string) error
	Delete(ctx context.Context, id string) error
}

type pushSubscriptionRepository struct {
	db *gorm.DB
}

func NewPushSubscriptionRepository(db *gorm.DB) PushSubscriptionRepository {
	return &pushSubscriptionRepository{db: db}
}

func (r *pushSubscriptionRepository) Upsert(ctx context.Context, sub *domain.PushSubscription) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "endpoint"}},
			DoUpdates: clause.AssignmentColumns([]string{"user_id", "p256dh", "auth", "updated_at"}),
		}).
		Create(sub).Error
}

func (r *pushSubscriptionRepository) FindAllByUserID(ctx context.Context, userID string) ([]domain.PushSubscription, error) {
	var items []domain.PushSubscription
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Find(&items).Error
	return items, err
}

func (r *pushSubscriptionRepository) DeleteByEndpoint(ctx context.Context, userID, endpoint string) error {
	return r.db.WithContext(ctx).
		Where("user_id = ? AND endpoint = ?", userID, endpoint).
		Delete(&domain.PushSubscription{}).Error
}

func (r *pushSubscriptionRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.PushSubscription{}, "id = ?", id).Error
}
