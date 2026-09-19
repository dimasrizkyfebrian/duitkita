package response

import "time"

type BudgetResponse struct {
	ID             string    `json:"id"`
	CategoryID     string    `json:"category_id"`
	Year           int       `json:"year"`
	Month          int       `json:"month"`
	BaseAmount     int64     `json:"base_amount"`
	RolloverAmount int64     `json:"rollover_amount"`
	TotalAmount    int64     `json:"total_amount"`
	IsFinalized    bool      `json:"is_finalized"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}
