package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/utils"
	"duitkita-api/validator"
)

// bindJSON binds and validates the request body, writing a 400 response
// itself on failure. Returns false when the caller should stop processing.
func bindJSON(c *gin.Context, out interface{}) bool {
	if err := c.ShouldBindJSON(out); err != nil {
		utils.Fail(c, http.StatusBadRequest, validator.FormatValidationError(err))
		return false
	}
	return true
}

// currentUserID reads the user id set by middleware.Auth. Handlers behind
// that middleware can assume this always succeeds.
func currentUserID(c *gin.Context) string {
	id, _ := utils.CurrentUserID(c)
	return id
}
