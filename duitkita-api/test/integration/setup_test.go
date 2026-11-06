package integration_test

import (
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"duitkita-api/config"
	"duitkita-api/infrastructure"
	"duitkita-api/model/domain"
)

// These tests run real SQL against a real Postgres — the balance formula and
// the per-account report live in SQL, where a mocked repository proves
// nothing. They only run with DUITKITA_INTEGRATION=1, using the database
// configured in duitkita-api/.env (the local development database), so CI —
// which has no database — skips them. Everything a test writes happens in a
// transaction that is rolled back afterwards, so the database is left as it
// was found.
//
//	DUITKITA_INTEGRATION=1 go test ./test/integration/...
func openTx(t *testing.T) *gorm.DB {
	t.Helper()
	if os.Getenv("DUITKITA_INTEGRATION") != "1" {
		t.Skip("set DUITKITA_INTEGRATION=1 to run integration tests against the .env database")
	}
	_ = godotenv.Load("../../.env")
	cfg, err := config.Load()
	require.NoError(t, err)

	db, err := infrastructure.NewDatabase(cfg.Database)
	require.NoError(t, err)

	tx := db.Begin()
	require.NoError(t, tx.Error)
	t.Cleanup(func() {
		tx.Rollback()
		if sqlDB, err := db.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
	return tx
}

func date(t *testing.T, s string) time.Time {
	t.Helper()
	d, err := time.Parse("2006-01-02", s)
	require.NoError(t, err)
	return d
}

// fixture is the minimum an expense needs to exist: a user, a category, and
// that category's budget for the month the expenses fall in.
type fixture struct {
	tx          *gorm.DB
	userID      string
	categoryID  string
	budgetID    string
	institution domain.FinancialInstitution
}

func newFixture(t *testing.T, tx *gorm.DB, year, month int) *fixture {
	t.Helper()
	f := &fixture{tx: tx, userID: uuid.NewString(), categoryID: uuid.NewString(), budgetID: uuid.NewString()}

	require.NoError(t, tx.Create(&domain.User{ID: f.userID, Name: "Integration", Email: f.userID + "@example.test", PasswordHash: "x", IsVerified: true}).Error)
	require.NoError(t, tx.Create(&domain.Category{ID: f.categoryID, UserID: f.userID, Name: "Makan"}).Error)
	require.NoError(t, tx.Create(&domain.MonthlyBudget{ID: f.budgetID, UserID: f.userID, CategoryID: f.categoryID, Year: year, Month: month, TotalAmount: 10_000_000}).Error)

	f.institution = domain.FinancialInstitution{ID: uuid.NewString(), Code: "it-" + uuid.NewString()[:8], Name: "Bank Integrasi", Type: domain.InstitutionTypeBank, IsActive: true}
	require.NoError(t, tx.Create(&f.institution).Error)
	return f
}

func (f *fixture) account(t *testing.T, name string, opening *int64, openingDate string) *domain.Account {
	t.Helper()
	acc := &domain.Account{ID: uuid.NewString(), UserID: f.userID, InstitutionID: f.institution.ID, Name: name, OpeningBalance: opening}
	if openingDate != "" {
		d := date(t, openingDate)
		acc.OpeningBalanceDate = &d
	}
	require.NoError(t, f.tx.Omit("User", "Institution").Create(acc).Error)
	return acc
}

func (f *fixture) expense(t *testing.T, accountID *string, amount int64, on string) *domain.Expense {
	t.Helper()
	e := &domain.Expense{ID: uuid.NewString(), UserID: f.userID, CategoryID: f.categoryID, MonthlyBudgetID: f.budgetID, AccountID: accountID, Amount: amount, ExpenseDate: date(t, on)}
	require.NoError(t, f.tx.Omit("User", "Category", "MonthlyBudget", "Account").Create(e).Error)
	return e
}

func int64Ptr(v int64) *int64 { return &v }
