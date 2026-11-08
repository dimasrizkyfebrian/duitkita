import type { AccountSummary } from '@/features/account/types'

export type IncomeSource = 'salary' | 'bonus' | 'freelance' | 'gift' | 'investment' | 'other'

/** `income_date` is a plain YYYY-MM-DD calendar date. `account_id` and
 * `account` are always present, null when the income isn't tied to an account. */
export interface Income {
  id: string
  source: IncomeSource
  amount: number
  note?: string
  income_date: string
  account_id: string | null
  account: AccountSummary | null
  created_at: string
}

export interface IncomeList {
  items: Income[]
  /** Sum of `amount` (rupiah) of ALL incomes matching the filter, ignoring
   * `limit`/`offset` — not a row count, and not the sum of `items`. */
  total: number
}

export interface CreateIncomeRequest {
  source: IncomeSource
  amount: number
  income_date: string
  account_id?: string
  note?: string
}

/** Every field is optional. `account_id: ''` detaches the account and
 * `note: ''` removes the note. */
export interface UpdateIncomeRequest {
  source?: IncomeSource
  amount?: number
  income_date?: string
  account_id?: string
  note?: string
}
