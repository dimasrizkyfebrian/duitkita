package response

import "time"

type MonthlyReportResponse struct {
	Year        int             `json:"year"`
	Month       int             `json:"month"`
	TotalSpent  int64           `json:"total_spent"`
	TotalBudget int64           `json:"total_budget"`
	ByCategory  []CategorySpend `json:"by_category"`
}

type CategorySpend struct {
	CategoryID string `json:"category_id"`
	Name       string `json:"name"`
	Spent      int64  `json:"spent"`
	Budget     int64  `json:"budget"`
}

// CoupleCategorySpend tags each row with whose category it is — a plain
// CategorySpend row alone doesn't say, and the frontend had been recovering
// that by diffing against a separately-fetched category list.
type CoupleCategorySpend struct {
	CategorySpend
	Owner string `json:"owner"` // "me" or "partner"
}

// CoupleReportResponse mirrors MonthlyReportResponse's totals but keeps
// each partner's own subtotal too — the combined total alone can't say who
// spent how much without the caller re-deriving it from ByCategory.
type CoupleReportResponse struct {
	Year         int                   `json:"year"`
	Month        int                   `json:"month"`
	MyTotal      int64                 `json:"my_total"`
	PartnerTotal int64                 `json:"partner_total"`
	TotalSpent   int64                 `json:"total_spent"`
	TotalBudget  int64                 `json:"total_budget"`
	ByCategory   []CoupleCategorySpend `json:"by_category"`
}

type TrendPoint struct {
	Year  int   `json:"year"`
	Month int   `json:"month"`
	Total int64 `json:"total"`
}

type TrendResponse struct {
	Points []TrendPoint `json:"points"`
}

type DayPoint struct {
	Day   int   `json:"day"`
	Total int64 `json:"total"`
}

type DailyReportResponse struct {
	Year   int        `json:"year"`
	Month  int        `json:"month"`
	Points []DayPoint `json:"points"`
}

type ForecastResponse struct {
	Year           int     `json:"year"`
	Month          int     `json:"month"`
	ProjectedTotal int64   `json:"projected_total"`
	Confidence     float64 `json:"confidence"`
}

type HealthScoreResponse struct {
	Score   int      `json:"score"`
	Grade   string   `json:"grade"`
	Reasons []string `json:"reasons"`
}

type ExportResponse struct {
	ID          string     `json:"id"`
	Format      string     `json:"format"`
	Year        int        `json:"year"`
	Month       int        `json:"month"`
	Scope       string     `json:"scope"`
	Status      string     `json:"status"`
	DownloadURL string     `json:"download_url,omitempty"`
	RequestedAt time.Time  `json:"requested_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
}
