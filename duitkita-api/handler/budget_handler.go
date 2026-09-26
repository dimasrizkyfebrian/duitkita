package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"duitkita-api/model/dto/request"
	"duitkita-api/service"
	"duitkita-api/utils"
)

type BudgetHandler struct {
	svc service.BudgetService
}

func NewBudgetHandler(svc service.BudgetService) *BudgetHandler {
	return &BudgetHandler{svc: svc}
}

func (h *BudgetHandler) RegisterRoutes(rg *gin.RouterGroup) {
	budgets := rg.Group("/budgets")
	budgets.POST("", h.create)
	budgets.GET("/partner", h.partner)
	budgets.POST("/finalize", h.finalizeByQuery)
	budgets.GET("", h.list)
	budgets.GET("/:id", h.getByID)
	budgets.PATCH("/:id", h.update)
	budgets.DELETE("/:id", h.delete)
}

func (h *BudgetHandler) create(c *gin.Context) {
	var req request.CreateBudgetRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.Create(c.Request.Context(), currentUserID(c), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusCreated, "budget created", res)
}

func (h *BudgetHandler) list(c *gin.Context) {
	year, month := parseYearMonth(c)
	limit, offset := parsePagination(c)
	res, err := h.svc.List(c.Request.Context(), currentUserID(c), year, month, limit, offset)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "budgets retrieved", res)
}

func (h *BudgetHandler) partner(c *gin.Context) {
	year, month := parseYearMonth(c)
	limit, offset := parsePagination(c)
	res, err := h.svc.GetPartnerBudgets(c.Request.Context(), currentUserID(c), year, month, limit, offset)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "partner budgets retrieved", res)
}

func (h *BudgetHandler) getByID(c *gin.Context) {
	res, err := h.svc.GetByID(c.Request.Context(), currentUserID(c), c.Param("id"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "budget retrieved", res)
}

func (h *BudgetHandler) update(c *gin.Context) {
	var req request.UpdateBudgetRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.Update(c.Request.Context(), currentUserID(c), c.Param("id"), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "budget updated", res)
}

func (h *BudgetHandler) delete(c *gin.Context) {
	if err := h.svc.Delete(c.Request.Context(), currentUserID(c), c.Param("id")); err != nil {
		c.Error(err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *BudgetHandler) finalizeByQuery(c *gin.Context) {
	id := c.Query("id")
	if id == "" {
		utils.Fail(c, http.StatusBadRequest, "id query parameter is required")
		return
	}
	res, err := h.svc.Finalize(c.Request.Context(), currentUserID(c), id)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "budget finalized", res)
}

func parseYearMonth(c *gin.Context) (int, int) {
	year, _ := strconv.Atoi(c.Query("year"))
	month, _ := strconv.Atoi(c.Query("month"))
	return year, month
}
