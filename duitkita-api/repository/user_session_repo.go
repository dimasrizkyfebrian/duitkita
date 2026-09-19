package repository

import (
	"context"
	"errors"
	"time"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

type UserSessionRepository interface {
	Create(ctx context.Context, session *domain.UserSession) error
	FindByID(ctx context.Context, id string) (*domain.UserSession, error)
	FindActiveByUserID(ctx context.Context, userID string) ([]domain.UserSession, error)
	Update(ctx context.Context, session *domain.UserSession) error
	RevokeByID(ctx context.Context, id string) error
	RevokeAllExcept(ctx context.Context, userID, exceptSessionID string) error
}

type userSessionRepository struct {
	db *gorm.DB
}

func NewUserSessionRepository(db *gorm.DB) UserSessionRepository {
	return &userSessionRepository{db: db}
}

func (r *userSessionRepository) Create(ctx context.Context, session *domain.UserSession) error {
	return r.db.WithContext(ctx).Create(session).Error
}

func (r *userSessionRepository) FindByID(ctx context.Context, id string) (*domain.UserSession, error) {
	var session domain.UserSession
	err := r.db.WithContext(ctx).First(&session, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &session, nil
}

func (r *userSessionRepository) FindActiveByUserID(ctx context.Context, userID string) ([]domain.UserSession, error) {
	var sessions []domain.UserSession
	err := r.db.WithContext(ctx).
		Where("user_id = ? AND revoked_at IS NULL AND expires_at > ?", userID, time.Now()).
		Order("last_active_at DESC").
		Find(&sessions).Error
	return sessions, err
}

func (r *userSessionRepository) Update(ctx context.Context, session *domain.UserSession) error {
	return r.db.WithContext(ctx).Save(session).Error
}

func (r *userSessionRepository) RevokeByID(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Model(&domain.UserSession{}).
		Where("id = ?", id).
		Update("revoked_at", time.Now()).Error
}

func (r *userSessionRepository) RevokeAllExcept(ctx context.Context, userID, exceptSessionID string) error {
	return r.db.WithContext(ctx).Model(&domain.UserSession{}).
		Where("user_id = ? AND id <> ? AND revoked_at IS NULL", userID, exceptSessionID).
		Update("revoked_at", time.Now()).Error
}
