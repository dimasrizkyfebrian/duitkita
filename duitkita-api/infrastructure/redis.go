package infrastructure

import (
	"context"
	"crypto/tls"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	"duitkita-api/config"
)

// NewRedisClient builds a Redis client for rate limiting (and, later,
// caching). The client is lazy — go-redis doesn't dial until the first
// command — so this never blocks or fails startup by itself; the ping
// below is only a best-effort early warning, non-fatal on purpose so a
// briefly-unreachable Redis doesn't take the whole API down (see
// middleware.RateLimit's fail-open behavior).
func NewRedisClient(cfg config.RedisConfig, logger zerolog.Logger) *redis.Client {
	opts := &redis.Options{
		Addr:     cfg.Host + ":" + cfg.Port,
		Password: cfg.Password,
		DB:       cfg.DB,
	}
	if cfg.TLSEnabled {
		opts.TLSConfig = &tls.Config{ServerName: cfg.Host}
	}
	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		logger.Warn().Err(err).Msg("redis ping failed at startup — rate limiting will fail open until it's reachable")
	}

	return client
}
