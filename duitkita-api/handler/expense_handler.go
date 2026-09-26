package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/model/dto/request"
	"duitkita-api/service"
	"duitkita-api/utils"
)

type ExpenseHandler struct {
	svc service.ExpenseService
}

func NewExpenseHandler(svc service.ExpenseService) *ExpenseHandler {
	return &ExpenseHandler{svc: svc}
}

func (h *ExpenseHandler) RegisterRoutes(rg *gin.RouterGroup) {
	expenses := rg.Group("/expenses")
	expenses.POST("", h.create)
	expenses.GET("/by-budget/:budgetId", h.listByBudget)
	expenses.GET("/partner", h.partner)
	expenses.GET("", h.list)
	expenses.GET("/:id", h.getByID)
	expenses.PATCH("/:id", h.update)
	expenses.DELETE("/:id", h.delete)
}

func (h *ExpenseHandler) create(c *gin.Context) {
	var req request.CreateExpenseRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.Create(c.Request.Context(), currentUserID(c), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusCreated, "expense created", res)
}

func (h *ExpenseHandler) list(c *gin.Context) {
	limit, offset := parsePagination(c)
	filter := service.ExpenseListFilter{
		CategoryID: c.Query("category_id"),
		From:       c.Query("from"),
		To:         c.Query("to"),
		Limit:      limit,
		Offset:     offset,
	}
	res, err := h.svc.List(c.Request.Context(), currentUserID(c), filter)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "expenses retrieved", res)
}

func (h *ExpenseHandler) listByBudget(c *gin.Context) {
	res, err := h.svc.ListByBudget(c.Request.Context(), currentUserID(c), c.Param("budgetId"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "expenses retrieved", res)
}

func (h *ExpenseHandler) partner(c *gin.Context) {
	limit, offset := parsePagination(c)
	filter := service.ExpenseListFilter{
		CategoryID: c.Query("category_id"),
		From:       c.Query("from"),
		To:         c.Query("to"),
		Limit:      limit,
		Offset:     offset,
	}
	res, err := h.svc.ListPartnerExpenses(c.Request.Context(), currentUserID(c), filter)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "partner expenses retrieved", res)
}

func (h *ExpenseHandler) getByID(c *gin.Context) {
	res, err := h.svc.GetByID(c.Request.Context(), currentUserID(c), c.Param("id"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "expense retrieved", res)
}

func (h *ExpenseHandler) update(c *gin.Context) {
	var req request.UpdateExpenseRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.Update(c.Request.Context(), currentUserID(c), c.Param("id"), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "expense updated", res)
}

func (h *ExpenseHandler) delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), currentUserID(c), c.Param("id")); err != nil {
		c.Error(err)
		return
	}
	c.Status(http.StatusNoContent)
}
