package domain

import "time"

// IncomeSource is what an income came from. The set is closed: the service
// rejects anything Valid reports false for.
type IncomeSource string

const (
	IncomeSourceSalary     IncomeSource = "salary"
	IncomeSourceBonus      IncomeSource = "bonus"
	IncomeSourceFreelance  IncomeSource = "freelance"
	IncomeSourceGift       IncomeSource = "gift"
	IncomeSourceInvestment IncomeSource = "investment"
	IncomeSourceOther      IncomeSource = "other"
)

func (s IncomeSource) Valid() bool {
	switch s {
	case IncomeSourceSalary, IncomeSourceBonus, IncomeSourceFreelance,
		IncomeSourceGift, IncomeSourceInvestment, IncomeSourceOther:
		return true
	}
	return false
}

// Income is money received. Amount is always positive (at least 1); the
// account it landed in is optional, like on an expense.
type Income struct {
	ID     string `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID string `gorm:"column:user_id;type:uuid;index:idx_incomes_user_date,priority:1;not null"`
	User   User   `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	// Optional: nil means "no account".
	AccountID  *string      `gorm:"column:account_id;type:uuid;index:idx_incomes_account_date,priority:1"`
	Account    *Account     `gorm:"foreignKey:AccountID;constraint:OnDelete:SET NULL"`
	Source     IncomeSource `gorm:"size:20;not null"`
	Amount     int64        `gorm:"not null"`
	Note       *string      `gorm:"size:255"`
	IncomeDate time.Time    `gorm:"column:income_date;type:date;index:idx_incomes_user_date,priority:2;index:idx_incomes_account_date,priority:2;not null"`
	CreatedAt  time.Time    `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt  time.Time    `gorm:"column:updated_at;autoUpdateTime"`
}

func (Income) TableName() string {
	return "incomes"
}

// OwnerID satisfies service.Owned for the generic ownership-check helper.
func (i Income) OwnerID() string {
	return i.UserID
}
