package service

import (
	"context"
	"encoding/json"

	"gorm.io/datatypes"

	"duitkita-api/model/domain"
	"duitkita-api/repository"
)

type SecurityAuditService interface {
	LogEvent(ctx context.Context, userID *string, eventType domain.SecurityAuditEventType, ipAddress, userAgent string, meta map[string]interface{})
	ListByUser(ctx context.Context, userID string, limit int) ([]domain.SecurityAuditLog, error)
}

type securityAuditService struct {
	repo repository.SecurityAuditRepository
}

func NewSecurityAuditService(repo repository.SecurityAuditRepository) SecurityAuditService {
	return &securityAuditService{repo: repo}
}

func (s *securityAuditService) LogEvent(ctx context.Context, userID *string, eventType domain.SecurityAuditEventType, ipAddress, userAgent string, meta map[string]interface{}) {
	var metaJSON datatypes.JSON
	if meta != nil {
		raw, _ := json.Marshal(meta)
		metaJSON = datatypes.JSON(raw)
	}

	log := &domain.SecurityAuditLog{
		UserID:    userID,
		EventType: eventType,
		Meta:      metaJSON,
	}
	if ipAddress != "" {
		log.IPAddress = &ipAddress
	}
	if userAgent != "" {
		log.UserAgent = &userAgent
	}

	_ = s.repo.Create(ctx, log)
}

func (s *securityAuditService) ListByUser(ctx context.Context, userID string, limit int) ([]domain.SecurityAuditLog, error) {
	if limit <= 0 {
		limit = 50
	}
	return s.repo.FindByUserID(ctx, userID, limit)
}
