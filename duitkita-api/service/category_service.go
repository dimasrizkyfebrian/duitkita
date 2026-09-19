package service

import (
	"context"

	"github.com/google/uuid"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/model/dto/response"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

type CategoryService interface {
	Create(ctx context.Context, userID string, req request.CreateCategoryRequest) (*response.CategoryResponse, error)
	List(ctx context.Context, userID string) ([]response.CategoryResponse, error)
	GetByID(ctx context.Context, userID, id string) (*response.CategoryResponse, error)
	Update(ctx context.Context, userID, id string, req request.UpdateCategoryRequest) (*response.CategoryResponse, error)
	Delete(ctx context.Context, userID, id string) error
}

type categoryService struct {
	repo repository.CategoryRepository
}

func NewCategoryService(repo repository.CategoryRepository) CategoryService {
	return &categoryService{repo: repo}
}

func (s *categoryService) Create(ctx context.Context, userID string, req request.CreateCategoryRequest) (*response.CategoryResponse, error) {
	category := &domain.Category{
		ID:     uuid.NewString(),
		UserID: userID,
		Name:   req.Name,
		Icon:   utils.StringPtr(req.Icon),
	}
	if err := s.repo.Create(ctx, category); err != nil {
		return nil, utils.ErrInternal("failed to create category")
	}
	res := toCategoryResponse(category)
	return &res, nil
}

func (s *categoryService) List(ctx context.Context, userID string) ([]response.CategoryResponse, error) {
	categories, err := s.repo.FindAllByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to list categories")
	}
	out := make([]response.CategoryResponse, 0, len(categories))
	for i := range categories {
		out = append(out, toCategoryResponse(&categories[i]))
	}
	return out, nil
}

func (s *categoryService) GetByID(ctx context.Context, userID, id string) (*response.CategoryResponse, error) {
	category, err := s.mustOwnCategory(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	res := toCategoryResponse(category)
	return &res, nil
}

func (s *categoryService) Update(ctx context.Context, userID, id string, req request.UpdateCategoryRequest) (*response.CategoryResponse, error) {
	category, err := s.mustOwnCategory(ctx, userID, id)
	if err != nil {
		return nil, err
	}

	if req.Name != "" {
		category.Name = req.Name
	}
	if req.Icon != "" {
		category.Icon = utils.StringPtr(req.Icon)
	}

	if err := s.repo.Update(ctx, category); err != nil {
		return nil, utils.ErrInternal("failed to update category")
	}
	res := toCategoryResponse(category)
	return &res, nil
}

func (s *categoryService) Delete(ctx context.Context, userID, id string) error {
	if _, err := s.mustOwnCategory(ctx, userID, id); err != nil {
		return err
	}
	if err := s.repo.Delete(ctx, id); err != nil {
		return utils.ErrInternal("failed to delete category")
	}
	return nil
}

func (s *categoryService) mustOwnCategory(ctx context.Context, userID, id string) (*domain.Category, error) {
	category, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up category")
	}
	if category == nil || category.UserID != userID {
		return nil, utils.ErrNotFound("category not found")
	}
	return category, nil
}

func toCategoryResponse(category *domain.Category) response.CategoryResponse {
	res := response.CategoryResponse{
		ID:        category.ID,
		Name:      category.Name,
		CreatedAt: category.CreatedAt,
	}
	if category.Icon != nil {
		res.Icon = *category.Icon
	}
	return res
}
