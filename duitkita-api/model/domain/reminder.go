package domain

import "time"

type BillReminderStatus string

const (
	BillReminderStatusUpcoming BillReminderStatus = "upcoming"
	BillReminderStatusOverdue  BillReminderStatus = "overdue"
	BillReminderStatusDone     BillReminderStatus = "done"
)

// BillReminder mirrors `bill_reminders`.
type BillReminder struct {
	ID               string             `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID           string             `gorm:"column:user_id;type:uuid;index;not null"`
	User             User               `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	Title            string             `gorm:"size:120;not null"`
	Amount           *int64             `gorm:""`
	DueDate          time.Time          `gorm:"column:due_date;type:date;index;not null"`
	RemindBeforeDays int                `gorm:"column:remind_before_days;default:1"`
	Status           BillReminderStatus `gorm:"type:varchar(10);default:'upcoming';not null"`
	SnoozedUntil     *time.Time         `gorm:"column:snoozed_until;type:date"`
	IsRecurring      bool               `gorm:"column:is_recurring;default:false"`
	RecurringRule    *string            `gorm:"column:recurring_rule;size:64"`
	CreatedAt        time.Time          `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt        time.Time          `gorm:"column:updated_at;autoUpdateTime"`
}

func (BillReminder) TableName() string {
	return "bill_reminders"
}
