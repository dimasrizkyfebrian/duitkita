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

func newAuthService(t *testing.T) (service.AuthService, *mocks.UserRepository, *mocks.UserSessionRepository, *svcmocks.SecurityAuditService) {
	userRepo := mocks.NewUserRepository(t)
	sessionRepo := mocks.NewUserSessionRepository(t)
	auditSvc := svcmocks.NewSecurityAuditService(t)
	return service.NewAuthService(userRepo, sessionRepo, auditSvc, testJWTConfig()), userRepo, sessionRepo, auditSvc
}

func TestAuthService_Register(t *testing.T) {
	req := request.RegisterRequest{Name: "Alice", Email: "alice@example.com", Password: "password123"}

	t.Run("success issues tokens and creates a session", func(t *testing.T) {
		svc, userRepo, sessionRepo, auditSvc := newAuthService(t)
		userRepo.EXPECT().ExistsByEmail(context.Background(), "alice@example.com").Return(false, nil)
		userRepo.EXPECT().Create(context.Background(), mockMatchByType[*domain.User]()).RunAndReturn(func(_ context.Context, u *domain.User) error {
			require.NotEmpty(t, u.PasswordHash)
			require.NoError(t, bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte("password123")))
			return nil
		})
		auditSvc.EXPECT().LogEvent(context.Background(), mock.Anything, domain.SecurityAuditEventRegisterSuccess, "1.2.3.4", "curl", mock.Anything).Return()
		sessionRepo.EXPECT().Create(context.Background(), mockMatchByType[*domain.UserSession]()).Return(nil)

		res, err := svc.Register(context.Background(), req, "1.2.3.4", "curl")

		require.NoError(t, err)
		require.NotEmpty(t, res.AccessToken)
		require.NotEmpty(t, res.RefreshToken)
		require.Equal(t, "alice@example.com", res.User.Email)
	})

	t.Run("duplicate email rejected", func(t *testing.T) {
		svc, userRepo, _, _ := newAuthService(t)
		userRepo.EXPECT().ExistsByEmail(context.Background(), "alice@example.com").Return(true, nil)

		_, err := svc.Register(context.Background(), req, "", "")

		requireAppError(t, err, http.StatusConflict, "email already registered")
	})

	t.Run("existence check failure is internal", func(t *testing.T) {
		svc, userRepo, _, _ := newAuthService(t)
		userRepo.EXPECT().ExistsByEmail(context.Background(), "alice@example.com").Return(false, errors.New("db down"))

		_, err := svc.Register(context.Background(), req, "", "")

		requireAppError(t, err, http.StatusInternalServerError, "failed to check existing user")
	})
}

func TestAuthService_Login(t *testing.T) {
	hash, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	require.NoError(t, err)
	existingUser := &domain.User{ID: "user-1", Email: "alice@example.com", PasswordHash: string(hash)}

	t.Run("success", func(t *testing.T) {
		svc, userRepo, sessionRepo, auditSvc := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "alice@example.com").Return(existingUser, nil)
		auditSvc.EXPECT().LogEvent(context.Background(), &existingUser.ID, domain.SecurityAuditEventLoginSuccess, "", "", mock.Anything).Return()
		sessionRepo.EXPECT().Create(context.Background(), mockMatchByType[*domain.UserSession]()).Return(nil)

		res, err := svc.Login(context.Background(), request.LoginRequest{Email: "alice@example.com", Password: "password123"}, "", "")

		require.NoError(t, err)
		require.NotEmpty(t, res.AccessToken)
	})

	t.Run("wrong password logs failure and returns unauthorized without leaking which part was wrong", func(t *testing.T) {
		svc, userRepo, _, auditSvc := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "alice@example.com").Return(existingUser, nil)
		auditSvc.EXPECT().LogEvent(context.Background(), &existingUser.ID, domain.SecurityAuditEventLoginFailure, "", "", mock.Anything).Return()

		_, err := svc.Login(context.Background(), request.LoginRequest{Email: "alice@example.com", Password: "wrong"}, "", "")

		requireAppError(t, err, http.StatusUnauthorized, "invalid email or password")
	})

	t.Run("unknown email returns the same generic error", func(t *testing.T) {
		svc, userRepo, _, _ := newAuthService(t)
		userRepo.EXPECT().FindByEmail(context.Background(), "nobody@example.com").Return(nil, nil)

		_, err := svc.Login(context.Background(), request.LoginRequest{Email: "nobody@example.com", Password: "x"}, "", "")

		requireAppError(t, err, http.StatusUnauthorized, "invalid email or password")
	})
}

func TestAuthService_Refresh(t *testing.T) {
	t.Run("malformed token rejected before touching the repo", func(t *testing.T) {
		svc, _, _, _ := newAuthService(t)

		_, err := svc.Refresh(context.Background(), request.RefreshTokenRequest{RefreshToken: "no-dot-here"})

		requireAppError(t, err, http.StatusUnauthorized, "malformed refresh token")
	})

	t.Run("revoked session rejected", func(t *testing.T) {
		svc, _, sessionRepo, _ := newAuthService(t)
		revokedAt := time.Now()
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(&domain.UserSession{ID: "sess-1", RevokedAt: &revokedAt}, nil)

		_, err := svc.Refresh(context.Background(), request.RefreshTokenRequest{RefreshToken: "sess-1.secret"})

		requireAppError(t, err, http.StatusUnauthorized, "session expired or revoked")
	})

	t.Run("expired session rejected", func(t *testing.T) {
		svc, _, sessionRepo, _ := newAuthService(t)
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(&domain.UserSession{ID: "sess-1", ExpiresAt: time.Now().Add(-time.Hour)}, nil)

		_, err := svc.Refresh(context.Background(), request.RefreshTokenRequest{RefreshToken: "sess-1.secret"})

		requireAppError(t, err, http.StatusUnauthorized, "session expired or revoked")
	})

	t.Run("wrong secret rejected", func(t *testing.T) {
		svc, _, sessionRepo, _ := newAuthService(t)
		session := &domain.UserSession{ID: "sess-1", UserID: "user-1", ExpiresAt: time.Now().Add(time.Hour), RefreshTokenHash: utils.HashToken("correct-secret")}
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(session, nil)

		_, err := svc.Refresh(context.Background(), request.RefreshTokenRequest{RefreshToken: "sess-1.wrong-secret"})

		requireAppError(t, err, http.StatusUnauthorized, "invalid refresh token")
	})

	t.Run("success rotates the refresh token", func(t *testing.T) {
		svc, userRepo, sessionRepo, _ := newAuthService(t)
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

func TestAuthService_ListSessions(t *testing.T) {
	svc, _, sessionRepo, _ := newAuthService(t)
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
		svc, _, sessionRepo, _ := newAuthService(t)
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(&domain.UserSession{ID: "sess-1", UserID: "someone-else"}, nil)

		err := svc.RevokeSession(context.Background(), "user-1", "sess-1")

		requireAppError(t, err, http.StatusNotFound, "session not found")
	})

	t.Run("success", func(t *testing.T) {
		svc, _, sessionRepo, auditSvc := newAuthService(t)
		sessionRepo.EXPECT().FindByID(context.Background(), "sess-1").Return(&domain.UserSession{ID: "sess-1", UserID: "user-1"}, nil)
		sessionRepo.EXPECT().RevokeByID(context.Background(), "sess-1").Return(nil)
		auditSvc.EXPECT().LogEvent(context.Background(), mock.Anything, domain.SecurityAuditEventSessionRevoked, "", "", mock.Anything).Return()

		err := svc.RevokeSession(context.Background(), "user-1", "sess-1")

		require.NoError(t, err)
	})
}

func TestAuthService_RevokeOtherSessions(t *testing.T) {
	svc, _, sessionRepo, auditSvc := newAuthService(t)
	sessionRepo.EXPECT().RevokeAllExcept(context.Background(), "user-1", "sess-current").Return(nil)
	auditSvc.EXPECT().LogEvent(context.Background(), mock.Anything, domain.SecurityAuditEventSessionsRevokedOthers, "", "", mock.Anything).Return()

	err := svc.RevokeOtherSessions(context.Background(), "user-1", "sess-current")

	require.NoError(t, err)
}
