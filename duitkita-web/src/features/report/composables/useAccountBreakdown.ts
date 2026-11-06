import { ref, watch, type Ref } from 'vue'
import { getAccountBreakdown } from '../api/report.api'
import type { AccountSpend } from '../types'

/** The selected month's spending split by account — personal only, since
 * accounts are private and there's no couple version of this. */
export function useAccountBreakdown(year: Ref<number>, month: Ref<number>) {
  const items = ref<AccountSpend[]>([])
  const total = ref(0)
  const loading = ref(true)

  async function load() {
    loading.value = true
    try {
      const res = await getAccountBreakdown(year.value, month.value)
      items.value = res.items
      total.value = res.total
    } catch (err) {
      console.warn('[report] failed to load account breakdown:', err)
      items.value = []
      total.value = 0
    } finally {
      loading.value = false
    }
  }

  watch([year, month], load, { immediate: true })

  return { items, total, loading }
}
