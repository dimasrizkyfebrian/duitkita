package integration_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/repository"
)

// txAt is a precise instant: the cursor keys on created_at, so these tests
// pin it explicitly instead of trusting insertion order.
func txAt(t *testing.T, s string) time.Time {
	t.Helper()
	at, err := time.Parse(time.RFC3339, s)
	require.NoError(t, err)
	return at
}

func (f *fixture) expenseAt(t *testing.T, id string, accountID *string, amount int64, on string, createdAt time.Time) {
	t.Helper()
	e := &domain.Expense{ID: id, UserID: f.userID, CategoryID: f.categoryID, MonthlyBudgetID: f.budgetID, AccountID: accountID, Amount: amount, ExpenseDate: date(t, on), CreatedAt: createdAt}
	require.NoError(t, f.tx.Omit("User", "Category", "MonthlyBudget", "Account").Create(e).Error)
}

func (f *fixture) incomeAt(t *testing.T, id string, accountID *string, amount int64, on string, createdAt time.Time) {
	t.Helper()
	i := &domain.Income{ID: id, UserID: f.userID, AccountID: accountID, Source: domain.IncomeSourceSalary, Amount: amount, IncomeDate: date(t, on), CreatedAt: createdAt}
	require.NoError(t, f.tx.Omit("User", "Account").Create(i).Error)
}

func (f *fixture) adjustmentAt(t *testing.T, id, accountID string, delta int64, createdAt time.Time) {
	t.Helper()
	a := &domain.AccountBalanceAdjustment{ID: id, AccountID: accountID, PreviousBalance: 0, NewBalance: delta, Delta: delta, CreatedAt: createdAt}
	require.NoError(t, f.tx.Omit("Account").Create(a).Error)
}

func TestAccountTransactions(t *testing.T) {
	ctx := context.Background()

	// Fixed ids so the third sort key (id DESC) is decided by us, not by luck.
	const (
		idHigh = "ffffffff-ffff-4fff-8fff-fffffffffff0"
		idLow  = "00000000-0000-4000-8000-000000000001"
	)

	type want struct {
		id, kind, date, label string
		amount                int64
	}

	// seed builds one account with eight rows over four dates, plus noise that
	// belongs to nobody we ask about. It returns the account id and the rows
	// in the order the endpoint has to deliver them.
	seed := func(t *testing.T) (*fixture, string, []want) {
		tx := openTx(t)
		f := newFixture(t, tx, 2026, 10)
		acc := f.account(t, "BCA", int64Ptr(1_000_000), "2026-10-10")
		other := f.account(t, "Other", int64Ptr(5), "2026-10-01")

		sameDayAdj := uuid.NewString()
		wibAdj := uuid.NewString()
		oldExpense := uuid.NewString()
		note := "gaji tambahan"

		// 2026-10-20: two incomes tied on date AND created_at, two expenses
		// tied likewise, and an adjustment made earlier that same UTC day.
		f.incomeAt(t, idHigh, &acc.ID, 50_000, "2026-10-20", txAt(t, "2026-10-20T11:00:00Z"))
		f.incomeAt(t, idLow, &acc.ID, 7_000, "2026-10-20", txAt(t, "2026-10-20T11:00:00Z"))
		f.expenseAt(t, idHigh[:35]+"1", &acc.ID, 10_000, "2026-10-20", txAt(t, "2026-10-20T09:00:00Z"))
		f.expenseAt(t, idLow[:35]+"2", &acc.ID, 4_000, "2026-10-20", txAt(t, "2026-10-20T09:00:00Z"))
		f.adjustmentAt(t, sameDayAdj, acc.ID, -3_000, txAt(t, "2026-10-20T08:00:00Z"))
		// 20:00 UTC on the 12th is 03:00 on the 13th in Jakarta.
		f.adjustmentAt(t, wibAdj, acc.ID, 4_000, txAt(t, "2026-10-12T20:00:00Z"))
		// An older date that was created LAST: date must outrank created_at.
		f.expenseAt(t, oldExpense, &acc.ID, 2_000, "2026-10-05", txAt(t, "2026-10-30T00:00:00Z"))
		// Dated before the opening balance, still listed.
		f.incomeAt(t, uuid.NewString(), &acc.ID, 1, "2026-10-04", txAt(t, "2026-10-04T00:00:00Z"))
		require.NoError(t, f.tx.Model(&domain.Income{}).Where("id = ?", idHigh).Update("note", note).Error)

		// Noise: another account, no account at all, another user's account.
		f.expenseAt(t, uuid.NewString(), &other.ID, 99, "2026-10-20", txAt(t, "2026-10-20T10:00:00Z"))
		f.incomeAt(t, uuid.NewString(), &other.ID, 98, "2026-10-20", txAt(t, "2026-10-20T10:00:00Z"))
		f.adjustmentAt(t, uuid.NewString(), other.ID, 97, txAt(t, "2026-10-20T10:00:00Z"))
		f.expenseAt(t, uuid.NewString(), nil, 96, "2026-10-20", txAt(t, "2026-10-20T10:00:00Z"))
		stranger := newFixture(t, tx, 2026, 10)
		strangerAcc := stranger.account(t, "Stranger", int64Ptr(1), "2026-10-01")
		stranger.expenseAt(t, uuid.NewString(), &strangerAcc.ID, 95, "2026-10-20", txAt(t, "2026-10-20T10:00:00Z"))

		return f, acc.ID, []want{
			{idHigh, "income", "2026-10-20", "salary", 50_000},
			{idLow, "income", "2026-10-20", "salary", 7_000},
			{idHigh[:35] + "1", "expense", "2026-10-20", "Makan", -10_000},
			{idLow[:35] + "2", "expense", "2026-10-20", "Makan", -4_000},
			{sameDayAdj, "adjustment", "2026-10-20", "", -3_000},
			{wibAdj, "adjustment", "2026-10-13", "", 4_000},
			{oldExpense, "expense", "2026-10-05", "Makan", -2_000},
		}
	}

	project := func(rows []repository.AccountTransactionRow) []want {
		out := make([]want, 0, len(rows))
		for _, r := range rows {
			out = append(out, want{r.ID, r.Kind, r.Date.Format("2006-01-02"), r.Label, r.Amount})
		}
		return out
	}

	// All but the pre-opening income, which has a random id and is checked
	// separately: it is always last.
	t.Run("one page returns the account's rows only, ordered and signed", func(t *testing.T) {
		f, accountID, expected := seed(t)
		repo := repository.NewAccountRepository(f.tx)

		rows, err := repo.ListTransactions(ctx, accountID, 100, nil)

		require.NoError(t, err)
		require.Len(t, rows, len(expected)+1)
		require.Equal(t, expected, project(rows[:len(expected)]))
		last := rows[len(rows)-1]
		require.Equal(t, "income", last.Kind)
		require.Equal(t, "2026-10-04", last.Date.Format("2006-01-02"))
		require.Equal(t, int64(1), last.Amount)

		// Notes travel with the row; the others have none.
		require.NotNil(t, rows[0].Note)
		require.Equal(t, "gaji tambahan", *rows[0].Note)
		require.Nil(t, rows[1].Note)
	})

	t.Run("an adjustment is dated by its created_at in Jakarta, not UTC", func(t *testing.T) {
		f, accountID, expected := seed(t)
		repo := repository.NewAccountRepository(f.tx)

		rows, err := repo.ListTransactions(ctx, accountID, 100, nil)

		require.NoError(t, err)
		var wib, sameDay *repository.AccountTransactionRow
		for i := range rows {
			if rows[i].ID == expected[5].id {
				wib = &rows[i]
			}
			if rows[i].ID == expected[4].id {
				sameDay = &rows[i]
			}
		}
		require.NotNil(t, wib)
		require.NotNil(t, sameDay)
		require.Equal(t, "2026-10-13", wib.Date.Format("2006-01-02"))
		require.True(t, wib.CreatedAt.Equal(txAt(t, "2026-10-12T20:00:00Z")))
		// 08:00 UTC is 15:00 WIB: same calendar day either way.
		require.Equal(t, "2026-10-20", sameDay.Date.Format("2006-01-02"))
	})

	for _, limit := range []int{1, 2, 3, 4} {
		t.Run(fmt.Sprintf("paging by %d visits every row exactly once, in order", limit), func(t *testing.T) {
			f, accountID, expected := seed(t)
			repo := repository.NewAccountRepository(f.tx)

			full, err := repo.ListTransactions(ctx, accountID, 100, nil)
			require.NoError(t, err)

			var collected []repository.AccountTransactionRow
			var cursor *repository.TransactionCursor
			for pages := 0; ; pages++ {
				require.Less(t, pages, 20, "paging does not terminate")
				page, err := repo.ListTransactions(ctx, accountID, limit, cursor)
				require.NoError(t, err)
				require.LessOrEqual(t, len(page), limit)
				if len(page) == 0 {
					break
				}
				collected = append(collected, page...)
				last := page[len(page)-1]
				cursor = &repository.TransactionCursor{Date: last.Date, CreatedAt: last.CreatedAt, ID: last.ID}
			}

			require.Len(t, collected, len(expected)+1)
			require.Equal(t, rowIDs(full), rowIDs(collected))
			require.Equal(t, expected, project(collected[:len(expected)]))
		})
	}

	t.Run("a cursor on a tied row resumes at its id neighbour", func(t *testing.T) {
		f, accountID, _ := seed(t)
		repo := repository.NewAccountRepository(f.tx)

		// idHigh and idLow share date and created_at; only id separates them.
		rows, err := repo.ListTransactions(ctx, accountID, 1, &repository.TransactionCursor{
			Date: date(t, "2026-10-20"), CreatedAt: txAt(t, "2026-10-20T11:00:00Z"), ID: idHigh,
		})

		require.NoError(t, err)
		require.Len(t, rows, 1)
		require.Equal(t, idLow, rows[0].ID)
	})

	t.Run("a cursor excludes rows dated after it even when created later", func(t *testing.T) {
		f, accountID, expected := seed(t)
		repo := repository.NewAccountRepository(f.tx)

		// The 10-05 expense was created on the 30th, after everything else.
		// Resuming after the Jakarta-dated adjustment must still reach it.
		wib := expected[5]
		rows, err := repo.ListTransactions(ctx, accountID, 1, &repository.TransactionCursor{
			Date: date(t, wib.date), CreatedAt: txAt(t, "2026-10-12T20:00:00Z"), ID: wib.id,
		})

		require.NoError(t, err)
		require.Len(t, rows, 1)
		require.Equal(t, expected[6].id, rows[0].ID)
	})

	t.Run("an account with nothing returns an empty page", func(t *testing.T) {
		tx := openTx(t)
		f := newFixture(t, tx, 2026, 10)
		acc := f.account(t, "Empty", int64Ptr(0), "2026-10-01")
		repo := repository.NewAccountRepository(tx)

		rows, err := repo.ListTransactions(ctx, acc.ID, 20, nil)

		require.NoError(t, err)
		require.Empty(t, rows)
	})
}

func rowIDs(rows []repository.AccountTransactionRow) []string {
	ids := make([]string, 0, len(rows))
	for _, r := range rows {
		ids = append(ids, r.ID)
	}
	return ids
}
