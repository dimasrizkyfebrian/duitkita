package repository

import (
	"context"

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

// ReportRepository holds the aggregation queries backing /reports/*.
// These lean on raw SQL rather than the GORM query builder since they're
// GROUP BY / date-range aggregates that don't map cleanly onto struct scans.
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

func (r *reportRepository) SumExpensesByUserAndPeriod(ctx context.Context, userID string, year, month int) (int64, error) {
	var total int64
	err := r.db.WithContext(ctx).
		Model(&domain.Expense{}).
		Where("user_id = ? AND EXTRACT(YEAR FROM expense_date) = ? AND EXTRACT(MONTH FROM expense_date) = ?", userID, year, month).
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
			AND EXTRACT(YEAR FROM e.expense_date) = ?
			AND EXTRACT(MONTH FROM e.expense_date) = ?
		LEFT JOIN monthly_budgets b
			ON b.category_id = c.id
			AND b.user_id = ?
			AND b.year = ?
			AND b.month = ?
		WHERE c.user_id = ?
		GROUP BY c.id, c.name
		ORDER BY spent DESC
	`, userID, year, month, userID, year, month, userID).Scan(&results).Error
	return results, err
}

func (r *reportRepository) MonthlyTrendByCategory(ctx context.Context, userID, categoryID string, months int) ([]MonthTotal, error) {
	var results []MonthTotal
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			EXTRACT(YEAR FROM expense_date)::int AS year,
			EXTRACT(MONTH FROM expense_date)::int AS month,
			SUM(amount) AS total
		FROM expenses
		WHERE user_id = ?
			AND category_id = ?
			AND expense_date >= (CURRENT_DATE - (? || ' months')::interval)
		GROUP BY year, month
		ORDER BY year ASC, month ASC
	`, userID, categoryID, months).Scan(&results).Error
	return results, err
}

func (r *reportRepository) MonthlyTrend(ctx context.Context, userID string, months int) ([]MonthTotal, error) {
	var results []MonthTotal
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			EXTRACT(YEAR FROM expense_date)::int AS year,
			EXTRACT(MONTH FROM expense_date)::int AS month,
			SUM(amount) AS total
		FROM expenses
		WHERE user_id = ?
			AND expense_date >= (CURRENT_DATE - (? || ' months')::interval)
		GROUP BY year, month
		ORDER BY year ASC, month ASC
	`, userID, months).Scan(&results).Error
	return results, err
}
