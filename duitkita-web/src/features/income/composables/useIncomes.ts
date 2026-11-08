import { effectScope, ref, watch, type EffectScope } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { listIncomes } from '../api/income.api'
import type { Income } from '../types'

// Module-level, so a form, a card, and a list share one list (and one
// request). Like `useAccounts`, it's tied to whoever loaded it: when the
// signed-in user changes it reloads rather than showing the previous
// person's incomes.
const items = ref<Income[]>([])
const total = ref(0)
const loading = ref(false)
let loadedFor: string | null = null
let inflight: Promise<void> | null = null
let scope: EffectScope | null = null

const pad = (n: number) => String(n).padStart(2, '0')
const toDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** First and last day of the current calendar month, as local YYYY-MM-DD. */
function currentMonthRange() {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: toDate(first), to: toDate(last) }
}

async function load(userId: string | null, force: boolean) {
  if (!userId) {
    items.value = []
    total.value = 0
    loadedFor = null
    return
  }
  if (!force && loadedFor === userId) return inflight ?? undefined

  loadedFor = userId
  loading.value = true
  const request = listIncomes({ ...currentMonthRange(), limit: 100 })
    .then((res) => {
      // A slower response for a user who has since signed out must not land.
      if (loadedFor !== userId) return
      items.value = res.items
      total.value = res.total
    })
    .catch((err) => {
      // Keep whatever was loaded before; a failed refresh isn't worth wiping it.
      console.warn('[incomes] failed to load incomes:', err)
      if (loadedFor === userId) loadedFor = null
    })
    .finally(() => {
      // A superseded request (user switched) must not clear the newer one's flag.
      if (inflight === request) {
        inflight = null
        loading.value = false
      }
    })
  inflight = request
  return request
}

/** The signed-in user's incomes for the current calendar month (up to 100;
 * `total` is the rupiah sum of all of them, not just these items). Call
 * `reload()` after recording, editing, or deleting an income. */
export function useIncomes() {
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

  return {
    items,
    total,
    loading,
    reload: () => load(auth.user?.id ?? null, true),
  }
}

/** Test-only: drop the shared state between test cases. */
export function resetIncomesForTests() {
  scope?.stop()
  scope = null
  items.value = []
  total.value = 0
  loading.value = false
  loadedFor = null
  inflight = null
}
