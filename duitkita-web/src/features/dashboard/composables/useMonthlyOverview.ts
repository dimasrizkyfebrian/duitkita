import { computed, ref } from 'vue'
import { getMonthlyReport } from '@/features/report/api/report.api'
import { listCategories } from '@/features/category/api/category.api'
import { listBudgets } from '@/features/budget/api/budget.api'
import type { MonthlyReport } from '@/features/report/types'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import type { CategoryOverviewItem } from '../types'

const now = new Date()

/** Fetches this month's spend-vs-budget breakdown and enriches it with each
 * category's icon and (once set) its budget id — the report endpoint only
 * returns id/name/spent/budget, not the extra fields the UI and the "catat
 * pengeluaran" flow need. */
export function useMonthlyOverview() {
  const toast = useToast()

  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const report = ref<MonthlyReport | null>(null)
  const items = ref<CategoryOverviewItem[]>([])
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

  // Categories with no budget set this period surface separately so the UI
  // can prompt "atur budget" instead of drawing a misleading 0%-used bar.
  const budgeted = computed(() => items.value.filter((c) => c.budget > 0))
  const unbudgeted = computed(() => items.value.filter((c) => c.budget === 0))

  async function load() {
    loading.value = true
    error.value = false
    try {
      const [reportRes, categories, budgets] = await Promise.all([
        getMonthlyReport(year, month),
        listCategories(),
        listBudgets(year, month),
      ])

      report.value = reportRes

      const iconByCategory = new Map(categories.map((c) => [c.id, c.icon]))
      const budgetIdByCategory = new Map(budgets.map((b) => [b.category_id, b.id]))

      items.value = reportRes.by_category.map((c) => ({
        ...c,
        icon: iconByCategory.get(c.category_id),
        budgetId: budgetIdByCategory.get(c.category_id),
      }))
    } catch (err) {
      error.value = true
      toast.error(apiErrorMessage(err, 'Gagal memuat ringkasan budget.'))
    } finally {
      loading.value = false
    }
  }

  load()

  return {
    year,
    month,
    report,
    loading,
    error,
    usage,
    remaining,
    budgeted,
    unbudgeted,
    reload: load,
  }
}
