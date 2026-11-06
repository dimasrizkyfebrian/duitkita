package response

import "time"

type InstitutionResponse struct {
	ID       string  `json:"id"`
	Code     string  `json:"code"`
	Name     string  `json:"name"`
	Type     string  `json:"type"`
	LogoPath *string `json:"logo_path"`
}

// Balance is null when the account has no opening balance — it's then only
// a label, and there is nothing to compute. OpeningBalanceDate is a plain
// YYYY-MM-DD string: it's a calendar date, not an instant, and serialising
// it as a timestamp would invite timezone shifts on the client.
type AccountResponse struct {
	ID                 string              `json:"id"`
	Name               string              `json:"name"`
	Institution        InstitutionResponse `json:"institution"`
	OpeningBalance     *int64              `json:"opening_balance"`
	OpeningBalanceDate *string             `json:"opening_balance_date"`
	Balance            *int64              `json:"balance"`
	Archived           bool                `json:"archived"`
	ArchivedAt         *time.Time          `json:"archived_at"`
	CreatedAt          time.Time           `json:"created_at"`
}

// TotalBalance sums the balances of active accounts that have one —
// archived accounts and balance-less ones are left out.
type AccountListResponse struct {
	Accounts     []AccountResponse `json:"accounts"`
	TotalBalance int64             `json:"total_balance"`
}

// AccountSummary is the slim form embedded in expenses and recurring
// expenses: enough to render a logo and a name.
type AccountSummary struct {
	ID          string              `json:"id"`
	Name        string              `json:"name"`
	Archived    bool                `json:"archived"`
	Institution InstitutionResponse `json:"institution"`
}

type BalanceAdjustmentResponse struct {
	ID              string    `json:"id"`
	AccountID       string    `json:"account_id"`
	PreviousBalance int64     `json:"previous_balance"`
	NewBalance      int64     `json:"new_balance"`
	Delta           int64     `json:"delta"`
	Note            string    `json:"note,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
}
