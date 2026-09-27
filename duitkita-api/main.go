package main

import (
	"context"
	"io"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"

	"duitkita-api/config"
	"duitkita-api/infrastructure"
	"duitkita-api/service"
	"duitkita-api/worker"
)

type fileStorage interface {
	Upload(ctx context.Context, objectKey string, data io.Reader, contentType string) (string, error)
	Delete(ctx context.Context, objectKey string) error
	SignedURL(objectKey string, expiry time.Duration) (string, error)
	Close() error
}

func main() {
	cfg, err := config.Load()
	if err != nil {
		panic(err)
	}

	logger := config.NewLogger(cfg.Log)

	db, err := infrastructure.NewDatabase(cfg.Database)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to connect to database")
	}

	if cfg.App.Env == "development" {
		if err := infrastructure.AutoMigrate(db); err != nil {
			logger.Fatal().Err(err).Msg("failed to auto-migrate database")
		}
	}

	var storage fileStorage
	if cfg.GCS.Enabled {
		ctx := context.Background()
		gcs, err := infrastructure.NewStorageClient(ctx, cfg.GCS)
		if err != nil {
			logger.Fatal().Err(err).Msg("failed to create storage client")
		}
		storage = gcs
	} else {
		logger.Warn().Msg("GCS_ENABLED=false — avatar upload and report export download will fail until it's turned back on")
		storage = infrastructure.NewNoopStorageClient()
	}
	defer storage.Close()

	var redisClient *redis.Client
	if cfg.RateLimit.Enabled {
		redisClient = infrastructure.NewRedisClient(cfg.Redis, logger)
		defer redisClient.Close()
	} else {
		logger.Warn().Msg("RATE_LIMIT_ENABLED=false — auth endpoints are not rate limited")
	}

	services := service.NewServices(db, cfg.JWT, cfg.Retention, storage)

	scheduler := infrastructure.NewScheduler(logger)
	if err := worker.RegisterAll(scheduler, services); err != nil {
		logger.Fatal().Err(err).Msg("failed to register scheduled jobs")
	}
	scheduler.Start()
	defer scheduler.Stop()

	router := infrastructure.NewRouter(services, cfg, logger, redisClient)

	srv := &http.Server{
		Addr:    ":" + cfg.App.Port,
		Handler: router,
	}

	go func() {
		logger.Info().Str("port", cfg.App.Port).Msg("starting server")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal().Err(err).Msg("server failed")
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info().Msg("shutting down server")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		logger.Error().Err(err).Msg("server forced to shutdown")
	}
}
