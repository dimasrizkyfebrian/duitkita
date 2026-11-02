package repository

import (
	"context"
	"time"

	"gorm.io/gorm"

	"duitkita-api/model/domain"
)

// The report snapshot queries back the PDF export. Every method takes a slice
// of user IDs so a couple export reads both partners in the same round-trip
// as a personal one (`user_id IN ?`), and every row carries user_id so the
// caller can split them back apart.

type SnapshotExpense struct {
	ID           string    `gorm:"column:id"`
	UserID       string    `gorm:"column:user_id"`
	CategoryID   string    `gorm:"column:category_id"`
	CategoryName string    `gorm:"column:category_name"`
	Note         *string   `gorm:"column:note"`
	Amount       int64     `gorm:"column:amount"`
	ExpenseDate  time.Time `gorm:"column:expense_date"`
}

type SnapshotCategoryBudget struct {
	UserID     string `gorm:"column:user_id"`
	CategoryID string `gorm:"column:category_id"`
	Name       string `gorm:"column:name"`
	Base       int64  `gorm:"column:base_amount"`
	Rollover   int64  `gorm:"column:rollover_amount"`
	Total      int64  `gorm:"column:total_amount"`
}

type SnapshotMonthCategoryTotal struct {
	UserID     string `gorm:"column:user_id"`
	CategoryID string `gorm:"column:category_id"`
	Year       int    `gorm:"column:year"`
	Month      int    `gorm:"column:month"`
	Total      int64  `gorm:"column:total"`
}

type SnapshotRecurring struct {
	ID           string    `gorm:"column:id"`
	UserID       string    `gorm:"column:user_id"`
	CategoryName string    `gorm:"column:category_name"`
	Note         *string   `gorm:"column:note"`
	Amount       int64     `gorm:"column:amount"`
	ScheduleType string    `gorm:"column:schedule_type"`
	ScheduleDay  int       `gorm:"column:schedule_day"`
	NextRunAt    time.Time `gorm:"column:next_run_at"`
}

type SnapshotActivityCount struct {
	ActorID    string `gorm:"column:actor_id"`
	EntityType string `gorm:"column:entity_type"`
	Action     string `gorm:"column:action"`
	Count      int    `gorm:"column:count"`
}

type ReportSnapshotRepository interface {
	ExpensesForPeriod(ctx context.Context, userIDs []string, start, end time.Time) ([]SnapshotExpense, error)
	CategoryBudgetsForPeriod(ctx context.Context, userIDs []string, year, month int) ([]SnapshotCategoryBudget, error)
	MonthlyCategoryTotals(ctx context.Context, userIDs []string, start, end time.Time) ([]SnapshotMonthCategoryTotal, error)
	ActiveRecurring(ctx context.Context, userIDs []string) ([]SnapshotRecurring, error)
	BillsDueBetween(ctx context.Context, userIDs []string, start, end time.Time) ([]domain.BillReminder, error)
	ActivityCountsForPeriod(ctx context.Context, coupleID string, start, end time.Time) ([]SnapshotActivityCount, error)
}

type reportSnapshotRepository struct {
	db *gorm.DB
}

func NewReportSnapshotRepository(db *gorm.DB) ReportSnapshotRepository {
	return &reportSnapshotRepository{db: db}
}

// ExpensesForPeriod is the one row-level read behind the export: daily,
// weekday, top-N, per-category spend and the appendix are all derived from
// this single result set instead of one aggregate query each. Served by
// idx_expenses_user_date.
func (r *reportSnapshotRepository) ExpensesForPeriod(ctx context.Context, userIDs []string, start, end time.Time) ([]SnapshotExpense, error) {
	var results []SnapshotExpense
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			e.id AS id,
			e.user_id AS user_id,
			e.category_id AS category_id,
			c.name AS category_name,
			e.note AS note,
			e.amount AS amount,
			e.expense_date AS expense_date
		FROM expenses e
		JOIN categories c ON c.id = e.category_id
		WHERE e.user_id IN ? AND e.expense_date >= ? AND e.expense_date < ?
		ORDER BY e.expense_date ASC, e.created_at ASC
	`, userIDs, start, end).Scan(&results).Error
	return results, err
}

// CategoryBudgetsForPeriod lists every category the users own with that
// period's budget, if any — so a budgeted category nobody spent in still
// shows up in the report. The unique (user, category, year, month) index
// guarantees at most one budget row per category.
func (r *reportSnapshotRepository) CategoryBudgetsForPeriod(ctx context.Context, userIDs []string, year, month int) ([]SnapshotCategoryBudget, error) {
	var results []SnapshotCategoryBudget
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			c.user_id AS user_id,
			c.id AS category_id,
			c.name AS name,
			COALESCE(b.base_amount, 0) AS base_amount,
			COALESCE(b.rollover_amount, 0) AS rollover_amount,
			COALESCE(b.total_amount, 0) AS total_amount
		FROM categories c
		LEFT JOIN monthly_budgets b
			ON b.category_id = c.id
			AND b.user_id = c.user_id
			AND b.year = ?
			AND b.month = ?
		WHERE c.user_id IN ?
	`, year, month, userIDs).Scan(&results).Error
	return results, err
}

// MonthlyCategoryTotals aggregates spend per (user, category, month) over
// [start, end). The export asks for the months *before* the report period
// only; the report month itself comes from ExpensesForPeriod, so no row is
// scanned twice.
func (r *reportSnapshotRepository) MonthlyCategoryTotals(ctx context.Context, userIDs []string, start, end time.Time) ([]SnapshotMonthCategoryTotal, error) {
	var results []SnapshotMonthCategoryTotal
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			user_id,
			category_id,
			EXTRACT(YEAR FROM expense_date)::int AS year,
			EXTRACT(MONTH FROM expense_date)::int AS month,
			SUM(amount) AS total
		FROM expenses
		WHERE user_id IN ? AND expense_date >= ? AND expense_date < ?
		GROUP BY user_id, category_id, year, month
	`, userIDs, start, end).Scan(&results).Error
	return results, err
}

func (r *reportSnapshotRepository) ActiveRecurring(ctx context.Context, userIDs []string) ([]SnapshotRecurring, error) {
	var results []SnapshotRecurring
	err := r.db.WithContext(ctx).Raw(`
		SELECT
			re.id AS id,
			re.user_id AS user_id,
			c.name AS category_name,
			re.note AS note,
			re.amount AS amount,
			re.schedule_type AS schedule_type,
			re.schedule_day AS schedule_day,
			re.next_run_at AS next_run_at
		FROM recurring_expenses re
		JOIN categories c ON c.id = re.category_id
		WHERE re.user_id IN ? AND re.is_active = TRUE
	`, userIDs).Scan(&results).Error
	return results, err
}

func (r *reportSnapshotRepository) BillsDueBetween(ctx context.Context, userIDs []string, start, end time.Time) ([]domain.BillReminder, error) {
	var results []domain.BillReminder
	err := r.db.WithContext(ctx).
		Where("user_id IN ? AND due_date >= ? AND due_date < ?", userIDs, start, end).
		Order("due_date ASC").
		Find(&results).Error
	return results, err
}

func (r *reportSnapshotRepository) ActivityCountsForPeriod(ctx context.Context, coupleID string, start, end time.Time) ([]SnapshotActivityCount, error) {
	var results []SnapshotActivityCount
	err := r.db.WithContext(ctx).Raw(`
		SELECT actor_id, entity_type, action, COUNT(*) AS count
		FROM activities
		WHERE couple_id = ? AND created_at >= ? AND created_at < ?
		GROUP BY actor_id, entity_type, action
	`, coupleID, start, end).Scan(&results).Error
	return results, err
}
