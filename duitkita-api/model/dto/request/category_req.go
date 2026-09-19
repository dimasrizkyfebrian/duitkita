package request

type CreateCategoryRequest struct {
	Name string `json:"name" binding:"required,min=1,max=100"`
	Icon string `json:"icon" binding:"omitempty,max=10"`
}

type UpdateCategoryRequest struct {
	Name string `json:"name" binding:"omitempty,min=1,max=100"`
	Icon string `json:"icon" binding:"omitempty,max=10"`
}
