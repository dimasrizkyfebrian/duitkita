package domain

import "time"

type RecurringScheduleType string

const (
	RecurringScheduleWeekly  RecurringScheduleType = "weekly"
	RecurringScheduleMonthly RecurringScheduleType = "monthly"
)

// RecurringExpense mirrors `recurring_expenses`.
// ScheduleDay: for weekly, 0-6 (Sun-Sat); for monthly, 1-31.
type RecurringExpense struct {
	ID           string                `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID       string                `gorm:"column:user_id;type:uuid;index;not null"`
	User         User                  `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	CategoryID   string                `gorm:"column:category_id;type:uuid;not null"`
	Category     Category              `gorm:"foreignKey:CategoryID;constraint:OnDelete:CASCADE"`
	Amount       int64                 `gorm:"not null"`
	Note         *string               `gorm:"size:255"`
	ScheduleType RecurringScheduleType `gorm:"column:schedule_type;type:varchar(10);not null"`
	ScheduleDay  int                   `gorm:"column:schedule_day;not null"`
	NextRunAt    time.Time             `gorm:"column:next_run_at;index;not null"`
	LastRunAt    *time.Time            `gorm:"column:last_run_at"`
	IsActive     bool                  `gorm:"column:is_active;default:true"`
	CreatedAt    time.Time             `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt    time.Time             `gorm:"column:updated_at;autoUpdateTime"`
}

func (RecurringExpense) TableName() string {
	return "recurring_expenses"
}
