package service

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"gorm.io/datatypes"

	"duitkita-api/model/domain"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

type ActivityItem struct {
	ID         string `json:"id"`
	ActorID    string `json:"actor_id"`
	ActorName  string `json:"actor_name"`
	Action     string `json:"action"`
	EntityType string `json:"entity_type"`
	EntityID   string `json:"entity_id"`
	CreatedAt  string `json:"created_at"`
}

type ActivityService interface {
	List(ctx context.Context, userID string, limit, offset int) ([]ActivityItem, error)
	Recent(ctx context.Context, userID string, limit int) ([]ActivityItem, error)
	LogActivity(ctx context.Context, actorID string, action domain.ActivityAction, entityType domain.ActivityEntityType, entityID string, meta map[string]interface{})
}

type activityService struct {
	repo       repository.ActivityRepository
	coupleRepo repository.CoupleRepository
}

func NewActivityService(repo repository.ActivityRepository, coupleRepo repository.CoupleRepository) ActivityService {
	return &activityService{repo: repo, coupleRepo: coupleRepo}
}

func (s *activityService) List(ctx context.Context, userID string, limit, offset int) ([]ActivityItem, error) {
	couple, err := s.coupleRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up couple")
	}
	if couple == nil {
		return []ActivityItem{}, nil
	}

	if limit <= 0 {
		limit = 20
	}
	items, err := s.repo.FindByCoupleID(ctx, couple.ID, limit, offset)
	if err != nil {
		return nil, utils.ErrInternal("failed to list activity")
	}
	return toActivityItems(items), nil
}

func (s *activityService) Recent(ctx context.Context, userID string, limit int) ([]ActivityItem, error) {
	return s.List(ctx, userID, limit, 0)
}

func (s *activityService) LogActivity(ctx context.Context, actorID string, action domain.ActivityAction, entityType domain.ActivityEntityType, entityID string, meta map[string]interface{}) {
	couple, err := s.coupleRepo.FindByUserID(ctx, actorID)
	if err != nil || couple == nil {
		return
	}

	var metaJSON datatypes.JSON
	if meta != nil {
		raw, _ := json.Marshal(meta)
		metaJSON = datatypes.JSON(raw)
	}

	activity := &domain.Activity{
		ID:         uuid.NewString(),
		CoupleID:   couple.ID,
		ActorID:    actorID,
		Action:     action,
		EntityType: entityType,
		EntityID:   entityID,
		Meta:       metaJSON,
	}
	_ = s.repo.Create(ctx, activity)
}

func toActivityItems(items []domain.Activity) []ActivityItem {
	out := make([]ActivityItem, 0, len(items))
	for _, item := range items {
		out = append(out, ActivityItem{
			ID:         item.ID,
			ActorID:    item.ActorID,
			ActorName:  item.Actor.Name,
			Action:     string(item.Action),
			EntityType: string(item.EntityType),
			EntityID:   item.EntityID,
			CreatedAt:  item.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}
	return out
}
