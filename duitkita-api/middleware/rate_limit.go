package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog/log"

	"duitkita-api/utils"
)

func RateLimit(client *redis.Client, keyPrefix string, max int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ctx := c.Request.Context()
		key := fmt.Sprintf("ratelimit:%s:%s", keyPrefix, c.ClientIP())

		count, err := client.Incr(ctx, key).Result()
		if err != nil {
			log.Warn().Err(err).Str("key", key).Msg("rate limiter: redis unavailable, failing open")
			c.Next()
			return
		}
		if count == 1 {
			client.Expire(ctx, key, window)
		}
		if count > int64(max) {
			utils.Fail(c, http.StatusTooManyRequests, "too many requests, please try again later")
			c.Abort()
			return
		}

		c.Next()
	}
}
