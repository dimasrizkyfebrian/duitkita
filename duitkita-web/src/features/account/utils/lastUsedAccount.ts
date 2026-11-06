/** "Akun terakhir dipakai" — the account the expense form pre-selects. Kept
 * per device in localStorage, keyed by user so two people sharing a phone
 * don't get each other's pick. An empty string is a real, remembered choice
 * ("no account"); null means nothing has been picked yet on this device. */
const keyFor = (userId: string) => `duitkita:last-account:${userId}`

export function getLastUsedAccountId(userId: string): string | null {
  return localStorage.getItem(keyFor(userId))
}

export function setLastUsedAccountId(userId: string, accountId: string) {
  localStorage.setItem(keyFor(userId), accountId)
}

/** The remembered account, but only while it's still one you can record
 * against — an archived or vanished account falls back to "no account"
 * (`''`) rather than silently tagging an expense with something hidden. */
export function pickDefaultAccountId(lastUsed: string | null, active: { id: string }[]): string {
  if (!lastUsed) return ''
  return active.some((a) => a.id === lastUsed) ? lastUsed : ''
}
