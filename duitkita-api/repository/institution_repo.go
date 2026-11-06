package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

// InstitutionRepository is read-only: financial institutions are master
// data maintained via docs/sql/003_seed_institutions.sql, not the API.
type InstitutionRepository interface {
	FindAllActive(ctx context.Context) ([]domain.FinancialInstitution, error)
	FindByID(ctx context.Context, id string) (*domain.FinancialInstitution, error)
}

type institutionRepository struct {
	db *gorm.DB
}

func NewInstitutionRepository(db *gorm.DB) InstitutionRepository {
	return &institutionRepository{db: db}
}

func (r *institutionRepository) FindAllActive(ctx context.Context) ([]domain.FinancialInstitution, error) {
	var institutions []domain.FinancialInstitution
	err := r.db.WithContext(ctx).
		Where("is_active = ?", true).
		Order("sort_order ASC, name ASC").
		Find(&institutions).Error
	return institutions, err
}

func (r *institutionRepository) FindByID(ctx context.Context, id string) (*domain.FinancialInstitution, error) {
	var institution domain.FinancialInstitution
	err := r.db.WithContext(ctx).First(&institution, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &institution, nil
}
