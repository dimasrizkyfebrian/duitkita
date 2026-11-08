import { authRequest } from '@/lib/http'
import type {
  Account,
  AccountList,
  AccountTransactionPage,
  AdjustBalanceRequest,
  BalanceAdjustment,
  CreateAccountRequest,
  Institution,
  UpdateAccountRequest,
} from '../types'

export function listInstitutions() {
  return authRequest<Institution[]>('/institutions')
}

export function listAccounts(includeArchived = false) {
  return authRequest<AccountList>(`/accounts?include_archived=${includeArchived}`)
}

export function createAccount(payload: CreateAccountRequest) {
  return authRequest<Account>('/accounts', { method: 'POST', body: payload })
}

export function updateAccount(id: string, payload: UpdateAccountRequest) {
  return authRequest<Account>(`/accounts/${id}`, { method: 'PATCH', body: payload })
}

export function archiveAccount(id: string) {
  return authRequest<Account>(`/accounts/${id}/archive`, { method: 'POST' })
}

export function unarchiveAccount(id: string) {
  return authRequest<Account>(`/accounts/${id}/unarchive`, { method: 'POST' })
}

export function listBalanceAdjustments(id: string) {
  return authRequest<BalanceAdjustment[]>(`/accounts/${id}/adjustments`)
}

export function listAccountTransactions(accountId: string, cursor?: string, limit = 20) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (cursor !== undefined) params.set('cursor', cursor)
  return authRequest<AccountTransactionPage>(`/accounts/${accountId}/transactions?${params}`)
}

export function adjustBalance(id: string, payload: AdjustBalanceRequest) {
  return authRequest<BalanceAdjustment>(`/accounts/${id}/adjustments`, {
    method: 'POST',
    body: payload,
  })
}
