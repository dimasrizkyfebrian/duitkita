package domain

import (
	"time"

	"gorm.io/datatypes"
)

type NotificationType string

const (
	NotificationTypeRecurringExpense NotificationType = "recurring_expense"
	NotificationTypeBillReminder     NotificationType = "bill_reminder"
	NotificationTypeBudgetAlert      NotificationType = "budget_alert"
	NotificationTypePartnerActivity  NotificationType = "partner_activity"
	NotificationTypeWeeklySummary    NotificationType = "weekly_summary"
)

type Notification struct {
	ID          string           `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID      string           `gorm:"column:user_id;type:uuid;index;not null"`
	User        User             `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Type        NotificationType `gorm:"type:varchar(30);not null"`
	Title       string           `gorm:"size:160;not null"`
	Body        string           `gorm:"type:text;not null"`
	PayloadJSON datatypes.JSON   `gorm:"column:payload_json"`
	IsRead      bool             `gorm:"column:is_read;default:false"`
	ReadAt      *time.Time       `gorm:"column:read_at"`
	CreatedAt   time.Time        `gorm:"column:created_at;autoCreateTime"`
}

func (Notification) TableName() string {
	return "notifications"
}

// NotificationPreference mirrors `notification_preferences` (1:1 with User).
type NotificationPreference struct {
	UserID          string    `gorm:"column:user_id;type:uuid;primaryKey"`
	User            User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	BudgetAlert     bool      `gorm:"column:budget_alert;default:true"`
	PartnerActivity bool      `gorm:"column:partner_activity;default:true"`
	WeeklySummary   bool      `gorm:"column:weekly_summary;default:true"`
	ReminderAlert   bool      `gorm:"column:reminder_alert;default:true"`
	RecurringAlert  bool      `gorm:"column:recurring_alert;default:true"`
	UpdatedAt       time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (NotificationPreference) TableName() string {
	return "notification_preferences"
}
