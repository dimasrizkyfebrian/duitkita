package integration_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/repository"
)

func TestAccountBalance(t *testing.T) {
	tx := openTx(t)
	ctx := context.Background()
	f := newFixture(t, tx, 2026, 10)
	repo := repository.NewAccountRepository(tx)

	bca := f.account(t, "BCA", int64Ptr(1_000_000), "2026-10-10")
	label := f.account(t, "OVO", nil, "")

	spent := f.expense(t, &bca.ID, 100_000, "2026-10-12")
	f.expense(t, &bca.ID, 50_000, "2026-10-05")   // before the opening date: already reflected in it
	f.expense(t, &bca.ID, 25_000, "2026-10-10")   // on the opening date: counts
	f.expense(t, &label.ID, 70_000, "2026-10-12") // balance-less account: nothing to compute
	f.expense(t, nil, 30_000, "2026-10-12")       // no account at all

	balances, err := repo.Balances(ctx, []string{bca.ID, label.ID})
	require.NoError(t, err)
	require.Equal(t, int64(875_000), balances[bca.ID])
	_, hasLabel := balances[label.ID]
	require.False(t, hasLabel, "an account without an opening balance has no balance")

	t.Run("adjustment diffs against the computed balance", func(t *testing.T) {
		adj, err := repo.AdjustBalance(ctx, bca.ID, 850_000, nil)
		require.NoError(t, err)
		require.Equal(t, int64(875_000), adj.PreviousBalance)
		require.Equal(t, int64(-25_000), adj.Delta)

		balances, err := repo.Balances(ctx, []string{bca.ID})
		require.NoError(t, err)
		require.Equal(t, int64(850_000), balances[bca.ID])
	})

	t.Run("editing and deleting an expense moves the balance", func(t *testing.T) {
		require.NoError(t, tx.Model(spent).Update("amount", 200_000).Error)
		balances, err := repo.Balances(ctx, []string{bca.ID})
		require.NoError(t, err)
		require.Equal(t, int64(750_000), balances[bca.ID])

		require.NoError(t, tx.Delete(spent).Error)
		balances, err = repo.Balances(ctx, []string{bca.ID})
		require.NoError(t, err)
		require.Equal(t, int64(950_000), balances[bca.ID])
	})

	t.Run("adjustment refused without an opening balance", func(t *testing.T) {
		_, err := repo.AdjustBalance(ctx, label.ID, 10, nil)
		require.Error(t, err)
	})

	t.Run("history is newest first", func(t *testing.T) {
		_, err := repo.AdjustBalance(ctx, bca.ID, 900_000, nil)
		require.NoError(t, err)
		adjustments, err := repo.FindAdjustments(ctx, bca.ID)
		require.NoError(t, err)
		require.Len(t, adjustments, 2)
		require.Equal(t, int64(900_000), adjustments[0].NewBalance)
	})
}

func TestExpenseAccountPreload(t *testing.T) {
	tx := openTx(t)
	ctx := context.Background()
	f := newFixture(t, tx, 2026, 10)
	expenseRepo := repository.NewExpenseRepository(tx)

	bca := f.account(t, "BCA", nil, "")
	f.expense(t, &bca.ID, 10_000, "2026-10-12")
	f.expense(t, nil, 20_000, "2026-10-13")

	byAccount, err := expenseRepo.FindAllByUserID(ctx, f.userID, repository.ExpenseFilter{AccountID: bca.ID, WithAccount: true})
	require.NoError(t, err)
	require.Len(t, byAccount, 1)
	require.Equal(t, "Bank Integrasi", byAccount[0].Account.Institution.Name)

	// A partner's list doesn't ask for accounts, so none are loaded.
	plain, err := expenseRepo.FindAllByUserID(ctx, f.userID, repository.ExpenseFilter{AccountID: bca.ID})
	require.NoError(t, err)
	require.Len(t, plain, 1)
	require.Nil(t, plain[0].Account)

	// Saving an expense that carries a preloaded account must not write the
	// account (or its institution) back.
	byAccount[0].Account.Name = "should not be saved"
	byAccount[0].Amount = 15_000
	require.NoError(t, expenseRepo.Update(ctx, &byAccount[0]))

	var name string
	require.NoError(t, tx.Raw("SELECT name FROM accounts WHERE id = ?", bca.ID).Scan(&name).Error)
	require.Equal(t, "BCA", name)

	all, err := expenseRepo.FindAllByBudgetID(ctx, f.budgetID)
	require.NoError(t, err)
	require.Len(t, all, 2)
}

func TestSpentByAccount(t *testing.T) {
	tx := openTx(t)
	ctx := context.Background()
	f := newFixture(t, tx, 2026, 10)
	reportRepo := repository.NewReportRepository(tx)

	bca := f.account(t, "BCA", int64Ptr(1_000_000), "2026-10-10")
	old := f.account(t, "Lama", nil, "")
	require.NoError(t, tx.Model(old).Update("archived_at", date(t, "2026-10-20")).Error)

	f.expense(t, &bca.ID, 100_000, "2026-10-12")
	f.expense(t, &bca.ID, 50_000, "2026-10-05") // before the opening date: still spending from BCA this month
	f.expense(t, &old.ID, 40_000, "2026-10-15") // archived since, but the spending happened
	f.expense(t, nil, 30_000, "2026-10-12")
	f.expense(t, &bca.ID, 999_000, "2026-11-01") // other month

	rows, err := reportRepo.SpentByAccountForPeriod(ctx, f.userID, 2026, 10)
	require.NoError(t, err)
	require.Len(t, rows, 3)

	require.Equal(t, bca.ID, *rows[0].AccountID)
	require.Equal(t, int64(150_000), rows[0].Total)
	require.Equal(t, "Bank Integrasi", *rows[0].InstitutionName)

	require.Equal(t, old.ID, *rows[1].AccountID)
	require.True(t, rows[1].Archived)

	require.Nil(t, rows[2].AccountID)
	require.Equal(t, int64(30_000), rows[2].Total)
}

func TestAccountListOrder(t *testing.T) {
	tx := openTx(t)
	ctx := context.Background()
	f := newFixture(t, tx, 2026, 10)
	repo := repository.NewAccountRepository(tx)

	archived := f.account(t, "Lama", nil, "")
	require.NoError(t, tx.Model(archived).Update("archived_at", date(t, "2026-10-01")).Error)
	active := f.account(t, "Baru", nil, "")

	all, err := repo.FindAllByUserID(ctx, f.userID, true)
	require.NoError(t, err)
	require.Len(t, all, 2)
	require.Equal(t, active.ID, all[0].ID, "active accounts come before archived ones")
	require.Equal(t, "Bank Integrasi", all[0].Institution.Name)

	onlyActive, err := repo.FindAllByUserID(ctx, f.userID, false)
	require.NoError(t, err)
	require.Len(t, onlyActive, 1)
}

func TestRecurringFindActive(t *testing.T) {
	tx := openTx(t)
	ctx := context.Background()
	f := newFixture(t, tx, 2026, 10)
	repo := repository.NewRecurringExpenseRepository(tx)

	schedule := func(amount int64) *domain.RecurringExpense {
		re := &domain.RecurringExpense{
			ID: uuid.NewString(), UserID: f.userID, CategoryID: f.categoryID, Amount: amount,
			ScheduleType: domain.RecurringScheduleMonthly, ScheduleDay: 1, NextRunAt: date(t, "2026-11-01"), IsActive: true,
		}
		require.NoError(t, tx.Omit("User", "Category", "Account").Create(re).Error)
		return re
	}
	active := schedule(100_000)
	paused := schedule(200_000)
	// is_active defaults to true, so a false on Create would be dropped.
	require.NoError(t, tx.Model(paused).Update("is_active", false).Error)

	got, err := repo.FindActiveByUserID(ctx, f.userID)
	require.NoError(t, err)
	require.Len(t, got, 1)
	require.Equal(t, active.ID, got[0].ID)
}
