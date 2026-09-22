package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/model/dto/request"
	"duitkita-api/service"
	"duitkita-api/utils"
)

type NotificationHandler struct {
	svc service.NotificationService
}

func NewNotificationHandler(svc service.NotificationService) *NotificationHandler {
	return &NotificationHandler{svc: svc}
}

func (h *NotificationHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/notifications", h.list)
	rg.PATCH("/notifications/read-all", h.markAllRead)
	rg.PATCH("/notifications/:id/read", h.markRead)
	rg.GET("/users/me/notification-preferences", h.getPreferences)
	rg.PATCH("/users/me/notification-preferences", h.updatePreferences)
}

func (h *NotificationHandler) list(c *gin.Context) {
	res, err := h.svc.List(c.Request.Context(), currentUserID(c))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "notifications retrieved", res)
}

func (h *NotificationHandler) markAllRead(c *gin.Context) {
	if err := h.svc.MarkAllRead(c.Request.Context(), currentUserID(c)); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "all notifications marked as read", nil)
}

func (h *NotificationHandler) markRead(c *gin.Context) {
	if err := h.svc.MarkRead(c.Request.Context(), currentUserID(c), c.Param("id")); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "notification marked as read", nil)
}

func (h *NotificationHandler) getPreferences(c *gin.Context) {
	res, err := h.svc.GetPreferences(c.Request.Context(), currentUserID(c))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "preferences retrieved", res)
}

func (h *NotificationHandler) updatePreferences(c *gin.Context) {
	var req request.UpdateNotificationPreferenceRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.UpdatePreferences(c.Request.Context(), currentUserID(c), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "preferences updated", res)
}
