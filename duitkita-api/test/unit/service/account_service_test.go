package service_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
)

func newAccountService(t *testing.T) (service.AccountService, *mocks.AccountRepository, *mocks.InstitutionRepository) {
	repo := mocks.NewAccountRepository(t)
	institutionRepo := mocks.NewInstitutionRepository(t)
	// Unreachable rather than mocked — cache invalidation is best-effort. See
	// expense_service_test.go.
	redisClient := redis.NewClient(&redis.Options{
		Addr:        "127.0.0.1:1",
		MaxRetries:  -1,
		DialTimeout: 100 * time.Millisecond,
	})
	t.Cleanup(func() { _ = redisClient.Close() })
	return service.NewAccountService(repo, institutionRepo, redisClient), repo, institutionRepo
}

func int64Ptr(v int64) *int64 { return &v }

func datePtr(s string) *time.Time {
	d, _ := time.Parse("2006-01-02", s)
	return &d
}

var bca = domain.FinancialInstitution{ID: "inst-bca", Code: "bca", Name: "BCA", Type: domain.InstitutionTypeBank, IsActive: true}

func TestAccountService_Create(t *testing.T) {
	t.Run("defaults opening date to today when balance given", func(t *testing.T) {
		svc, repo, institutionRepo := newAccountService(t)
		institutionRepo.EXPECT().FindByID(context.Background(), "inst-bca").Return(&bca, nil)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Account]()).RunAndReturn(func(_ context.Context, a *domain.Account) error {
			require.Equal(t, "user-1", a.UserID)
			require.Equal(t, "BCA Utama", a.Name)
			require.Equal(t, int64(2_000_000), *a.OpeningBalance)
			require.Equal(t, time.Now().UTC().Format("2006-01-02"), a.OpeningBalanceDate.Format("2006-01-02"))
			return nil
		})
		repo.EXPECT().Balances(context.Background(), mockMatchByType[[]string]()).Return(map[string]int64{}, nil).Maybe()

		res, err := svc.Create(context.Background(), "user-1", request.CreateAccountRequest{
			InstitutionID: "inst-bca", Name: "BCA Utama", OpeningBalance: int64Ptr(2_000_000),
		})

		require.NoError(t, err)
		require.Equal(t, "bca", res.Institution.Code)
		require.Equal(t, time.Now().UTC().Format("2006-01-02"), *res.OpeningBalanceDate)
		// A brand-new account's balance is its opening balance.
		require.Equal(t, int64(2_000_000), *res.Balance)
	})

	t.Run("without balance stays a plain label", func(t *testing.T) {
		svc, repo, institutionRepo := newAccountService(t)
		institutionRepo.EXPECT().FindByID(context.Background(), "inst-bca").Return(&bca, nil)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Account]()).RunAndReturn(func(_ context.Context, a *domain.Account) error {
			require.Nil(t, a.OpeningBalance)
			require.Nil(t, a.OpeningBalanceDate)
			return nil
		})

		res, err := svc.Create(context.Background(), "user-1", request.CreateAccountRequest{InstitutionID: "inst-bca", Name: "BCA"})

		require.NoError(t, err)
		require.Nil(t, res.Balance)
		require.Nil(t, res.OpeningBalance)
	})

	t.Run("rejects date without balance", func(t *testing.T) {
		svc, _, _ := newAccountService(t)

		_, err := svc.Create(context.Background(), "user-1", request.CreateAccountRequest{
			InstitutionID: "inst-bca", Name: "BCA", OpeningBalanceDate: "2026-10-01",
		})

		requireAppError(t, err, http.StatusBadRequest, "opening_balance_date requires opening_balance")
	})

	t.Run("trims and requires name", func(t *testing.T) {
		svc, _, _ := newAccountService(t)

		_, err := svc.Create(context.Background(), "user-1", request.CreateAccountRequest{InstitutionID: "inst-bca", Name: "   "})

		requireAppError(t, err, http.StatusBadRequest, "name is required")
	})

	t.Run("rejects unknown institution", func(t *testing.T) {
		svc, _, institutionRepo := newAccountService(t)
		institutionRepo.EXPECT().FindByID(context.Background(), "inst-x").Return(nil, nil)

		_, err := svc.Create(context.Background(), "user-1", request.CreateAccountRequest{InstitutionID: "inst-x", Name: "X"})

		requireAppError(t, err, http.StatusNotFound, "institution not found")
	})

	t.Run("rejects inactive institution", func(t *testing.T) {
		svc, _, institutionRepo := newAccountService(t)
		retired := bca
		retired.IsActive = false
		institutionRepo.EXPECT().FindByID(context.Background(), "inst-bca").Return(&retired, nil)

		_, err := svc.Create(context.Background(), "user-1", request.CreateAccountRequest{InstitutionID: "inst-bca", Name: "BCA"})

		requireAppError(t, err, http.StatusNotFound, "institution not found")
	})
}

func TestAccountService_GetByID(t *testing.T) {
	t.Run("other user's account is not found", func(t *testing.T) {
		svc, repo, _ := newAccountService(t)
		repo.EXPECT().FindByID(context.Background(), "acc-1").Return(&domain.Account{ID: "acc-1", UserID: "someone-else"}, nil)

		_, err := svc.GetByID(context.Background(), "user-1", "acc-1")

		requireAppError(t, err, http.StatusNotFound, "account not found")
	})

	t.Run("owner sees computed balance", func(t *testing.T) {
		svc, repo, _ := newAccountService(t)
		repo.EXPECT().FindByID(context.Background(), "acc-1").Return(&domain.Account{
			ID: "acc-1", UserID: "user-1", Name: "BCA", Institution: bca,
			OpeningBalance: int64Ptr(1_000_000), OpeningBalanceDate: datePtr("2026-10-10"),
		}, nil)
		repo.EXPECT().Balances(context.Background(), []string{"acc-1"}).Return(map[string]int64{"acc-1": 900_000}, nil)

		res, err := svc.GetByID(context.Background(), "user-1", "acc-1")

		require.NoError(t, err)
		require.Equal(t, int64(900_000), *res.Balance)
		require.Equal(t, "2026-10-10", *res.OpeningBalanceDate)
	})
}

func TestAccountService_Update(t *testing.T) {
	t.Run("sets opening balance when empty", func(t *testing.T) {
		svc, repo, _ := newAccountService(t)
		repo.EXPECT().FindByID(context.Background(), "acc-1").Return(&domain.Account{ID: "acc-1", UserID: "user-1", Name: "BCA", Institution: bca}, nil)
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.Account]()).RunAndReturn(func(_ context.Context, a *domain.Account) error {
			require.Equal(t, int64(500_000), *a.OpeningBalance)
			require.Equal(t, "2026-11-01", a.OpeningBalanceDate.Format("2006-01-02"))
			return nil
		})
		repo.EXPECT().Balances(context.Background(), []string{"acc-1"}).Return(map[string]int64{"acc-1": 500_000}, nil)

		res, err := svc.Update(context.Background(), "user-1", "acc-1", request.UpdateAccountRequest{
			OpeningBalance: int64Ptr(500_000), OpeningBalanceDate: "2026-11-01",
		})

		require.NoError(t, err)
		require.Equal(t, int64(500_000), *res.Balance)
	})

	t.Run("refuses to overwrite an existing opening balance", func(t *testing.T) {
		svc, repo, _ := newAccountService(t)
		repo.EXPECT().FindByID(context.Background(), "acc-1").Return(&domain.Account{
			ID: "acc-1", UserID: "user-1", OpeningBalance: int64Ptr(1), OpeningBalanceDate: datePtr("2026-10-10"),
		}, nil)

		_, err := svc.Update(context.Background(), "user-1", "acc-1", request.UpdateAccountRequest{OpeningBalance: int64Ptr(2)})

		requireAppError(t, err, http.StatusConflict, "opening balance already set, use balance adjustment instead")
	})

	t.Run("renames", func(t *testing.T) {
		svc, repo, _ := newAccountService(t)
		repo.EXPECT().FindByID(context.Background(), "acc-1").Return(&domain.Account{ID: "acc-1", UserID: "user-1", Name: "Old", Institution: bca}, nil)
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.Account]()).RunAndReturn(func(_ context.Context, a *domain.Account) error {
			require.Equal(t, "New", a.Name)
			return nil
		})

		res, err := svc.Update(context.Background(), "user-1", "acc-1", request.UpdateAccountRequest{Name: " New "})

		require.NoError(t, err)
		require.Equal(t, "New", res.Name)
	})
}

func TestAccountService_ArchiveUnarchive(t *testing.T) {
	svc, repo, _ := newAccountService(t)
	acc := &domain.Account{ID: "acc-1", UserID: "user-1", Name: "OVO", Institution: bca}
	repo.EXPECT().FindByID(context.Background(), "acc-1").Return(acc, nil)
	repo.EXPECT().Update(context.Background(), acc).Return(nil)

	res, err := svc.Archive(context.Background(), "user-1", "acc-1")
	require.NoError(t, err)
	require.True(t, res.Archived)
	require.NotNil(t, res.ArchivedAt)

	res, err = svc.Unarchive(context.Background(), "user-1", "acc-1")
	require.NoError(t, err)
	require.False(t, res.Archived)
	require.Nil(t, res.ArchivedAt)
}

func TestAccountService_AdjustBalance(t *testing.T) {
	t.Run("requires opening balance", func(t *testing.T) {
		svc, repo, _ := newAccountService(t)
		repo.EXPECT().FindByID(context.Background(), "acc-1").Return(&domain.Account{ID: "acc-1", UserID: "user-1"}, nil)

		_, err := svc.AdjustBalance(context.Background(), "user-1", "acc-1", request.AdjustBalanceRequest{NewBalance: int64Ptr(10)})

		requireAppError(t, err, http.StatusBadRequest, "account has no opening balance")
	})

	t.Run("rejected on archived account", func(t *testing.T) {
		svc, repo, _ := newAccountService(t)
		now := time.Now()
		repo.EXPECT().FindByID(context.Background(), "acc-1").Return(&domain.Account{
			ID: "acc-1", UserID: "user-1", OpeningBalance: int64Ptr(1), OpeningBalanceDate: datePtr("2026-10-10"), ArchivedAt: &now,
		}, nil)

		_, err := svc.AdjustBalance(context.Background(), "user-1", "acc-1", request.AdjustBalanceRequest{NewBalance: int64Ptr(10)})

		requireAppError(t, err, http.StatusBadRequest, "account is archived")
	})

	t.Run("passes the typed balance and note through", func(t *testing.T) {
		svc, repo, _ := newAccountService(t)
		repo.EXPECT().FindByID(context.Background(), "acc-1").Return(&domain.Account{
			ID: "acc-1", UserID: "user-1", OpeningBalance: int64Ptr(1_000_000), OpeningBalanceDate: datePtr("2026-10-10"),
		}, nil)
		note := "cek m-banking"
		repo.EXPECT().AdjustBalance(context.Background(), "acc-1", int64(850_000), &note).Return(&domain.AccountBalanceAdjustment{
			ID: "adj-1", AccountID: "acc-1", PreviousBalance: 900_000, NewBalance: 850_000, Delta: -50_000, Note: &note,
		}, nil)

		res, err := svc.AdjustBalance(context.Background(), "user-1", "acc-1", request.AdjustBalanceRequest{NewBalance: int64Ptr(850_000), Note: note})

		require.NoError(t, err)
		require.Equal(t, int64(-50_000), res.Delta)
		require.Equal(t, int64(900_000), res.PreviousBalance)
		require.Equal(t, "cek m-banking", res.Note)
	})
}

func TestAccountService_List(t *testing.T) {
	svc, repo, _ := newAccountService(t)
	now := time.Now()
	repo.EXPECT().FindAllByUserID(context.Background(), "user-1", true).Return([]domain.Account{
		{ID: "a", UserID: "user-1", Institution: bca, OpeningBalance: int64Ptr(100), OpeningBalanceDate: datePtr("2026-10-01")},
		{ID: "b", UserID: "user-1", Institution: bca}, // no balance
		{ID: "c", UserID: "user-1", Institution: bca, OpeningBalance: int64Ptr(999), OpeningBalanceDate: datePtr("2026-10-01"), ArchivedAt: &now},
	}, nil)
	repo.EXPECT().Balances(context.Background(), []string{"a", "b", "c"}).Return(map[string]int64{"a": 70, "c": 999}, nil)

	res, err := svc.List(context.Background(), "user-1", true)

	require.NoError(t, err)
	require.Len(t, res.Accounts, 3)
	require.Equal(t, int64(70), *res.Accounts[0].Balance)
	require.Nil(t, res.Accounts[1].Balance)
	// Archived accounts keep their balance on display but stay out of the total.
	require.Equal(t, int64(70), res.TotalBalance)
}

// The biggest balance comes first everywhere accounts are listed (and so in
// the two logos on the home card). Accounts with no balance follow, and
// archived ones stay last whatever their balance. Ties keep the repo's
// creation order.
func TestAccountService_List_SortsByBalance(t *testing.T) {
	svc, repo, _ := newAccountService(t)
	now := time.Now()
	withBalance := func(id string) domain.Account {
		return domain.Account{ID: id, UserID: "user-1", Institution: bca, OpeningBalance: int64Ptr(0), OpeningBalanceDate: datePtr("2026-10-01")}
	}
	archived := withBalance("archived-rich")
	archived.ArchivedAt = &now
	repo.EXPECT().FindAllByUserID(context.Background(), "user-1", true).Return([]domain.Account{
		withBalance("shopeepay"),
		{ID: "no-balance", UserID: "user-1", Institution: bca},
		withBalance("bca"),
		withBalance("gopay-tie-1"),
		withBalance("gopay-tie-2"),
		archived,
	}, nil)
	repo.EXPECT().Balances(context.Background(), mockMatchByType[[]string]()).Return(map[string]int64{
		"shopeepay":     200_000,
		"bca":           10_000_000,
		"gopay-tie-1":   50_000,
		"gopay-tie-2":   50_000,
		"archived-rich": 99_000_000,
	}, nil)

	res, err := svc.List(context.Background(), "user-1", true)

	require.NoError(t, err)
	ids := make([]string, 0, len(res.Accounts))
	for _, a := range res.Accounts {
		ids = append(ids, a.ID)
	}
	require.Equal(t, []string{"bca", "shopeepay", "gopay-tie-1", "gopay-tie-2", "no-balance", "archived-rich"}, ids)
}

func TestAccountService_ListInstitutions(t *testing.T) {
	svc, _, institutionRepo := newAccountService(t)
	institutionRepo.EXPECT().FindAllActive(context.Background()).Return([]domain.FinancialInstitution{bca}, nil)

	res, err := svc.ListInstitutions(context.Background())

	require.NoError(t, err)
	require.Len(t, res, 1)
	require.Equal(t, "bank", res[0].Type)
}
