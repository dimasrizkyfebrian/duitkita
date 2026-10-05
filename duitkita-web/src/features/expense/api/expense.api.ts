import { authRequest } from '@/lib/http'
import type { CreateExpenseRequest, Expense } from '../types'

export function listExpenses(limit = 10) {
  return authRequest<Expense[]>(`/expenses?limit=${limit}`)
}

export function listPartnerExpenses(limit = 10) {
  return authRequest<Expense[]>(`/expenses/partner?limit=${limit}`)
}

export function createExpense(payload: CreateExpenseRequest) {
  return authRequest<Expense>('/expenses', { method: 'POST', body: payload })
}
