package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

type CategoryTotal struct {
	CategoryID string `gorm:"column:category_id"`
	Name       string `gorm:"column:name"`
	Spent      int64  `gorm:"column:spent"`
	Budget     int64  `gorm:"column:budget"`
}

type MonthTotal struct {
	Year  int   `gorm:"column:year"`
	Month int   `gorm:"column:month"`
	Total int64 `gorm:"column:total"`
}

type ReportRepository interface {
	SumExpensesByUserAndPeriod(ctx context.Context, userID string, year, month int) (int64, error)
	SumBudgetByUserAndPeriod(ctx context.Context, userID string, year, month int) (int64, error)
	SpentByCategoryForPeriod(ctx context.Context, userID string, year, month int) ([]CategoryTotal, error)
	MonthlyTrend(ctx context.Context, userID string, months int) ([]MonthTotal, error)
	MonthlyTrendByCategory(ctx context.Context, userID, categoryID string, months int) ([]MonthTotal, error)
}

type reportRepository struct {
	db *gorm.DB
}

func NewReportRepository(db *gorm.DB) ReportRepository {
	return &reportRepository{db: db}
}

func monthRange(year, month int) (time.Time, time.Time) {
	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	return start, start.AddDate(0, 1, 0)
}

func monthsAgo(months int) time.Time {
	now := time.Now().UTC()
	return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).AddDate(0, -months, 0)
}

func (r *reportRepository) SumExpensesByUserAndPeriod(ctx context.Context, userID string, year, month int) (int64, error) {
	start, end := monthRange(year, month)

	var total int64
	err := r.db.WithContext(ctx).
		Model(&domain.Expense{}).
		Where("user_id = ? AND expense_date >= ? AND expense_date < ?", userID, start, end).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&total).Error
	return total, err
}

func (r *reportRepository) SumBudgetByUserAndPeriod(ctx context.Context, userID string, year, month int) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).
		Model(&domain.MonthlyBudget{}).
		Where("user_id = ? AND year = ? AND month = ?", userID, year, month).
		Select("COALESCE(SUM(total_amount), 0)").
		Scan(&total).Error
	return total, err
}

func (r *reportRepository) SpentByCategoryForPeriod(ctx context.Context, userID string, year, month int) ([]CategoryTotal, error) {
	start, end := monthRange(year, month)

	var results []CategoryTotal
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			c.id AS category_id,
			c.name AS name,
			COALESCE(SUM(e.amount), 0) AS spent,
			COALESCE(MAX(b.total_amount), 0) AS budget
		FROM categories c
		LEFT JOIN expenses e
			ON e.category_id = c.id
			AND e.user_id = ?
			AND e.expense_date >= ?
			AND e.expense_date < ?
		LEFT JOIN monthly_budgets b
			ON b.category_id = c.id
			AND b.user_id = ?
			AND b.year = ?
			AND b.month = ?
		WHERE c.user_id = ?
		GROUP BY c.id, c.name
		ORDER BY spent DESC
	`, userID, start, end, userID, year, month, userID).Scan(&results).Error
	return results, err
}

func (r *reportRepository) MonthlyTrendByCategory(ctx context.Context, userID, categoryID string, months int) ([]MonthTotal, error) {
	since := monthsAgo(months)

	var results []MonthTotal
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			EXTRACT(YEAR FROM expense_date)::int AS year,
			EXTRACT(MONTH FROM expense_date)::int AS month,
			SUM(amount) AS total
		FROM expenses
		WHERE user_id = ?
			AND category_id = ?
			AND expense_date >= ?
		GROUP BY year, month
		ORDER BY year ASC, month ASC
	`, userID, categoryID, since).Scan(&results).Error
	return results, err
}

func (r *reportRepository) MonthlyTrend(ctx context.Context, userID string, months int) ([]MonthTotal, error) {
	since := monthsAgo(months)

	var results []MonthTotal
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			EXTRACT(YEAR FROM expense_date)::int AS year,
			EXTRACT(MONTH FROM expense_date)::int AS month,
			SUM(amount) AS total
		FROM expenses
		WHERE user_id = ?
			AND expense_date >= ?
		GROUP BY year, month
		ORDER BY year ASC, month ASC
	`, userID, since).Scan(&results).Error
	return results, err
}
