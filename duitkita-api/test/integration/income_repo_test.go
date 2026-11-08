package integration_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/repository"
)

func incomeIDs(incomes []domain.Income) []string {
	ids := make([]string, 0, len(incomes))
	for _, i := range incomes {
		ids = append(ids, i.ID)
	}
	return ids
}

func setIncomeSource(t *testing.T, f *fixture, i *domain.Income, source domain.IncomeSource) {
	t.Helper()
	require.NoError(t, f.tx.Model(&domain.Income{}).Where("id = ?", i.ID).Update("source", source).Error)
}

func TestIncomeRepository(t *testing.T) {
	ctx := context.Background()

	t.Run("filters each narrow the list and the total agrees", func(t *testing.T) {
		tx := openTx(t)
		f := newFixture(t, tx, 2026, 10)
		repo := repository.NewIncomeRepository(tx)
		accA := f.account(t, "A", nil, "")
		accB := f.account(t, "B", nil, "")

		salaryA := f.income(t, &accA.ID, 5_000_000, "2026-10-25")
		bonusA := f.income(t, &accA.ID, 1_000_000, "2026-10-10")
		giftB := f.income(t, &accB.ID, 200_000, "2026-09-15")
		noAccount := f.income(t, nil, 300_000, "2026-11-02")
		setIncomeSource(t, f, bonusA, domain.IncomeSourceBonus)
		setIncomeSource(t, f, giftB, domain.IncomeSourceGift)

		cases := []struct {
			name   string
			filter repository.IncomeFilter
			want   []string
			sum    int64
		}{
			{"no filter", repository.IncomeFilter{}, []string{noAccount.ID, salaryA.ID, bonusA.ID, giftB.ID}, 6_500_000},
			{"account", repository.IncomeFilter{AccountID: accA.ID}, []string{salaryA.ID, bonusA.ID}, 6_000_000},
			{"other account", repository.IncomeFilter{AccountID: accB.ID}, []string{giftB.ID}, 200_000},
			{"source", repository.IncomeFilter{Source: "bonus"}, []string{bonusA.ID}, 1_000_000},
			{"from", repository.IncomeFilter{From: "2026-10-10"}, []string{noAccount.ID, salaryA.ID, bonusA.ID}, 6_300_000},
			{"to", repository.IncomeFilter{To: "2026-10-10"}, []string{bonusA.ID, giftB.ID}, 1_200_000},
			{"from and to", repository.IncomeFilter{From: "2026-10-01", To: "2026-10-31"}, []string{salaryA.ID, bonusA.ID}, 6_000_000},
			{"combined", repository.IncomeFilter{AccountID: accA.ID, Source: "salary", From: "2026-10-01"}, []string{salaryA.ID}, 5_000_000},
			{"matches nothing", repository.IncomeFilter{Source: "freelance"}, []string{}, 0},
		}
		for _, tc := range cases {
			t.Run(tc.name, func(t *testing.T) {
				got, err := repo.FindAllByUserID(ctx, f.userID, tc.filter)
				require.NoError(t, err)
				require.Equal(t, tc.want, incomeIDs(got))

				var sum int64
				for _, i := range got {
					sum += i.Amount
				}
				require.Equal(t, tc.sum, sum)

				// Total is the sum of amounts (rupiah), not a row count.
				total, err := repo.Total(ctx, f.userID, tc.filter)
				require.NoError(t, err)
				require.Equal(t, tc.sum, total)
			})
		}
	})

	t.Run("total is the sum of amounts and ignores limit and offset", func(t *testing.T) {
		tx := openTx(t)
		f := newFixture(t, tx, 2026, 10)
		repo := repository.NewIncomeRepository(tx)
		f.income(t, nil, 100_000, "2026-10-01")
		f.income(t, nil, 250_000, "2026-10-02")
		f.income(t, nil, 40_000, "2026-10-03")

		page, err := repo.FindAllByUserID(ctx, f.userID, repository.IncomeFilter{Limit: 1, Offset: 1})
		require.NoError(t, err)
		require.Len(t, page, 1)

		total, err := repo.Total(ctx, f.userID, repository.IncomeFilter{Limit: 1, Offset: 1})
		require.NoError(t, err)
		require.Equal(t, int64(390_000), total)

		total, err = repo.Total(ctx, f.userID, repository.IncomeFilter{Limit: 1, From: "2026-10-02"})
		require.NoError(t, err)
		require.Equal(t, int64(290_000), total)
	})

	t.Run("orders by income_date then created_at, newest first", func(t *testing.T) {
		tx := openTx(t)
		f := newFixture(t, tx, 2026, 10)
		repo := repository.NewIncomeRepository(tx)
		oldest := f.income(t, nil, 100, "2026-10-01")
		sameDayFirst := f.income(t, nil, 200, "2026-10-20")
		sameDaySecond := f.income(t, nil, 300, "2026-10-20")
		newest := f.income(t, nil, 400, "2026-10-28")

		got, err := repo.FindAllByUserID(ctx, f.userID, repository.IncomeFilter{})

		require.NoError(t, err)
		require.Equal(t, []string{newest.ID, sameDaySecond.ID, sameDayFirst.ID, oldest.ID}, incomeIDs(got))
	})

	t.Run("rows carry the account and its institution", func(t *testing.T) {
		tx := openTx(t)
		f := newFixture(t, tx, 2026, 10)
		repo := repository.NewIncomeRepository(tx)
		acc := f.account(t, "BCA", nil, "")
		f.income(t, &acc.ID, 100, "2026-10-01")
		f.income(t, nil, 200, "2026-10-02")

		got, err := repo.FindAllByUserID(ctx, f.userID, repository.IncomeFilter{})

		require.NoError(t, err)
		require.Len(t, got, 2)
		require.Nil(t, got[0].Account)
		require.NotNil(t, got[1].Account)
		require.Equal(t, "BCA", got[1].Account.Name)
		require.Equal(t, f.institution.ID, got[1].Account.Institution.ID)
		require.Equal(t, "Bank Integrasi", got[1].Account.Institution.Name)
	})

	t.Run("update to no account persists nil", func(t *testing.T) {
		tx := openTx(t)
		f := newFixture(t, tx, 2026, 10)
		repo := repository.NewIncomeRepository(tx)
		acc := f.account(t, "BCA", nil, "")
		income := f.income(t, &acc.ID, 100, "2026-10-01")

		loaded, err := repo.FindByID(ctx, income.ID)
		require.NoError(t, err)
		require.NotNil(t, loaded)
		require.NotNil(t, loaded.AccountID)
		require.NotNil(t, loaded.Account)

		loaded.AccountID = nil
		loaded.Account = nil
		loaded.Amount = 250
		require.NoError(t, repo.Update(ctx, loaded))

		reloaded, err := repo.FindByID(ctx, income.ID)
		require.NoError(t, err)
		require.NotNil(t, reloaded)
		require.Nil(t, reloaded.AccountID)
		require.Nil(t, reloaded.Account)
		require.Equal(t, int64(250), reloaded.Amount)
	})

	t.Run("another user's incomes never appear", func(t *testing.T) {
		tx := openTx(t)
		mine := newFixture(t, tx, 2026, 10)
		theirs := newFixture(t, tx, 2026, 10)
		repo := repository.NewIncomeRepository(tx)
		own := mine.income(t, nil, 40_000, "2026-10-01")
		theirs.income(t, nil, 999, "2026-10-01")

		got, err := repo.FindAllByUserID(ctx, mine.userID, repository.IncomeFilter{})
		require.NoError(t, err)
		require.Equal(t, []string{own.ID}, incomeIDs(got))

		total, err := repo.Total(ctx, mine.userID, repository.IncomeFilter{})
		require.NoError(t, err)
		require.Equal(t, int64(40_000), total)
	})
}
