import { computed, ref, watch, type Ref } from 'vue'
import { getMonthlyReport } from '../api/report.api'
import { listCategories } from '@/features/category/api/category.api'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import type { MonthlyReport } from '../types'

export interface CategoryBreakdownItem {
  category_id: string
  name: string
  icon?: string
  spent: number
  budget: number
  share: number
}

/** The personal monthly breakdown for whichever period `year`/`month` point
 * at — re-fetches whenever the shared report-page stepper moves. Enriches
 * each row with its category icon (the report endpoint only returns
 * id/name/spent/budget) and a 0-100 "share of total spend" used by the
 * donut chart, so the view doesn't recompute that per render. */
export function useMonthlySummary(year: Ref<number>, month: Ref<number>) {
  const toast = useToast()

  const report = ref<MonthlyReport | null>(null)
  const loading = ref(true)
  const error = ref(false)

  const usage = computed(() => {
    if (!report.value || report.value.total_budget <= 0) return 0
    return Math.round((report.value.total_spent / report.value.total_budget) * 100)
  })

  const remaining = computed(() => {
    if (!report.value) return 0
    return report.value.total_budget - report.value.total_spent
  })

  const iconByCategory = ref(new Map<string, string | undefined>())

  const breakdown = computed<CategoryBreakdownItem[]>(() => {
    if (!report.value) return []
    const total = report.value.total_spent
    return [...report.value.by_category]
      .filter((c) => c.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .map((c) => ({
        ...c,
        icon: iconByCategory.value.get(c.category_id),
        share: total > 0 ? Math.round((c.spent / total) * 100) : 0,
      }))
  })

  async function load() {
    loading.value = true
    error.value = false
    try {
      const [reportRes, categories] = await Promise.all([
        getMonthlyReport(year.value, month.value),
        listCategories(),
      ])
      iconByCategory.value = new Map(categories.map((c) => [c.id, c.icon]))
      report.value = reportRes
    } catch (err) {
      error.value = true
      toast.error(apiErrorMessage(err, 'Gagal memuat ringkasan bulan ini.'))
    } finally {
      loading.value = false
    }
  }

  watch([year, month], load, { immediate: true })

  return { report, loading, error, usage, remaining, breakdown, reload: load }
}
