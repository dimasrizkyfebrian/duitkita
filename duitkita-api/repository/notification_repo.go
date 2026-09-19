package repository

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

type NotificationRepository interface {
	Create(ctx context.Context, notification *domain.Notification) error
	FindAllByUserID(ctx context.Context, userID string) ([]domain.Notification, error)
	MarkRead(ctx context.Context, id, userID string) error
	MarkAllRead(ctx context.Context, userID string) error
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

func (r *notificationRepository) FindAllByUserID(ctx context.Context, userID string) ([]domain.Notification, error) {
	var items []domain.Notification
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("created_at DESC").Find(&items).Error
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

// NotificationPreferenceRepository manages the 1:1 notification_preferences row.
type NotificationPreferenceRepository interface {
	FindByUserID(ctx context.Context, userID string) (*domain.NotificationPreference, error)
	Upsert(ctx context.Context, pref *domain.NotificationPreference) error
}

type notificationPreferenceRepository struct {
	db *gorm.DB
}

func NewNotificationPreferenceRepository(db *gorm.DB) NotificationPreferenceRepository {
	return &notificationPreferenceRepository{db: db}
}

func (r *notificationPreferenceRepository) FindByUserID(ctx context.Context, userID string) (*domain.NotificationPreference, error) {
	var pref domain.NotificationPreference
	err := r.db.WithContext(ctx).First(&pref, "user_id = ?", userID).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &pref, nil
}

func (r *notificationPreferenceRepository) Upsert(ctx context.Context, pref *domain.NotificationPreference) error {
	return r.db.WithContext(ctx).Save(pref).Error
}
