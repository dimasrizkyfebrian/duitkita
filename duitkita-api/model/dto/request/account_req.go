package request

// OpeningBalance is a pointer so "no balance" (nil — the account is just a
// label) is distinguishable from a real balance of 0. OpeningBalanceDate
// defaults to today when a balance is given without one; a date without a
// balance is rejected by the service.
type CreateAccountRequest struct {
	InstitutionID      string `json:"institution_id" binding:"required,uuid"`
	Name               string `json:"name" binding:"required,max=100"`
	OpeningBalance     *int64 `json:"opening_balance" binding:"omitempty,min=0"`
	OpeningBalanceDate string `json:"opening_balance_date" binding:"omitempty,datetime=2006-01-02"`
}

// The opening balance can only be filled in here while it's still empty —
// once set, the balance moves through AdjustBalanceRequest instead, so the
// adjustment history stays consistent with it.
type UpdateAccountRequest struct {
	Name               string `json:"name" binding:"omitempty,max=100"`
	OpeningBalance     *int64 `json:"opening_balance" binding:"omitempty,min=0"`
	OpeningBalanceDate string `json:"opening_balance_date" binding:"omitempty,datetime=2006-01-02"`
}

// NewBalance is the balance the user sees in their real bank/e-wallet app.
// A pointer so `required` still accepts 0 (an emptied wallet).
type AdjustBalanceRequest struct {
	NewBalance *int64 `json:"new_balance" binding:"required,min=0"`
	Note       string `json:"note" binding:"omitempty,max=255"`
}
