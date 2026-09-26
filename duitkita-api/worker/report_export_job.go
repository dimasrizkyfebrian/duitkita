package worker

import (
	"context"

	"github.com/rs/zerolog/log"

	"duitkita-api/service"
)

// NewReportExportJob returns the cron callback that renders every export
// still marked "pending" — the actual PDF generation + storage upload,
// moved off the request path so POST /reports/exports returns immediately.
func NewReportExportJob(svc service.ReportExportService) func() {
	return func() {
		processed, err := svc.ProcessPending(context.Background())
		if err != nil {
			log.Error().Err(err).Msg("report export job failed")
			return
		}
		if processed > 0 {
			log.Info().Int("processed", processed).Msg("report export job completed")
		}
	}
}
