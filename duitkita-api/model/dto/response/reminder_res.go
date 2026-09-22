package response

import "time"

type ReminderResponse struct {
	ID               string     `json:"id"`
	Title            string     `json:"title"`
	Amount           *int64     `json:"amount,omitempty"`
	DueDate          time.Time  `json:"due_date"`
	RemindBeforeDays int        `json:"remind_before_days"`
	Status           string     `json:"status"`
	SnoozedUntil     *time.Time `json:"snoozed_until,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}
