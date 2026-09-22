package worker

import (
	"duitkita-api/infrastructure"
	"duitkita-api/service"
)

func RegisterAll(scheduler *infrastructure.Scheduler, svcs *service.Services) error {
	if err := scheduler.Register("recurring-expenses", "0 0 * * * *", NewRecurringExpenseJob(svcs.RecurringExpense)); err != nil {
		return err
	}

	if err := scheduler.Register("reminders", "0 0 * * * *", NewReminderJob(svcs.Reminder)); err != nil {
		return err
	}

	if err := scheduler.Register("cleanup", "0 0 3 * * *", NewCleanupJob(svcs.Maintenance)); err != nil {
		return err
	}
	return nil
}
