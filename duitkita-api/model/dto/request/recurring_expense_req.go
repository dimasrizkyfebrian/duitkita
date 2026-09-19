package request

type CreateRecurringExpenseRequest struct {
	CategoryID   string `json:"category_id" binding:"required,uuid"`
	Amount       int64  `json:"amount" binding:"required,min=1"`
	Note         string `json:"note" binding:"omitempty,max=255"`
	ScheduleType string `json:"schedule_type" binding:"required,oneof=weekly monthly"`
	ScheduleDay  int    `json:"schedule_day" binding:"required"`
}

type UpdateRecurringExpenseRequest struct {
	Amount      int64  `json:"amount" binding:"omitempty,min=1"`
	Note        string `json:"note" binding:"omitempty,max=255"`
	ScheduleDay int    `json:"schedule_day" binding:"omitempty"`
}
