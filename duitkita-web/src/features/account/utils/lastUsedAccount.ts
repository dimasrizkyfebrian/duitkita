/** "Akun terakhir dipakai" — the account the expense/income forms pre-select.
 * Kept per device in localStorage, keyed by user so two people sharing a phone
 * don't get each other's pick, and by kind so the account you spend from and
 * the one you get paid into are remembered separately. An empty string is a
 * real, remembered choice ("no account"); null means nothing has been picked
 * yet on this device. */
export type AccountPickKind = 'expense' | 'income'

// The expense key predates income and must stay as-is, or everyone's existing
// remembered account would silently reset.
const keyFor = (userId: string, kind: AccountPickKind) =>
  kind === 'income' ? `duitkita:last-account:income:${userId}` : `duitkita:last-account:${userId}`

export function getLastUsedAccountId(
  userId: string,
  kind: AccountPickKind = 'expense',
): string | null {
  return localStorage.getItem(keyFor(userId, kind))
}

export function setLastUsedAccountId(
  userId: string,
  accountId: string,
  kind: AccountPickKind = 'expense',
) {
  localStorage.setItem(keyFor(userId, kind), accountId)
}

/** The remembered account, but only while it's still one you can record
 * against — an archived or vanished account falls back to "no account"
 * (`''`) rather than silently tagging an expense with something hidden. */
export function pickDefaultAccountId(lastUsed: string | null, active: { id: string }[]): string {
  if (!lastUsed) return ''
  return active.some((a) => a.id === lastUsed) ? lastUsed : ''
}
