package main

import (
	"context"
	"io"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"duitkita-api/config"
	"duitkita-api/infrastructure"
	"duitkita-api/service"
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

	redisClient := infrastructure.NewRedisClient(cfg.Redis, logger)
	defer redisClient.Close()
	if !cfg.RateLimit.Enabled {
		logger.Warn().Msg("RATE_LIMIT_ENABLED=false — auth endpoints are not rate limited")
	}

	mailer := infrastructure.NewMailer(cfg.SMTP)

	var taskEnqueuer service.TaskEnqueuer
	if cfg.CloudTasks.Enabled {
		cte, err := infrastructure.NewCloudTasksEnqueuer(context.Background(), cfg.CloudTasks, cfg.Internal.JobsSecret)
		if err != nil {
			logger.Fatal().Err(err).Msg("failed to create cloud tasks client")
		}
		defer cte.Close()
		taskEnqueuer = cte
	} else {
		logger.Warn().Msg("CLOUD_TASKS_ENABLED=false — report exports render inline instead of via Cloud Tasks (fine for local dev)")
	}
	if cfg.Internal.JobsSecret == "" {
		logger.Warn().Msg("INTERNAL_JOBS_SECRET is empty — /internal/jobs/* routes will reject every request until it's set")
	}

	services := service.NewServices(db, cfg.JWT, cfg.Retention, cfg.OTP, storage, redisClient, mailer, taskEnqueuer)

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
