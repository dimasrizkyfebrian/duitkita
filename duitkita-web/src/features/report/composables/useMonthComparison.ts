import { computed, ref, watch, type Ref } from 'vue'
import { getMonthlyReport } from '../api/report.api'
import type { MonthlyReport } from '../types'

export interface CategoryComparisonItem {
  category_id: string
  name: string
  current: number
  previous: number
  // null when the previous month was zero — a % change from zero is
  // meaningless, not "infinite", so the UI shows "kategori baru" instead.
  deltaPct: number | null
}

function previousPeriod(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
}

/** Compares `currentReport` (the period the page's stepper is on, loaded
 * elsewhere by useMonthlySummary — not re-fetched here) against the month
 * right before it. GET /reports/monthly left-joins from all of a user's
 * categories, so both periods return a consistent category set and the
 * two responses can be diffed directly without a dedicated endpoint. */
export function useMonthComparison(
  year: Ref<number>,
  month: Ref<number>,
  currentReport: Ref<MonthlyReport | null>,
) {
  const previousReport = ref<MonthlyReport | null>(null)
  const loading = ref(true)

  async function load() {
    loading.value = true
    try {
      const { year: py, month: pm } = previousPeriod(year.value, month.value)
      previousReport.value = await getMonthlyReport(py, pm)
    } catch (err) {
      console.warn('[report] failed to load previous month for comparison:', err)
      previousReport.value = null
    } finally {
      loading.value = false
    }
  }

  watch([year, month], load, { immediate: true })

  const totalCurrent = computed(() => currentReport.value?.total_spent ?? 0)
  const totalPrevious = computed(() => previousReport.value?.total_spent ?? 0)
  const totalDeltaPct = computed(() => {
    if (totalPrevious.value === 0) return null
    return Math.round(((totalCurrent.value - totalPrevious.value) / totalPrevious.value) * 100)
  })

  const categories = computed<CategoryComparisonItem[]>(() => {
    if (!currentReport.value) return []
    const previousByCategory = new Map(
      (previousReport.value?.by_category ?? []).map((c) => [c.category_id, c.spent]),
    )
    return currentReport.value.by_category
      .map((c) => {
        const previous = previousByCategory.get(c.category_id) ?? 0
        return {
          category_id: c.category_id,
          name: c.name,
          current: c.spent,
          previous,
          deltaPct: previous === 0 ? null : Math.round(((c.spent - previous) / previous) * 100),
        }
      })
      .filter((c) => c.current > 0 || c.previous > 0)
      .sort((a, b) => b.current - a.current)
  })

  return { loading, totalCurrent, totalPrevious, totalDeltaPct, categories }
}
