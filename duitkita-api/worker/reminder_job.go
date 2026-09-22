package worker

import (
	"context"

	"github.com/rs/zerolog/log"

	"duitkita-api/service"
)

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
