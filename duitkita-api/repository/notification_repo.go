package repository

import (
	"context"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"duitkita-api/model/domain"
)

type NotificationRepository interface {
	Create(ctx context.Context, notification *domain.Notification) error
	FindAllByUserID(ctx context.Context, userID string, limit, offset int) ([]domain.Notification, error)
	MarkRead(ctx context.Context, id, userID string) error
	MarkAllRead(ctx context.Context, userID string) error
	DeleteReadBefore(ctx context.Context, cutoff time.Time) (int64, error)
}

type notificationRepository struct {
	db *gorm.DB
}

func NewNotificationRepository(db *gorm.DB) NotificationRepository {
	return &notificationRepository{db: db}
}

func (r *notificationRepository) Create(ctx context.Context, notification *domain.Notification) error {
	return r.db.WithContext(ctx).Create(notification).Error
}

func (r *notificationRepository) FindAllByUserID(ctx context.Context, userID string, limit, offset int) ([]domain.Notification, error) {
	var items []domain.Notification
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).Offset(offset).
		Find(&items).Error
	return items, err
}

func (r *notificationRepository) MarkRead(ctx context.Context, id, userID string) error {
	return r.db.WithContext(ctx).Model(&domain.Notification{}).
		Where("id = ? AND user_id = ?", id, userID).
		Updates(map[string]interface{}{"is_read": true, "read_at": time.Now()}).Error
}

func (r *notificationRepository) MarkAllRead(ctx context.Context, userID string) error {
	return r.db.WithContext(ctx).Model(&domain.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Updates(map[string]interface{}{"is_read": true, "read_at": time.Now()}).Error
}

func (r *notificationRepository) DeleteReadBefore(ctx context.Context, cutoff time.Time) (int64, error) {
	result := r.db.WithContext(ctx).
		Where("is_read = ? AND read_at < ?", true, cutoff).
		Delete(&domain.Notification{})
	return result.RowsAffected, result.Error
}

type NotificationPreferenceRepository interface {
	FindAllByUserID(ctx context.Context, userID string) ([]domain.NotificationPreference, error)
	Upsert(ctx context.Context, pref *domain.NotificationPreference) error
}

type notificationPreferenceRepository struct {
	db *gorm.DB
}

func NewNotificationPreferenceRepository(db *gorm.DB) NotificationPreferenceRepository {
	return &notificationPreferenceRepository{db: db}
}

func (r *notificationPreferenceRepository) FindAllByUserID(ctx context.Context, userID string) ([]domain.NotificationPreference, error) {
	var prefs []domain.NotificationPreference
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Find(&prefs).Error
	return prefs, err
}

func (r *notificationPreferenceRepository) Upsert(ctx context.Context, pref *domain.NotificationPreference) error {
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "user_id"}, {Name: "key"}},
			DoUpdates: clause.AssignmentColumns([]string{"enabled", "updated_at"}),
		}).
		Create(pref).Error
}
