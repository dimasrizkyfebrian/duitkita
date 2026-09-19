package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/model/dto/request"
	"duitkita-api/service"
	"duitkita-api/utils"
)

type ReminderHandler struct {
	svc service.ReminderService
}

func NewReminderHandler(svc service.ReminderService) *ReminderHandler {
	return &ReminderHandler{svc: svc}
}

func (h *ReminderHandler) RegisterRoutes(rg *gin.RouterGroup) {
	reminders := rg.Group("/reminders")
	reminders.POST("", h.create)
	reminders.GET("", h.list)
	reminders.GET("/:id", h.getByID)
	reminders.PATCH("/:id", h.update)
	reminders.POST("/:id/mark-done", h.markDone)
	reminders.POST("/:id/snooze", h.snooze)
	reminders.DELETE("/:id", h.delete)
}

func (h *ReminderHandler) create(c *gin.Context) {
	var req request.CreateReminderRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.Create(c.Request.Context(), currentUserID(c), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusCreated, "reminder created", res)
}

func (h *ReminderHandler) list(c *gin.Context) {
	res, err := h.svc.List(c.Request.Context(), currentUserID(c))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "reminders retrieved", res)
}

func (h *ReminderHandler) getByID(c *gin.Context) {
	res, err := h.svc.GetByID(c.Request.Context(), currentUserID(c), c.Param("id"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "reminder retrieved", res)
}

func (h *ReminderHandler) update(c *gin.Context) {
	var req request.UpdateReminderRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.Update(c.Request.Context(), currentUserID(c), c.Param("id"), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "reminder updated", res)
}

func (h *ReminderHandler) markDone(c *gin.Context) {
	res, err := h.svc.MarkDone(c.Request.Context(), currentUserID(c), c.Param("id"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "reminder marked as done", res)
}

func (h *ReminderHandler) snooze(c *gin.Context) {
	var req request.SnoozeReminderRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.Snooze(c.Request.Context(), currentUserID(c), c.Param("id"), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "reminder snoozed", res)
}

func (h *ReminderHandler) delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), currentUserID(c), c.Param("id")); err != nil {
		c.Error(err)
		return
	}
	c.Status(http.StatusNoContent)
}
