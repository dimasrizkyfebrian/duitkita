package pdfreport

import "time"

// Report is the fully-derived view model the renderer lays out. Everything
// here is already computed (totals, statuses, sentences) — the renderer only
// decides where things go, never what they are.
type Report struct {
	Couple      bool
	Year        int
	Month       int
	GeneratedAt time.Time // already in the reader's timezone (WIB)
	// Partial is true when the report covers the month still in progress;
	// AsOfDay is then the last day included.
	Partial     bool
	AsOfDay     int
	DaysInMonth int

	Owner   Person
	Partner *Person // set only for couple reports

	Summary        Summary
	Insights       []Insight
	Categories     []CategoryRow
	CategoryTrends []CategoryTrend
	Trend          []TrendPoint // oldest first; the last point is the report month
	Projection     *Projection
	Daily          []DayPoint // one per calendar day, 1..DaysInMonth
	Weekdays       []WeekdayStat
	TopExpenses    []Transaction
	Recurring      RecurringSection
	Bills          BillSection
	CoupleStats    *CoupleSection

	Transactions        []Transaction
	TransactionsOmitted int
}

type Person struct {
	ID   string
	Name string
}

// Owner says whose row something is in a couple report. Personal reports
// leave everything as OwnerMe.
type Owner int

const (
	OwnerMe Owner = iota
	OwnerPartner
)

type Status int

const (
	StatusNeutral Status = iota
	StatusGood
	StatusWarn
	StatusDanger
)

type Summary struct {
	TotalSpent  int64
	TotalBudget int64
	// PrevSpent is the previous calendar month's total; HasPrev is false when
	// there's no spending recorded for it at all.
	PrevSpent     int64
	HasPrev       bool
	AvgDaily      int64
	TxCount       int
	ZeroSpendDays int
	DaysCounted   int
	Health        Health
}

func (s Summary) HasBudget() bool { return s.TotalBudget > 0 }

type Health struct {
	Score int
	Grade string // "A".."D", or "" when there's no budget to score against
}

type Insight struct {
	Status Status
	Text   string
}

type CategoryRow struct {
	Owner    Owner
	Name     string
	Spent    int64
	Budget   int64 // total = base + rollover
	Base     int64
	Rollover int64
	Share    float64 // of the report's total spend, 0..1
}

func (c CategoryRow) Remaining() int64 { return c.Budget - c.Spent }

// Usage is spent/budget, or -1 when there is no budget to measure against.
func (c CategoryRow) Usage() float64 {
	if c.Budget <= 0 {
		return -1
	}
	return float64(c.Spent) / float64(c.Budget)
}

func (c CategoryRow) Status() Status { return UsageStatus(c.Usage()) }

// UsageStatus maps a spent/budget ratio to the three-step budget scale used
// everywhere in the report: under 80% is fine, 80–100% is close, over is over.
func UsageStatus(usage float64) Status {
	switch {
	case usage < 0:
		return StatusNeutral
	case usage > 1:
		return StatusDanger
	case usage >= 0.8:
		return StatusWarn
	default:
		return StatusGood
	}
}

type CategoryTrend struct {
	Owner  Owner
	Name   string
	Points []int64 // aligned with Report.Trend
}

type TrendPoint struct {
	Year    int
	Month   int
	Me      int64
	Partner int64
}

func (t TrendPoint) Total() int64 { return t.Me + t.Partner }

type ProjectionKind int

const (
	ProjectionEndOfMonth ProjectionKind = iota
	ProjectionNextMonth
)

type Projection struct {
	Kind   ProjectionKind
	Year   int
	Month  int
	Amount int64
}

type DayPoint struct {
	Day     int
	Weekday time.Weekday
	Me      int64
	Partner int64
	// Future marks days after AsOfDay in a partial month.
	Future bool
}

func (d DayPoint) Total() int64 { return d.Me + d.Partner }

type WeekdayStat struct {
	Weekday     time.Weekday
	Avg         int64
	Occurrences int
}

type Transaction struct {
	Owner    Owner
	Date     time.Time
	Category string
	Note     string
	Amount   int64
}

type RecurringItem struct {
	Owner         Owner
	Label         string
	Category      string
	Schedule      string
	Amount        int64
	MonthlyAmount int64
	NextRun       time.Time
}

type RecurringSection struct {
	Items        []RecurringItem
	MonthlyTotal int64
}

type BillState int

const (
	BillUpcoming BillState = iota
	BillOverdue
	BillPaid
)

type BillItem struct {
	Owner   Owner
	Title   string
	DueDate time.Time
	Amount  *int64
	State   BillState
}

type BillSection struct {
	Items       []BillItem
	Paid        int
	Overdue     int
	TotalAmount int64
}

type PersonStats struct {
	Spent         int64
	Budget        int64
	TxCount       int
	AvgDaily      int64
	TopCategories []CategoryRow
}

type ActivityStats struct {
	ExpensesCreated int
	ExpensesUpdated int
	ExpensesDeleted int
	BudgetChanges   int
}

type CoupleSection struct {
	Me      PersonStats
	Partner PersonStats
	// ActivityAvailable is false when the period is older than the activity
	// log's retention window, so zero counts would be misleading.
	ActivityAvailable bool
	RetentionDays     int
	MeActivity        ActivityStats
	PartnerActivity   ActivityStats
}
