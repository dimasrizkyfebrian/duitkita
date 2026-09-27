package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"duitkita-api/service"
	"duitkita-api/utils"
)

// InternalHandler wires the /internal/jobs/* routes that Cloud Scheduler and
// Cloud Tasks call directly — there's no end user behind these requests, so
// they sit outside /api/v1 and are guarded by middleware.InternalAuth
// instead of the normal JWT middleware. See WORKER_CLOUD_DEPLOYMENT_PLAN.md.
type InternalHandler struct {
	recurringExpenseSvc service.RecurringExpenseService
	reminderSvc         service.ReminderService
	maintenanceSvc      service.MaintenanceService
	reportExportSvc     service.ReportExportService
}

func NewInternalHandler(recurringExpenseSvc service.RecurringExpenseService, reminderSvc service.ReminderService, maintenanceSvc service.MaintenanceService, reportExportSvc service.ReportExportService) *InternalHandler {
	return &InternalHandler{
		recurringExpenseSvc: recurringExpenseSvc,
		reminderSvc:         reminderSvc,
		maintenanceSvc:      maintenanceSvc,
		reportExportSvc:     reportExportSvc,
	}
}

func (h *InternalHandler) RegisterRoutes(rg *gin.RouterGroup) {
	jobs := rg.Group("/jobs")
	jobs.POST("/recurring-expenses/run", h.runRecurringExpenses)
	jobs.POST("/reminders/run", h.runReminders)
	jobs.POST("/cleanup/run", h.runCleanup)
	jobs.POST("/report-exports/:id/render", h.renderReportExport)
}

func (h *InternalHandler) runRecurringExpenses(c *gin.Context) {
	count, err := h.recurringExpenseSvc.RunDue(c.Request.Context())
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "recurring expenses processed", gin.H{"processed": count})
}

func (h *InternalHandler) runReminders(c *gin.Context) {
	count, err := h.reminderSvc.ProcessDue(c.Request.Context())
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "reminders processed", gin.H{"processed": count})
}

func (h *InternalHandler) runCleanup(c *gin.Context) {
	result, err := h.maintenanceSvc.RunCleanup(c.Request.Context())
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "cleanup completed", result)
}

func (h *InternalHandler) renderReportExport(c *gin.Context) {
	if err := h.reportExportSvc.RenderOne(c.Request.Context(), c.Param("id")); err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "export rendered", nil)
}
