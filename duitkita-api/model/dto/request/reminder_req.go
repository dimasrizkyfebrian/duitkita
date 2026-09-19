package request

type CreateReminderRequest struct {
	Title            string `json:"title" binding:"required,max=120"`
	Amount           *int64 `json:"amount" binding:"omitempty,min=1"`
	DueDate          string `json:"due_date" binding:"required,datetime=2006-01-02"`
	RemindBeforeDays int    `json:"remind_before_days" binding:"omitempty,min=0"`
	IsRecurring      bool   `json:"is_recurring"`
	RecurringRule    string `json:"recurring_rule" binding:"omitempty,max=64"`
}

type UpdateReminderRequest struct {
	Title            string `json:"title" binding:"omitempty,max=120"`
	Amount           *int64 `json:"amount" binding:"omitempty,min=1"`
	DueDate          string `json:"due_date" binding:"omitempty,datetime=2006-01-02"`
	RemindBeforeDays int    `json:"remind_before_days" binding:"omitempty,min=0"`
}

type SnoozeReminderRequest struct {
	SnoozedUntil string `json:"snoozed_until" binding:"required,datetime=2006-01-02"`
}
