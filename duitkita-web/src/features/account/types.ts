export type InstitutionType = 'bank' | 'ewallet' | 'cash'

export interface Institution {
  id: string
  code: string
  name: string
  type: InstitutionType
  logo_path: string | null
}

/** `balance` is null when the account has no opening balance — it's then
 * just a label, with nothing to compute. `opening_balance_date` is a plain
 * YYYY-MM-DD calendar date. */
export interface Account {
  id: string
  name: string
  institution: Institution
  opening_balance: number | null
  opening_balance_date: string | null
  balance: number | null
  archived: boolean
  archived_at: string | null
  created_at: string
}

export interface AccountList {
  accounts: Account[]
  /** Active accounts with a balance only. */
  total_balance: number
}

/** The slim form embedded in an expense: enough for a logo and a name. */
export interface AccountSummary {
  id: string
  name: string
  archived: boolean
  institution: Institution
}

/** Anything the account picker can list — a full Account or the summary
 * an expense carries (used to keep an archived account selectable while
 * editing an expense that's already on it). */
export type PickableAccount = Pick<Account, 'id' | 'name' | 'institution'>

export interface BalanceAdjustment {
  id: string
  account_id: string
  previous_balance: number
  new_balance: number
  delta: number
  note?: string
  created_at: string
}

export type AccountTransactionKind = 'expense' | 'income' | 'adjustment'

/** One row of an account's mutasi. `amount` is the signed effect on this
 * account's balance. `label` is the category name (expense), the income source
 * code (income) or empty (adjustment). `date` is a plain YYYY-MM-DD calendar
 * date. `before_opening` rows predate the opening balance and don't count. */
export interface AccountTransaction {
  id: string
  kind: AccountTransactionKind
  date: string
  amount: number
  label: string
  note?: string
  before_opening: boolean
}

export interface AccountTransactionPage {
  items: AccountTransaction[]
  next_cursor: string | null
}

/** Leave out opening_balance (and its date) for a label-only account. */
export interface CreateAccountRequest {
  institution_id: string
  name: string
  opening_balance?: number
  opening_balance_date?: string
}

/** The opening balance can only be filled in while it's still empty — after
 * that the balance moves through a balance adjustment instead. */
export interface UpdateAccountRequest {
  name?: string
  opening_balance?: number
  opening_balance_date?: string
}

export interface AdjustBalanceRequest {
  new_balance: number
  note?: string
}
