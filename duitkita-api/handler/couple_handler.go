package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/model/dto/request"
	"duitkita-api/service"
	"duitkita-api/utils"
)

type CoupleHandler struct {
	svc service.CoupleService
}

func NewCoupleHandler(svc service.CoupleService) *CoupleHandler {
	return &CoupleHandler{svc: svc}
}

func (h *CoupleHandler) RegisterRoutes(rg *gin.RouterGroup) {
	couples := rg.Group("/couples")
	couples.GET("/partner", h.getPartner)
	couples.DELETE("/partner", h.unlink)
	couples.POST("/invitations", h.sendInvitation)
	couples.GET("/invitations/incoming", h.incomingInvitations)
	couples.POST("/invitations/:id/accept", h.acceptInvitation)
	couples.POST("/invitations/:id/reject", h.rejectInvitation)
	couples.POST("/invitations/:id/cancel", h.cancelInvitation)
}

func (h *CoupleHandler) getPartner(c *gin.Context) {
	res, err := h.svc.GetPartner(c.Request.Context(), currentUserID(c))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "partner retrieved", res)
}

func (h *CoupleHandler) unlink(c *gin.Context) {
	if err := h.svc.Unlink(c.Request.Context(), currentUserID(c)); err != nil {
		c.Error(err)
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *CoupleHandler) sendInvitation(c *gin.Context) {
	var req request.SendInvitationRequest
	if !bindJSON(c, &req) {
		return
	}

	res, err := h.svc.SendInvitation(c.Request.Context(), currentUserID(c), req)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusCreated, "invitation sent", res)
}

func (h *CoupleHandler) incomingInvitations(c *gin.Context) {
	res, err := h.svc.ListIncomingInvitations(c.Request.Context(), currentUserID(c))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "incoming invitations retrieved", res)
}

func (h *CoupleHandler) acceptInvitation(c *gin.Context) {
	res, err := h.svc.AcceptInvitation(c.Request.Context(), currentUserID(c), c.Param("id"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "invitation accepted", res)
}

func (h *CoupleHandler) rejectInvitation(c *gin.Context) {
	if err := h.svc.RejectInvitation(c.Request.Context(), currentUserID(c), c.Param("id")); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "invitation rejected", nil)
}

func (h *CoupleHandler) cancelInvitation(c *gin.Context) {
	if err := h.svc.CancelInvitation(c.Request.Context(), currentUserID(c), c.Param("id")); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "invitation cancelled", nil)
}
