import { reactive, ref } from 'vue'
import { listExpensesByBudget } from '@/features/expense/api/expense.api'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import type { Expense } from '@/features/expense/types'

/** Lazily loads and caches each budgeted category's expense list for the
 * current period, keyed by budget id — nothing is fetched until a category
 * row is expanded, and expanding it again afterwards reuses what's already
 * loaded instead of refetching. */
export function useCategoryExpenses() {
  const toast = useToast()

  const expandedId = ref<string | null>(null)
  const itemsByBudget = reactive(new Map<string, Expense[]>())
  const loadingId = ref<string | null>(null)

  async function fetchInto(budgetId: string) {
    loadingId.value = budgetId
    try {
      const expenses = await listExpensesByBudget(budgetId)
      itemsByBudget.set(budgetId, expenses)
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Gagal memuat daftar pengeluaran kategori ini.'))
      if (expandedId.value === budgetId) expandedId.value = null
    } finally {
      loadingId.value = null
    }
  }

  async function toggle(budgetId: string) {
    if (expandedId.value === budgetId) {
      expandedId.value = null
      return
    }
    expandedId.value = budgetId
    if (!itemsByBudget.has(budgetId)) await fetchInto(budgetId)
  }

  // After an edit/delete against this budget, the cached list is stale —
  // drop it so a later expand re-fetches, and if it's open right now,
  // refetch immediately so what's on screen doesn't lag the change.
  function refresh(budgetId: string) {
    itemsByBudget.delete(budgetId)
    if (expandedId.value === budgetId) fetchInto(budgetId)
  }

  return { expandedId, itemsByBudget, loadingId, toggle, refresh }
}
