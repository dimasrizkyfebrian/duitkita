package service_test

import (
	"context"
	"errors"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"

	"duitkita-api/config"
	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/repository/mocks"
	"duitkita-api/service"
	svcmocks "duitkita-api/service/mocks"
	"duitkita-api/utils"
)

func testJWTConfig() config.JWTConfig {
	return config.JWTConfig{AccessSecret: "test-secret", AccessTTLMinutes: 15, RefreshTTLDays: 30}
}

func newAuthService(t *testing.T) (service.AuthService, *mocks.UserRepository, *mocks.UserSessionRepository, *svcmocks.SecurityAuditService, *svcmocks.OTPService) {
	userRepo := mocks.NewUserRepository(t)
	sessionRepo := mocks.NewUserSessionRepository(t)
	auditSvc := svcmocks.NewSecurityAuditService(t)
	otpSvc := svcmocks.NewOTPService(t)
	return service.NewAuthService(userRepo, sessionRepo, auditSvc, otpSvc, testJWTConfig()), userRepo, sessionRepo, auditSvc, otpSvc
}

func TestAuthService_Register(t *testing.T) {
	req := request.RegisterRequest{Name: "Alice", Email: "alice@example.com", Password: "password123"}

	t.Run("success creates an unverified user and sends an otp instead of issuing tokens", func(t *testing.T) {
		svc, userRepo, _, auditSvc, otpSvc := newAuthService(t)
		userRepo.EXPECT().ExistsByEmail(context.Background(), "alice@example.com").Return(false, nil)
		userRepo.EXPECT().Create(context.Background(), mockMatchByType[*domain.User]()).RunAndReturn(func(_ context.Context, u *domain.User) error {
			require.NotEmpty(t, u.PasswordHash)
			require.NoError(t, bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte("password123")))
			require.False(t, u.IsVerified)
			return nil
		})
		otpSvc.EXPECT().Generate(context.Background(), "alice@example.com", service.OTPPurposeRegister).Return(nil)
		auditSvc.EXPECT().LogEvent(context.Background(), mock.Anything, domain.SecurityAuditEventRegisterSuccess, "1.2.3.4", "curl", mock.Anything).Return()

		res, err := svc.Register(context.Background(), req, "1.2.3.4", "curl")

		require.NoError(t, err)
		require.Equal(t, "alice@example.com", res.Email)
	})

	t.Run("duplicate email rejected", func(t *testing.T) {
		svc, userRepo, _, _, _ := newAuthService(t)
		userRepo.EXPECT().ExistsByEmail(context.Background(), "alice@example.com").Return(true, nil)

		_, err := svc.Register(context.Background(), req, "", "")

		requireAppError(t, err, http.StatusConflict, "email already registered")
	})

	t.Run("existence check failure is internal", func(t *testing.T) {
		svc, userRepo, _, _, _ := newAuthService(t)
		userRepo.EXPECT().ExistsByEmail(context.Background(), "alice@example.com").Return(false, errors.New("db down"))

		_, err := svc.Register(context.Background(), req, "", "")

		requireAppError(t, err, http.StatusInternalServerError, "failed to check existing user")
	})
}

func TestAuthService_VerifyOTP(t *testing.T) {
	t.Run("success marks the user verified and issues tokens", func(t *testing.T) {
		svc, userRepo, sessionRepo, _, otpSvc := newAuthService(t)
		user := &domain.User{ID: "user-1", Email: "alice@example.com", IsVerified: false}
		userRepo.EXPECT().FindByEmail(context.Background(), "alice@example.com").Return(user, nil)
		otpSvc.EXPECT().Verify(context.Background(), "alice@example.com", service.OTPPurposeRegister, "123456").Return(nil)
		userRepo.EXPECT().Update(context.Background(), user).RunAndReturn(func(_ context.Context, u *domain.User) error {
			require.True(t, u.IsVerified)
			return nil
		})
		sessionRepo.EXPECT().Create(context.Background(), mockMatchByType[*domain.UserSession]()).Return(nil)

		res, err := svc.VerifyOTP(context.Background(), request.VerifyOTPRequest{Email: "alice@example.com", OTP: "123456"}, "", "")

		require.NoError(t, err)
		require.NotEmpty(t, res.AccessToken)
	})

	t.Run("already verified rejected", func(t *testing.T) {
		svc, userRepo, _, _, _ := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "alice@example.com").Return(&domain.User{ID: "user-1", IsVerified: true}, nil)

		_, err := svc.VerifyOTP(context.Background(), request.VerifyOTPRequest{Email: "alice@example.com", OTP: "123456"}, "", "")

		requireAppError(t, err, http.StatusConflict, "account already verified")
	})

	t.Run("unknown email rejected", func(t *testing.T) {
		svc, userRepo, _, _, _ := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "nobody@example.com").Return(nil, nil)

		_, err := svc.VerifyOTP(context.Background(), request.VerifyOTPRequest{Email: "nobody@example.com", OTP: "123456"}, "", "")

		requireAppError(t, err, http.StatusNotFound, "user not found")
	})

	t.Run("wrong otp propagates the otp service error", func(t *testing.T) {
		svc, userRepo, _, _, otpSvc := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "alice@example.com").Return(&domain.User{ID: "user-1"}, nil)
		otpSvc.EXPECT().Verify(context.Background(), "alice@example.com", service.OTPPurposeRegister, "000000").
			Return(utils.ErrBadRequest("invalid otp"))

		_, err := svc.VerifyOTP(context.Background(), request.VerifyOTPRequest{Email: "alice@example.com", OTP: "000000"}, "", "")

		requireAppError(t, err, http.StatusBadRequest, "invalid otp")
	})
}

func TestAuthService_ResendOTP(t *testing.T) {
	t.Run("success regenerates the otp", func(t *testing.T) {
		svc, userRepo, _, _, otpSvc := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "alice@example.com").Return(&domain.User{ID: "user-1"}, nil)
		otpSvc.EXPECT().Generate(context.Background(), "alice@example.com", service.OTPPurposeRegister).Return(nil)

		err := svc.ResendOTP(context.Background(), request.ResendOTPRequest{Email: "alice@example.com", Purpose: "register"})

		require.NoError(t, err)
	})

	t.Run("already verified account rejected", func(t *testing.T) {
		svc, userRepo, _, _, _ := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "alice@example.com").Return(&domain.User{ID: "user-1", IsVerified: true}, nil)

		err := svc.ResendOTP(context.Background(), request.ResendOTPRequest{Email: "alice@example.com", Purpose: "register"})

		requireAppError(t, err, http.StatusConflict, "account already verified")
	})

	t.Run("unknown email silently succeeds to avoid leaking registration status", func(t *testing.T) {
		svc, userRepo, _, _, _ := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "nobody@example.com").Return(nil, nil)

		err := svc.ResendOTP(context.Background(), request.ResendOTPRequest{Email: "nobody@example.com", Purpose: "register"})

		require.NoError(t, err)
	})
}

func TestAuthService_ForgotPassword(t *testing.T) {
	t.Run("success sends a reset otp", func(t *testing.T) {
		svc, userRepo, _, _, otpSvc := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "alice@example.com").Return(&domain.User{ID: "user-1"}, nil)
		otpSvc.EXPECT().Generate(context.Background(), "alice@example.com", service.OTPPurposeResetPassword).Return(nil)

		err := svc.ForgotPassword(context.Background(), request.ForgotPasswordRequest{Email: "alice@example.com"})

		require.NoError(t, err)
	})

	t.Run("unknown email silently succeeds to avoid leaking registration status", func(t *testing.T) {
		svc, userRepo, _, _, _ := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "nobody@example.com").Return(nil, nil)

		err := svc.ForgotPassword(context.Background(), request.ForgotPasswordRequest{Email: "nobody@example.com"})

		require.NoError(t, err)
	})
}

func TestAuthService_ResetPassword(t *testing.T) {
	t.Run("success rotates the password and revokes all sessions", func(t *testing.T) {
		svc, userRepo, sessionRepo, auditSvc, otpSvc := newAuthService(t)
		user := &domain.User{ID: "user-1", Email: "alice@example.com", PasswordHash: "old-hash"}
		userRepo.EXPECT().FindByEmail(context.Background(), "alice@example.com").Return(user, nil)
		otpSvc.EXPECT().Verify(context.Background(), "alice@example.com", service.OTPPurposeResetPassword, "123456").Return(nil)
		userRepo.EXPECT().Update(context.Background(), user).RunAndReturn(func(_ context.Context, u *domain.User) error {
			require.NotEqual(t, "old-hash", u.PasswordHash)
			require.NoError(t, bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte("newpassword123")))
			return nil
		})
		sessionRepo.EXPECT().RevokeAllByUserID(context.Background(), "user-1").Return(nil)
		auditSvc.EXPECT().LogEvent(context.Background(), &user.ID, domain.SecurityAuditEventPasswordChanged, "", "", mock.Anything).Return()

		err := svc.ResetPassword(context.Background(), request.ResetPasswordRequest{Email: "alice@example.com", OTP: "123456", NewPassword: "newpassword123"})

		require.NoError(t, err)
	})

	t.Run("wrong otp propagates the otp service error", func(t *testing.T) {
		svc, userRepo, _, _, otpSvc := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "alice@example.com").Return(&domain.User{ID: "user-1"}, nil)
		otpSvc.EXPECT().Verify(context.Background(), "alice@example.com", service.OTPPurposeResetPassword, "000000").
			Return(utils.ErrBadRequest("invalid otp"))

		err := svc.ResetPassword(context.Background(), request.ResetPasswordRequest{Email: "alice@example.com", OTP: "000000", NewPassword: "newpassword123"})

		requireAppError(t, err, http.StatusBadRequest, "invalid otp")
	})

	t.Run("unknown email rejected", func(t *testing.T) {
		svc, userRepo, _, _, _ := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "nobody@example.com").Return(nil, nil)

		err := svc.ResetPassword(context.Background(), request.ResetPasswordRequest{Email: "nobody@example.com", OTP: "123456", NewPassword: "newpassword123"})

		requireAppError(t, err, http.StatusNotFound, "user not found")
	})
}

func TestAuthService_Login(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	require.NoError(t, err)
	existingUser := &domain.User{ID: "user-1", Email: "alice@example.com", PasswordHash: string(hash), IsVerified: true}

	t.Run("success", func(t *testing.T) {
		svc, userRepo, sessionRepo, auditSvc, _ := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "alice@example.com").Return(existingUser, nil)
		auditSvc.EXPECT().LogEvent(context.Background(), &existingUser.ID, domain.SecurityAuditEventLoginSuccess, "", "", mock.Anything).Return()
		sessionRepo.EXPECT().Create(context.Background(), mockMatchByType[*domain.UserSession]()).Return(nil)

		res, err := svc.Login(context.Background(), request.LoginRequest{Email: "alice@example.com", Password: "password123"}, "", "")

		require.NoError(t, err)
		require.NotEmpty(t, res.AccessToken)
	})

	t.Run("wrong password logs failure and returns unauthorized without leaking which part was wrong", func(t *testing.T) {
		svc, userRepo, _, auditSvc, _ := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "alice@example.com").Return(existingUser, nil)
		auditSvc.EXPECT().LogEvent(context.Background(), &existingUser.ID, domain.SecurityAuditEventLoginFailure, "", "", mock.Anything).Return()

		_, err := svc.Login(context.Background(), request.LoginRequest{Email: "alice@example.com", Password: "wrong"}, "", "")

		requireAppError(t, err, http.StatusUnauthorized, "invalid email or password")
	})

	t.Run("unknown email returns the same generic error", func(t *testing.T) {
		svc, userRepo, _, _, _ := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "nobody@example.com").Return(nil, nil)

		_, err := svc.Login(context.Background(), request.LoginRequest{Email: "nobody@example.com", Password: "x"}, "", "")

		requireAppError(t, err, http.StatusUnauthorized, "invalid email or password")
	})

	t.Run("unverified account blocked even with correct password", func(t *testing.T) {
		svc, userRepo, _, _, _ := newAuthService(t)
		unverified := &domain.User{ID: "user-2", Email: "bob@example.com", PasswordHash: string(hash), IsVerified: false}
		userRepo.EXPECT().FindByEmail(context.Background(), "bob@example.com").Return(unverified, nil)

		_, err := svc.Login(context.Background(), request.LoginRequest{Email: "bob@example.com", Password: "password123"}, "", "")

		requireAppError(t, err, http.StatusForbidden, "email not verified, please verify your account first")
	})
}

func TestAuthService_Refresh(t *testing.T) {
	t.Run("malformed token rejected before touching the repo", func(t *testing.T) {
		svc, _, _, _, _ := newAuthService(t)

		_, err := svc.Refresh(context.Background(), request.RefreshTokenRequest{RefreshToken: "no-dot-here"})

		requireAppError(t, err, http.StatusUnauthorized, "malformed refresh token")
	})

	t.Run("revoked session rejected", func(t *testing.T) {
		svc, _, sessionRepo, _, _ := newAuthService(t)
		revokedAt := time.Now()
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(&domain.UserSession{ID: "sess-1", RevokedAt: &revokedAt}, nil)

		_, err := svc.Refresh(context.Background(), request.RefreshTokenRequest{RefreshToken: "sess-1.secret"})

		requireAppError(t, err, http.StatusUnauthorized, "session expired or revoked")
	})

	t.Run("expired session rejected", func(t *testing.T) {
		svc, _, sessionRepo, _, _ := newAuthService(t)
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(&domain.UserSession{ID: "sess-1", ExpiresAt: time.Now().Add(-time.Hour)}, nil)

		_, err := svc.Refresh(context.Background(), request.RefreshTokenRequest{RefreshToken: "sess-1.secret"})

		requireAppError(t, err, http.StatusUnauthorized, "session expired or revoked")
	})

	t.Run("wrong secret rejected", func(t *testing.T) {
		svc, _, sessionRepo, _, _ := newAuthService(t)
		session := &domain.UserSession{ID: "sess-1", UserID: "user-1", ExpiresAt: time.Now().Add(time.Hour), RefreshTokenHash: utils.HashToken("correct-secret")}
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(session, nil)

		_, err := svc.Refresh(context.Background(), request.RefreshTokenRequest{RefreshToken: "sess-1.wrong-secret"})

		requireAppError(t, err, http.StatusUnauthorized, "invalid refresh token")
	})

	t.Run("success rotates the refresh token", func(t *testing.T) {
		svc, userRepo, sessionRepo, _, _ := newAuthService(t)
		session := &domain.UserSession{ID: "sess-1", UserID: "user-1", ExpiresAt: time.Now().Add(time.Hour), RefreshTokenHash: utils.HashToken("correct-secret")}
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(session, nil)
		userRepo.EXPECT().FindByID(context.Background(), "user-1").Return(&domain.User{ID: "user-1", Email: "alice@example.com"}, nil)
		sessionRepo.EXPECT().Update(context.Background(), session).RunAndReturn(func(_ context.Context, s *domain.UserSession) error {
			require.NotEqual(t, utils.HashToken("correct-secret"), s.RefreshTokenHash)
			return nil
		})

		res, err := svc.Refresh(context.Background(), request.RefreshTokenRequest{RefreshToken: "sess-1.correct-secret"})

		require.NoError(t, err)
		require.NotEmpty(t, res.AccessToken)
		require.Contains(t, res.RefreshToken, "sess-1.")
	})
}

func TestAuthService_Logout(t *testing.T) {
	t.Run("malformed token is a no-op", func(t *testing.T) {
		svc, _, _, _, _ := newAuthService(t)

		err := svc.Logout(context.Background(), request.RefreshTokenRequest{RefreshToken: "no-dot-here"})

		require.NoError(t, err)
	})

	t.Run("unknown session is a no-op", func(t *testing.T) {
		svc, _, sessionRepo, _, _ := newAuthService(t)
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(nil, nil)

		err := svc.Logout(context.Background(), request.RefreshTokenRequest{RefreshToken: "sess-1.secret"})

		require.NoError(t, err)
	})

	t.Run("already revoked session is a no-op", func(t *testing.T) {
		svc, _, sessionRepo, _, _ := newAuthService(t)
		revokedAt := time.Now()
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(&domain.UserSession{ID: "sess-1", RevokedAt: &revokedAt}, nil)

		err := svc.Logout(context.Background(), request.RefreshTokenRequest{RefreshToken: "sess-1.secret"})

		require.NoError(t, err)
	})

	t.Run("wrong secret is a no-op, does not revoke someone else's session", func(t *testing.T) {
		svc, _, sessionRepo, _, _ := newAuthService(t)
		session := &domain.UserSession{ID: "sess-1", UserID: "user-1", RefreshTokenHash: utils.HashToken("correct-secret")}
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(session, nil)

		err := svc.Logout(context.Background(), request.RefreshTokenRequest{RefreshToken: "sess-1.wrong-secret"})

		require.NoError(t, err)
	})

	t.Run("success revokes the session", func(t *testing.T) {
		svc, _, sessionRepo, auditSvc, _ := newAuthService(t)
		session := &domain.UserSession{ID: "sess-1", UserID: "user-1", RefreshTokenHash: utils.HashToken("correct-secret")}
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(session, nil)
		sessionRepo.EXPECT().RevokeByID(context.Background(), "sess-1").Return(nil)
		auditSvc.EXPECT().LogEvent(context.Background(), mock.Anything, domain.SecurityAuditEventSessionRevoked, "", "", mock.Anything).Return()

		err := svc.Logout(context.Background(), request.RefreshTokenRequest{RefreshToken: "sess-1.correct-secret"})

		require.NoError(t, err)
	})
}

func TestAuthService_ListSessions(t *testing.T) {
	svc, _, sessionRepo, _, _ := newAuthService(t)
	device := "iPhone"
	sessionRepo.EXPECT().FindActiveByUserID(context.Background(), "user-1").Return([]domain.UserSession{
		{ID: "sess-1", DeviceName: &device},
	}, nil)

	res, err := svc.ListSessions(context.Background(), "user-1")

	require.NoError(t, err)
	require.Len(t, res, 1)
	require.Equal(t, "iPhone", res[0].DeviceName)
}

func TestAuthService_RevokeSession(t *testing.T) {
	t.Run("blocked when not owner", func(t *testing.T) {
		svc, _, sessionRepo, _, _ := newAuthService(t)
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(&domain.UserSession{ID: "sess-1", UserID: "someone-else"}, nil)

		err := svc.RevokeSession(context.Background(), "user-1", "sess-1")

		requireAppError(t, err, http.StatusNotFound, "session not found")
	})

	t.Run("success", func(t *testing.T) {
		svc, _, sessionRepo, auditSvc, _ := newAuthService(t)
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(&domain.UserSession{ID: "sess-1", UserID: "user-1"}, nil)
		sessionRepo.EXPECT().RevokeByID(context.Background(), "sess-1").Return(nil)
		auditSvc.EXPECT().LogEvent(context.Background(), mock.Anything, domain.SecurityAuditEventSessionRevoked, "", "", mock.Anything).Return()

		err := svc.RevokeSession(context.Background(), "user-1", "sess-1")

		require.NoError(t, err)
	})
}

func TestAuthService_RevokeOtherSessions(t *testing.T) {
	svc, _, sessionRepo, auditSvc, _ := newAuthService(t)
	sessionRepo.EXPECT().RevokeAllExcept(context.Background(), "user-1", "sess-current").Return(nil)
	auditSvc.EXPECT().LogEvent(context.Background(), mock.Anything, domain.SecurityAuditEventSessionsRevokedOthers, "", "", mock.Anything).Return()

	err := svc.RevokeOtherSessions(context.Background(), "user-1", "sess-current")

	require.NoError(t, err)
}
