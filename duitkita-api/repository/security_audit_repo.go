package repository

import (
	"context"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

type SecurityAuditRepository interface {
	Create(ctx context.Context, log *domain.SecurityAuditLog) error
	FindByUserID(ctx context.Context, userID string, limit int) ([]domain.SecurityAuditLog, error)
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
