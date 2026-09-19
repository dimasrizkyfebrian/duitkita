package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

type CoupleInvitationRepository interface {
	Create(ctx context.Context, invitation *domain.CoupleInvitation) error
	FindByID(ctx context.Context, id string) (*domain.CoupleInvitation, error)
	FindIncomingPending(ctx context.Context, receiverUserID string) ([]domain.CoupleInvitation, error)
	Update(ctx context.Context, invitation *domain.CoupleInvitation) error
}

type coupleInvitationRepository struct {
	db *gorm.DB
}

func NewCoupleInvitationRepository(db *gorm.DB) CoupleInvitationRepository {
	return &coupleInvitationRepository{db: db}
}

func (r *coupleInvitationRepository) Create(ctx context.Context, invitation *domain.CoupleInvitation) error {
	return r.db.WithContext(ctx).Create(invitation).Error
}

func (r *coupleInvitationRepository) FindByID(ctx context.Context, id string) (*domain.CoupleInvitation, error) {
	var invitation domain.CoupleInvitation
	err := r.db.WithContext(ctx).First(&invitation, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &invitation, nil
}

func (r *coupleInvitationRepository) FindIncomingPending(ctx context.Context, receiverUserID string) ([]domain.CoupleInvitation, error) {
	var invitations []domain.CoupleInvitation
	err := r.db.WithContext(ctx).
		Where("receiver_user_id = ? AND status = ?", receiverUserID, domain.CoupleInvitationStatusPending).
		Order("created_at DESC").
		Find(&invitations).Error
	return invitations, err
}

func (r *coupleInvitationRepository) Update(ctx context.Context, invitation *domain.CoupleInvitation) error {
	return r.db.WithContext(ctx).Save(invitation).Error
}
