package service

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// Report aggregates (the monthly spend-by-category breakdown, an N-month
// trend, a day-by-day breakdown) are recomputed on essentially every
// Laporan page load or month-step, and several call paths overlap —
// CoupleReport runs the same per-user aggregate as MonthlyReport,
// HealthScore calls MonthlyReport internally, and the trend math backs
// both /reports/trend and /reports/forecast. All of it is cached here,
// keyed off a per-user version counter rather than invalidated key-by-key:
// every expense and budget mutation bumps that counter (invalidateReportCache),
// which orphans every previously cached entry for that user in one write —
// old entries are never deleted, they just age out via TTL. The TTL is kept
// short regardless, as a backstop against any mutation path that forgets to
// invalidate.
const reportCacheTTL = 5 * time.Minute

func reportCacheVersionKey(userID string) string {
	return fmt.Sprintf("report_cache_version:%s", userID)
}

// reportCacheVersion reads the current version for userID. A miss (nothing
// cached yet, or a Redis error) reads as version "0" rather than creating
// the key — only invalidateReportCache ever advances it.
func reportCacheVersion(ctx context.Context, redisClient *redis.Client, userID string) string {
	v, err := redisClient.Get(ctx, reportCacheVersionKey(userID)).Result()
	if err != nil {
		return "0"
	}
	return v
}

// invalidateReportCache bumps userID's report cache version. Best-effort:
// a Redis outage here just means that user's report pages stay stale a
// little longer, not that the mutation itself fails.
func invalidateReportCache(ctx context.Context, redisClient *redis.Client, userID string) {
	redisClient.Incr(ctx, reportCacheVersionKey(userID))
}

func reportCacheKey(parts ...any) string {
	key := "report"
	for _, p := range parts {
		key += fmt.Sprintf(":%v", p)
	}
	return key
}

// getReportCache is a cache miss (ok=false) on anything other than a clean
// hit — Redis unreachable, nothing stored, or a value stored before a
// shape change — so callers always have a safe "just recompute" fallback.
func getReportCache[T any](ctx context.Context, redisClient *redis.Client, key string) (T, bool) {
	var value T
	raw, err := redisClient.Get(ctx, key).Result()
	if err != nil {
		return value, false
	}
	if err := json.Unmarshal([]byte(raw), &value); err != nil {
		return value, false
	}
	return value, true
}

func setReportCache[T any](ctx context.Context, redisClient *redis.Client, key string, value T) {
	raw, err := json.Marshal(value)
	if err != nil {
		return
	}
	redisClient.Set(ctx, key, raw, reportCacheTTL)
}
