package handler

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"duitkita-api/model/dto/request"
	"duitkita-api/service"
	"duitkita-api/utils"
)

type ReportHandler struct {
	reportSvc       service.ReportService
	insightsSvc     service.InsightsService
	exportSvc       service.ReportExportService
	insightsEnabled bool
}

func NewReportHandler(reportSvc service.ReportService, insightsSvc service.InsightsService, exportSvc service.ReportExportService, insightsEnabled bool) *ReportHandler {
	return &ReportHandler{reportSvc: reportSvc, insightsSvc: insightsSvc, exportSvc: exportSvc, insightsEnabled: insightsEnabled}
}

func (h *ReportHandler) RegisterRoutes(rg *gin.RouterGroup) {
	reports := rg.Group("/reports")
	reports.GET("/monthly", h.monthly)
	reports.GET("/couple", h.couple)
	reports.GET("/trend", h.trend)
	reports.GET("/couple/trend", h.coupleTrend)
	reports.GET("/trend/category", h.trendByCategory)
	reports.GET("/daily", h.daily)
	reports.POST("/exports", h.createExport)
	reports.GET("/exports", h.listExports)
	reports.GET("/exports/:id/download", h.downloadExport)
	reports.GET("/exports/:id", h.getExport)
	reports.GET("/rollover/:categoryId", h.rollover)

	if h.insightsEnabled {
		reports.GET("/forecast", h.forecast)
		reports.GET("/health-score", h.healthScore)
	}
}

func (h *ReportHandler) monthly(c *gin.Context) {
	year, month := parseYearMonth(c)
	res, err := h.reportSvc.MonthlyReport(c.Request.Context(), currentUserID(c), year, month)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "monthly report retrieved", res)
}

func (h *ReportHandler) couple(c *gin.Context) {
	year, month := parseYearMonth(c)
	res, err := h.reportSvc.CoupleReport(c.Request.Context(), currentUserID(c), year, month)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "couple report retrieved", res)
}

func (h *ReportHandler) trend(c *gin.Context) {
	months, _ := strconv.Atoi(c.Query("months"))
	res, err := h.reportSvc.Trend(c.Request.Context(), currentUserID(c), months)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "trend retrieved", res)
}

func (h *ReportHandler) coupleTrend(c *gin.Context) {
	months, _ := strconv.Atoi(c.Query("months"))
	res, err := h.reportSvc.CoupleTrend(c.Request.Context(), currentUserID(c), months)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "couple trend retrieved", res)
}

func (h *ReportHandler) daily(c *gin.Context) {
	year, month := parseYearMonth(c)
	res, err := h.reportSvc.DailyBreakdown(c.Request.Context(), currentUserID(c), year, month)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "daily breakdown retrieved", res)
}

func (h *ReportHandler) trendByCategory(c *gin.Context) {
	months, _ := strconv.Atoi(c.Query("months"))
	categoryID := c.Query("category_id")
	if categoryID == "" {
		utils.Fail(c, http.StatusBadRequest, "category_id query parameter is required")
		return
	}
	res, err := h.reportSvc.TrendByCategory(c.Request.Context(), currentUserID(c), categoryID, months)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "category trend retrieved", res)
}

func (h *ReportHandler) forecast(c *gin.Context) {
	res, err := h.insightsSvc.Forecast(c.Request.Context(), currentUserID(c))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "forecast retrieved", res)
}

func (h *ReportHandler) healthScore(c *gin.Context) {
	year, month := parseYearMonth(c)
	res, err := h.insightsSvc.HealthScore(c.Request.Context(), currentUserID(c), year, month)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "health score retrieved", res)
}

func (h *ReportHandler) rollover(c *gin.Context) {
	year, month := parseYearMonth(c)
	amount, err := h.reportSvc.Rollover(c.Request.Context(), currentUserID(c), c.Param("categoryId"), year, month)
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "rollover retrieved", gin.H{"rollover_amount": amount})
}

func (h *ReportHandler) createExport(c *gin.Context) {
	var req request.CreateExportRequest
	if !bindJSON(c, &req) {
		return
	}
	res, err := h.exportSvc.Create(c.Request.Context(), currentUserID(c), req)
	if err != nil {
		c.Error(err)
		return
	}
	// 202: the row is created but rendering happens async (worker/report_export_job.go)
	// — poll GET /reports/exports/:id until status is "completed".
	utils.Success(c, http.StatusAccepted, "export queued", res)
}

func (h *ReportHandler) listExports(c *gin.Context) {
	res, err := h.exportSvc.List(c.Request.Context(), currentUserID(c))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "exports retrieved", res)
}

func (h *ReportHandler) getExport(c *gin.Context) {
	res, err := h.exportSvc.GetByID(c.Request.Context(), currentUserID(c), c.Param("id"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "export retrieved", res)
}

func (h *ReportHandler) downloadExport(c *gin.Context) {
	url, err := h.exportSvc.DownloadURL(c.Request.Context(), currentUserID(c), c.Param("id"))
	if err != nil {
		c.Error(err)
		return
	}
	utils.Success(c, http.StatusOK, "download url retrieved", gin.H{"url": url})
}
