package service_test

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
)

func newCategoryService(t *testing.T) (service.CategoryService, *mocks.CategoryRepository, *mocks.CoupleRepository, *mocks.BudgetRepository) {
	repo := mocks.NewCategoryRepository(t)
	coupleRepo := mocks.NewCoupleRepository(t)
	budgetRepo := mocks.NewBudgetRepository(t)
	return service.NewCategoryService(repo, coupleRepo, budgetRepo), repo, coupleRepo, budgetRepo
}

func TestCategoryService_Create(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		svc, repo, _, _ := newCategoryService(t)
		repo.EXPECT().
			Create(context.Background(), mockMatchByType[*domain.Category]()).
			RunAndReturn(func(_ context.Context, c *domain.Category) error {
				require.Equal(t, "user-1", c.UserID)
				require.Equal(t, "Food", c.Name)
				require.NotEmpty(t, c.ID)
				return nil
			})

		res, err := svc.Create(context.Background(), "user-1", request.CreateCategoryRequest{Name: "Food", Icon: "🍔"})

		require.NoError(t, err)
		require.Equal(t, "Food", res.Name)
		require.Equal(t, "🍔", res.Icon)
	})

	t.Run("repo error is wrapped as internal", func(t *testing.T) {
		svc, repo, _, _ := newCategoryService(t)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Category]()).Return(errors.New("db down"))

		_, err := svc.Create(context.Background(), "user-1", request.CreateCategoryRequest{Name: "Food"})

		requireAppError(t, err, http.StatusInternalServerError, "failed to create category")
	})
}

func TestCategoryService_List(t *testing.T) {
	svc, repo, _, _ := newCategoryService(t)
	repo.EXPECT().FindAllByUserID(context.Background(), "user-1").Return([]domain.Category{
		{ID: "cat-1", UserID: "user-1", Name: "Food"},
		{ID: "cat-2", UserID: "user-1", Name: "Transport"},
	}, nil)

	res, err := svc.List(context.Background(), "user-1")

	require.NoError(t, err)
	require.Len(t, res, 2)
	require.Equal(t, "Food", res[0].Name)
}

func TestCategoryService_GetByID(t *testing.T) {
	t.Run("owner can fetch", func(t *testing.T) {
		svc, repo, _, _ := newCategoryService(t)
		repo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "user-1", Name: "Food"}, nil)

		res, err := svc.GetByID(context.Background(), "user-1", "cat-1")

		require.NoError(t, err)
		require.Equal(t, "Food", res.Name)
	})

	t.Run("non-owner gets not found", func(t *testing.T) {
		svc, repo, _, _ := newCategoryService(t)
		repo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "someone-else", Name: "Food"}, nil)

		_, err := svc.GetByID(context.Background(), "user-1", "cat-1")

		requireAppError(t, err, http.StatusNotFound, "category not found")
	})

	t.Run("missing category gets not found", func(t *testing.T) {
		svc, repo, _, _ := newCategoryService(t)
		repo.EXPECT().FindByID(context.Background(), "cat-1").Return(nil, nil)

		_, err := svc.GetByID(context.Background(), "user-1", "cat-1")

		requireAppError(t, err, http.StatusNotFound, "category not found")
	})

	t.Run("lookup error becomes internal, not leaked", func(t *testing.T) {
		svc, repo, _, _ := newCategoryService(t)
		repo.EXPECT().FindByID(context.Background(), "cat-1").Return(nil, errors.New("connection reset"))

		_, err := svc.GetByID(context.Background(), "user-1", "cat-1")

		requireAppError(t, err, http.StatusInternalServerError, "failed to look up resource")
	})
}

func TestCategoryService_Update(t *testing.T) {
	t.Run("updates only provided fields", func(t *testing.T) {
		svc, repo, _, _ := newCategoryService(t)
		existing := &domain.Category{ID: "cat-1", UserID: "user-1", Name: "Food", Icon: strPtr("🍔")}
		repo.EXPECT().FindByID(context.Background(), "cat-1").Return(existing, nil)
		repo.EXPECT().Update(context.Background(), existing).RunAndReturn(func(_ context.Context, c *domain.Category) error {
			require.Equal(t, "Groceries", c.Name)
			require.Equal(t, "🍔", *c.Icon)
			return nil
		})

		res, err := svc.Update(context.Background(), "user-1", "cat-1", request.UpdateCategoryRequest{Name: "Groceries"})

		require.NoError(t, err)
		require.Equal(t, "Groceries", res.Name)
	})

	t.Run("blocked when not owner", func(t *testing.T) {
		svc, repo, _, _ := newCategoryService(t)
		repo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "someone-else"}, nil)

		_, err := svc.Update(context.Background(), "user-1", "cat-1", request.UpdateCategoryRequest{Name: "Groceries"})

		requireAppError(t, err, http.StatusNotFound, "category not found")
	})
}

func TestCategoryService_Delete(t *testing.T) {
	t.Run("owner can delete when no budgets reference it", func(t *testing.T) {
		svc, repo, _, budgetRepo := newCategoryService(t)
		repo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "user-1"}, nil)
		budgetRepo.EXPECT().ExistsByCategoryID(context.Background(), "cat-1").Return(false, nil)
		repo.EXPECT().Delete(context.Background(), "cat-1").Return(nil)

		err := svc.Delete(context.Background(), "user-1", "cat-1")

		require.NoError(t, err)
	})

	t.Run("blocked when not owner, delete never called", func(t *testing.T) {
		svc, repo, _, _ := newCategoryService(t)
		repo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "someone-else"}, nil)

		err := svc.Delete(context.Background(), "user-1", "cat-1")

		requireAppError(t, err, http.StatusNotFound, "category not found")
	})

	t.Run("blocked while a budget still references it", func(t *testing.T) {
		svc, repo, _, budgetRepo := newCategoryService(t)
		repo.EXPECT().FindByID(context.Background(), "cat-1").Return(&domain.Category{ID: "cat-1", UserID: "user-1"}, nil)
		budgetRepo.EXPECT().ExistsByCategoryID(context.Background(), "cat-1").Return(true, nil)

		err := svc.Delete(context.Background(), "user-1", "cat-1")

		requireAppError(t, err, http.StatusConflict, "category still has budgets set, delete those first")
	})
}

func TestCategoryService_GetPartnerCategories(t *testing.T) {
	t.Run("resolves partner id from either side of the couple", func(t *testing.T) {
		svc, repo, coupleRepo, _ := newCategoryService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(&domain.Couple{User1ID: "partner-1", User2ID: "user-1"}, nil)
		repo.EXPECT().FindAllByUserID(context.Background(), "partner-1").Return([]domain.Category{
			{ID: "cat-1", UserID: "partner-1", Name: "Makan"},
		}, nil)

		res, err := svc.GetPartnerCategories(context.Background(), "user-1")

		require.NoError(t, err)
		require.Len(t, res, 1)
		require.Equal(t, "Makan", res[0].Name)
	})

	t.Run("no linked partner", func(t *testing.T) {
		svc, _, coupleRepo, _ := newCategoryService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(nil, nil)

		_, err := svc.GetPartnerCategories(context.Background(), "user-1")

		requireAppError(t, err, http.StatusNotFound, "no linked partner")
	})
}
