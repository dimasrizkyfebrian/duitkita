package service

import (
	"bytes"
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog/log"

	"duitkita-api/model/domain"
	"duitkita-api/model/dto/request"
	"duitkita-api/model/dto/response"
	"duitkita-api/repository"
	"duitkita-api/utils"
)

type ReportExportService interface {
	Create(ctx context.Context, userID string, req request.CreateExportRequest) (*response.ExportResponse, error)
	List(ctx context.Context, userID string) ([]response.ExportResponse, error)
	GetByID(ctx context.Context, userID, id string) (*response.ExportResponse, error)
	DownloadURL(ctx context.Context, userID, id string) (string, error)
	// ProcessPending renders every export still marked "pending". Called by
	// worker/report_export_job.go on a short cron tick — see Create, which
	// only inserts the row and returns immediately instead of rendering
	// inline on the request (PDF generation + upload used to block the
	// HTTP response; a bigger report could then time it out).
	ProcessPending(ctx context.Context) (int, error)
}

type reportExportService struct {
	repo      repository.ReportExportRepository
	reportSvc ReportService
	storage   FileStorage
}

func NewReportExportService(repo repository.ReportExportRepository, reportSvc ReportService, storage FileStorage) ReportExportService {
	return &reportExportService{repo: repo, reportSvc: reportSvc, storage: storage}
}

func (s *reportExportService) Create(ctx context.Context, userID string, req request.CreateExportRequest) (*response.ExportResponse, error) {
	export := &domain.ReportExport{
		ID:     uuid.NewString(),
		UserID: userID,
		Format: domain.ReportExportFormat(req.Format),
		Year:   req.Year,
		Month:  req.Month,
		Scope:  req.Scope,
		Status: domain.ReportExportStatusPending,
	}
	if err := s.repo.Create(ctx, export); err != nil {
		return nil, utils.ErrInternal("failed to create export")
	}

	return toExportResponse(export, ""), nil
}

func (s *reportExportService) ProcessPending(ctx context.Context) (int, error) {
	pending, err := s.repo.FindPending(ctx)
	if err != nil {
		return 0, utils.ErrInternal("failed to load pending exports")
	}

	processed := 0
	for i := range pending {
		export := &pending[i]

		export.Status = domain.ReportExportStatusProcessing
		if err := s.repo.Update(ctx, export); err != nil {
			log.Error().Err(err).Str("export_id", export.ID).Msg("failed to mark export as processing")
			continue
		}

		if err := s.render(ctx, export); err != nil {
			s.failExport(ctx, export, err)
			continue
		}
		processed++
	}

	return processed, nil
}

// render builds the PDF and uploads it, leaving export ready for the
// caller to mark completed. Split out of ProcessPending so a failure
// midway always goes through failExport with the actual cause.
func (s *reportExportService) render(ctx context.Context, export *domain.ReportExport) error {
	report, err := s.reportSvc.MonthlyReport(ctx, export.UserID, export.Year, export.Month)
	if err != nil {
		return err
	}

	pdfBytes, err := renderMonthlyReportPDF(report)
	if err != nil {
		return fmt.Errorf("render report pdf: %w", err)
	}

	objectKey := fmt.Sprintf("reports/%s/%s.pdf", export.UserID, export.ID)
	if _, err := s.storage.Upload(ctx, objectKey, bytes.NewReader(pdfBytes), "application/pdf"); err != nil {
		return fmt.Errorf("upload report pdf: %w", err)
	}

	now := time.Now()
	export.Status = domain.ReportExportStatusCompleted
	export.FilePath = &objectKey
	export.CompletedAt = &now
	if err := s.repo.Update(ctx, export); err != nil {
		return fmt.Errorf("save export status: %w", err)
	}

	return nil
}

func (s *reportExportService) List(ctx context.Context, userID string) ([]response.ExportResponse, error) {
	exports, err := s.repo.FindAllByUserID(ctx, userID)
	if err != nil {
		return nil, utils.ErrInternal("failed to list exports")
	}
	out := make([]response.ExportResponse, 0, len(exports))
	for i := range exports {
		out = append(out, *toExportResponse(&exports[i], ""))
	}
	return out, nil
}

func (s *reportExportService) GetByID(ctx context.Context, userID, id string) (*response.ExportResponse, error) {
	export, err := s.mustOwn(ctx, userID, id)
	if err != nil {
		return nil, err
	}
	return toExportResponse(export, ""), nil
}

func (s *reportExportService) DownloadURL(ctx context.Context, userID, id string) (string, error) {
	export, err := s.mustOwn(ctx, userID, id)
	if err != nil {
		return "", err
	}
	if export.Status != domain.ReportExportStatusCompleted || export.FilePath == nil {
		return "", utils.ErrConflict("export is not ready for download")
	}

	url, err := s.storage.SignedURL(*export.FilePath, 15*time.Minute)
	if err != nil {
		return "", utils.ErrInternal("failed to generate download url")
	}
	return url, nil
}

func (s *reportExportService) mustOwn(ctx context.Context, userID, id string) (*domain.ReportExport, error) {
	export, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, utils.ErrInternal("failed to look up export")
	}
	if export == nil || export.UserID != userID {
		return nil, utils.ErrNotFound("export not found")
	}
	return export, nil
}

func (s *reportExportService) failExport(ctx context.Context, export *domain.ReportExport, cause error) {
	log.Error().Err(cause).Str("export_id", export.ID).Msg("report export failed")

	export.Status = domain.ReportExportStatusFailed
	export.ErrorMessage = utils.StringPtr(cause.Error())
	if err := s.repo.Update(ctx, export); err != nil {
		log.Error().Err(err).Str("export_id", export.ID).Msg("failed to persist export failure status")
	}
}

func renderMonthlyReportPDF(report *response.MonthlyReportResponse) ([]byte, error) {
	lines := []utils.PDFLine{
		{Text: fmt.Sprintf("Period: %04d-%02d", report.Year, report.Month), Bold: true},
		{Text: fmt.Sprintf("Total Spent: %d", report.TotalSpent)},
		{Text: fmt.Sprintf("Total Budget: %d", report.TotalBudget)},
		{Text: "By Category:", Bold: true},
	}
	for _, c := range report.ByCategory {
		lines = append(lines, utils.PDFLine{Text: fmt.Sprintf("- %s: spent %d / budget %d", c.Name, c.Spent, c.Budget)})
	}
	return utils.GenerateSimplePDF("Monthly Report", lines)
}

func toExportResponse(export *domain.ReportExport, downloadURL string) *response.ExportResponse {
	return &response.ExportResponse{
		ID:          export.ID,
		Format:      string(export.Format),
		Year:        export.Year,
		Month:       export.Month,
		Scope:       export.Scope,
		Status:      string(export.Status),
		DownloadURL: downloadURL,
		RequestedAt: export.RequestedAt,
		CompletedAt: export.CompletedAt,
	}
}
