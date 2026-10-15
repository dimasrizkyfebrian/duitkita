package service

import (
	"context"

	"github.com/rs/zerolog/log"
)

type TaskEnqueuer interface {
	EnqueueReportExportRender(ctx context.Context, exportID string) error
	EnqueuePushDispatch(ctx context.Context, notificationID string) error
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

// EnqueuePushDispatch on the report-export inline enqueuer is unreachable —
// notificationService never shares this instance, it gets its own
// inlinePushEnqueuer below. Implemented only so *inlineEnqueuer keeps
// satisfying TaskEnqueuer.
func (e *inlineEnqueuer) EnqueuePushDispatch(_ context.Context, _ string) error {
	return nil
}

// inlinePushEnqueuer is notificationService's local-dev fallback (mirrors
// inlineEnqueuer's self-referencing trick above) for when Cloud Tasks is
// disabled: it fires the dispatch in a goroutine on a fresh context so a
// slow/offline push service never blocks the caller that created the
// notification (an expense write, a partner-activity log, a reminder cron
// tick) — the same reason the real CloudTasksEnqueuer below hands the work
// to a queue instead of sending inline.
type inlinePushEnqueuer struct {
	pushSvc PushService
}

func NewInlinePushEnqueuer(svc PushService) TaskEnqueuer {
	return &inlinePushEnqueuer{pushSvc: svc}
}

func (e *inlinePushEnqueuer) EnqueueReportExportRender(_ context.Context, _ string) error {
	return nil
}

func (e *inlinePushEnqueuer) EnqueuePushDispatch(_ context.Context, notificationID string) error {
	go func() {
		if err := e.pushSvc.Dispatch(context.Background(), notificationID); err != nil {
			log.Error().Err(err).Str("notification_id", notificationID).Msg("inline push dispatch failed")
		}
	}()
	return nil
}
