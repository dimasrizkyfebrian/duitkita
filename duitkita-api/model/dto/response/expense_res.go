package response

import "time"

type ExpenseResponse struct {
	ID              string    `json:"id"`
	CategoryID      string    `json:"category_id"`
	MonthlyBudgetID string    `json:"monthly_budget_id"`
	Amount          int64     `json:"amount"`
	Note            string    `json:"note,omitempty"`
	ExpenseDate     time.Time `json:"expense_date"`
	CreatedAt       time.Time `json:"created_at"`
}
