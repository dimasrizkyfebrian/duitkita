import { authRequest } from '@/lib/http'
import type { Budget, CreateBudgetRequest } from '../types'

export function createBudget(payload: CreateBudgetRequest) {
  return authRequest<Budget>('/budgets', { method: 'POST', body: payload })
}

export function listBudgets(year: number, month: number) {
  return authRequest<Budget[]>(`/budgets?year=${year}&month=${month}&limit=100`)
}

export function updateBudget(id: string, baseAmount: number) {
  return authRequest<Budget>(`/budgets/${id}`, {
    method: 'PATCH',
    body: { base_amount: baseAmount },
  })
}

export function deleteBudget(id: string) {
  return authRequest<void>(`/budgets/${id}`, { method: 'DELETE' })
}
