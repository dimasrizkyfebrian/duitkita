package infrastructure

import (
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"github.com/rs/zerolog"

	"duitkita-api/config"
	"duitkita-api/docs"
	"duitkita-api/handler"
	appmw "duitkita-api/middleware"
	"duitkita-api/service"
)

func NewRouter(svcs *service.Services, cfg *config.Config, logger zerolog.Logger, redisClient *redis.Client) *gin.Engine {
	r := gin.New()
	RegisterGlobalMiddleware(r, cfg, logger)
	docs.RegisterRoutes(r)

	authHandler := handler.NewAuthHandler(svcs.Auth)
	userHandler := handler.NewUserHandler(svcs.User)
	coupleHandler := handler.NewCoupleHandler(svcs.Couple)
	categoryHandler := handler.NewCategoryHandler(svcs.Category)
	budgetHandler := handler.NewBudgetHandler(svcs.Budget)
	expenseHandler := handler.NewExpenseHandler(svcs.Expense)
	recurringExpenseHandler := handler.NewRecurringExpenseHandler(svcs.RecurringExpense)
	reminderHandler := handler.NewReminderHandler(svcs.Reminder)
	notificationHandler := handler.NewNotificationHandler(svcs.Notification)
	reportHandler := handler.NewReportHandler(svcs.Report, svcs.Insights, svcs.ReportExport, cfg.Feature.InsightsEnabled)
	activityHandler := handler.NewActivityHandler(svcs.Activity)

	api := r.Group("/api/v1")

	authPublic := api.Group("")
	if cfg.RateLimit.Enabled && redisClient != nil {
		window := time.Duration(cfg.RateLimit.AuthWindowSeconds) * time.Second
		authPublic.Use(appmw.RateLimit(redisClient, "auth", cfg.RateLimit.AuthMax, window))
	}
	authHandler.RegisterPublicRoutes(authPublic)

	protected := api.Group("")
	protected.Use(AuthRequired(cfg.JWT))

	authHandler.RegisterProtectedRoutes(protected)
	userHandler.RegisterRoutes(protected)
	coupleHandler.RegisterRoutes(protected)
	categoryHandler.RegisterRoutes(protected)
	budgetHandler.RegisterRoutes(protected)
	expenseHandler.RegisterRoutes(protected)
	recurringExpenseHandler.RegisterRoutes(protected)
	reminderHandler.RegisterRoutes(protected)
	notificationHandler.RegisterRoutes(protected)
	reportHandler.RegisterRoutes(protected)
	activityHandler.RegisterRoutes(protected)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	return r
}
