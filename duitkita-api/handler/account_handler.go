package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/model/dto/request"
	"duitkita-api/service"
	"duitkita-api/utils"
)

type AccountHandler struct {
	svc service.AccountService
}

func NewAccountHandler(svc service.AccountService) *AccountHandler {
	return &AccountHandler{svc: svc}
}

// There is deliberately no DELETE: accounts are archived, never removed, so
// expenses tagged with one keep pointing at a named account.
func (h *AccountHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/institutions", h.listInstitutions)

	accounts := rg.Group("/accounts")
	accounts.GET("", h.list)
	accounts.POST("", h.create)
	accounts.GET("/:id", h.getByID)
	accounts.PATCH("/:id", h.update)
	accounts.POST("/:id/archive", h.archive)
	accounts.POST("/:id/unarchive", h.unarchive)
	accounts.GET("/:id/adjustments", h.listAdjustments)
	accounts.POST("/:id/adjustments", h.adjustBalance)
	accounts.GET("/:id/transactions", h.listTransactions)
}

func (h *AccountHandler) listInstitutions(c *gin.Context) {
	res, err := h.svc.ListInstitutions(c.Request.Context())
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "institutions retrieved", res)
}

func (h *AccountHandler) list(c *gin.Context) {
	includeArchived := c.Query("include_archived") == "true"
	res, err := h.svc.List(c.Request.Context(), currentUserID(c), includeArchived)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "accounts retrieved", res)
}

func (h *AccountHandler) create(c *gin.Context) {
	var req request.CreateAccountRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.Create(c.Request.Context(), currentUserID(c), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusCreated, "account created", res)
}

func (h *AccountHandler) getByID(c *gin.Context) {
	res, err := h.svc.GetByID(c.Request.Context(), currentUserID(c), c.Param("id"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "account retrieved", res)
}

func (h *AccountHandler) update(c *gin.Context) {
	var req request.UpdateAccountRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.Update(c.Request.Context(), currentUserID(c), c.Param("id"), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "account updated", res)
}

func (h *AccountHandler) archive(c *gin.Context) {
	res, err := h.svc.Archive(c.Request.Context(), currentUserID(c), c.Param("id"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "account archived", res)
}

func (h *AccountHandler) unarchive(c *gin.Context) {
	res, err := h.svc.Unarchive(c.Request.Context(), currentUserID(c), c.Param("id"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "account unarchived", res)
}

func (h *AccountHandler) listAdjustments(c *gin.Context) {
	res, err := h.svc.ListAdjustments(c.Request.Context(), currentUserID(c), c.Param("id"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "balance adjustments retrieved", res)
}

// listTransactions pages by cursor, so the offset parsePagination also reads
// is ignored.
func (h *AccountHandler) listTransactions(c *gin.Context) {
	limit, _ := parsePagination(c)
	res, err := h.svc.ListTransactions(c.Request.Context(), currentUserID(c), c.Param("id"), limit, c.Query("cursor"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "transactions retrieved", res)
}

func (h *AccountHandler) adjustBalance(c *gin.Context) {
	var req request.AdjustBalanceRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.svc.AdjustBalance(c.Request.Context(), currentUserID(c), c.Param("id"), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusCreated, "balance adjusted", res)
}
