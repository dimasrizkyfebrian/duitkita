import { ref, watch, type Ref } from 'vue'
import { getDailyBreakdown } from '../api/report.api'
import type { DayPoint } from '../types'

/** Every day of the selected month, zero-filled — the backend only returns
 * rows for days that actually have an expense, same reasoning as the
 * monthly trend's gap-filling (see utils/trend.ts), just day-granular and
 * bounded by the real number of days in that specific month instead of a
 * fixed trailing window. */
export function useDailyBreakdown(year: Ref<number>, month: Ref<number>) {
  const points = ref<DayPoint[]>([])
  const loading = ref(true)

  async function load() {
    loading.value = true
    try {
      const res = await getDailyBreakdown(year.value, month.value)
      const totalByDay = new Map(res.points.map((p) => [p.day, p.total]))
      const daysInMonth = new Date(year.value, month.value, 0).getDate()
      points.value = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1
        return { day, total: totalByDay.get(day) ?? 0 }
      })
    } catch (err) {
      console.warn('[report] failed to load daily breakdown:', err)
      points.value = []
    } finally {
      loading.value = false
    }
  }

  watch([year, month], load, { immediate: true })

  return { points, loading }
}
