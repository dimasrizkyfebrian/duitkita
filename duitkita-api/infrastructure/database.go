package infrastructure

import (
	"fmt"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"duitkita-api/config"
	"duitkita-api/model/domain"
)

// NewDatabase opens the GORM/Postgres connection pool.
func NewDatabase(cfg config.DatabaseConfig) (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.Name, cfg.SSLMode,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("connect database: %w", err)
	}

	return db, nil
}

// AutoMigrate syncs table schemas from the domain models. Handy for local
// development; production schema changes should go through a proper
// migration tool (golang-migrate/goose) instead.
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&domain.User{},
		&domain.UserSession{},
		&domain.Couple{},
		&domain.CoupleInvitation{},
		&domain.Category{},
		&domain.MonthlyBudget{},
		&domain.Expense{},
		&domain.RecurringExpense{},
		&domain.BillReminder{},
		&domain.Notification{},
		&domain.NotificationPreference{},
		&domain.ReportExport{},
		&domain.Activity{},
		&domain.SecurityAuditLog{},
	)
}
