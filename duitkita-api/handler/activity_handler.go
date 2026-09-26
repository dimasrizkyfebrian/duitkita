package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/service"
	"duitkita-api/utils"
)

type ActivityHandler struct {
	svc service.ActivityService
}

func NewActivityHandler(svc service.ActivityService) *ActivityHandler {
	return &ActivityHandler{svc: svc}
}

func (h *ActivityHandler) RegisterRoutes(rg *gin.RouterGroup) {
	activity := rg.Group("/activity")
	activity.GET("", h.list)
	activity.GET("/recent", h.recent)
}

func (h *ActivityHandler) list(c *gin.Context) {
	limit, offset := parsePagination(c)

	res, err := h.svc.List(c.Request.Context(), currentUserID(c), limit, offset)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "activity retrieved", res)
}

func (h *ActivityHandler) recent(c *gin.Context) {
	limit, _ := parsePagination(c)

	res, err := h.svc.Recent(c.Request.Context(), currentUserID(c), limit)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "recent activity retrieved", res)
}
