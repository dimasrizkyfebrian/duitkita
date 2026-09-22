package worker

import (
	"context"

	"github.com/rs/zerolog/log"

	"duitkita-api/service"
)

func NewCleanupJob(svc service.MaintenanceService) func() {
	return func() {
		result, err := svc.RunCleanup(context.Background())
		if err != nil {
			log.Error().Err(err).Msg("cleanup job failed")
			return
		}
		log.Info().
			Int64("sessions_deleted", result.SessionsDeleted).
			Int64("notifications_deleted", result.NotificationsDeleted).
			Int64("activities_deleted", result.ActivitiesDeleted).
			Int64("security_audit_deleted", result.SecurityAuditDeleted).
			Msg("cleanup job completed")
	}
}
