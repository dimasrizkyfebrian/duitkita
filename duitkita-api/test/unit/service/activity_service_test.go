package service_test

import (
	"context"
	"errors"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
	svcmocks "duitkita-api/service/mocks"
)

func newActivityService(t *testing.T) (service.ActivityService, *mocks.ActivityRepository, *mocks.CoupleRepository, *svcmocks.NotificationService) {
	repo := mocks.NewActivityRepository(t)
	coupleRepo := mocks.NewCoupleRepository(t)
	notifSvc := svcmocks.NewNotificationService(t)
	return service.NewActivityService(repo, coupleRepo, notifSvc), repo, coupleRepo, notifSvc
}

func TestActivityService_List(t *testing.T) {
	t.Run("no linked couple returns empty list, not an error", func(t *testing.T) {
		svc, _, coupleRepo, _ := newActivityService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(nil, nil)

		res, err := svc.List(context.Background(), "user-1", 20, 0)

		require.NoError(t, err)
		require.Empty(t, res)
	})

	t.Run("non-positive limit defaults to 20", func(t *testing.T) {
		svc, repo, coupleRepo, _ := newActivityService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(&domain.Couple{ID: "couple-1"}, nil)
		repo.EXPECT().FindByCoupleID(context.Background(), "couple-1", 20, 0).Return([]domain.Activity{{ID: "a-1", Action: domain.ActivityActionCreated}}, nil)

		res, err := svc.List(context.Background(), "user-1", 0, 0)

		require.NoError(t, err)
		require.Len(t, res, 1)
	})

	t.Run("couple lookup error is internal", func(t *testing.T) {
		svc, _, coupleRepo, _ := newActivityService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(nil, errors.New("db down"))

		_, err := svc.List(context.Background(), "user-1", 20, 0)

		requireAppError(t, err, http.StatusInternalServerError, "failed to look up couple")
	})
}

func TestActivityService_Recent_DelegatesToListWithZeroOffset(t *testing.T) {
	svc, repo, coupleRepo, _ := newActivityService(t)
	coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(&domain.Couple{ID: "couple-1"}, nil)
	repo.EXPECT().FindByCoupleID(context.Background(), "couple-1", 5, 0).Return(nil, nil)

	_, err := svc.Recent(context.Background(), "user-1", 5)

	require.NoError(t, err)
}

func TestActivityService_LogActivity(t *testing.T) {
	t.Run("notifies the other side of the couple with correct article", func(t *testing.T) {
		svc, repo, coupleRepo, notifSvc := newActivityService(t)
		couple := &domain.Couple{
			ID:      "couple-1",
			User1ID: "user-1",
			User1:   domain.User{ID: "user-1", Name: "Alice"},
			User2ID: "user-2",
			User2:   domain.User{ID: "user-2", Name: "Bob"},
		}
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(couple, nil)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Activity]()).Return(nil)
		notifSvc.EXPECT().
			Create(context.Background(), "user-2", domain.NotificationTypePartnerActivity, "Partner activity", "Alice created an expense").
			Return(nil)

		svc.LogActivity(context.Background(), "user-1", domain.ActivityActionCreated, domain.ActivityEntityTypeExpense, "e-1", nil)
	})

	t.Run("uses 'a' article for non-expense entities", func(t *testing.T) {
		svc, repo, coupleRepo, notifSvc := newActivityService(t)
		couple := &domain.Couple{
			ID: "couple-1", User1ID: "user-1", User1: domain.User{ID: "user-1", Name: "Alice"},
			User2ID: "user-2", User2: domain.User{ID: "user-2", Name: "Bob"},
		}
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(couple, nil)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Activity]()).Return(nil)
		notifSvc.EXPECT().
			Create(context.Background(), "user-2", domain.NotificationTypePartnerActivity, "Partner activity", "Alice created a budget").
			Return(nil)

		svc.LogActivity(context.Background(), "user-1", domain.ActivityActionCreated, domain.ActivityEntityTypeBudget, "b-1", nil)
	})

	t.Run("no linked couple: silently skips, never touches activity repo", func(t *testing.T) {
		svc, _, coupleRepo, _ := newActivityService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(nil, nil)

		svc.LogActivity(context.Background(), "user-1", domain.ActivityActionCreated, domain.ActivityEntityTypeExpense, "e-1", nil)
	})

	t.Run("repo create failure skips partner notification", func(t *testing.T) {
		svc, repo, coupleRepo, _ := newActivityService(t)
		couple := &domain.Couple{ID: "couple-1", User1ID: "user-1", User2ID: "user-2"}
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(couple, nil)
		repo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Activity]()).Return(errors.New("db down"))

		svc.LogActivity(context.Background(), "user-1", domain.ActivityActionCreated, domain.ActivityEntityTypeExpense, "e-1", nil)
	})
}
