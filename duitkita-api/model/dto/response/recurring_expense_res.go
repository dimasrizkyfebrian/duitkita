package response

import "time"

type RecurringExpenseResponse struct {
	ID           string     `json:"id"`
	CategoryID   string     `json:"category_id"`
	Amount       int64      `json:"amount"`
	Note         string     `json:"note,omitempty"`
	ScheduleType string     `json:"schedule_type"`
	ScheduleDay  int        `json:"schedule_day"`
	NextRunAt    time.Time  `json:"next_run_at"`
	LastRunAt    *time.Time `json:"last_run_at,omitempty"`
	IsActive     bool       `json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
}
