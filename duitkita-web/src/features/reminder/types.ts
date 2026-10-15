export type ReminderStatus = 'upcoming' | 'overdue' | 'done'

export interface Reminder {
  id: string
  title: string
  amount?: number
  due_date: string
  remind_before_days: number
  status: ReminderStatus
  snoozed_until?: string
  created_at: string
}

export interface CreateReminderRequest {
  title: string
  amount?: number
  due_date: string
  remind_before_days?: number
}

export interface UpdateReminderRequest {
  title?: string
  amount?: number
  due_date?: string
  remind_before_days?: number
}

export interface SnoozeReminderRequest {
  snoozed_until: string
}
