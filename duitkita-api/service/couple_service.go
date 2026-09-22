package service

import (
	"context"
	"time"

	"github.com/google/uuid"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/model/dto/response"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

const invitationTTL = 7 * 24 * time.Hour

type CoupleService interface {
	SendInvitation(ctx context.Context, senderID string, req request.SendInvitationRequest) (*response.InvitationResponse, error)
	ListIncomingInvitations(ctx context.Context, userID string) ([]response.InvitationResponse, error)
	AcceptInvitation(ctx context.Context, userID, invitationID string) (*response.CoupleResponse, error)
	RejectInvitation(ctx context.Context, userID, invitationID string) error
	CancelInvitation(ctx context.Context, userID, invitationID string) error
	GetPartner(ctx context.Context, userID string) (*response.CoupleResponse, error)
	Unlink(ctx context.Context, userID string) error
}

type coupleService struct {
	coupleRepo     repository.CoupleRepository
	invitationRepo repository.CoupleInvitationRepository
	userRepo       repository.UserRepository
	auditSvc       SecurityAuditService
}

func NewCoupleService(coupleRepo repository.CoupleRepository, invitationRepo repository.CoupleInvitationRepository, userRepo repository.UserRepository, auditSvc SecurityAuditService) CoupleService {
	return &coupleService{
		coupleRepo:     coupleRepo,
		invitationRepo: invitationRepo,
		userRepo:       userRepo,
		auditSvc:       auditSvc,
	}
}

func (s *coupleService) SendInvitation(ctx context.Context, senderID string, req request.SendInvitationRequest) (*response.InvitationResponse, error) {
	if existing, err := s.coupleRepo.FindByUserID(ctx, senderID); err != nil {
		return nil, utils.ErrInternal("failed to check existing partner")
	} else if existing != nil {
		return nil, utils.ErrConflict("you already have a linked partner")
	}

	receiver, err := s.userRepo.FindByEmail(ctx, req.ReceiverEmail)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up receiver")
	}
	if receiver == nil {
		return nil, utils.ErrNotFound("no user found with that email")
	}
	if receiver.ID == senderID {
		return nil, utils.ErrBadRequest("cannot invite yourself")
	}

	invitation := &domain.CoupleInvitation{
		ID:             uuid.NewString(),
		SenderUserID:   senderID,
		ReceiverUserID: receiver.ID,
		Status:         domain.CoupleInvitationStatusPending,
		ExpiresAt:      time.Now().Add(invitationTTL),
	}
	if err := s.invitationRepo.Create(ctx, invitation); err != nil {
		return nil, utils.ErrInternal("failed to create invitation")
	}

	s.auditSvc.LogEvent(ctx, &senderID, domain.SecurityAuditEventInvitationSent, "", "", map[string]interface{}{"invitation_id": invitation.ID})

	return toInvitationResponse(invitation), nil
}

func (s *coupleService) ListIncomingInvitations(ctx context.Context, userID string) ([]response.InvitationResponse, error) {
	invitations, err := s.invitationRepo.FindIncomingPending(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to list invitations")
	}

	out := make([]response.InvitationResponse, 0, len(invitations))
	for i := range invitations {
		out = append(out, *toInvitationResponse(&invitations[i]))
	}
	return out, nil
}

func (s *coupleService) AcceptInvitation(ctx context.Context, userID, invitationID string) (*response.CoupleResponse, error) {
	invitation, err := s.loadRespondableInvitation(ctx, userID, invitationID)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	invitation.Status = domain.CoupleInvitationStatusAccepted
	invitation.RespondedAt = &now
	if err := s.invitationRepo.Update(ctx, invitation); err != nil {
		return nil, utils.ErrInternal("failed to accept invitation")
	}

	user1ID, user2ID := normalizePair(invitation.SenderUserID, invitation.ReceiverUserID)
	couple := &domain.Couple{
		ID:      uuid.NewString(),
		User1ID: user1ID,
		User2ID: user2ID,
	}
	if err := s.coupleRepo.Create(ctx, couple); err != nil {
		return nil, utils.ErrInternal("failed to link partner")
	}

	s.auditSvc.LogEvent(ctx, &userID, domain.SecurityAuditEventInvitationAccepted, "", "", map[string]interface{}{"invitation_id": invitation.ID})
	s.auditSvc.LogEvent(ctx, &userID, domain.SecurityAuditEventPartnerLinked, "", "", map[string]interface{}{"couple_id": couple.ID})

	return s.GetPartner(ctx, userID)
}

func (s *coupleService) RejectInvitation(ctx context.Context, userID, invitationID string) error {
	invitation, err := s.loadRespondableInvitation(ctx, userID, invitationID)
	if err != nil {
		return err
	}

	now := time.Now()
	invitation.Status = domain.CoupleInvitationStatusRejected
	invitation.RespondedAt = &now
	if err := s.invitationRepo.Update(ctx, invitation); err != nil {
		return utils.ErrInternal("failed to reject invitation")
	}

	s.auditSvc.LogEvent(ctx, &userID, domain.SecurityAuditEventInvitationRejected, "", "", map[string]interface{}{"invitation_id": invitation.ID})
	return nil
}

func (s *coupleService) CancelInvitation(ctx context.Context, userID, invitationID string) error {
	invitation, err := s.invitationRepo.FindByID(ctx, invitationID)
	if err != nil {
		return utils.ErrInternal("failed to look up invitation")
	}
	if invitation == nil || invitation.SenderUserID != userID {
		return utils.ErrNotFound("invitation not found")
	}
	if invitation.Status != domain.CoupleInvitationStatusPending {
		return utils.ErrConflict("invitation is no longer pending")
	}

	invitation.Status = domain.CoupleInvitationStatusCancelled
	if err := s.invitationRepo.Update(ctx, invitation); err != nil {
		return utils.ErrInternal("failed to cancel invitation")
	}

	s.auditSvc.LogEvent(ctx, &userID, domain.SecurityAuditEventInvitationCancelled, "", "", map[string]interface{}{"invitation_id": invitation.ID})
	return nil
}

func (s *coupleService) GetPartner(ctx context.Context, userID string) (*response.CoupleResponse, error) {
	couple, err := s.coupleRepo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up partner")
	}
	if couple == nil {
		return nil, utils.ErrNotFound("no linked partner")
	}

	partner := couple.User2
	if couple.User2ID == userID {
		partner = couple.User1
	}

	return &response.CoupleResponse{
		ID:       couple.ID,
		Partner:  toUserResponse(&partner),
		LinkedAt: couple.LinkedAt,
	}, nil
}

func (s *coupleService) Unlink(ctx context.Context, userID string) error {
	couple, err := s.coupleRepo.FindByUserID(ctx, userID)
	if err != nil {
		return utils.ErrInternal("failed to look up partner")
	}
	if couple == nil {
		return utils.ErrNotFound("no linked partner")
	}

	if err := s.coupleRepo.Delete(ctx, couple.ID); err != nil {
		return utils.ErrInternal("failed to unlink partner")
	}

	s.auditSvc.LogEvent(ctx, &userID, domain.SecurityAuditEventPartnerUnlinked, "", "", map[string]interface{}{"couple_id": couple.ID})
	return nil
}

func (s *coupleService) loadRespondableInvitation(ctx context.Context, receiverID, invitationID string) (*domain.CoupleInvitation, error) {
	invitation, err := s.invitationRepo.FindByID(ctx, invitationID)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up invitation")
	}
	if invitation == nil || invitation.ReceiverUserID != receiverID {
		return nil, utils.ErrNotFound("invitation not found")
	}
	if invitation.Status != domain.CoupleInvitationStatusPending {
		return nil, utils.ErrConflict("invitation is no longer pending")
	}
	if invitation.ExpiresAt.Before(time.Now()) {
		return nil, utils.ErrConflict("invitation has expired")
	}
	return invitation, nil
}

func normalizePair(a, b string) (string, string) {
	if a < b {
		return a, b
	}
	return b, a
}

func toInvitationResponse(invitation *domain.CoupleInvitation) *response.InvitationResponse {
	return &response.InvitationResponse{
		ID:         invitation.ID,
		SenderID:   invitation.SenderUserID,
		ReceiverID: invitation.ReceiverUserID,
		Status:     string(invitation.Status),
		ExpiresAt:  invitation.ExpiresAt,
		CreatedAt:  invitation.CreatedAt,
	}
}
