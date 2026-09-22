package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

type SecurityAuditRepository interface {
	Create(ctx context.Context, log *domain.SecurityAuditLog) error
	FindByUserID(ctx context.Context, userID string, limit int) ([]domain.SecurityAuditLog, error)
	DeleteOlderThan(ctx context.Context, cutoff time.Time) (int64, error)
}

type securityAuditRepository struct {
	db *gorm.DB
}

func NewSecurityAuditRepository(db *gorm.DB) SecurityAuditRepository {
	return &securityAuditRepository{db: db}
}

func (r *securityAuditRepository) Create(ctx context.Context, log *domain.SecurityAuditLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *securityAuditRepository) FindByUserID(ctx context.Context, userID string, limit int) ([]domain.SecurityAuditLog, error) {
	var logs []domain.SecurityAuditLog
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Find(&logs).Error
	return logs, err
}

func (r *securityAuditRepository) DeleteOlderThan(ctx context.Context, cutoff time.Time) (int64, error) {
	result := r.db.WithContext(ctx).Where("created_at < ?", cutoff).Delete(&domain.SecurityAuditLog{})
	return result.RowsAffected, result.Error
}
