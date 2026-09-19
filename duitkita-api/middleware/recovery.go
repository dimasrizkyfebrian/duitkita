package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"

	"duitkita-api/utils"
)

// Recovery catches panics so a single handler failure returns a 500 JSON
// envelope instead of crashing the process or leaking a bare stack trace.
func Recovery(logger zerolog.Logger) gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered interface{}) {
		logger.Error().Interface("panic", recovered).Str("path", c.Request.URL.Path).Msg("recovered from panic")
		utils.Fail(c, http.StatusInternalServerError, "internal server error")
		c.AbortWithStatus(http.StatusInternalServerError)
	})
}
