import { authRequest } from '@/lib/http'
import type {
  CreateIncomeRequest,
  Income,
  IncomeList,
  IncomeSource,
  UpdateIncomeRequest,
} from '../types'

export interface ListIncomesParams {
  from?: string
  to?: string
  accountId?: string
  source?: IncomeSource
  limit?: number
  offset?: number
}

export function listIncomes(params: ListIncomesParams = {}) {
  const query = new URLSearchParams()
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)
  if (params.accountId) query.set('account_id', params.accountId)
  if (params.source) query.set('source', params.source)
  if (params.limit !== undefined) query.set('limit', String(params.limit))
  if (params.offset !== undefined) query.set('offset', String(params.offset))
  const qs = query.toString()
  return authRequest<IncomeList>(qs ? `/incomes?${qs}` : '/incomes')
}

export function createIncome(payload: CreateIncomeRequest) {
  return authRequest<Income>('/incomes', { method: 'POST', body: payload })
}

export function updateIncome(id: string, payload: UpdateIncomeRequest) {
  return authRequest<Income>(`/incomes/${id}`, { method: 'PATCH', body: payload })
}

export function deleteIncome(id: string) {
  return authRequest<void>(`/incomes/${id}`, { method: 'DELETE' })
}
