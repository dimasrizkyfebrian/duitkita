import { computed, effectScope, ref, watch, type EffectScope } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { listAccounts } from '../api/account.api'
import type { Account } from '../types'

// Module-level, so every sheet, picker, and card on the page shares one list
// (and one request) instead of each fetching its own. It's tied to whoever
// loaded it: when the signed-in user changes, it reloads rather than showing
// the previous person's accounts.
const accounts = ref<Account[]>([])
const totalBalance = ref(0)
const loading = ref(false)
let loadedFor: string | null = null
let inflight: Promise<void> | null = null
let scope: EffectScope | null = null

async function load(userId: string | null, force: boolean) {
  if (!userId) {
    accounts.value = []
    totalBalance.value = 0
    loadedFor = null
    return
  }
  if (!force && loadedFor === userId) return inflight ?? undefined

  loadedFor = userId
  loading.value = true
  const request = listAccounts(true)
    .then((res) => {
      // A slower response for a user who has since signed out must not land.
      if (loadedFor !== userId) return
      accounts.value = res.accounts
      totalBalance.value = res.total_balance
    })
    .catch((err) => {
      console.warn('[accounts] failed to load accounts:', err)
      if (loadedFor === userId) loadedFor = null
    })
    .finally(() => {
      if (inflight === request) inflight = null
      loading.value = false
    })
  inflight = request
  return request
}

/** The signed-in user's accounts — archived ones included, split out below
 * — plus the total balance of active accounts that have one. Accounts are
 * private, so this is only ever the caller's own. Call `reload()` after
 * anything that changes a balance (recording or editing an expense). */
export function useAccounts() {
  const auth = useAuthStore()

  if (!scope) {
    // Detached, so the watcher outlives whichever component happened to
    // call this first.
    scope = effectScope(true)
    scope.run(() => {
      watch(
        () => auth.user?.id ?? null,
        (id) => load(id, false),
        { immediate: true },
      )
    })
  }

  const activeAccounts = computed(() => accounts.value.filter((a) => !a.archived))
  const archivedAccounts = computed(() => accounts.value.filter((a) => a.archived))
  const hasAnyBalance = computed(() => activeAccounts.value.some((a) => a.balance !== null))
  const nameById = computed(() => new Map(accounts.value.map((a) => [a.id, a.name])))

  /** An expense row's account name as it is now. Rows carry the name from
   * when they were fetched, so after a rename this list (reloaded by the
   * rename) wins; `fallback` covers rows whose account isn't loaded. */
  function accountName(id: string | null | undefined, fallback: string | undefined) {
    return (id ? nameById.value.get(id) : undefined) ?? fallback
  }

  return {
    accounts,
    activeAccounts,
    archivedAccounts,
    totalBalance,
    hasAnyBalance,
    accountName,
    loading,
    reload: () => load(auth.user?.id ?? null, true),
  }
}

/** Test-only: drop the shared state between test cases. */
export function resetAccountsForTests() {
  scope?.stop()
  scope = null
  accounts.value = []
  totalBalance.value = 0
  loading.value = false
  loadedFor = null
  inflight = null
}
