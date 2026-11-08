package response

// AccountTransactionResponse is one line of an account's mutasi. Amount is the
// effect on this account's balance, so it is signed: an expense is negative,
// an income positive, an adjustment its delta. Label is a code or name, never
// a sentence — the client words it: the category name for an expense, the
// source code for an income, empty for an adjustment.
type AccountTransactionResponse struct {
	ID   string `json:"id"`
	Kind string `json:"kind"`
	// YYYY-MM-DD. For an adjustment: the date of its created_at in WIB.
	Date   string `json:"date"`
	Amount int64  `json:"amount"`
	Label  string `json:"label"`
	Note   string `json:"note,omitempty"`
	// True when the row is dated before the account's opening balance date,
	// so it is listed but does not move the balance. Never true for an
	// adjustment.
	BeforeOpening bool `json:"before_opening"`
}

type AccountTransactionListResponse struct {
	Items []AccountTransactionResponse `json:"items"`
	// Opaque; pass it back as ?cursor= for the next page. Null on the last page.
	NextCursor *string `json:"next_cursor"`
}
