export type RecurringScheduleType = 'weekly' | 'monthly'

export interface RecurringExpense {
  id: string
  category_id: string
  amount: number
  note?: string
  schedule_type: RecurringScheduleType
  // Weekly: day of week, Sunday = 0 .. Saturday = 6 (matches Go's
  // time.Weekday, which is what the backend schedules against).
  // Monthly: day of month, 1-31 (clamped to the month's last day if it
  // runs short, e.g. 31 in February becomes the 28th/29th).
  schedule_day: number
  next_run_at: string
  last_run_at?: string
  is_active: boolean
  created_at: string
}

export interface CreateRecurringExpenseRequest {
  category_id: string
  amount: number
  note?: string
  schedule_type: RecurringScheduleType
  schedule_day: number
}

export interface UpdateRecurringExpenseRequest {
  amount?: number
  note?: string
  schedule_day?: number
}
