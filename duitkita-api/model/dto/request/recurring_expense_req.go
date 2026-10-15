package request

// ScheduleDay deliberately isn't `required`: for a weekly schedule the day
// is a time.Weekday, where Sunday is 0 — and `required` rejects the zero
// value, which would make "every Sunday" the one weekday the API refuses.
// The valid range depends on ScheduleType (0-6 weekly, 1-31 monthly), so
// the bound here is only the outer envelope; the service does the real
// per-type check once it knows the type.
type CreateRecurringExpenseRequest struct {
	CategoryID   string `json:"category_id" binding:"required,uuid"`
	Amount       int64  `json:"amount" binding:"required,min=1"`
	Note         string `json:"note" binding:"omitempty,max=255"`
	ScheduleType string `json:"schedule_type" binding:"required,oneof=weekly monthly"`
	ScheduleDay  int    `json:"schedule_day" binding:"min=0,max=31"`
}

// Pointers, not zero-value sentinels: a nil field means "leave this alone",
// which is the only way to tell "don't touch the day" apart from "set it to
// Sunday (0)", or "keep the note" apart from "clear the note".
type UpdateRecurringExpenseRequest struct {
	Amount      int64   `json:"amount" binding:"omitempty,min=1"`
	Note        *string `json:"note" binding:"omitempty,max=255"`
	ScheduleDay *int    `json:"schedule_day" binding:"omitempty,min=0,max=31"`
}
