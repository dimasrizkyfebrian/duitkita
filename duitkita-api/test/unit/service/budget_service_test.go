package service_test

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
	svcmocks "duitkita-api/service/mocks"
)

func newBudgetService(t *testing.T) (service.BudgetService, *mocks.BudgetRepository, *mocks.CategoryRepository, *mocks.CoupleRepository, *svcmocks.ActivityService) {
	repo := mocks.NewBudgetRepository(t)
	categoryRepo := mocks.NewCategoryRepository(t)
	coupleRepo := mocks.NewCoupleRepository(t)
	activitySvc := svcmocks.NewActivityService(t)
	return service.NewBudgetService(repo, categoryRepo, coupleRepo, activitySvc), repo, categoryRepo, coupleRepo, activitySvc
}

func TestBudgetService_Create(t *testing.T) {
	req := request.CreateBudgetRequest{CategoryID: "cat-1", Year: 2026, Month: 1, BaseAmount: 1_000_000}

	t.Run("success", func(t *testing.T) {
		svc, repo, categoryRepo, _, activitySvc := newBudgetService(t)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "user-1"}, nil)
		repo.EXPECT().FindByUserCategoryPeriod(context.Background(), "user-1", "cat-1", 2026, 1).Return(nil, nil)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.MonthlyBudget]()).RunAndReturn(func(_ context.Context, b *domain.MonthlyBudget) error {
			require.Equal(t, int64(1_000_000), b.TotalAmount)
			return nil
		})
		activitySvc.EXPECT().LogActivity(context.Background(), "user-1", domain.ActivityActionCreated, domain.ActivityEntityTypeBudget, mockMatchByType[string](), mock.Anything).Return()

		res, err := svc.Create(context.Background(), "user-1", req)

		require.NoError(t, err)
		require.Equal(t, int64(1_000_000), res.BaseAmount)
	})

	t.Run("category not owned", func(t *testing.T) {
		svc, _, categoryRepo, _, _ := newBudgetService(t)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "someone-else"}, nil)

		_, err := svc.Create(context.Background(), "user-1", req)

		requireAppError(t, err, http.StatusNotFound, "category not found")
	})

	t.Run("duplicate period rejected", func(t *testing.T) {
		svc, repo, categoryRepo, _, _ := newBudgetService(t)
		categoryRepo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "user-1"}, nil)
		repo.EXPECT().FindByUserCategoryPeriod(context.Background(), "user-1", "cat-1", 2026, 1).Return(&domain.MonthlyBudget{ID: "existing"}, nil)

		_, err := svc.Create(context.Background(), "user-1", req)

		requireAppError(t, err, http.StatusConflict, "budget already exists for this category and period")
	})
}

func TestBudgetService_GetByID(t *testing.T) {
	t.Run("owner can fetch", func(t *testing.T) {
		svc, repo, _, _, _ := newBudgetService(t)
		repo.EXPECT().FindByID(context.Background(), "b-1").Return(&domain.MonthlyBudget{ID: "b-1", UserID: "user-1"}, nil)

		res, err := svc.GetByID(context.Background(), "user-1", "b-1")

		require.NoError(t, err)
		require.Equal(t, "b-1", res.ID)
	})

	t.Run("not owner", func(t *testing.T) {
		svc, repo, _, _, _ := newBudgetService(t)
		repo.EXPECT().FindByID(context.Background(), "b-1").Return(&domain.MonthlyBudget{ID: "b-1", UserID: "someone-else"}, nil)

		_, err := svc.GetByID(context.Background(), "user-1", "b-1")

		requireAppError(t, err, http.StatusNotFound, "budget not found")
	})
}

func TestBudgetService_Update(t *testing.T) {
	t.Run("recomputes total from base + rollover", func(t *testing.T) {
		svc, repo, _, _, activitySvc := newBudgetService(t)
		budget := &domain.MonthlyBudget{ID: "b-1", UserID: "user-1", BaseAmount: 500, RolloverAmount: 200, TotalAmount: 700}
		repo.EXPECT().FindByID(context.Background(), "b-1").Return(budget, nil)
		repo.EXPECT().Update(context.Background(), budget).Return(nil)
		activitySvc.EXPECT().LogActivity(context.Background(), "user-1", domain.ActivityActionUpdated, domain.ActivityEntityTypeBudget, "b-1", mock.Anything).Return()

		res, err := svc.Update(context.Background(), "user-1", "b-1", request.UpdateBudgetRequest{BaseAmount: 900})

		require.NoError(t, err)
		require.Equal(t, int64(900), res.BaseAmount)
		require.Equal(t, int64(1100), res.TotalAmount)
	})

	t.Run("finalized budget cannot be updated", func(t *testing.T) {
		svc, repo, _, _, _ := newBudgetService(t)
		budget := &domain.MonthlyBudget{ID: "b-1", UserID: "user-1", IsFinalized: true}
		repo.EXPECT().FindByID(context.Background(), "b-1").Return(budget, nil)

		_, err := svc.Update(context.Background(), "user-1", "b-1", request.UpdateBudgetRequest{BaseAmount: 900})

		requireAppError(t, err, http.StatusConflict, "budget is already finalized")
	})
}

func TestBudgetService_Delete(t *testing.T) {
	svc, repo, _, _, activitySvc := newBudgetService(t)
	budget := &domain.MonthlyBudget{ID: "b-1", UserID: "user-1"}
	repo.EXPECT().FindByID(context.Background(), "b-1").Return(budget, nil)
	repo.EXPECT().Delete(context.Background(), "b-1").Return(nil)
	activitySvc.EXPECT().LogActivity(context.Background(), "user-1", domain.ActivityActionDeleted, domain.ActivityEntityTypeBudget, "b-1", mock.Anything).Return()

	err := svc.Delete(context.Background(), "user-1", "b-1")

	require.NoError(t, err)
}

func TestBudgetService_GetPartnerBudgets(t *testing.T) {
	t.Run("resolves partner id from either side of the couple", func(t *testing.T) {
		svc, repo, _, coupleRepo, _ := newBudgetService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(&domain.Couple{User1ID: "partner-1", User2ID: "user-1"}, nil)
		repo.EXPECT().FindAllByUserID(context.Background(), "partner-1", 2026, 1, 20, 0).Return(nil, nil)

		_, err := svc.GetPartnerBudgets(context.Background(), "user-1", 2026, 1, 20, 0)

		require.NoError(t, err)
	})

	t.Run("no linked partner", func(t *testing.T) {
		svc, _, _, coupleRepo, _ := newBudgetService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(nil, nil)

		_, err := svc.GetPartnerBudgets(context.Background(), "user-1", 2026, 1, 20, 0)

		requireAppError(t, err, http.StatusNotFound, "no linked partner")
	})
}

func TestBudgetService_Finalize(t *testing.T) {
	svc, repo, _, _, _ := newBudgetService(t)
	budget := &domain.MonthlyBudget{ID: "b-1", UserID: "user-1"}
	repo.EXPECT().FindByID(context.Background(), "b-1").Return(budget, nil)
	repo.EXPECT().Update(context.Background(), budget).RunAndReturn(func(_ context.Context, b *domain.MonthlyBudget) error {
		require.True(t, b.IsFinalized)
		return nil
	})

	res, err := svc.Finalize(context.Background(), "user-1", "b-1")

	require.NoError(t, err)
	require.True(t, res.IsFinalized)
}

func TestBudgetService_List_RepoErrorWrapped(t *testing.T) {
	svc, repo, _, _, _ := newBudgetService(t)
	repo.EXPECT().FindAllByUserID(context.Background(), "user-1", 2026, 1, 20, 0).Return(nil, errors.New("db down"))

	_, err := svc.List(context.Background(), "user-1", 2026, 1, 20, 0)

	requireAppError(t, err, http.StatusInternalServerError, "failed to list budgets")
}
