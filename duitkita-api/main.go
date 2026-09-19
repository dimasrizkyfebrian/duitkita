package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"duitkita-api/config"
	"duitkita-api/infrastructure"
	"duitkita-api/service"
	"duitkita-api/worker"
)

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

	ctx := context.Background()
	storage, err := infrastructure.NewStorageClient(ctx, cfg.GCS)
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to create storage client")
	}
	defer storage.Close()

	services := service.NewServices(db, cfg.JWT, storage)

	scheduler := infrastructure.NewScheduler(logger)
	if err := worker.RegisterAll(scheduler, services.RecurringExpense, services.Reminder); err != nil {
		logger.Fatal().Err(err).Msg("failed to register scheduled jobs")
	}
	scheduler.Start()
	defer scheduler.Stop()

	router := infrastructure.NewRouter(services, cfg, logger)

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
