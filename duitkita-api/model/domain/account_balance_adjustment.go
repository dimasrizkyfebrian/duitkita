package domain

import "time"

// AccountBalanceAdjustment records a "Sesuaikan saldo": the user typed in
// their real balance, and Delta is how far the computed balance was off at
// that moment. Append-only — the computed balance sums every Delta, so
// editing or removing a row would silently rewrite history.
type AccountBalanceAdjustment struct {
	ID              string    `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	AccountID       string    `gorm:"column:account_id;type:uuid;index;not null"`
	Account         Account   `gorm:"foreignKey:AccountID;constraint:OnDelete:CASCADE"`
	PreviousBalance int64     `gorm:"column:previous_balance;not null"`
	NewBalance      int64     `gorm:"column:new_balance;not null"`
	Delta           int64     `gorm:"not null"`
	Note            *string   `gorm:"size:255"`
	CreatedAt       time.Time `gorm:"column:created_at;autoCreateTime"`
}

func (AccountBalanceAdjustment) TableName() string {
	return "account_balance_adjustments"
}
