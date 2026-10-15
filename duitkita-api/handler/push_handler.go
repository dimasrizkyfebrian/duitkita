package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/model/dto/request"
	"duitkita-api/model/dto/response"
	"duitkita-api/service"
	"duitkita-api/utils"
)

type PushHandler struct {
	svc service.PushService
}

func NewPushHandler(svc service.PushService) *PushHandler {
	return &PushHandler{svc: svc}
}

func (h *PushHandler) RegisterRoutes(rg *gin.RouterGroup) {
	rg.GET("/push/public-key", h.publicKey)
	rg.POST("/push/subscriptions", h.subscribe)
	rg.DELETE("/push/subscriptions", h.unsubscribe)
}

func (h *PushHandler) publicKey(c *gin.Context) {
	utils.Success(c, http.StatusOK, "vapid public key retrieved", response.PushPublicKeyResponse{
		PublicKey: h.svc.PublicKey(),
	})
}

func (h *PushHandler) subscribe(c *gin.Context) {
	var req request.SubscribePushRequest
	if !bindJSON(c, &req) {
		return
	}
	if err := h.svc.Subscribe(c.Request.Context(), currentUserID(c), req); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusCreated, "push subscription saved", nil)
}

func (h *PushHandler) unsubscribe(c *gin.Context) {
	var req request.UnsubscribePushRequest
	if !bindJSON(c, &req) {
		return
	}
	if err := h.svc.Unsubscribe(c.Request.Context(), currentUserID(c), req.Endpoint); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "push subscription removed", nil)
}
