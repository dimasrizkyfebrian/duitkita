package worker

import (
	"context"

	"github.com/rs/zerolog/log"

	"duitkita-api/service"
)

func NewRecurringExpenseJob(svc service.RecurringExpenseService) func() {
	return func() {
		processed, err := svc.RunDue(context.Background())
		if err != nil {
			log.Error().Err(err).Msg("recurring expense job failed")
			return
		}
		log.Info().Int("processed", processed).Msg("recurring expense job completed")
	}
}
