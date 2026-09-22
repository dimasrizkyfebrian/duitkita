package service

import (
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
	ReportExport     ReportExportService
	Activity         ActivityService
	SecurityAudit    SecurityAuditService
	Maintenance      MaintenanceService
}

func NewServices(db *gorm.DB, jwtCfg config.JWTConfig, retentionCfg config.RetentionConfig, storage FileStorage) *Services {
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
	activitySvc := NewActivityService(activityRepo, coupleRepo)
	reportSvc := NewReportService(reportRepo, budgetRepo, coupleRepo)

	return &Services{
		Auth:             NewAuthService(userRepo, sessionRepo, securityAuditSvc, jwtCfg),
		User:             NewUserService(userRepo, securityAuditSvc, storage),
		Couple:           NewCoupleService(coupleRepo, invitationRepo, userRepo, securityAuditSvc),
		Category:         NewCategoryService(categoryRepo),
		Budget:           NewBudgetService(budgetRepo, categoryRepo, coupleRepo),
		Expense:          NewExpenseService(expenseRepo, categoryRepo, budgetRepo, coupleRepo),
		RecurringExpense: NewRecurringExpenseService(recurringExpenseRepo, categoryRepo, budgetRepo, expenseRepo),
		Reminder:         NewReminderService(reminderRepo, notificationSvc),
		Notification:     notificationSvc,
		Report:           reportSvc,
		ReportExport:     NewReportExportService(reportExportRepo, reportSvc, storage),
		Activity:         activitySvc,
		SecurityAudit:    securityAuditSvc,
		Maintenance:      NewMaintenanceService(sessionRepo, notificationRepo, activityRepo, securityAuditRepo, retentionCfg),
	}
}
