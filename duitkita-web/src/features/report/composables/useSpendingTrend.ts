import { computed, ref } from 'vue'
import { getTrend } from '../api/report.api'
import { fillTrailingMonths } from '../utils/trend'
import type { TrendPoint } from '../types'

/** Last N months of total spend, always anchored to today — not to
 * whichever period the page's month stepper is on (the backend endpoint
 * itself has no year/month params, only a month count). Powers both the
 * hero sparkline and the trend bar tile, fetched once and shared. */
export function useSpendingTrend(months: number) {
  const points = ref<TrendPoint[]>([])
  const loading = ref(true)

  const max = computed(() => points.value.reduce((m, p) => Math.max(m, p.total), 0))

  // This month vs last month, as a %. Null when there isn't a full pair yet
  // (brand-new account) or the prior month was zero (a % change from zero
  // is meaningless, not "infinite").
  const deltaPct = computed(() => {
    if (points.value.length < 2) return null
    const last = points.value[points.value.length - 1]!.total
    const prev = points.value[points.value.length - 2]!.total
    if (prev === 0) return null
    return Math.round(((last - prev) / prev) * 100)
  })

  async function load() {
    loading.value = true
    try {
      const res = await getTrend(months)
      points.value = fillTrailingMonths(res.points, months)
    } catch (err) {
      console.warn('[report] failed to load spending trend:', err)
    } finally {
      loading.value = false
    }
  }

  load()

  return { points, loading, max, deltaPct, reload: load }
}
