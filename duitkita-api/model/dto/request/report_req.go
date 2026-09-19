package request

type CreateExportRequest struct {
	Format string `json:"format" binding:"required,oneof=pdf"`
	Year   int    `json:"year" binding:"required"`
	Month  int    `json:"month" binding:"required,min=1,max=12"`
	Scope  string `json:"scope" binding:"required,oneof=personal couple"`
}
