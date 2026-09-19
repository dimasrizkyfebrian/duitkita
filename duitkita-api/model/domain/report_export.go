package domain

import "time"

type ReportExportFormat string

const (
	ReportExportFormatPDF ReportExportFormat = "pdf"
)

type ReportExportStatus string

const (
	ReportExportStatusPending    ReportExportStatus = "pending"
	ReportExportStatusProcessing ReportExportStatus = "processing"
	ReportExportStatusCompleted  ReportExportStatus = "completed"
	ReportExportStatusFailed     ReportExportStatus = "failed"
)

type ReportExport struct {
	ID           string             `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID       string             `gorm:"column:user_id;type:uuid;index;not null"`
	User         User               `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Format       ReportExportFormat `gorm:"type:varchar(10);not null"`
	Year         int                `gorm:"not null"`
	Month        int                `gorm:"not null"`
	Scope        string             `gorm:"size:16;not null"`
	Status       ReportExportStatus `gorm:"type:varchar(15);default:'pending';not null"`
	FilePath     *string            `gorm:"column:file_path;size:512"`
	ErrorMessage *string            `gorm:"column:error_message;type:text"`
	RequestedAt  time.Time          `gorm:"column:requested_at;autoCreateTime"`
	CompletedAt  *time.Time         `gorm:"column:completed_at"`
	ExpiresAt    *time.Time         `gorm:"column:expires_at"`
}

func (ReportExport) TableName() string {
	return "report_exports"
}
