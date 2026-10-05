export interface Expense {
  id: string
  category_id: string
  monthly_budget_id: string
  amount: number
  note?: string
  expense_date: string
  created_at: string
}

export interface CreateExpenseRequest {
  category_id: string
  monthly_budget_id: string
  amount: number
  note?: string
  expense_date: string
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
