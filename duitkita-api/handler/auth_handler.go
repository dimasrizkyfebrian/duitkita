package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/model/dto/request"
	"duitkita-api/service"
	"duitkita-api/utils"
)

type AuthHandler struct {
	svc service.AuthService
}

func NewAuthHandler(svc service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

// RegisterPublicRoutes wires the credential endpoints that don't require a valid access token.
func (h *AuthHandler) RegisterPublicRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	auth.POST("/register", h.register)
	auth.POST("/login", h.login)
	auth.POST("/refresh", h.refresh)
	auth.POST("/logout", h.logout)
}

func (h *AuthHandler) RegisterOTPRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	auth.POST("/verify-otp", h.verifyOTP)
	auth.POST("/resend-otp", h.resendOTP)
	auth.POST("/forgot-password", h.forgotPassword)
	auth.POST("/reset-password", h.resetPassword)
}

// RegisterProtectedRoutes wires the endpoints that require a valid access token.
func (h *AuthHandler) RegisterProtectedRoutes(rg *gin.RouterGroup) {
	auth := rg.Group("/auth")
	auth.GET("/sessions", h.listSessions)
	auth.DELETE("/sessions/others", h.revokeOtherSessions)
	auth.DELETE("/sessions/:id", h.revokeSession)
}

func (h *AuthHandler) register(c *gin.Context) {
	var req request.RegisterRequest
	if !bindJSON(c, &req) {
		return
	}

	res, err := h.svc.Register(c.Request.Context(), req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusCreated, "registered successfully, please check your email for the verification code", res)
}

func (h *AuthHandler) verifyOTP(c *gin.Context) {
	var req request.VerifyOTPRequest
	if !bindJSON(c, &req) {
		return
	}

	res, err := h.svc.VerifyOTP(c.Request.Context(), req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "account verified", res)
}

func (h *AuthHandler) resendOTP(c *gin.Context) {
	var req request.ResendOTPRequest
	if !bindJSON(c, &req) {
		return
	}

	if err := h.svc.ResendOTP(c.Request.Context(), req); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "otp resent if the account exists", nil)
}

func (h *AuthHandler) forgotPassword(c *gin.Context) {
	var req request.ForgotPasswordRequest
	if !bindJSON(c, &req) {
		return
	}

	if err := h.svc.ForgotPassword(c.Request.Context(), req); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "if the email is registered, a reset code has been sent", nil)
}

func (h *AuthHandler) resetPassword(c *gin.Context) {
	var req request.ResetPasswordRequest
	if !bindJSON(c, &req) {
		return
	}

	if err := h.svc.ResetPassword(c.Request.Context(), req); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "password reset successfully", nil)
}

func (h *AuthHandler) login(c *gin.Context) {
	var req request.LoginRequest
	if !bindJSON(c, &req) {
		return
	}

	res, err := h.svc.Login(c.Request.Context(), req, c.ClientIP(), c.Request.UserAgent())
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "logged in successfully", res)
}

func (h *AuthHandler) refresh(c *gin.Context) {
	var req request.RefreshTokenRequest
	if !bindJSON(c, &req) {
		return
	}

	res, err := h.svc.Refresh(c.Request.Context(), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "token refreshed", res)
}

func (h *AuthHandler) logout(c *gin.Context) {
	var req request.RefreshTokenRequest
	if !bindJSON(c, &req) {
		return
	}

	if err := h.svc.Logout(c.Request.Context(), req); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "logged out successfully", nil)
}

func (h *AuthHandler) listSessions(c *gin.Context) {
	sessions, err := h.svc.ListSessions(c.Request.Context(), currentUserID(c))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "sessions retrieved", sessions)
}

func (h *AuthHandler) revokeOtherSessions(c *gin.Context) {
	currentSessionID := c.Query("current_session_id")
	if err := h.svc.RevokeOtherSessions(c.Request.Context(), currentUserID(c), currentSessionID); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "other sessions revoked", nil)
}

func (h *AuthHandler) revokeSession(c *gin.Context) {
	if err := h.svc.RevokeSession(c.Request.Context(), currentUserID(c), c.Param("id")); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "session revoked", nil)
}
