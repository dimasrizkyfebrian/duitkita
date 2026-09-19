package request

type CreateExpenseRequest struct {
	CategoryID      string `json:"category_id" binding:"required,uuid"`
	MonthlyBudgetID string `json:"monthly_budget_id" binding:"required,uuid"`
	Amount          int64  `json:"amount" binding:"required,min=1"`
	Note            string `json:"note" binding:"omitempty,max=255"`
	ExpenseDate     string `json:"expense_date" binding:"required,datetime=2006-01-02"`
}

type UpdateExpenseRequest struct {
	CategoryID  string `json:"category_id" binding:"omitempty,uuid"`
	Amount      int64  `json:"amount" binding:"omitempty,min=1"`
	Note        string `json:"note" binding:"omitempty,max=255"`
	ExpenseDate string `json:"expense_date" binding:"omitempty,datetime=2006-01-02"`
}
