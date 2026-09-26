package service_test

import (
	"context"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
	svcmocks "duitkita-api/service/mocks"
)

func newCoupleService(t *testing.T) (service.CoupleService, *mocks.CoupleRepository, *mocks.CoupleInvitationRepository, *mocks.UserRepository, *svcmocks.SecurityAuditService) {
	coupleRepo := mocks.NewCoupleRepository(t)
	invitationRepo := mocks.NewCoupleInvitationRepository(t)
	userRepo := mocks.NewUserRepository(t)
	auditSvc := svcmocks.NewSecurityAuditService(t)
	return service.NewCoupleService(coupleRepo, invitationRepo, userRepo, auditSvc), coupleRepo, invitationRepo, userRepo, auditSvc
}

func TestCoupleService_SendInvitation(t *testing.T) {
	req := request.SendInvitationRequest{ReceiverEmail: "bob@example.com"}

	t.Run("success", func(t *testing.T) {
		svc, coupleRepo, invitationRepo, userRepo, auditSvc := newCoupleService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(nil, nil)
		userRepo.EXPECT().FindByEmail(context.Background(), "bob@example.com").Return(&domain.User{ID: "user-2"}, nil)
		invitationRepo.EXPECT().Create(context.Background(), mockMatchByType[*domain.CoupleInvitation]()).Return(nil)
		auditSvc.EXPECT().LogEvent(context.Background(), mock.Anything, domain.SecurityAuditEventInvitationSent, "", "", mock.Anything).Return()

		res, err := svc.SendInvitation(context.Background(), "user-1", req)

		require.NoError(t, err)
		require.Equal(t, "user-2", res.ReceiverID)
	})

	t.Run("already has a linked partner", func(t *testing.T) {
		svc, coupleRepo, _, _, _ := newCoupleService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(&domain.Couple{ID: "couple-1"}, nil)

		_, err := svc.SendInvitation(context.Background(), "user-1", req)

		requireAppError(t, err, http.StatusConflict, "you already have a linked partner")
	})

	t.Run("receiver email not found", func(t *testing.T) {
		svc, coupleRepo, _, userRepo, _ := newCoupleService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(nil, nil)
		userRepo.EXPECT().FindByEmail(context.Background(), "bob@example.com").Return(nil, nil)

		_, err := svc.SendInvitation(context.Background(), "user-1", req)

		requireAppError(t, err, http.StatusNotFound, "no user found with that email")
	})

	t.Run("cannot invite yourself", func(t *testing.T) {
		svc, coupleRepo, _, userRepo, _ := newCoupleService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(nil, nil)
		userRepo.EXPECT().FindByEmail(context.Background(), "bob@example.com").Return(&domain.User{ID: "user-1"}, nil)

		_, err := svc.SendInvitation(context.Background(), "user-1", req)

		requireAppError(t, err, http.StatusBadRequest, "cannot invite yourself")
	})
}

func TestCoupleService_AcceptInvitation(t *testing.T) {
	t.Run("normalizes the pair ordering regardless of who accepts", func(t *testing.T) {
		svc, coupleRepo, invitationRepo, _, auditSvc := newCoupleService(t)
		invitation := &domain.CoupleInvitation{
			ID: "inv-1", SenderUserID: "zzz-sender", ReceiverUserID: "aaa-receiver",
			Status: domain.CoupleInvitationStatusPending, ExpiresAt: time.Now().Add(time.Hour),
		}
		invitationRepo.EXPECT().FindByID(context.Background(), "inv-1").Return(invitation, nil)
		invitationRepo.EXPECT().Update(context.Background(), invitation).Return(nil)
		coupleRepo.EXPECT().Create(context.Background(), mockMatchByType[*domain.Couple]()).RunAndReturn(func(_ context.Context, c *domain.Couple) error {
			require.Equal(t, "aaa-receiver", c.User1ID)
			require.Equal(t, "zzz-sender", c.User2ID)
			return nil
		})
		auditSvc.EXPECT().LogEvent(context.Background(), mock.Anything, domain.SecurityAuditEventInvitationAccepted, "", "", mock.Anything).Return()
		auditSvc.EXPECT().LogEvent(context.Background(), mock.Anything, domain.SecurityAuditEventPartnerLinked, "", "", mock.Anything).Return()
		coupleRepo.EXPECT().FindByUserID(context.Background(), "aaa-receiver").Return(&domain.Couple{ID: "couple-1", User1ID: "aaa-receiver", User2ID: "zzz-sender"}, nil)

		res, err := svc.AcceptInvitation(context.Background(), "aaa-receiver", "inv-1")

		require.NoError(t, err)
		require.Equal(t, "couple-1", res.ID)
	})

	t.Run("expired invitation rejected", func(t *testing.T) {
		svc, _, invitationRepo, _, _ := newCoupleService(t)
		invitation := &domain.CoupleInvitation{
			ID: "inv-1", ReceiverUserID: "user-1",
			Status: domain.CoupleInvitationStatusPending, ExpiresAt: time.Now().Add(-time.Hour),
		}
		invitationRepo.EXPECT().FindByID(context.Background(), "inv-1").Return(invitation, nil)

		_, err := svc.AcceptInvitation(context.Background(), "user-1", "inv-1")

		requireAppError(t, err, http.StatusConflict, "invitation has expired")
	})

	t.Run("wrong receiver cannot accept", func(t *testing.T) {
		svc, _, invitationRepo, _, _ := newCoupleService(t)
		invitation := &domain.CoupleInvitation{ID: "inv-1", ReceiverUserID: "someone-else", Status: domain.CoupleInvitationStatusPending, ExpiresAt: time.Now().Add(time.Hour)}
		invitationRepo.EXPECT().FindByID(context.Background(), "inv-1").Return(invitation, nil)

		_, err := svc.AcceptInvitation(context.Background(), "user-1", "inv-1")

		requireAppError(t, err, http.StatusNotFound, "invitation not found")
	})

	t.Run("non-pending invitation cannot be re-accepted", func(t *testing.T) {
		svc, _, invitationRepo, _, _ := newCoupleService(t)
		invitation := &domain.CoupleInvitation{ID: "inv-1", ReceiverUserID: "user-1", Status: domain.CoupleInvitationStatusAccepted, ExpiresAt: time.Now().Add(time.Hour)}
		invitationRepo.EXPECT().FindByID(context.Background(), "inv-1").Return(invitation, nil)

		_, err := svc.AcceptInvitation(context.Background(), "user-1", "inv-1")

		requireAppError(t, err, http.StatusConflict, "invitation is no longer pending")
	})
}

func TestCoupleService_ListIncomingInvitations(t *testing.T) {
	svc, _, invitationRepo, _, _ := newCoupleService(t)
	invitationRepo.EXPECT().FindIncomingPending(context.Background(), "user-1").Return([]domain.CoupleInvitation{{ID: "inv-1"}}, nil)

	res, err := svc.ListIncomingInvitations(context.Background(), "user-1")

	require.NoError(t, err)
	require.Len(t, res, 1)
}

func TestCoupleService_RejectInvitation(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		svc, _, invitationRepo, _, auditSvc := newCoupleService(t)
		invitation := &domain.CoupleInvitation{ID: "inv-1", ReceiverUserID: "user-1", Status: domain.CoupleInvitationStatusPending, ExpiresAt: time.Now().Add(time.Hour)}
		invitationRepo.EXPECT().FindByID(context.Background(), "inv-1").Return(invitation, nil)
		invitationRepo.EXPECT().Update(context.Background(), invitation).RunAndReturn(func(_ context.Context, i *domain.CoupleInvitation) error {
			require.Equal(t, domain.CoupleInvitationStatusRejected, i.Status)
			return nil
		})
		auditSvc.EXPECT().LogEvent(context.Background(), mock.Anything, domain.SecurityAuditEventInvitationRejected, "", "", mock.Anything).Return()

		err := svc.RejectInvitation(context.Background(), "user-1", "inv-1")

		require.NoError(t, err)
	})

	t.Run("expired invitation cannot be rejected", func(t *testing.T) {
		svc, _, invitationRepo, _, _ := newCoupleService(t)
		invitation := &domain.CoupleInvitation{ID: "inv-1", ReceiverUserID: "user-1", Status: domain.CoupleInvitationStatusPending, ExpiresAt: time.Now().Add(-time.Hour)}
		invitationRepo.EXPECT().FindByID(context.Background(), "inv-1").Return(invitation, nil)

		err := svc.RejectInvitation(context.Background(), "user-1", "inv-1")

		requireAppError(t, err, http.StatusConflict, "invitation has expired")
	})
}

func TestCoupleService_CancelInvitation(t *testing.T) {
	t.Run("only the sender can cancel", func(t *testing.T) {
		svc, _, invitationRepo, _, _ := newCoupleService(t)
		invitationRepo.EXPECT().FindByID(context.Background(), "inv-1").Return(&domain.CoupleInvitation{ID: "inv-1", SenderUserID: "someone-else"}, nil)

		err := svc.CancelInvitation(context.Background(), "user-1", "inv-1")

		requireAppError(t, err, http.StatusNotFound, "invitation not found")
	})

	t.Run("success", func(t *testing.T) {
		svc, _, invitationRepo, _, auditSvc := newCoupleService(t)
		invitation := &domain.CoupleInvitation{ID: "inv-1", SenderUserID: "user-1", Status: domain.CoupleInvitationStatusPending}
		invitationRepo.EXPECT().FindByID(context.Background(), "inv-1").Return(invitation, nil)
		invitationRepo.EXPECT().Update(context.Background(), invitation).Return(nil)
		auditSvc.EXPECT().LogEvent(context.Background(), mock.Anything, domain.SecurityAuditEventInvitationCancelled, "", "", mock.Anything).Return()

		err := svc.CancelInvitation(context.Background(), "user-1", "inv-1")

		require.NoError(t, err)
	})
}

func TestCoupleService_GetPartner(t *testing.T) {
	t.Run("resolves the other side when user is User2", func(t *testing.T) {
		svc, coupleRepo, _, _, _ := newCoupleService(t)
		couple := &domain.Couple{ID: "couple-1", User1ID: "partner-1", User1: domain.User{ID: "partner-1", Name: "Alice"}, User2ID: "user-1"}
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(couple, nil)

		res, err := svc.GetPartner(context.Background(), "user-1")

		require.NoError(t, err)
		require.Equal(t, "Alice", res.Partner.Name)
	})

	t.Run("no linked partner", func(t *testing.T) {
		svc, coupleRepo, _, _, _ := newCoupleService(t)
		coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(nil, nil)

		_, err := svc.GetPartner(context.Background(), "user-1")

		requireAppError(t, err, http.StatusNotFound, "no linked partner")
	})
}

func TestCoupleService_Unlink(t *testing.T) {
	svc, coupleRepo, _, _, auditSvc := newCoupleService(t)
	coupleRepo.EXPECT().FindByUserID(context.Background(), "user-1").Return(&domain.Couple{ID: "couple-1"}, nil)
	coupleRepo.EXPECT().Delete(context.Background(), "couple-1").Return(nil)
	auditSvc.EXPECT().LogEvent(context.Background(), mock.Anything, domain.SecurityAuditEventPartnerUnlinked, "", "", mock.Anything).Return()

	err := svc.Unlink(context.Background(), "user-1")

	require.NoError(t, err)
}
