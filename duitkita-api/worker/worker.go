package worker

import (
	"duitkita-api/infrastructure"
	"duitkita-api/service"
)

// RegisterAll wires every scheduled job onto the shared cron engine. Called
// once from main.go after the scheduler and services are constructed.
func RegisterAll(scheduler *infrastructure.Scheduler, recurringSvc service.RecurringExpenseService, reminderSvc service.ReminderService) error {
	// Every hour on the hour: materialize due recurring expenses.
	if err := scheduler.Register("recurring-expenses", "0 0 * * * *", NewRecurringExpenseJob(recurringSvc)); err != nil {
		return err
	}
	// Every hour on the hour: flag overdue reminders and notify owners.
	if err := scheduler.Register("reminders", "0 0 * * * *", NewReminderJob(reminderSvc)); err != nil {
		return err
	}
	return nil
}
