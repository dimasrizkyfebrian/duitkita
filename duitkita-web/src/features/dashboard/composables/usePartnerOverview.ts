import { ref } from 'vue'
import { getCoupleReport } from '@/features/report/api/report.api'
import { getPartner } from '@/features/couple/api/couple.api'
import { listCategories } from '@/features/category/api/category.api'
import type { Partner } from '@/features/couple/types'
import type { CategorySpend } from '@/features/report/types'
import { ApiError } from '@/lib/request'

/**
 * Side-by-side comparison, not a merged/shared budget — each partner's
 * numbers stay their own. `GET /reports/couple` returns both partners'
 * category rows concatenated together (not grouped), so the partner-only
 * rows are recovered here by excluding this user's own category ids
 * (fetched independently, rather than borrowed from a sibling composable,
 * so there's no load-order race between the two).
 *
 * No couple linked yet is a normal state, not an error — stays silently
 * empty instead of toasting.
 */
export function usePartnerOverview() {
  const partner = ref<Partner | null>(null)
  const items = ref<CategorySpend[]>([])
  const loading = ref(true)
  const linked = ref(false)

  async function load() {
    loading.value = true
    try {
      const [partnerRes, coupleReport, ownCategories] = await Promise.all([
        getPartner(),
        getCoupleReport(new Date().getFullYear(), new Date().getMonth() + 1),
        listCategories(),
      ])
      partner.value = partnerRes.partner
      const mine = new Set(ownCategories.map((c) => c.id))
      items.value = coupleReport.by_category.filter((c) => !mine.has(c.category_id))
      linked.value = true
    } catch (err) {
      // 404 "no linked partner" is the expected shape when the user hasn't
      // paired up yet — every other failure still deserves silence here too,
      // since this is a secondary widget, not the primary page load.
      if (!(err instanceof ApiError && err.status === 404)) {
        console.warn('[dashboard] failed to load partner overview:', err)
      }
      linked.value = false
    } finally {
      loading.value = false
    }
  }

  load()

  return { partner, items, loading, linked, reload: load }
}
