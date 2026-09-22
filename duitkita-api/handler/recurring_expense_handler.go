package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/model/dto/request"
	"duitkita-api/service"
	"duitkita-api/utils"
)

type RecurringExpenseHandler struct {
	svc service.RecurringExpenseService
}

func NewRecurringExpenseHandler(svc service.RecurringExpenseService) *RecurringExpenseHandler {
	return &RecurringExpenseHandler{svc: svc}
}

func (h *RecurringExpenseHandler) RegisterRoutes(rg *gin.RouterGroup) {
	re := rg.Group("/recurring-expenses")
	re.POST("", h.create)
	re.GET("", h.list)
	re.POST("/run-due", h.runDue)
	re.GET("/:id", h.getByID)
	re.PATCH("/:id", h.update)
	re.DELETE("/:id", h.delete)
	re.POST("/:id/pause", h.pause)
	re.POST("/:id/resume", h.resume)
}

func (h *RecurringExpenseHandler) create(c *gin.Context) {
	var req request.CreateRecurringExpenseRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.Create(c.Request.Context(), currentUserID(c), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusCreated, "recurring expense created", res)
}

func (h *RecurringExpenseHandler) list(c *gin.Context) {
	res, err := h.svc.List(c.Request.Context(), currentUserID(c))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "recurring expenses retrieved", res)
}

func (h *RecurringExpenseHandler) runDue(c *gin.Context) {
	count, err := h.svc.RunDue(c.Request.Context())
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "due recurring expenses processed", gin.H{"processed": count})
}

func (h *RecurringExpenseHandler) getByID(c *gin.Context) {
	res, err := h.svc.GetByID(c.Request.Context(), currentUserID(c), c.Param("id"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "recurring expense retrieved", res)
}

func (h *RecurringExpenseHandler) update(c *gin.Context) {
	var req request.UpdateRecurringExpenseRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.Update(c.Request.Context(), currentUserID(c), c.Param("id"), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "recurring expense updated", res)
}

func (h *RecurringExpenseHandler) delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), currentUserID(c), c.Param("id")); err != nil {
		c.Error(err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *RecurringExpenseHandler) pause(c *gin.Context) {
	if err := h.svc.Pause(c.Request.Context(), currentUserID(c), c.Param("id")); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "recurring expense paused", nil)
}

func (h *RecurringExpenseHandler) resume(c *gin.Context) {
	if err := h.svc.Resume(c.Request.Context(), currentUserID(c), c.Param("id")); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "recurring expense resumed", nil)
}
