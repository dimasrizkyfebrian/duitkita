package response

import "time"

type NotificationResponse struct {
	ID        string     `json:"id"`
	Type      string     `json:"type"`
	Title     string     `json:"title"`
	Body      string     `json:"body"`
	IsRead    bool       `json:"is_read"`
	ReadAt    *time.Time `json:"read_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
}

type NotificationPreferenceResponse struct {
	BudgetAlert     bool `json:"budget_alert"`
	PartnerActivity bool `json:"partner_activity"`
	WeeklySummary   bool `json:"weekly_summary"`
	ReminderAlert   bool `json:"reminder_alert"`
	RecurringAlert  bool `json:"recurring_alert"`
}
