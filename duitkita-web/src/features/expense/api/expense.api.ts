import { authRequest } from '@/lib/http'
import type { CreateExpenseRequest, Expense, UpdateExpenseRequest } from '../types'

export function listExpenses(limit = 10) {
  return authRequest<Expense[]>(`/expenses?limit=${limit}`)
}

export function listPartnerExpenses(limit = 10) {
  return authRequest<Expense[]>(`/expenses/partner?limit=${limit}`)
}

export function createExpense(payload: CreateExpenseRequest) {
  return authRequest<Expense>('/expenses', { method: 'POST', body: payload })
}

export function updateExpense(id: string, payload: UpdateExpenseRequest) {
  return authRequest<Expense>(`/expenses/${id}`, { method: 'PATCH', body: payload })
}

export function deleteExpense(id: string) {
  return authRequest<void>(`/expenses/${id}`, { method: 'DELETE' })
}
