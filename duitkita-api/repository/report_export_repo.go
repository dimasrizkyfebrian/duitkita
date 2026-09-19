package repository

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

type ReportExportRepository interface {
	Create(ctx context.Context, export *domain.ReportExport) error
	FindByID(ctx context.Context, id string) (*domain.ReportExport, error)
	FindAllByUserID(ctx context.Context, userID string) ([]domain.ReportExport, error)
	Update(ctx context.Context, export *domain.ReportExport) error
}

type reportExportRepository struct {
	db *gorm.DB
}

func NewReportExportRepository(db *gorm.DB) ReportExportRepository {
	return &reportExportRepository{db: db}
}

func (r *reportExportRepository) Create(ctx context.Context, export *domain.ReportExport) error {
	return r.db.WithContext(ctx).Create(export).Error
}

func (r *reportExportRepository) FindByID(ctx context.Context, id string) (*domain.ReportExport, error) {
	var export domain.ReportExport
	err := r.db.WithContext(ctx).First(&export, "id = ?", id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &export, nil
}

func (r *reportExportRepository) FindAllByUserID(ctx context.Context, userID string) ([]domain.ReportExport, error) {
	var exports []domain.ReportExport
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("requested_at DESC").Find(&exports).Error
	return exports, err
}

func (r *reportExportRepository) Update(ctx context.Context, export *domain.ReportExport) error {
	return r.db.WithContext(ctx).Save(export).Error
}
