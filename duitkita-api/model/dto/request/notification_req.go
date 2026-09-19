package request

type UpdateNotificationPreferenceRequest struct {
	BudgetAlert     *bool `json:"budget_alert"`
	PartnerActivity *bool `json:"partner_activity"`
	WeeklySummary   *bool `json:"weekly_summary"`
	ReminderAlert   *bool `json:"reminder_alert"`
	RecurringAlert  *bool `json:"recurring_alert"`
}
