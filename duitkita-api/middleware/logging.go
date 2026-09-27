package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

const maxLoggedBodyBytes = 4096

var sensitiveFields = map[string]bool{
	"password":         true,
	"current_password": true,
	"new_password":     true,
	"otp":              true,
	"access_token":     true,
	"refresh_token":    true,
	"token":            true,
}

type bodyLogWriter struct {
	gin.ResponseWriter
	captured bytes.Buffer
}

func (w *bodyLogWriter) Write(b []byte) (int, error) {
	if remaining := maxLoggedBodyBytes - w.captured.Len(); remaining > 0 {
		if remaining > len(b) {
			w.captured.Write(b)
		} else {
			w.captured.Write(b[:remaining])
		}
	}
	return w.ResponseWriter.Write(b)
}

func Logging(logger zerolog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path

		var requestBody []byte
		if shouldCaptureBody(c.Request.Header.Get("Content-Type")) && c.Request.Body != nil {
			requestBody, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(requestBody))
		}

		blw := &bodyLogWriter{ResponseWriter: c.Writer}
		c.Writer = blw

		c.Next()

		status := c.Writer.Status()
		event := logger.Info()
		if status >= 400 {
			event = logger.Warn()
		}

		event = event.
			Str("method", c.Request.Method).
			Str("path", path).
			Int("status", status).
			Dur("latency", time.Since(start)).
			Str("client_ip", c.ClientIP())

		if status >= 400 {
			if len(requestBody) > 0 {
				event = event.Str("request_body", redactAndTruncate(requestBody))
			}
			if blw.captured.Len() > 0 {
				event = event.Str("response_body", redactAndTruncate(blw.captured.Bytes()))
			}
		}

		event.Msg("request handled")
	}
}

func shouldCaptureBody(contentType string) bool {
	return strings.HasPrefix(contentType, "application/json")
}

func redactAndTruncate(body []byte) string {
	var parsed interface{}
	if err := json.Unmarshal(body, &parsed); err == nil {
		redact(parsed)
		if out, err := json.Marshal(parsed); err == nil {
			body = out
		}
	}

	if len(body) > maxLoggedBodyBytes {
		return string(body[:maxLoggedBodyBytes]) + "...(truncated)"
	}
	return string(body)
}

func redact(v interface{}) {
	switch val := v.(type) {
	case map[string]interface{}:
		for key, nested := range val {
			if sensitiveFields[strings.ToLower(key)] {
				val[key] = "***"
				continue
			}
			redact(nested)
		}
	case []interface{}:
		for _, item := range val {
			redact(item)
		}
	}
}
