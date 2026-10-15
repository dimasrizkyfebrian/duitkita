import { authRequest } from '@/lib/http'
import type {
  CreateRecurringExpenseRequest,
  RecurringExpense,
  UpdateRecurringExpenseRequest,
} from '../types'

export function listRecurringExpenses(limit = 100, offset = 0) {
  return authRequest<RecurringExpense[]>(`/recurring-expenses?limit=${limit}&offset=${offset}`)
}

export function createRecurringExpense(payload: CreateRecurringExpenseRequest) {
  return authRequest<RecurringExpense>('/recurring-expenses', { method: 'POST', body: payload })
}

export function updateRecurringExpense(id: string, payload: UpdateRecurringExpenseRequest) {
  return authRequest<RecurringExpense>(`/recurring-expenses/${id}`, {
    method: 'PATCH',
    body: payload,
  })
}

export function deleteRecurringExpense(id: string) {
  return authRequest<void>(`/recurring-expenses/${id}`, { method: 'DELETE' })
}

export function pauseRecurringExpense(id: string) {
  return authRequest<void>(`/recurring-expenses/${id}/pause`, { method: 'POST' })
}

export function resumeRecurringExpense(id: string) {
  return authRequest<void>(`/recurring-expenses/${id}/resume`, { method: 'POST' })
}
