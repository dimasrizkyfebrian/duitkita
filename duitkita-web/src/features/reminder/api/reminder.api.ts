import { authRequest } from '@/lib/http'
import type {
  CreateReminderRequest,
  Reminder,
  SnoozeReminderRequest,
  UpdateReminderRequest,
} from '../types'

export function listReminders(limit = 100, offset = 0) {
  return authRequest<Reminder[]>(`/reminders?limit=${limit}&offset=${offset}`)
}

export function createReminder(payload: CreateReminderRequest) {
  return authRequest<Reminder>('/reminders', { method: 'POST', body: payload })
}

export function updateReminder(id: string, payload: UpdateReminderRequest) {
  return authRequest<Reminder>(`/reminders/${id}`, { method: 'PATCH', body: payload })
}

export function deleteReminder(id: string) {
  return authRequest<void>(`/reminders/${id}`, { method: 'DELETE' })
}

export function markReminderDone(id: string) {
  return authRequest<Reminder>(`/reminders/${id}/mark-done`, { method: 'POST' })
}

export function snoozeReminder(id: string, payload: SnoozeReminderRequest) {
  return authRequest<Reminder>(`/reminders/${id}/snooze`, { method: 'POST', body: payload })
}
