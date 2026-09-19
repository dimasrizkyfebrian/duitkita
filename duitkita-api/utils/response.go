package utils

import "github.com/gin-gonic/gin"

// Envelope is the standard API response shape used across all handlers.
type Envelope struct {
	Success bool        `json:"success"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Meta    interface{} `json:"meta,omitempty"`
}

// Success writes a 2xx JSON envelope.
func Success(c *gin.Context, code int, message string, data interface{}) {
	c.JSON(code, Envelope{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// SuccessWithMeta writes a 2xx JSON envelope including pagination/meta info.
func SuccessWithMeta(c *gin.Context, code int, message string, data interface{}, meta interface{}) {
	c.JSON(code, Envelope{
		Success: true,
		Message: message,
		Data:    data,
		Meta:    meta,
	})
}

// Fail writes an error JSON envelope. Prefer AbortWithAppError for errors
// produced by the service layer so the error_handler middleware can map
// the correct status code consistently.
func Fail(c *gin.Context, code int, message string) {
	c.JSON(code, Envelope{
		Success: false,
		Error:   message,
	})
}
