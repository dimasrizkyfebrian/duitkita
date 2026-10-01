package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"duitkita-api/config"
	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/model/dto/response"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

type AuthService interface {
	Register(ctx context.Context, req request.RegisterRequest, ip, userAgent string) (*response.RegisterResponse, error)
	VerifyOTP(ctx context.Context, req request.VerifyOTPRequest, ip, userAgent string) (*response.AuthResponse, error)
	ResendOTP(ctx context.Context, req request.ResendOTPRequest) error
	ForgotPassword(ctx context.Context, req request.ForgotPasswordRequest) error
	ResetPassword(ctx context.Context, req request.ResetPasswordRequest) error
	Login(ctx context.Context, req request.LoginRequest, ip, userAgent string) (*response.AuthResponse, error)
	Refresh(ctx context.Context, req request.RefreshTokenRequest) (*response.AuthResponse, error)
	Logout(ctx context.Context, req request.RefreshTokenRequest) error
	ListSessions(ctx context.Context, userID string) ([]response.SessionResponse, error)
	RevokeSession(ctx context.Context, userID, sessionID string) error
	RevokeOtherSessions(ctx context.Context, userID, currentSessionID string) error
}

type authService struct {
	userRepo    repository.UserRepository
	sessionRepo repository.UserSessionRepository
	auditSvc    SecurityAuditService
	otpSvc      OTPService
	jwtCfg      config.JWTConfig
}

func NewAuthService(userRepo repository.UserRepository, sessionRepo repository.UserSessionRepository, auditSvc SecurityAuditService, otpSvc OTPService, jwtCfg config.JWTConfig) AuthService {
	return &authService{
		userRepo:    userRepo,
		sessionRepo: sessionRepo,
		auditSvc:    auditSvc,
		otpSvc:      otpSvc,
		jwtCfg:      jwtCfg,
	}
}

func (s *authService) Register(ctx context.Context, req request.RegisterRequest, ip, userAgent string) (*response.RegisterResponse, error) {
	exists, err := s.userRepo.ExistsByEmail(ctx, req.Email)
	if err != nil {
		return nil, utils.ErrInternal("failed to check existing user")
	}
	if exists {
		return nil, utils.ErrConflict("email already registered")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, utils.ErrInternal("failed to hash password")
	}

	user := &domain.User{
		ID:           uuid.NewString(),
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: string(hash),
		IsVerified:   false,
	}
	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, utils.ErrInternal("failed to create user")
	}

	if err := s.otpSvc.Generate(ctx, user.Email, OTPPurposeRegister); err != nil {
		return nil, err
	}

	s.auditSvc.LogEvent(ctx, &user.ID, domain.SecurityAuditEventRegisterSuccess, ip, userAgent, nil)

	return &response.RegisterResponse{Email: user.Email}, nil
}

func (s *authService) VerifyOTP(ctx context.Context, req request.VerifyOTPRequest, ip, userAgent string) (*response.AuthResponse, error) {
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up user")
	}
	if user == nil {
		return nil, utils.ErrNotFound("user not found")
	}
	if user.IsVerified {
		return nil, utils.ErrConflict("account already verified")
	}

	if err := s.otpSvc.Verify(ctx, req.Email, OTPPurposeRegister, req.OTP); err != nil {
		return nil, err
	}

	user.IsVerified = true
	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, utils.ErrInternal("failed to update user")
	}

	return s.issueTokens(ctx, user, ip, userAgent)
}

func (s *authService) ResendOTP(ctx context.Context, req request.ResendOTPRequest) error {
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return utils.ErrInternal("failed to look up user")
	}
	if user == nil {
		// Don't reveal whether the email is registered.
		return nil
	}

	purpose := OTPPurpose(req.Purpose)
	if purpose == OTPPurposeRegister && user.IsVerified {
		return utils.ErrConflict("account already verified")
	}

	return s.otpSvc.Generate(ctx, req.Email, purpose)
}

func (s *authService) ForgotPassword(ctx context.Context, req request.ForgotPasswordRequest) error {
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return utils.ErrInternal("failed to look up user")
	}
	if user == nil {
		// Don't reveal whether the email is registered.
		return nil
	}

	return s.otpSvc.Generate(ctx, req.Email, OTPPurposeResetPassword)
}

func (s *authService) ResetPassword(ctx context.Context, req request.ResetPasswordRequest) error {
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return utils.ErrInternal("failed to look up user")
	}
	if user == nil {
		return utils.ErrNotFound("user not found")
	}

	if err := s.otpSvc.Verify(ctx, req.Email, OTPPurposeResetPassword, req.OTP); err != nil {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return utils.ErrInternal("failed to hash password")
	}
	user.PasswordHash = string(hash)
	if err := s.userRepo.Update(ctx, user); err != nil {
		return utils.ErrInternal("failed to update user")
	}

	if err := s.sessionRepo.RevokeAllByUserID(ctx, user.ID); err != nil {
		return utils.ErrInternal("failed to revoke sessions")
	}

	s.auditSvc.LogEvent(ctx, &user.ID, domain.SecurityAuditEventPasswordChanged, "", "", map[string]interface{}{"via": "otp_reset"})
	return nil
}

func (s *authService) Login(ctx context.Context, req request.LoginRequest, ip, userAgent string) (*response.AuthResponse, error) {
	user, err := s.userRepo.FindByEmail(ctx, req.Email)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up user")
	}
	if user == nil {
		return nil, utils.ErrUnauthorized("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		s.auditSvc.LogEvent(ctx, &user.ID, domain.SecurityAuditEventLoginFailure, ip, userAgent, nil)
		return nil, utils.ErrUnauthorized("invalid email or password")
	}

	if !user.IsVerified {
		return nil, utils.ErrForbidden("email not verified, please verify your account first")
	}

	s.auditSvc.LogEvent(ctx, &user.ID, domain.SecurityAuditEventLoginSuccess, ip, userAgent, nil)

	return s.issueTokens(ctx, user, ip, userAgent)
}

func (s *authService) Refresh(ctx context.Context, req request.RefreshTokenRequest) (*response.AuthResponse, error) {
	sessionID, secret, ok := splitRefreshToken(req.RefreshToken)
	if !ok {
		return nil, utils.ErrUnauthorized("malformed refresh token")
	}

	session, err := s.sessionRepo.FindByID(ctx, sessionID)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up session")
	}
	if session == nil || session.RevokedAt != nil || session.ExpiresAt.Before(time.Now()) {
		return nil, utils.ErrUnauthorized("session expired or revoked")
	}
	if utils.HashToken(secret) != session.RefreshTokenHash {
		return nil, utils.ErrUnauthorized("invalid refresh token")
	}

	user, err := s.userRepo.FindByID(ctx, session.UserID)
	if err != nil || user == nil {
		return nil, utils.ErrUnauthorized("user not found")
	}

	newSecret, err := utils.GenerateOpaqueSecret()
	if err != nil {
		return nil, utils.ErrInternal("failed to rotate refresh token")
	}
	session.RefreshTokenHash = utils.HashToken(newSecret)
	session.LastActiveAt = time.Now()
	session.ExpiresAt = time.Now().Add(time.Duration(s.jwtCfg.RefreshTTLDays) * 24 * time.Hour)
	if err := s.sessionRepo.Update(ctx, session); err != nil {
		return nil, utils.ErrInternal("failed to persist session")
	}

	accessToken, err := utils.GenerateAccessToken(s.jwtCfg.AccessSecret, user.ID, time.Duration(s.jwtCfg.AccessTTLMinutes)*time.Minute)
	if err != nil {
		return nil, utils.ErrInternal("failed to generate access token")
	}

	return &response.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: fmt.Sprintf("%s.%s", session.ID, newSecret),
		User:         toUserResponse(user),
	}, nil
}

func (s *authService) Logout(ctx context.Context, req request.RefreshTokenRequest) error {
	sessionID, secret, ok := splitRefreshToken(req.RefreshToken)
	if !ok {
		return nil
	}

	session, err := s.sessionRepo.FindByID(ctx, sessionID)
	if err != nil {
		return utils.ErrInternal("failed to look up session")
	}
	if session == nil || session.RevokedAt != nil {
		return nil
	}
	if utils.HashToken(secret) != session.RefreshTokenHash {
		return nil
	}

	if err := s.sessionRepo.RevokeByID(ctx, sessionID); err != nil {
		return utils.ErrInternal("failed to revoke session")
	}

	s.auditSvc.LogEvent(ctx, &session.UserID, domain.SecurityAuditEventSessionRevoked, "", "", map[string]interface{}{"session_id": sessionID, "via": "logout"})
	return nil
}

func (s *authService) ListSessions(ctx context.Context, userID string) ([]response.SessionResponse, error) {
	sessions, err := s.sessionRepo.FindActiveByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to list sessions")
	}

	out := make([]response.SessionResponse, 0, len(sessions))
	for _, sess := range sessions {
		item := response.SessionResponse{
			ID:           sess.ID,
			LastActiveAt: sess.LastActiveAt,
			CreatedAt:    sess.CreatedAt,
		}
		if sess.DeviceName != nil {
			item.DeviceName = *sess.DeviceName
		}
		if sess.IPAddress != nil {
			item.IPAddress = *sess.IPAddress
		}
		if sess.UserAgent != nil {
			item.UserAgent = *sess.UserAgent
		}
		out = append(out, item)
	}
	return out, nil
}

func (s *authService) RevokeSession(ctx context.Context, userID, sessionID string) error {
	session, err := s.sessionRepo.FindByID(ctx, sessionID)
	if err != nil {
		return utils.ErrInternal("failed to look up session")
	}
	if session == nil || session.UserID != userID {
		return utils.ErrNotFound("session not found")
	}

	if err := s.sessionRepo.RevokeByID(ctx, sessionID); err != nil {
		return utils.ErrInternal("failed to revoke session")
	}

	s.auditSvc.LogEvent(ctx, &userID, domain.SecurityAuditEventSessionRevoked, "", "", map[string]interface{}{"session_id": sessionID})
	return nil
}

func (s *authService) RevokeOtherSessions(ctx context.Context, userID, currentSessionID string) error {
	if err := s.sessionRepo.RevokeAllExcept(ctx, userID, currentSessionID); err != nil {
		return utils.ErrInternal("failed to revoke other sessions")
	}
	s.auditSvc.LogEvent(ctx, &userID, domain.SecurityAuditEventSessionsRevokedOthers, "", "", nil)
	return nil
}

func (s *authService) issueTokens(ctx context.Context, user *domain.User, ip, userAgent string) (*response.AuthResponse, error) {
	accessToken, err := utils.GenerateAccessToken(s.jwtCfg.AccessSecret, user.ID, time.Duration(s.jwtCfg.AccessTTLMinutes)*time.Minute)
	if err != nil {
		return nil, utils.ErrInternal("failed to generate access token")
	}

	refreshSecret, err := utils.GenerateOpaqueSecret()
	if err != nil {
		return nil, utils.ErrInternal("failed to generate refresh token")
	}

	session := &domain.UserSession{
		ID:               uuid.NewString(),
		UserID:           user.ID,
		RefreshTokenHash: utils.HashToken(refreshSecret),
		LastActiveAt:     time.Now(),
		ExpiresAt:        time.Now().Add(time.Duration(s.jwtCfg.RefreshTTLDays) * 24 * time.Hour),
	}
	if ip != "" {
		session.IPAddress = &ip
	}
	if userAgent != "" {
		session.UserAgent = &userAgent
	}
	if err := s.sessionRepo.Create(ctx, session); err != nil {
		return nil, utils.ErrInternal("failed to create session")
	}

	return &response.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: fmt.Sprintf("%s.%s", session.ID, refreshSecret),
		User:         toUserResponse(user),
	}, nil
}

func splitRefreshToken(raw string) (sessionID, secret string, ok bool) {
	parts := strings.SplitN(raw, ".", 2)
	if len(parts) != 2 || parts[0] == "" || parts[1] == "" {
		return "", "", false
	}
	return parts[0], parts[1], true
}

func toUserResponse(user *domain.User) response.UserResponse {
	return response.UserResponse{
		ID:        user.ID,
		Name:      user.Name,
		Email:     user.Email,
		CreatedAt: user.CreatedAt,
	}
}
