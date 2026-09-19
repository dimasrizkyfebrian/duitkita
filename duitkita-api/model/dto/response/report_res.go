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

type TrendPoint struct {
	Year  int   `json:"year"`
	Month int   `json:"month"`
	Total int64 `json:"total"`
}

type TrendResponse struct {
	Points []TrendPoint `json:"points"`
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
