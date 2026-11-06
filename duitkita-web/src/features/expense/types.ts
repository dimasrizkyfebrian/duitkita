import type { AccountSummary } from '@/features/account/types'

export interface Expense {
  id: string
  category_id: string
  monthly_budget_id: string
  amount: number
  note?: string
  expense_date: string
  created_at: string
  // Only ever present on your own expenses — accounts are private, so a
  // partner's expenses never carry them. Absent also means "no account".
  account_id?: string
  account?: AccountSummary
}

export interface CreateExpenseRequest {
  category_id: string
  monthly_budget_id: string
  amount: number
  note?: string
  expense_date: string
  account_id?: string
}

/** Every field is optional — omitted ones keep their current value. The
 * budget an expense belongs to is derived server-side from category and
 * date, so there's no monthly_budget_id to send: changing either one
 * re-points it (and fails if that category/month has no budget yet).
 * Sending `note: ''` clears an existing note, and `account_id: ''` takes the
 * expense off its account. Re-sending its current account is always fine,
 * even if that account has been archived since. */
export interface UpdateExpenseRequest {
  category_id?: string
  amount?: number
  note?: string
  expense_date?: string
  account_id?: string
}

/** A merged, display-ready item — the backend has no single feed that
 * tags whose expense this is, so the caller stamps it based on which
 * endpoint the item came from. See `useRecentExpenses`. */
export interface ExpenseFeedItem extends Expense {
  owner: 'me' | 'partner'
  categoryName?: string
  categoryIcon?: string
  // Who actually spent it, for the avatar — resolved per owner (one lookup
  // for "me", one for the partner), not per expense. Null/undefined means no
  // avatar is set (the common case today — see getAvatarUrl), so the UI
  // falls back to that person's initial.
  avatarUrl?: string | null
}
