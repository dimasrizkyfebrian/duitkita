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

type NotificationPreferenceKey string

const (
	PreferenceBudgetAlert     NotificationPreferenceKey = "budget_alert"
	PreferencePartnerActivity NotificationPreferenceKey = "partner_activity"
	PreferenceWeeklySummary   NotificationPreferenceKey = "weekly_summary"
	PreferenceReminderAlert   NotificationPreferenceKey = "reminder_alert"
	PreferenceRecurringAlert  NotificationPreferenceKey = "recurring_alert"
)

var AllNotificationPreferenceKeys = []NotificationPreferenceKey{
	PreferenceBudgetAlert,
	PreferencePartnerActivity,
	PreferenceWeeklySummary,
	PreferenceReminderAlert,
	PreferenceRecurringAlert,
}

type NotificationPreference struct {
	UserID string                    `gorm:"column:user_id;type:uuid;primaryKey"`
	User   User                      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Key    NotificationPreferenceKey `gorm:"column:key;type:varchar(30);primaryKey"`
	Enabled   bool      `gorm:"column:enabled;not null"`
	UpdatedAt time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (NotificationPreference) TableName() string {
	return "notification_preferences"
}
