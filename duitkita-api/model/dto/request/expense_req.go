package request

type CreateExpenseRequest struct {
	CategoryID      string `json:"category_id" binding:"required,uuid"`
	MonthlyBudgetID string `json:"monthly_budget_id" binding:"required,uuid"`
	Amount          int64  `json:"amount" binding:"required,min=1"`
	Note            string `json:"note" binding:"omitempty,max=255"`
	ExpenseDate     string `json:"expense_date" binding:"required,datetime=2006-01-02"`
	// Optional — empty means "no account".
	AccountID string `json:"account_id" binding:"omitempty,uuid"`
}

type UpdateExpenseRequest struct {
	CategoryID string `json:"category_id" binding:"omitempty,uuid"`
	Amount     int64  `json:"amount" binding:"omitempty,min=1"`
	// Pointer so an omitted note (nil) is distinguishable from one the
	// caller is deliberately clearing (""), which a plain string can't
	// express — both look like the zero value.
	Note        *string `json:"note" binding:"omitempty,max=255"`
	ExpenseDate string  `json:"expense_date" binding:"omitempty,datetime=2006-01-02"`
	// Same three-way pointer as Note: nil keeps the account, "" removes it,
	// anything else moves the expense to that account. Not tagged `uuid`,
	// since that would reject the "" that means "remove" — the service
	// checks the format instead.
	AccountID *string `json:"account_id"`
}
