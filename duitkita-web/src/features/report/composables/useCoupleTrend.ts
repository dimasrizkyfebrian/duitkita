import { ref } from 'vue'
import { getCoupleTrend } from '../api/report.api'
import { fillTrailingMonths } from '../utils/trend'
import { ApiError } from '@/lib/request'
import type { TrendPoint } from '../types'

/** Combined monthly spend for both partners, last N months up to today —
 * same "always anchored to now, not the page's month stepper" shape as
 * useSpendingTrend. No couple linked is a normal state (404), stays empty
 * rather than toasting, same as useCoupleSummary. */
export function useCoupleTrend(months: number) {
  const points = ref<TrendPoint[]>([])
  const loading = ref(true)
  const linked = ref(false)

  async function load() {
    loading.value = true
    try {
      const res = await getCoupleTrend(months)
      points.value = fillTrailingMonths(res.points, months)
      linked.value = true
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        console.warn('[report] failed to load couple trend:', err)
      }
      linked.value = false
    } finally {
      loading.value = false
    }
  }

  load()

  return { points, loading, linked, reload: load }
}
