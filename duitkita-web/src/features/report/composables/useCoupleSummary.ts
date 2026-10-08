import { ref, watch, type Ref } from 'vue'
import { getCoupleReport } from '../api/report.api'
import { getPartner } from '@/features/couple/api/couple.api'
import { ApiError } from '@/lib/request'

/**
 * `GET /reports/couple` now tags each category row with its owner and
 * returns my_total/partner_total directly — no more inferring "whose
 * category is this" by diffing against separately-fetched category lists
 * (the old approach, kept only in git history). The report itself still
 * doesn't carry the partner's display name, so that's the one thing still
 * fetched separately.
 *
 * No couple linked is a normal state (404), not an error — stays quietly
 * empty.
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
      const [coupleRes, partnerRes] = await Promise.all([
        getCoupleReport(year.value, month.value),
        getPartner(),
      ])

      partnerName.value = partnerRes.partner.name
      myTotal.value = coupleRes.my_total
      partnerTotal.value = coupleRes.partner_total
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
