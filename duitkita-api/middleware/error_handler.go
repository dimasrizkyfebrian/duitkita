package middleware

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/utils"
)

// ErrorHandler centralizes error -> HTTP response translation. Handlers
// should call c.Error(err) (instead of writing a response directly) when
// they want the error mapped consistently; *utils.AppError carries its own
// status code, anything else falls back to 500.
func ErrorHandler() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()

		if len(c.Errors) == 0 || c.Writer.Written() {
			return
		}

		err := c.Errors.Last().Err

		var appErr *utils.AppError
		if errors.As(err, &appErr) {
			utils.Fail(c, appErr.Code, appErr.Message)
			return
		}

		utils.Fail(c, http.StatusInternalServerError, "internal server error")
	}
}
