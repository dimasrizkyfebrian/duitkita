package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"duitkita-api/utils"
	"duitkita-api/validator"
)

const (
	defaultPageLimit = 20
	maxPageLimit     = 100
)

// parsePagination reads ?limit=&offset= with sane defaults/caps, shared by
// every list endpoint (expenses, notifications, budgets, reminders,
// recurring expenses, activity) so none of them can be asked to return an
// unbounded result set.
func parsePagination(c *gin.Context) (limit, offset int) {
	limit, err := strconv.Atoi(c.Query("limit"))
	if err != nil || limit <= 0 {
		limit = defaultPageLimit
	}
	if limit > maxPageLimit {
		limit = maxPageLimit
	}

	offset, err = strconv.Atoi(c.Query("offset"))
	if err != nil || offset < 0 {
		offset = 0
	}

	return limit, offset
}

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
