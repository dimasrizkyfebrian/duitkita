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
	// Only ever set on the owner's own expenses: accounts are private, so a
	// partner's expenses are returned with both left out entirely.
	AccountID *string         `json:"account_id,omitempty"`
	Account   *AccountSummary `json:"account,omitempty"`
}
