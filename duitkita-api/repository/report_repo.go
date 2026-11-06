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

type DayTotal struct {
	Day   int   `gorm:"column:day"`
	Total int64 `gorm:"column:total"`
}

type TopExpense struct {
	ExpenseID    string    `gorm:"column:expense_id"`
	CategoryID   string    `gorm:"column:category_id"`
	CategoryName string    `gorm:"column:category_name"`
	CategoryIcon *string   `gorm:"column:category_icon"`
	Note         *string   `gorm:"column:note"`
	Amount       int64     `gorm:"column:amount"`
	ExpenseDate  time.Time `gorm:"column:expense_date"`
}

// AccountTotal is one row of the per-account breakdown. Every account field
// is nil on the row that totals expenses with no account.
type AccountTotal struct {
	AccountID       *string `gorm:"column:account_id"`
	AccountName     *string `gorm:"column:account_name"`
	InstitutionID   *string `gorm:"column:institution_id"`
	InstitutionCode *string `gorm:"column:institution_code"`
	InstitutionName *string `gorm:"column:institution_name"`
	InstitutionType *string `gorm:"column:institution_type"`
	LogoPath        *string `gorm:"column:logo_path"`
	Archived        bool    `gorm:"column:archived"`
	Total           int64   `gorm:"column:total"`
}

type ReportRepository interface {
	SumExpensesByUserAndPeriod(ctx context.Context, userID string, year, month int) (int64, error)
	SumBudgetByUserAndPeriod(ctx context.Context, userID string, year, month int) (int64, error)
	SpentByCategoryForPeriod(ctx context.Context, userID string, year, month int) ([]CategoryTotal, error)
	MonthlyTrend(ctx context.Context, userID string, months int) ([]MonthTotal, error)
	MonthlyTrendByCategory(ctx context.Context, userID, categoryID string, months int) ([]MonthTotal, error)
	SpentByDayForPeriod(ctx context.Context, userID string, year, month int) ([]DayTotal, error)
	TopExpensesForPeriod(ctx context.Context, userID string, year, month, limit int) ([]TopExpense, error)
	SpentByAccountForPeriod(ctx context.Context, userID string, year, month int) ([]AccountTotal, error)
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

func (r *reportRepository) SpentByDayForPeriod(ctx context.Context, userID string, year, month int) ([]DayTotal, error) {
	start, end := monthRange(year, month)

	var results []DayTotal
	err := r.db.WithContext(ctx).
		Model(&domain.Expense{}).
		Select("EXTRACT(DAY FROM expense_date)::int AS day, SUM(amount) AS total").
		Where("user_id = ? AND expense_date >= ? AND expense_date < ?", userID, start, end).
		Group("day").
		Order("day ASC").
		Scan(&results).Error
	return results, err
}

func (r *reportRepository) TopExpensesForPeriod(ctx context.Context, userID string, year, month, limit int) ([]TopExpense, error) {
	start, end := monthRange(year, month)

	var results []TopExpense
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			e.id AS expense_id,
			e.category_id AS category_id,
			c.name AS category_name,
			c.icon AS category_icon,
			e.note AS note,
			e.amount AS amount,
			e.expense_date AS expense_date
		FROM expenses e
		JOIN categories c ON c.id = e.category_id
		WHERE e.user_id = ? AND e.expense_date >= ? AND e.expense_date < ?
		ORDER BY e.amount DESC, e.expense_date DESC
		LIMIT ?
	`, userID, start, end, limit).Scan(&results).Error
	return results, err
}

// SpentByAccountForPeriod totals the month's spending per account, with all
// expenses that have no account grouped into one row. Unlike an account's
// balance, this counts every expense in the period regardless of the
// opening balance date — it answers "what did I spend from where", not
// "what's left". Archived accounts still appear if they were spent from.
func (r *reportRepository) SpentByAccountForPeriod(ctx context.Context, userID string, year, month int) ([]AccountTotal, error) {
	start, end := monthRange(year, month)

	var results []AccountTotal
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			e.account_id AS account_id,
			a.name AS account_name,
			fi.id AS institution_id,
			fi.code AS institution_code,
			fi.name AS institution_name,
			fi.type AS institution_type,
			fi.logo_path AS logo_path,
			(a.archived_at IS NOT NULL) AS archived,
			SUM(e.amount) AS total
		FROM expenses e
		LEFT JOIN accounts a ON a.id = e.account_id
		LEFT JOIN financial_institutions fi ON fi.id = a.institution_id
		WHERE e.user_id = ? AND e.expense_date >= ? AND e.expense_date < ?
		GROUP BY e.account_id, a.name, a.archived_at, fi.id, fi.code, fi.name, fi.type, fi.logo_path
		ORDER BY total DESC, account_name ASC
	`, userID, start, end).Scan(&results).Error
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
