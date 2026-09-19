package utils

import (
	"time"

	"github.com/gin-gonic/gin"
)

const ContextUserIDKey = "user_id"

// CurrentUserID reads the authenticated user id set by the auth middleware.
func CurrentUserID(c *gin.Context) (string, bool) {
	v, exists := c.Get(ContextUserIDKey)
	if !exists {
		return "", false
	}
	id, ok := v.(string)
	return id, ok
}

func StringPtr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func Int64Ptr(v int64) *int64 {
	return &v
}

// ParseDateOnly parses a "YYYY-MM-DD" string into time.Time (UTC midnight).
func ParseDateOnly(value string) (time.Time, error) {
	return time.Parse("2006-01-02", value)
}
