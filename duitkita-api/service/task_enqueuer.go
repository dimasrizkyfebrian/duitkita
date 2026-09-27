package service

import (
	"context"

	"github.com/rs/zerolog/log"
)

type TaskEnqueuer interface {
	EnqueueReportExportRender(ctx context.Context, exportID string) error
}

type inlineEnqueuer struct {
	exportSvc ReportExportService
}

func NewInlineEnqueuer(svc ReportExportService) TaskEnqueuer {
	return &inlineEnqueuer{exportSvc: svc}
}

func (e *inlineEnqueuer) EnqueueReportExportRender(_ context.Context, exportID string) error {
	go func() {
		if err := e.exportSvc.RenderOne(context.Background(), exportID); err != nil {
			log.Error().Err(err).Str("export_id", exportID).Msg("inline report export render failed")
		}
	}()
	return nil
}
