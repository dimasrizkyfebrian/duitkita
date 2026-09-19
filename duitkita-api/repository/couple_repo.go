package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

type CoupleRepository interface {
	Create(ctx context.Context, couple *domain.Couple) error
	FindByUserID(ctx context.Context, userID string) (*domain.Couple, error)
	Delete(ctx context.Context, id string) error
}

type coupleRepository struct {
	db *gorm.DB
}

func NewCoupleRepository(db *gorm.DB) CoupleRepository {
	return &coupleRepository{db: db}
}

func (r *coupleRepository) Create(ctx context.Context, couple *domain.Couple) error {
	return r.db.WithContext(ctx).Create(couple).Error
}

func (r *coupleRepository) FindByUserID(ctx context.Context, userID string) (*domain.Couple, error) {
	var couple domain.Couple
	err := r.db.WithContext(ctx).
		Preload("User1").Preload("User2").
		Where("user1_id = ? OR user2_id = ?", userID, userID).
		First(&couple).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &couple, nil
}

func (r *coupleRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&domain.Couple{}, "id = ?", id).Error
}
