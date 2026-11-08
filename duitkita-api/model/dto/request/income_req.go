package request

type CreateIncomeRequest struct {
	// One of salary, bonus, freelance, gift, investment, other — checked by
	// the service rather than a oneof tag so the error stays "invalid source".
	Source     string `json:"source" binding:"required"`
	Amount     int64  `json:"amount" binding:"required,min=1"`
	IncomeDate string `json:"income_date" binding:"required,datetime=2006-01-02"`
	// Optional — empty means "no account".
	AccountID string `json:"account_id" binding:"omitempty,uuid"`
	Note      string `json:"note" binding:"omitempty,max=255"`
}

type UpdateIncomeRequest struct {
	Source     string `json:"source"`
	Amount     int64  `json:"amount" binding:"omitempty,min=1"`
	IncomeDate string `json:"income_date" binding:"omitempty,datetime=2006-01-02"`
	// Three-way pointer: nil keeps the account, "" removes it, anything else
	// moves the income to that account. Not tagged `uuid`, since that would
	// reject the "" that means "remove" — the service checks the format.
	AccountID *string `json:"account_id"`
	// Pointer so an omitted note (nil) is distinguishable from one the
	// caller is deliberately clearing ("").
	Note *string `json:"note" binding:"omitempty,max=255"`
}
