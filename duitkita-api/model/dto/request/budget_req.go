package request

type CreateBudgetRequest struct {
	CategoryID string `json:"category_id" binding:"required,uuid"`
	Year       int    `json:"year" binding:"required"`
	Month      int    `json:"month" binding:"required,min=1,max=12"`
	BaseAmount int64  `json:"base_amount" binding:"required,min=0"`
}

type UpdateBudgetRequest struct {
	BaseAmount int64 `json:"base_amount" binding:"required,min=0"`
}
