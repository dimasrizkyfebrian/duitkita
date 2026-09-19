package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"duitkita-api/utils"
)

// Auth validates the "Authorization: Bearer <token>" header against the
// given access-token secret and stores the resolved user id in the gin
// context under utils.ContextUserIDKey for downstream handlers.
func Auth(accessSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			utils.Fail(c, http.StatusUnauthorized, "missing or malformed authorization header")
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(header, "Bearer ")
		claims, err := utils.ParseAccessToken(accessSecret, tokenString)
		if err != nil {
			utils.Fail(c, http.StatusUnauthorized, "invalid or expired token")
			c.Abort()
			return
		}

		c.Set(utils.ContextUserIDKey, claims.UserID)
		c.Next()
	}
}
