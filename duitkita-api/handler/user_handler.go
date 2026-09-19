package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/model/dto/request"
	"duitkita-api/service"
	"duitkita-api/utils"
)

type UserHandler struct {
	svc service.UserService
}

func NewUserHandler(svc service.UserService) *UserHandler {
	return &UserHandler{svc: svc}
}

func (h *UserHandler) RegisterRoutes(rg *gin.RouterGroup) {
	users := rg.Group("/users")
	users.GET("/me", h.getMe)
	users.PATCH("/me", h.updateMe)
	users.POST("/me/avatar", h.uploadAvatar)
	users.DELETE("/me/avatar", h.deleteAvatar)
	users.GET("/me/avatar", h.getMyAvatar)
	users.GET("/:userId/avatar", h.getUserAvatar)
	users.PATCH("/me/password", h.changePassword)
	users.GET("/me/security-audit", h.getSecurityAudit)
}

func (h *UserHandler) getMe(c *gin.Context) {
	res, err := h.svc.GetProfile(c.Request.Context(), currentUserID(c))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "profile retrieved", res)
}

func (h *UserHandler) updateMe(c *gin.Context) {
	var req request.UpdateProfileRequest
	if !bindJSON(c, &req) {
		return
	}

	res, err := h.svc.UpdateProfile(c.Request.Context(), currentUserID(c), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "profile updated", res)
}

func (h *UserHandler) uploadAvatar(c *gin.Context) {
	fileHeader, err := c.FormFile("avatar")
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "avatar file is required")
		return
	}
	file, err := fileHeader.Open()
	if err != nil {
		utils.Fail(c, http.StatusBadRequest, "failed to read uploaded file")
		return
	}
	defer file.Close()

	res, err := h.svc.UploadAvatar(c.Request.Context(), currentUserID(c), file, fileHeader)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "avatar uploaded", res)
}

func (h *UserHandler) deleteAvatar(c *gin.Context) {
	if err := h.svc.DeleteAvatar(c.Request.Context(), currentUserID(c)); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "avatar deleted", nil)
}

func (h *UserHandler) getMyAvatar(c *gin.Context) {
	url, err := h.svc.GetAvatarURL(c.Request.Context(), currentUserID(c))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "avatar url retrieved", gin.H{"url": url})
}

func (h *UserHandler) getUserAvatar(c *gin.Context) {
	url, err := h.svc.GetAvatarURL(c.Request.Context(), c.Param("userId"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "avatar url retrieved", gin.H{"url": url})
}

func (h *UserHandler) changePassword(c *gin.Context) {
	var req request.ChangePasswordRequest
	if !bindJSON(c, &req) {
		return
	}

	if err := h.svc.ChangePassword(c.Request.Context(), currentUserID(c), req); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "password changed", nil)
}

func (h *UserHandler) getSecurityAudit(c *gin.Context) {
	logs, err := h.svc.GetSecurityAudit(c.Request.Context(), currentUserID(c))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "security audit retrieved", logs)
}
