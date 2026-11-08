package response

import "time"

type IncomeResponse struct {
	ID     string `json:"id"`
	Source string `json:"source"`
	Amount int64  `json:"amount"`
	Note   string `json:"note,omitempty"`
	// YYYY-MM-DD, not a timestamp.
	IncomeDate string `json:"income_date"`
	// Always present, null when the income has no account.
	AccountID *string         `json:"account_id"`
	Account   *AccountSummary `json:"account"`
	CreatedAt time.Time       `json:"created_at"`
}

type IncomeListResponse struct {
	Items []IncomeResponse `json:"items"`
	// Sum of amount (rupiah) of all incomes matching the filter, ignoring
	// paging — not a row count.
	Total int64 `json:"total"`
}
