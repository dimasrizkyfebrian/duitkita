import { ref, watch, type Ref } from 'vue'
import { getCoupleReport } from '../api/report.api'
import { getPartner } from '@/features/couple/api/couple.api'
import { listCategories, listPartnerCategories } from '@/features/category/api/category.api'
import { ApiError } from '@/lib/request'

/**
 * `GET /reports/couple` only hands back one merged total plus both
 * partners' category rows concatenated — it doesn't say which total is
 * whose. Rebuilt here the same way the dashboard's partner widget does:
 * fetch both people's own category id sets, then split the merged rows by
 * which set a row's category_id falls into. No couple linked is a normal
 * state (404), not an error — stays quietly empty.
 */
export function useCoupleSummary(year: Ref<number>, month: Ref<number>) {
  const linked = ref(false)
  const loading = ref(true)
  const partnerName = ref<string | null>(null)
  const myTotal = ref(0)
  const partnerTotal = ref(0)
  const combinedTotal = ref(0)
  const combinedBudget = ref(0)

  async function load() {
    loading.value = true
    try {
      const [coupleRes, partnerRes, mineCategories, partnerCategories] = await Promise.all([
        getCoupleReport(year.value, month.value),
        getPartner(),
        listCategories(),
        listPartnerCategories(),
      ])

      partnerName.value = partnerRes.partner.name
      const mine = new Set(mineCategories.map((c) => c.id))
      const theirs = new Set(partnerCategories.map((c) => c.id))

      myTotal.value = coupleRes.by_category
        .filter((c) => mine.has(c.category_id))
        .reduce((sum, c) => sum + c.spent, 0)
      partnerTotal.value = coupleRes.by_category
        .filter((c) => theirs.has(c.category_id))
        .reduce((sum, c) => sum + c.spent, 0)

      combinedTotal.value = coupleRes.total_spent
      combinedBudget.value = coupleRes.total_budget
      linked.value = true
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        console.warn('[report] failed to load couple summary:', err)
      }
      linked.value = false
    } finally {
      loading.value = false
    }
  }

  watch([year, month], load, { immediate: true })

  return { linked, loading, partnerName, myTotal, partnerTotal, combinedTotal, combinedBudget }
}
