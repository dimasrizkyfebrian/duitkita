package middleware

import (
	"crypto/subtle"
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/utils"
)

// InternalAuth guards the /internal/jobs/* routes used by Cloud Scheduler
// and Cloud Tasks, which have no user JWT to check. If secret is empty
// (misconfigured), every request is rejected rather than left open.
func InternalAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		provided := c.GetHeader("X-Internal-Secret")
		if secret == "" || provided == "" || subtle.ConstantTimeCompare([]byte(provided), []byte(secret)) != 1 {
			utils.Fail(c, http.StatusUnauthorized, "invalid or missing internal secret")
			c.Abort()
			return
		}
		c.Next()
	}
}
