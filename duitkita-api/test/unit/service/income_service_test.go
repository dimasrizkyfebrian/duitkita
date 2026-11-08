package service_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/repository"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
)

const (
	incomeAccountA = "11111111-1111-1111-1111-111111111111"
	incomeAccountB = "22222222-2222-2222-2222-222222222222"
)

func newIncomeService(t *testing.T) (service.IncomeService, *mocks.IncomeRepository, *mocks.AccountRepository) {
	repo := mocks.NewIncomeRepository(t)
	accountRepo := mocks.NewAccountRepository(t)
	return service.NewIncomeService(repo, accountRepo), repo, accountRepo
}

func TestIncomeService_Create(t *testing.T) {
	ctx := context.Background()
	req := request.CreateIncomeRequest{Source: "salary", Amount: 5_000_000, IncomeDate: "2026-10-25"}

	t.Run("without account", func(t *testing.T) {
		svc, repo, _ := newIncomeService(t)
		repo.EXPECT().Create(ctx, mockMatchByType[*domain.Income]()).RunAndReturn(func(_ context.Context, i *domain.Income) error {
			require.Equal(t, int64(5_000_000), i.Amount)
			require.Equal(t, domain.IncomeSourceSalary, i.Source)
			require.Equal(t, "2026-10-25", i.IncomeDate.Format("2006-01-02"))
			require.Equal(t, "user-1", i.UserID)
			require.Nil(t, i.AccountID)
			return nil
		})

		res, err := svc.Create(ctx, "user-1", req)

		require.NoError(t, err)
		require.Nil(t, res.Account)
		require.Nil(t, res.AccountID)
		require.Equal(t, "2026-10-25", res.IncomeDate)
		require.Equal(t, "salary", res.Source)
		require.Equal(t, int64(5_000_000), res.Amount)
	})

	t.Run("with own account", func(t *testing.T) {
		svc, repo, accountRepo := newIncomeService(t)
		accountRepo.EXPECT().FindByID(ctx, incomeAccountA).Return(&domain.Account{ID: incomeAccountA, UserID: "user-1", Name: "BCA"}, nil)
		repo.EXPECT().Create(ctx, mockMatchByType[*domain.Income]()).RunAndReturn(func(_ context.Context, i *domain.Income) error {
			require.NotNil(t, i.AccountID)
			require.Equal(t, incomeAccountA, *i.AccountID)
			return nil
		})

		withAccount := req
		withAccount.AccountID = incomeAccountA
		res, err := svc.Create(ctx, "user-1", withAccount)

		require.NoError(t, err)
		require.NotNil(t, res.Account)
		require.Equal(t, incomeAccountA, res.Account.ID)
		require.NotNil(t, res.AccountID)
		require.Equal(t, incomeAccountA, *res.AccountID)
	})

	t.Run("account without opening balance still accepted", func(t *testing.T) {
		svc, repo, accountRepo := newIncomeService(t)
		accountRepo.EXPECT().FindByID(ctx, incomeAccountA).Return(&domain.Account{ID: incomeAccountA, UserID: "user-1", OpeningBalance: nil}, nil)
		repo.EXPECT().Create(ctx, mockMatchByType[*domain.Income]()).Return(nil)

		withAccount := req
		withAccount.AccountID = incomeAccountA
		_, err := svc.Create(ctx, "user-1", withAccount)

		require.NoError(t, err)
	})

	t.Run("account of another user", func(t *testing.T) {
		svc, _, accountRepo := newIncomeService(t)
		accountRepo.EXPECT().FindByID(ctx, incomeAccountA).Return(&domain.Account{ID: incomeAccountA, UserID: "someone-else"}, nil)

		withAccount := req
		withAccount.AccountID = incomeAccountA
		_, err := svc.Create(ctx, "user-1", withAccount)

		requireAppError(t, err, http.StatusNotFound, "account not found")
	})

	t.Run("archived account", func(t *testing.T) {
		svc, _, accountRepo := newIncomeService(t)
		archivedAt := time.Now()
		accountRepo.EXPECT().FindByID(ctx, incomeAccountA).Return(&domain.Account{ID: incomeAccountA, UserID: "user-1", ArchivedAt: &archivedAt}, nil)

		withAccount := req
		withAccount.AccountID = incomeAccountA
		_, err := svc.Create(ctx, "user-1", withAccount)

		requireAppError(t, err, http.StatusBadRequest, "account is archived")
	})

	t.Run("invalid source", func(t *testing.T) {
		svc, _, _ := newIncomeService(t)
		bad := req
		bad.Source = "rent"

		_, err := svc.Create(ctx, "user-1", bad)

		requireAppError(t, err, http.StatusBadRequest, "invalid source")
	})

	t.Run("non-positive amount", func(t *testing.T) {
		svc, _, _ := newIncomeService(t)
		bad := req
		bad.Amount = 0

		_, err := svc.Create(ctx, "user-1", bad)

		requireAppError(t, err, http.StatusBadRequest, "amount must be positive")
	})

	t.Run("invalid income_date", func(t *testing.T) {
		svc, _, _ := newIncomeService(t)
		bad := req
		bad.IncomeDate = "nope"

		_, err := svc.Create(ctx, "user-1", bad)

		requireAppError(t, err, http.StatusBadRequest, "invalid income_date")
	})
}

func TestIncomeService_Update(t *testing.T) {
	ctx := context.Background()
	archivedAt := time.Now()

	t.Run("income of another user", func(t *testing.T) {
		svc, repo, _ := newIncomeService(t)
		repo.EXPECT().FindByID(ctx, "i-1").Return(&domain.Income{ID: "i-1", UserID: "someone-else"}, nil)

		_, err := svc.Update(ctx, "user-1", "i-1", request.UpdateIncomeRequest{Amount: 100})

		requireAppError(t, err, http.StatusNotFound, "income not found")
	})

	t.Run("re-sending the same archived account is accepted", func(t *testing.T) {
		svc, repo, _ := newIncomeService(t)
		archived := &domain.Account{ID: incomeAccountA, UserID: "user-1", Name: "Lama", ArchivedAt: &archivedAt}
		accountID := incomeAccountA
		repo.EXPECT().FindByID(ctx, "i-1").Return(&domain.Income{ID: "i-1", UserID: "user-1", Source: domain.IncomeSourceSalary, Amount: 100, AccountID: &accountID, Account: archived}, nil)
		repo.EXPECT().Update(ctx, mockMatchByType[*domain.Income]()).Return(nil)

		res, err := svc.Update(ctx, "user-1", "i-1", request.UpdateIncomeRequest{AccountID: strPtr(incomeAccountA), Amount: 200})

		require.NoError(t, err)
		require.Equal(t, int64(200), res.Amount)
		require.NotNil(t, res.Account)
		require.Equal(t, incomeAccountA, res.Account.ID)
		require.True(t, res.Account.Archived)
	})

	t.Run("empty account_id removes the account", func(t *testing.T) {
		svc, repo, _ := newIncomeService(t)
		accountID := incomeAccountA
		repo.EXPECT().FindByID(ctx, "i-1").Return(&domain.Income{ID: "i-1", UserID: "user-1", Source: domain.IncomeSourceSalary, Amount: 100, AccountID: &accountID, Account: &domain.Account{ID: incomeAccountA, UserID: "user-1"}}, nil)
		repo.EXPECT().Update(ctx, mockMatchByType[*domain.Income]()).RunAndReturn(func(_ context.Context, i *domain.Income) error {
			require.Nil(t, i.AccountID)
			return nil
		})

		res, err := svc.Update(ctx, "user-1", "i-1", request.UpdateIncomeRequest{AccountID: strPtr("")})

		require.NoError(t, err)
		require.Nil(t, res.AccountID)
		require.Nil(t, res.Account)
	})

	t.Run("move to another account", func(t *testing.T) {
		svc, repo, accountRepo := newIncomeService(t)
		accountID := incomeAccountA
		repo.EXPECT().FindByID(ctx, "i-1").Return(&domain.Income{ID: "i-1", UserID: "user-1", Source: domain.IncomeSourceSalary, Amount: 100, AccountID: &accountID, Account: &domain.Account{ID: incomeAccountA, UserID: "user-1"}}, nil)
		accountRepo.EXPECT().FindByID(ctx, incomeAccountB).Return(&domain.Account{ID: incomeAccountB, UserID: "user-1", Name: "Baru"}, nil)
		repo.EXPECT().Update(ctx, mockMatchByType[*domain.Income]()).RunAndReturn(func(_ context.Context, i *domain.Income) error {
			require.Equal(t, incomeAccountB, *i.AccountID)
			return nil
		})

		res, err := svc.Update(ctx, "user-1", "i-1", request.UpdateIncomeRequest{AccountID: strPtr(incomeAccountB)})

		require.NoError(t, err)
		require.Equal(t, incomeAccountB, *res.AccountID)
		require.Equal(t, incomeAccountB, res.Account.ID)
		require.Equal(t, "Baru", res.Account.Name)
	})

	t.Run("move to an archived account", func(t *testing.T) {
		svc, repo, accountRepo := newIncomeService(t)
		repo.EXPECT().FindByID(ctx, "i-1").Return(&domain.Income{ID: "i-1", UserID: "user-1", Source: domain.IncomeSourceSalary, Amount: 100}, nil)
		accountRepo.EXPECT().FindByID(ctx, incomeAccountB).Return(&domain.Account{ID: incomeAccountB, UserID: "user-1", ArchivedAt: &archivedAt}, nil)

		_, err := svc.Update(ctx, "user-1", "i-1", request.UpdateIncomeRequest{AccountID: strPtr(incomeAccountB)})

		requireAppError(t, err, http.StatusBadRequest, "account is archived")
	})

	t.Run("invalid source", func(t *testing.T) {
		svc, repo, _ := newIncomeService(t)
		repo.EXPECT().FindByID(ctx, "i-1").Return(&domain.Income{ID: "i-1", UserID: "user-1", Source: domain.IncomeSourceSalary, Amount: 100}, nil)

		_, err := svc.Update(ctx, "user-1", "i-1", request.UpdateIncomeRequest{Source: "rent"})

		requireAppError(t, err, http.StatusBadRequest, "invalid source")
	})

	t.Run("negative amount is rejected", func(t *testing.T) {
		svc, repo, _ := newIncomeService(t)
		repo.EXPECT().FindByID(ctx, "i-1").Return(&domain.Income{ID: "i-1", UserID: "user-1", Source: domain.IncomeSourceSalary, Amount: 100}, nil)

		_, err := svc.Update(ctx, "user-1", "i-1", request.UpdateIncomeRequest{Amount: -5})

		requireAppError(t, err, http.StatusBadRequest, "amount must be positive")
	})

	t.Run("omitted fields are kept", func(t *testing.T) {
		svc, repo, _ := newIncomeService(t)
		note := "gaji"
		repo.EXPECT().FindByID(ctx, "i-1").Return(&domain.Income{ID: "i-1", UserID: "user-1", Source: domain.IncomeSourceSalary, Amount: 100, Note: &note, IncomeDate: time.Date(2026, 10, 25, 0, 0, 0, 0, time.UTC)}, nil)
		repo.EXPECT().Update(ctx, mockMatchByType[*domain.Income]()).RunAndReturn(func(_ context.Context, i *domain.Income) error {
			require.Equal(t, domain.IncomeSourceBonus, i.Source)
			require.Equal(t, int64(100), i.Amount)
			require.Equal(t, "gaji", *i.Note)
			require.Equal(t, "2026-10-25", i.IncomeDate.Format("2006-01-02"))
			return nil
		})

		res, err := svc.Update(ctx, "user-1", "i-1", request.UpdateIncomeRequest{Source: "bonus"})

		require.NoError(t, err)
		require.Equal(t, "bonus", res.Source)
	})

	t.Run("empty note clears it", func(t *testing.T) {
		svc, repo, _ := newIncomeService(t)
		note := "gaji"
		repo.EXPECT().FindByID(ctx, "i-1").Return(&domain.Income{ID: "i-1", UserID: "user-1", Source: domain.IncomeSourceSalary, Amount: 100, Note: &note}, nil)
		repo.EXPECT().Update(ctx, mockMatchByType[*domain.Income]()).RunAndReturn(func(_ context.Context, i *domain.Income) error {
			require.Nil(t, i.Note)
			return nil
		})

		res, err := svc.Update(ctx, "user-1", "i-1", request.UpdateIncomeRequest{Note: strPtr("")})

		require.NoError(t, err)
		require.Empty(t, res.Note)
	})
}

func TestIncomeService_List(t *testing.T) {
	ctx := context.Background()

	t.Run("invalid account_id", func(t *testing.T) {
		svc, _, _ := newIncomeService(t)

		_, err := svc.List(ctx, "user-1", service.IncomeListFilter{AccountID: "not-a-uuid"})

		requireAppError(t, err, http.StatusBadRequest, "invalid account_id")
	})

	t.Run("invalid source", func(t *testing.T) {
		svc, _, _ := newIncomeService(t)

		_, err := svc.List(ctx, "user-1", service.IncomeListFilter{Source: "rent"})

		requireAppError(t, err, http.StatusBadRequest, "invalid source")
	})

	t.Run("invalid from", func(t *testing.T) {
		svc, _, _ := newIncomeService(t)

		_, err := svc.List(ctx, "user-1", service.IncomeListFilter{From: "2026-13-45"})

		requireAppError(t, err, http.StatusBadRequest, "invalid from")
	})

	t.Run("invalid to", func(t *testing.T) {
		svc, _, _ := newIncomeService(t)

		_, err := svc.List(ctx, "user-1", service.IncomeListFilter{To: "yesterday"})

		requireAppError(t, err, http.StatusBadRequest, "invalid to")
	})

	t.Run("passes the filter through and takes total from the repo", func(t *testing.T) {
		svc, repo, _ := newIncomeService(t)
		filter := service.IncomeListFilter{AccountID: incomeAccountA, Source: "salary", From: "2026-10-01", To: "2026-10-31", Limit: 20, Offset: 40}
		repoFilter := repository.IncomeFilter{AccountID: incomeAccountA, Source: "salary", From: "2026-10-01", To: "2026-10-31", Limit: 20, Offset: 40}
		repo.EXPECT().FindAllByUserID(ctx, "user-1", repoFilter).Return([]domain.Income{
			{ID: "i-1", Source: domain.IncomeSourceSalary, Amount: 100, IncomeDate: time.Date(2026, 10, 25, 0, 0, 0, 0, time.UTC)},
		}, nil)
		repo.EXPECT().Total(ctx, "user-1", repoFilter).Return(int64(57), nil)

		res, err := svc.List(ctx, "user-1", filter)

		require.NoError(t, err)
		require.Len(t, res.Items, 1)
		require.Equal(t, "i-1", res.Items[0].ID)
		require.Equal(t, "2026-10-25", res.Items[0].IncomeDate)
		require.Equal(t, int64(57), res.Total)
	})

	t.Run("empty result is an empty list, not null", func(t *testing.T) {
		svc, repo, _ := newIncomeService(t)
		repo.EXPECT().FindAllByUserID(ctx, "user-1", repository.IncomeFilter{}).Return(nil, nil)
		repo.EXPECT().Total(ctx, "user-1", repository.IncomeFilter{}).Return(int64(0), nil)

		res, err := svc.List(ctx, "user-1", service.IncomeListFilter{})

		require.NoError(t, err)
		require.NotNil(t, res.Items)
		require.Empty(t, res.Items)
	})
}

func TestIncomeService_GetByID(t *testing.T) {
	ctx := context.Background()

	t.Run("owner can fetch", func(t *testing.T) {
		svc, repo, _ := newIncomeService(t)
		repo.EXPECT().FindByID(ctx, "i-1").Return(&domain.Income{ID: "i-1", UserID: "user-1", Amount: 100}, nil)

		res, err := svc.GetByID(ctx, "user-1", "i-1")

		require.NoError(t, err)
		require.Equal(t, "i-1", res.ID)
	})

	t.Run("not owner", func(t *testing.T) {
		svc, repo, _ := newIncomeService(t)
		repo.EXPECT().FindByID(ctx, "i-1").Return(&domain.Income{ID: "i-1", UserID: "someone-else"}, nil)

		_, err := svc.GetByID(ctx, "user-1", "i-1")

		requireAppError(t, err, http.StatusNotFound, "income not found")
	})
}

func TestIncomeService_Delete(t *testing.T) {
	ctx := context.Background()

	t.Run("not owner", func(t *testing.T) {
		svc, repo, _ := newIncomeService(t)
		repo.EXPECT().FindByID(ctx, "i-1").Return(&domain.Income{ID: "i-1", UserID: "someone-else"}, nil)

		err := svc.Delete(ctx, "user-1", "i-1")

		requireAppError(t, err, http.StatusNotFound, "income not found")
		repo.AssertNotCalled(t, "Delete", ctx, "i-1")
	})

	t.Run("owner deletes", func(t *testing.T) {
		svc, repo, _ := newIncomeService(t)
		repo.EXPECT().FindByID(ctx, "i-1").Return(&domain.Income{ID: "i-1", UserID: "user-1"}, nil)
		repo.EXPECT().Delete(ctx, "i-1").Return(nil)

		require.NoError(t, svc.Delete(ctx, "user-1", "i-1"))
	})
}
