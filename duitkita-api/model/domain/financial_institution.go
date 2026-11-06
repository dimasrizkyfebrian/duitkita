package domain

type InstitutionType string

const (
	InstitutionTypeBank    InstitutionType = "bank"
	InstitutionTypeEwallet InstitutionType = "ewallet"
	InstitutionTypeCash    InstitutionType = "cash"
)

// FinancialInstitution is master data — a bank, e-wallet, or cash — seeded
// by hand via docs/sql/003_seed_institutions.sql rather than managed through
// the API, since new ones appear rarely. One row per place a balance can
// live, so a digital spin-off with its own app and account (blu, wondr) is
// its own row, separate from its parent bank.
type FinancialInstitution struct {
	ID        string          `gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Code      string          `gorm:"size:50;uniqueIndex;not null"`
	Name      string          `gorm:"size:100;not null"`
	Type      InstitutionType `gorm:"type:varchar(10);not null"`
	LogoPath  *string         `gorm:"column:logo_path;size:255"`
	SortOrder int             `gorm:"column:sort_order;not null;default:0"`
	IsActive  bool            `gorm:"column:is_active;not null;default:true"`
}

func (FinancialInstitution) TableName() string {
	return "financial_institutions"
}
