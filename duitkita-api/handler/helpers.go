package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/utils"
	"duitkita-api/validator"
)

func bindJSON(c *gin.Context, out interface{}) bool {
	if err := c.ShouldBindJSON(out); err != nil {
		utils.Fail(c, http.StatusBadRequest, validator.FormatValidationError(err))
		return false
	}
	return true
}

func currentUserID(c *gin.Context) string {
	id, _ := utils.CurrentUserID(c)
	return id
}
