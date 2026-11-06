package domain

import "time"

// Account is one place a user keeps money — a specific bank account,
// e-wallet, or cash — and what an expense can be tagged as coming from.
// The balance is optional: OpeningBalance and OpeningBalanceDate are set
// together or not at all, and the current balance is never stored, only
// computed (see AccountRepository.Balances). Accounts are archived, never
// deleted, so past expenses keep pointing at a named account.
type Account struct {
	ID                 string               `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID             string               `gorm:"column:user_id;type:uuid;index;not null"`
	User               User                 `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE"`
	InstitutionID      string               `gorm:"column:institution_id;type:uuid;not null"`
	Institution        FinancialInstitution `gorm:"foreignKey:InstitutionID"`
	Name               string               `gorm:"size:100;not null"`
	OpeningBalance     *int64               `gorm:"column:opening_balance"`
	OpeningBalanceDate *time.Time           `gorm:"column:opening_balance_date;type:date"`
	ArchivedAt         *time.Time           `gorm:"column:archived_at"`
	CreatedAt          time.Time            `gorm:"column:created_at;autoCreateTime"`
	UpdatedAt          time.Time            `gorm:"column:updated_at;autoUpdateTime"`
}

func (Account) TableName() string {
	return "accounts"
}

// OwnerID satisfies service.Owned for the generic ownership-check helper.
func (a Account) OwnerID() string {
	return a.UserID
}

func (a Account) IsArchived() bool {
	return a.ArchivedAt != nil
}

func (a Account) HasOpeningBalance() bool {
	return a.OpeningBalance != nil
}
