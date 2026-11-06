package service_test

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/repository"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
	svcmocks "duitkita-api/service/mocks"
)

func newExpenseService(t *testing.T) (service.ExpenseService, *mocks.ExpenseRepository, *mocks.BudgetRepository, *mocks.CoupleRepository, *svcmocks.ActivityService) {
	svc, repo, budgetRepo, coupleRepo, _, activitySvc := newExpenseServiceWithAccounts(t)
	return svc, repo, budgetRepo, coupleRepo, activitySvc
}

func newExpenseServiceWithAccounts(t *testing.T) (service.ExpenseService, *mocks.ExpenseRepository, *mocks.BudgetRepository, *mocks.CoupleRepository, *mocks.AccountRepository, *svcmocks.ActivityService) {
	repo := mocks.NewExpenseRepository(t)
	budgetRepo := mocks.NewBudgetRepository(t)
	coupleRepo := mocks.NewCoupleRepository(t)
	accountRepo := mocks.NewAccountRepository(t)
	activitySvc := svcmocks.NewActivityService(t)
	// Unreachable rather than mocked — cache invalidation is best-effort, so
	// this exercises that fallback for free. See user_service_test.go.
	redisClient := redis.NewClient(&redis.Options{
		Addr:        "127.0.0.1:1",
		MaxRetries:  -1,
		DialTimeout: 100 * time.Millisecond,
	})
	t.Cleanup(func() { _ = redisClient.Close() })
	return service.NewExpenseService(repo, budgetRepo, coupleRepo, accountRepo, activitySvc, redisClient), repo, budgetRepo, coupleRepo, accountRepo, activitySvc
}

func TestExpenseService_Create(t *testing.T) {
	req := request.CreateExpenseRequest{CategoryID: "cat-1", MonthlyBudgetID: "budget-1", Amount: 5000, ExpenseDate: "2026-01-15"}

	t.Run("success validates both ownerships in one call", func(t *testing.T) {
		svc, repo, _, _, activitySvc := newExpenseService(t)
		repo.EXPECT().ValidateOwnership(context.Background(), "user-1", "cat-1", "budget-1").Return(true, true, nil)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Expense]()).RunAndReturn(func(_ context.Context, e *domain.Expense) error {
			require.Equal(t, int64(5000), e.Amount)
			require.Equal(t, "2026-01-15", e.ExpenseDate.Format("2006-01-02"))
			return nil
		})
		activitySvc.EXPECT().LogActivity(context.Background(), "user-1", domain.ActivityActionCreated, domain.ActivityEntityTypeExpense, mock.Anything, mock.Anything).Return()

		res, err := svc.Create(context.Background(), "user-1", req)

		require.NoError(t, err)
		require.Equal(t, int64(5000), res.Amount)
	})

	t.Run("category not owned", func(t *testing.T) {
		svc, repo, _, _, _ := newExpenseService(t)
		repo.EXPECT().ValidateOwnership(context.Background(), "user-1", "cat-1", "budget-1").Return(false, true, nil)

		_, err := svc.Create(context.Background(), "user-1", req)

		requireAppError(t, err, http.StatusNotFound, "category not found")
	})

	t.Run("budget not owned", func(t *testing.T) {
		svc, repo, _, _, _ := newExpenseService(t)
		repo.EXPECT().ValidateOwnership(context.Background(), "user-1", "cat-1", "budget-1").Return(true, false, nil)

		_, err := svc.Create(context.Background(), "user-1", req)

		requireAppError(t, err, http.StatusNotFound, "budget not found")
	})

	t.Run("invalid expense_date rejected", func(t *testing.T) {
		svc, repo, _, _, _ := newExpenseService(t)
		repo.EXPECT().ValidateOwnership(context.Background(), "user-1", "cat-1", "budget-1").Return(true, true, nil)

		badReq := req
		badReq.ExpenseDate = "not-a-date"
		_, err := svc.Create(context.Background(), "user-1", badReq)

		requireAppError(t, err, http.StatusBadRequest, "invalid expense_date")
	})
}

func TestExpenseService_List(t *testing.T) {
	svc, repo, _, _, _ := newExpenseService(t)
	filter := service.ExpenseListFilter{CategoryID: "cat-1", Limit: 20, Offset: 0}
	repo.EXPECT().FindAllByUserID(context.Background(), "user-1", repository.ExpenseFilter{CategoryID: "cat-1", Limit: 20, WithAccount: true}).Return([]domain.Expense{{ID: "e-1", Amount: 100}}, nil)

	res, err := svc.List(context.Background(), "user-1", filter)

	require.NoError(t, err)
	require.Len(t, res, 1)
}

func TestExpenseService_ListByBudget(t *testing.T) {
	t.Run("blocked when budget not owned", func(t *testing.T) {
		svc, _, budgetRepo, _, _ := newExpenseService(t)
		budgetRepo.EXPECT().FindByID(context.Background(), "budget-1").Return(&domain.MonthlyBudget{ID: "budget-1", UserID: "someone-else"}, nil)

		_, err := svc.ListByBudget(context.Background(), "user-1", "budget-1")

		requireAppError(t, err, http.StatusNotFound, "budget not found")
	})

	t.Run("success", func(t *testing.T) {
		svc, repo, budgetRepo, _, _ := newExpenseService(t)
		budgetRepo.EXPECT().FindByID(context.Background(), "budget-1").Return(&domain.MonthlyBudget{ID: "budget-1", UserID: "user-1"}, nil)
		repo.EXPECT().FindAllByBudgetID(context.Background(), "budget-1").Return([]domain.Expense{{ID: "e-1"}}, nil)

		res, err := svc.ListByBudget(context.Background(), "user-1", "budget-1")

		require.NoError(t, err)
		require.Len(t, res, 1)
	})
}

func TestExpenseService_ListPartnerExpenses(t *testing.T) {
	svc, repo, _, coupleRepo, _ := newExpenseService(t)
	coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(&domain.Couple{User1ID: "user-1", User2ID: "partner-1"}, nil)
	filter := service.ExpenseListFilter{Limit: 20}
	repo.EXPECT().FindAllByUserID(context.Background(), "partner-1", repository.ExpenseFilter{Limit: 20, WithAccount: false}).Return(nil, nil)

	_, err := svc.ListPartnerExpenses(context.Background(), "user-1", filter)

	require.NoError(t, err)
}

func TestExpenseService_GetByID(t *testing.T) {
	t.Run("owner can fetch", func(t *testing.T) {
		svc, repo, _, _, _ := newExpenseService(t)
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(&domain.Expense{ID: "e-1", UserID: "user-1"}, nil)

		res, err := svc.GetByID(context.Background(), "user-1", "e-1")

		require.NoError(t, err)
		require.Equal(t, "e-1", res.ID)
	})

	t.Run("not owner", func(t *testing.T) {
		svc, repo, _, _, _ := newExpenseService(t)
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(&domain.Expense{ID: "e-1", UserID: "someone-else"}, nil)

		_, err := svc.GetByID(context.Background(), "user-1", "e-1")

		requireAppError(t, err, http.StatusNotFound, "expense not found")
	})
}

func TestExpenseService_Update(t *testing.T) {
	t.Run("only overwrites provided fields", func(t *testing.T) {
		svc, repo, _, _, activitySvc := newExpenseService(t)
		existing := &domain.Expense{ID: "e-1", UserID: "user-1", Amount: 100, ExpenseDate: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)}
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(existing, nil)
		repo.EXPECT().Update(context.Background(), existing).Return(nil)
		activitySvc.EXPECT().LogActivity(context.Background(), "user-1", domain.ActivityActionUpdated, domain.ActivityEntityTypeExpense, "e-1", mock.Anything).Return()

		res, err := svc.Update(context.Background(), "user-1", "e-1", request.UpdateExpenseRequest{Amount: 250})

		require.NoError(t, err)
		require.Equal(t, int64(250), res.Amount)
		require.Equal(t, "2026-01-01", res.ExpenseDate.Format("2006-01-02"))
	})

	t.Run("invalid date on update rejected", func(t *testing.T) {
		svc, repo, _, _, _ := newExpenseService(t)
		existing := &domain.Expense{ID: "e-1", UserID: "user-1"}
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(existing, nil)

		_, err := svc.Update(context.Background(), "user-1", "e-1", request.UpdateExpenseRequest{ExpenseDate: "bad"})

		requireAppError(t, err, http.StatusBadRequest, "invalid expense_date")
	})

	t.Run("not owner", func(t *testing.T) {
		svc, repo, _, _, _ := newExpenseService(t)
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(&domain.Expense{ID: "e-1", UserID: "someone-else"}, nil)

		_, err := svc.Update(context.Background(), "user-1", "e-1", request.UpdateExpenseRequest{Amount: 1})

		requireAppError(t, err, http.StatusNotFound, "expense not found")
	})

	// A category or month change moves the expense under a different
	// monthly budget — the link has to follow, or the spend stays counted
	// against the budget it left.
	t.Run("switching category re-points the budget", func(t *testing.T) {
		svc, repo, budgetRepo, _, activitySvc := newExpenseService(t)
		existing := &domain.Expense{
			ID: "e-1", UserID: "user-1", CategoryID: "cat-1", MonthlyBudgetID: "budget-1",
			Amount: 100, ExpenseDate: time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC),
		}
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(existing, nil)
		repo.EXPECT().ValidateOwnership(context.Background(), "user-1", "cat-2", "budget-1").Return(true, true, nil)
		budgetRepo.EXPECT().FindByUserCategoryPeriod(context.Background(), "user-1", "cat-2", 2026, 1).
			Return(&domain.MonthlyBudget{ID: "budget-2"}, nil)
		repo.EXPECT().Update(context.Background(), existing).Return(nil)
		activitySvc.EXPECT().LogActivity(context.Background(), "user-1", domain.ActivityActionUpdated, domain.ActivityEntityTypeExpense, "e-1", mock.Anything).Return()

		res, err := svc.Update(context.Background(), "user-1", "e-1", request.UpdateExpenseRequest{CategoryID: "cat-2"})

		require.NoError(t, err)
		require.Equal(t, "cat-2", res.CategoryID)
		require.Equal(t, "budget-2", res.MonthlyBudgetID)
	})

	t.Run("moving into another month re-points the budget", func(t *testing.T) {
		svc, repo, budgetRepo, _, activitySvc := newExpenseService(t)
		existing := &domain.Expense{
			ID: "e-1", UserID: "user-1", CategoryID: "cat-1", MonthlyBudgetID: "budget-jan",
			Amount: 100, ExpenseDate: time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC),
		}
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(existing, nil)
		budgetRepo.EXPECT().FindByUserCategoryPeriod(context.Background(), "user-1", "cat-1", 2026, 2).
			Return(&domain.MonthlyBudget{ID: "budget-feb"}, nil)
		repo.EXPECT().Update(context.Background(), existing).Return(nil)
		activitySvc.EXPECT().LogActivity(context.Background(), "user-1", domain.ActivityActionUpdated, domain.ActivityEntityTypeExpense, "e-1", mock.Anything).Return()

		res, err := svc.Update(context.Background(), "user-1", "e-1", request.UpdateExpenseRequest{ExpenseDate: "2026-02-03"})

		require.NoError(t, err)
		require.Equal(t, "budget-feb", res.MonthlyBudgetID)
	})

	t.Run("someone else's category rejected", func(t *testing.T) {
		svc, repo, _, _, _ := newExpenseService(t)
		existing := &domain.Expense{
			ID: "e-1", UserID: "user-1", CategoryID: "cat-1", MonthlyBudgetID: "budget-1",
			ExpenseDate: time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC),
		}
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(existing, nil)
		repo.EXPECT().ValidateOwnership(context.Background(), "user-1", "cat-2", "budget-1").Return(false, true, nil)

		_, err := svc.Update(context.Background(), "user-1", "e-1", request.UpdateExpenseRequest{CategoryID: "cat-2"})

		requireAppError(t, err, http.StatusNotFound, "category not found")
	})

	t.Run("rejected when the target category has no budget that month", func(t *testing.T) {
		svc, repo, budgetRepo, _, _ := newExpenseService(t)
		existing := &domain.Expense{
			ID: "e-1", UserID: "user-1", CategoryID: "cat-1", MonthlyBudgetID: "budget-1",
			ExpenseDate: time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC),
		}
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(existing, nil)
		repo.EXPECT().ValidateOwnership(context.Background(), "user-1", "cat-2", "budget-1").Return(true, true, nil)
		budgetRepo.EXPECT().FindByUserCategoryPeriod(context.Background(), "user-1", "cat-2", 2026, 1).Return(nil, nil)

		_, err := svc.Update(context.Background(), "user-1", "e-1", request.UpdateExpenseRequest{CategoryID: "cat-2"})

		requireAppError(t, err, http.StatusNotFound, "budget not set for that category and period")
	})

	t.Run("note can be cleared", func(t *testing.T) {
		svc, repo, _, _, activitySvc := newExpenseService(t)
		existing := &domain.Expense{
			ID: "e-1", UserID: "user-1", Note: strPtr("salah ketik"),
			ExpenseDate: time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC),
		}
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(existing, nil)
		repo.EXPECT().Update(context.Background(), existing).RunAndReturn(func(_ context.Context, e *domain.Expense) error {
			require.Nil(t, e.Note)
			return nil
		})
		activitySvc.EXPECT().LogActivity(context.Background(), "user-1", domain.ActivityActionUpdated, domain.ActivityEntityTypeExpense, "e-1", mock.Anything).Return()

		empty := ""
		_, err := svc.Update(context.Background(), "user-1", "e-1", request.UpdateExpenseRequest{Note: &empty})

		require.NoError(t, err)
	})
}

func TestExpenseService_Delete(t *testing.T) {
	svc, repo, _, _, activitySvc := newExpenseService(t)
	repo.EXPECT().FindByID(context.Background(), "e-1").Return(&domain.Expense{ID: "e-1", UserID: "user-1"}, nil)
	repo.EXPECT().Delete(context.Background(), "e-1").Return(nil)
	activitySvc.EXPECT().LogActivity(context.Background(), "user-1", domain.ActivityActionDeleted, domain.ActivityEntityTypeExpense, "e-1", mock.Anything).Return()

	err := svc.Delete(context.Background(), "user-1", "e-1")

	require.NoError(t, err)
}

func TestExpenseService_Create_ValidateOwnershipError(t *testing.T) {
	svc, repo, _, _, _ := newExpenseService(t)
	repo.EXPECT().ValidateOwnership(context.Background(), "user-1", "cat-1", "budget-1").Return(false, false, errors.New("db down"))

	_, err := svc.Create(context.Background(), "user-1", request.CreateExpenseRequest{CategoryID: "cat-1", MonthlyBudgetID: "budget-1", ExpenseDate: "2026-01-01"})

	requireAppError(t, err, http.StatusInternalServerError, "failed to validate ownership")
}

func TestExpenseService_Accounts(t *testing.T) {
	bcaInst := domain.FinancialInstitution{ID: "inst-bca", Code: "bca", Name: "BCA", Type: domain.InstitutionTypeBank}
	req := request.CreateExpenseRequest{CategoryID: "cat-1", MonthlyBudgetID: "budget-1", Amount: 5000, ExpenseDate: "2026-01-15", AccountID: accountA}

	t.Run("create with account validates it and returns its summary", func(t *testing.T) {
		svc, repo, _, _, accountRepo, activitySvc := newExpenseServiceWithAccounts(t)
		repo.EXPECT().ValidateOwnership(context.Background(), "user-1", "cat-1", "budget-1").Return(true, true, nil)
		accountRepo.EXPECT().FindByID(context.Background(), accountA).Return(&domain.Account{ID: accountA, UserID: "user-1", Name: "BCA Utama", Institution: bcaInst}, nil)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Expense]()).RunAndReturn(func(_ context.Context, e *domain.Expense) error {
			require.Equal(t, accountA, *e.AccountID)
			return nil
		})
		activitySvc.EXPECT().LogActivity(context.Background(), "user-1", domain.ActivityActionCreated, domain.ActivityEntityTypeExpense, mock.Anything, mock.Anything).Return()

		res, err := svc.Create(context.Background(), "user-1", req)

		require.NoError(t, err)
		require.Equal(t, accountA, *res.AccountID)
		require.Equal(t, "BCA Utama", res.Account.Name)
		require.Equal(t, "bca", res.Account.Institution.Code)
	})

	t.Run("create with archived account is rejected", func(t *testing.T) {
		svc, repo, _, _, accountRepo, _ := newExpenseServiceWithAccounts(t)
		repo.EXPECT().ValidateOwnership(context.Background(), "user-1", "cat-1", "budget-1").Return(true, true, nil)
		archivedAt := time.Now()
		accountRepo.EXPECT().FindByID(context.Background(), accountA).Return(&domain.Account{ID: accountA, UserID: "user-1", ArchivedAt: &archivedAt}, nil)

		_, err := svc.Create(context.Background(), "user-1", req)

		requireAppError(t, err, http.StatusBadRequest, "account is archived")
	})

	t.Run("create with another user's account is not found", func(t *testing.T) {
		svc, repo, _, _, accountRepo, _ := newExpenseServiceWithAccounts(t)
		repo.EXPECT().ValidateOwnership(context.Background(), "user-1", "cat-1", "budget-1").Return(true, true, nil)
		accountRepo.EXPECT().FindByID(context.Background(), accountA).Return(&domain.Account{ID: accountA, UserID: "someone-else"}, nil)

		_, err := svc.Create(context.Background(), "user-1", req)

		requireAppError(t, err, http.StatusNotFound, "account not found")
	})

	existing := func(accountID *string) *domain.Expense {
		return &domain.Expense{ID: "e-1", UserID: "user-1", CategoryID: "cat-1", MonthlyBudgetID: "budget-1", AccountID: accountID, Amount: 100, ExpenseDate: time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)}
	}

	t.Run("update keeps archived account untouched", func(t *testing.T) {
		svc, repo, _, _, accountRepo, activitySvc := newExpenseServiceWithAccounts(t)
		current := accountA
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(existing(&current), nil)
		archivedAt := time.Now()
		// Looked up only to render the summary: an unchanged account is
		// never re-validated, so being archived must not reject the edit.
		accountRepo.EXPECT().FindByID(context.Background(), accountA).Return(&domain.Account{ID: accountA, UserID: "user-1", Name: "Lama", ArchivedAt: &archivedAt}, nil).Maybe()
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.Expense]()).RunAndReturn(func(_ context.Context, e *domain.Expense) error {
			require.Equal(t, accountA, *e.AccountID)
			require.Equal(t, int64(200), e.Amount)
			return nil
		})
		activitySvc.EXPECT().LogActivity(context.Background(), "user-1", domain.ActivityActionUpdated, domain.ActivityEntityTypeExpense, "e-1", mock.Anything).Return()

		_, err := svc.Update(context.Background(), "user-1", "e-1", request.UpdateExpenseRequest{Amount: 200, AccountID: strPtr(accountA)})

		require.NoError(t, err)
	})

	t.Run("update moving to an archived account is rejected", func(t *testing.T) {
		svc, repo, _, _, accountRepo, _ := newExpenseServiceWithAccounts(t)
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(existing(nil), nil)
		archivedAt := time.Now()
		accountRepo.EXPECT().FindByID(context.Background(), accountB).Return(&domain.Account{ID: accountB, UserID: "user-1", ArchivedAt: &archivedAt}, nil)

		_, err := svc.Update(context.Background(), "user-1", "e-1", request.UpdateExpenseRequest{AccountID: strPtr(accountB)})

		requireAppError(t, err, http.StatusBadRequest, "account is archived")
	})

	t.Run("update clears account with empty string", func(t *testing.T) {
		svc, repo, _, _, _, activitySvc := newExpenseServiceWithAccounts(t)
		current := accountA
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(existing(&current), nil)
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.Expense]()).RunAndReturn(func(_ context.Context, e *domain.Expense) error {
			require.Nil(t, e.AccountID)
			return nil
		})
		activitySvc.EXPECT().LogActivity(context.Background(), "user-1", domain.ActivityActionUpdated, domain.ActivityEntityTypeExpense, "e-1", mock.Anything).Return()

		res, err := svc.Update(context.Background(), "user-1", "e-1", request.UpdateExpenseRequest{AccountID: strPtr("")})

		require.NoError(t, err)
		require.Nil(t, res.AccountID)
		require.Nil(t, res.Account)
	})

	t.Run("update without account_id keeps it", func(t *testing.T) {
		svc, repo, _, _, accountRepo, activitySvc := newExpenseServiceWithAccounts(t)
		current := accountA
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(existing(&current), nil)
		accountRepo.EXPECT().FindByID(context.Background(), accountA).Return(&domain.Account{ID: accountA, UserID: "user-1", Name: "BCA"}, nil).Maybe()
		repo.EXPECT().Update(context.Background(), mockMatchByType[*domain.Expense]()).RunAndReturn(func(_ context.Context, e *domain.Expense) error {
			require.Equal(t, accountA, *e.AccountID)
			return nil
		})
		activitySvc.EXPECT().LogActivity(context.Background(), "user-1", domain.ActivityActionUpdated, domain.ActivityEntityTypeExpense, "e-1", mock.Anything).Return()

		res, err := svc.Update(context.Background(), "user-1", "e-1", request.UpdateExpenseRequest{Amount: 300})

		require.NoError(t, err)
		require.Equal(t, accountA, *res.AccountID)
	})

	t.Run("update rejects malformed account_id", func(t *testing.T) {
		svc, repo, _, _, _, _ := newExpenseServiceWithAccounts(t)
		repo.EXPECT().FindByID(context.Background(), "e-1").Return(existing(nil), nil)

		_, err := svc.Update(context.Background(), "user-1", "e-1", request.UpdateExpenseRequest{AccountID: strPtr("not-a-uuid")})

		requireAppError(t, err, http.StatusBadRequest, "invalid account_id")
	})

	t.Run("own list carries the preloaded account", func(t *testing.T) {
		svc, repo, _, _, _, _ := newExpenseServiceWithAccounts(t)
		account := accountA
		filter := service.ExpenseListFilter{AccountID: accountA, Limit: 20}
		repo.EXPECT().FindAllByUserID(context.Background(), "user-1", repository.ExpenseFilter{AccountID: accountA, Limit: 20, WithAccount: true}).Return([]domain.Expense{
			{ID: "e-1", UserID: "user-1", AccountID: &account, Account: &domain.Account{ID: accountA, Name: "BCA", Institution: bcaInst}},
		}, nil)

		res, err := svc.List(context.Background(), "user-1", filter)

		require.NoError(t, err)
		require.Equal(t, "BCA", res[0].Account.Name)
	})

	t.Run("list rejects a malformed account_id filter", func(t *testing.T) {
		svc, _, _, _, _, _ := newExpenseServiceWithAccounts(t)

		_, err := svc.List(context.Background(), "user-1", service.ExpenseListFilter{AccountID: "bca", Limit: 20})

		requireAppError(t, err, http.StatusBadRequest, "invalid account_id")
	})

	t.Run("partner list never includes account", func(t *testing.T) {
		svc, repo, _, coupleRepo, _, _ := newExpenseServiceWithAccounts(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(&domain.Couple{User1ID: "user-1", User2ID: "partner-1"}, nil)
		account := accountA
		filter := service.ExpenseListFilter{Limit: 20}
		repo.EXPECT().FindAllByUserID(context.Background(), "partner-1", repository.ExpenseFilter{Limit: 20, WithAccount: false}).Return([]domain.Expense{
			{ID: "e-9", UserID: "partner-1", AccountID: &account, Account: &domain.Account{ID: accountA, Name: "Rahasia", Institution: bcaInst}},
		}, nil)

		res, err := svc.ListPartnerExpenses(context.Background(), "user-1", filter)

		require.NoError(t, err)
		require.Nil(t, res[0].AccountID)
		require.Nil(t, res[0].Account)
	})
}
