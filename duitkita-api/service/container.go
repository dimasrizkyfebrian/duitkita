package service

import (
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"

	"duitkita-api/config"
	"duitkita-api/repository"
)

type Services struct {
	Auth             AuthService
	User             UserService
	Couple           CoupleService
	Category         CategoryService
	Budget           BudgetService
	Expense          ExpenseService
	RecurringExpense RecurringExpenseService
	Reminder         ReminderService
	Notification     NotificationService
	Report           ReportService
	Insights         InsightsService
	ReportExport     ReportExportService
	Activity         ActivityService
	SecurityAudit    SecurityAuditService
	Maintenance      MaintenanceService
}

func NewServices(db *gorm.DB, jwtCfg config.JWTConfig, retentionCfg config.RetentionConfig, otpCfg config.OTPConfig, storage FileStorage, redisClient *redis.Client, mailer Mailer) *Services {
	userRepo := repository.NewUserRepository(db)
	sessionRepo := repository.NewUserSessionRepository(db)
	coupleRepo := repository.NewCoupleRepository(db)
	invitationRepo := repository.NewCoupleInvitationRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	budgetRepo := repository.NewBudgetRepository(db)
	expenseRepo := repository.NewExpenseRepository(db)
	recurringExpenseRepo := repository.NewRecurringExpenseRepository(db)
	reminderRepo := repository.NewReminderRepository(db)
	notificationRepo := repository.NewNotificationRepository(db)
	notificationPrefRepo := repository.NewNotificationPreferenceRepository(db)
	reportRepo := repository.NewReportRepository(db)
	reportExportRepo := repository.NewReportExportRepository(db)
	activityRepo := repository.NewActivityRepository(db)
	securityAuditRepo := repository.NewSecurityAuditRepository(db)

	securityAuditSvc := NewSecurityAuditService(securityAuditRepo)
	notificationSvc := NewNotificationService(notificationRepo, notificationPrefRepo)
	activitySvc := NewActivityService(activityRepo, coupleRepo, notificationSvc)
	reportSvc := NewReportService(reportRepo, budgetRepo, coupleRepo)
	otpSvc := NewOTPService(redisClient, mailer, otpCfg)

	return &Services{
		Auth:             NewAuthService(userRepo, sessionRepo, securityAuditSvc, otpSvc, jwtCfg),
		User:             NewUserService(userRepo, securityAuditSvc, storage),
		Couple:           NewCoupleService(coupleRepo, invitationRepo, userRepo, securityAuditSvc),
		Category:         NewCategoryService(categoryRepo),
		Budget:           NewBudgetService(budgetRepo, categoryRepo, coupleRepo, activitySvc),
		Expense:          NewExpenseService(expenseRepo, budgetRepo, coupleRepo, activitySvc),
		RecurringExpense: NewRecurringExpenseService(recurringExpenseRepo, categoryRepo, budgetRepo, expenseRepo),
		Reminder:         NewReminderService(reminderRepo, notificationSvc),
		Notification:     notificationSvc,
		Report:           reportSvc,
		Insights:         NewInsightsService(reportRepo, reportSvc),
		ReportExport:     NewReportExportService(reportExportRepo, reportSvc, storage),
		Activity:         activitySvc,
		SecurityAudit:    securityAuditSvc,
		Maintenance:      NewMaintenanceService(sessionRepo, notificationRepo, activityRepo, securityAuditRepo, retentionCfg),
	}
}
