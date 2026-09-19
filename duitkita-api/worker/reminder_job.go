package worker

import (
	"context"

	"github.com/rs/zerolog/log"

	"duitkita-api/service"
)

// NewReminderJob returns the cron callback that flags overdue bill
// reminders and pushes a notification for each one that just became due.
func NewReminderJob(svc service.ReminderService) func() {
	return func() {
		processed, err := svc.ProcessDue(context.Background())
		if err != nil {
			log.Error().Err(err).Msg("reminder job failed")
			return
		}
		log.Info().Int("processed", processed).Msg("reminder job completed")
	}
}
