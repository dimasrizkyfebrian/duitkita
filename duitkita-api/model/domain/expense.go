package domain

import "time"

type Expense struct {
	ID              string        `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID          string        `gorm:"column:user_id;type:uuid;index:idx_expenses_user_date,priority:1;not null"`
	User            User          `gorm:"foreignKey:UserID"`
	CategoryID      string        `gorm:"column:category_id;type:uuid;not null"`
	Category        Category      `gorm:"foreignKey:CategoryID"`
	MonthlyBudgetID string        `gorm:"column:monthly_budget_id;type:uuid;index;not null"`
	MonthlyBudget   MonthlyBudget `gorm:"foreignKey:MonthlyBudgetID"`
	Amount          int64         `gorm:"not null"`
	Note            *string       `gorm:"size:255"`
	ExpenseDate     time.Time     `gorm:"column:expense_date;type:date;index:idx_expenses_user_date,priority:2;not null"`
	CreatedAt       time.Time     `gorm:"column:created_at;autoCreateTime"`
}

func (Expense) TableName() string {
	return "expenses"
}

// OwnerID satisfies service.Owned for the generic ownership-check helper.
func (e Expense) OwnerID() string {
	return e.UserID
}
