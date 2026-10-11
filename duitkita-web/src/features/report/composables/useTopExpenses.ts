import { ref, watch, type Ref } from 'vue'
import { getCoupleTopExpenses, getTopExpenses } from '../api/report.api'
import { ApiError } from '@/lib/request'
import type { CoupleTopExpenseItem, TopExpenseItem } from '../types'

const TOP_EXPENSES_LIMIT = 5

/** Personal top-N always loads. The combined couple ranking loads alongside
 * it and just stays empty on a 404 ("no linked partner" — a normal state,
 * same pattern as useCoupleSummary) — rendering it is gated by the page's
 * own `coupleLinked` (from useCoupleSummary) rather than a second flag
 * here, so both couple sections agree on whether a partner is linked. */
export function useTopExpenses(year: Ref<number>, month: Ref<number>) {
  const items = ref<TopExpenseItem[]>([])
  const coupleItems = ref<CoupleTopExpenseItem[]>([])
  const loading = ref(true)

  async function load() {
    loading.value = true
    try {
      const res = await getTopExpenses(year.value, month.value, TOP_EXPENSES_LIMIT)
      items.value = res.items
    } catch (err) {
      console.warn('[report] failed to load top expenses:', err)
      items.value = []
    }

    try {
      const coupleRes = await getCoupleTopExpenses(year.value, month.value, TOP_EXPENSES_LIMIT)
      coupleItems.value = coupleRes.items
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        console.warn('[report] failed to load couple top expenses:', err)
      }
      coupleItems.value = []
    } finally {
      loading.value = false
    }
  }

  watch([year, month], load, { immediate: true })

  return { items, coupleItems, loading }
}
