package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/model/dto/request"
	"duitkita-api/service"
	"duitkita-api/utils"
)

type IncomeHandler struct {
	svc service.IncomeService
}

func NewIncomeHandler(svc service.IncomeService) *IncomeHandler {
	return &IncomeHandler{svc: svc}
}

func (h *IncomeHandler) RegisterRoutes(rg *gin.RouterGroup) {
	incomes := rg.Group("/incomes")
	incomes.POST("", h.create)
	incomes.GET("", h.list)
	incomes.GET("/:id", h.getByID)
	incomes.PATCH("/:id", h.update)
	incomes.DELETE("/:id", h.delete)
}

func (h *IncomeHandler) create(c *gin.Context) {
	var req request.CreateIncomeRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.Create(c.Request.Context(), currentUserID(c), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusCreated, "income created", res)
}

func (h *IncomeHandler) list(c *gin.Context) {
	limit, offset := parsePagination(c)
	filter := service.IncomeListFilter{
		AccountID: c.Query("account_id"),
		Source:    c.Query("source"),
		From:      c.Query("from"),
		To:        c.Query("to"),
		Limit:     limit,
		Offset:    offset,
	}
	res, err := h.svc.List(c.Request.Context(), currentUserID(c), filter)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "incomes retrieved", res)
}

func (h *IncomeHandler) getByID(c *gin.Context) {
	res, err := h.svc.GetByID(c.Request.Context(), currentUserID(c), c.Param("id"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "income retrieved", res)
}

func (h *IncomeHandler) update(c *gin.Context) {
	var req request.UpdateIncomeRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.Update(c.Request.Context(), currentUserID(c), c.Param("id"), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "income updated", res)
}

func (h *IncomeHandler) delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), currentUserID(c), c.Param("id")); err != nil {
		c.Error(err)
		return
	}
	c.Status(http.StatusNoContent)
}
