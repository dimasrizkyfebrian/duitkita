package domain

import "time"

type MonthlyBudget struct {
	ID             string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID         string    `gorm:"column:user_id;type:uuid;index;not null;uniqueIndex:idx_budgets_user_category_period"`
	User           User      `gorm:"foreignKey:UserID"`
	CategoryID     string    `gorm:"column:category_id;type:uuid;not null;uniqueIndex:idx_budgets_user_category_period"`
	Category       Category  `gorm:"foreignKey:CategoryID"`
	Year           int       `gorm:"not null;uniqueIndex:idx_budgets_user_category_period"`
	Month          int       `gorm:"not null;uniqueIndex:idx_budgets_user_category_period"`
	BaseAmount     int64     `gorm:"column:base_amount;default:0"`
	RolloverAmount int64     `gorm:"column:rollover_amount;default:0"`
	TotalAmount    int64     `gorm:"column:total_amount;default:0"`
	IsFinalized    bool      `gorm:"column:is_finalized;default:false"`
	CreatedAt      time.Time `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt      time.Time `gorm:"column:updated_at;autoUpdateTime"`
}

func (MonthlyBudget) TableName() string {
	return "monthly_budgets"
}
