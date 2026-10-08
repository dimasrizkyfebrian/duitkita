import { ref } from 'vue'
import { listExpenses, listPartnerExpenses } from '@/features/expense/api/expense.api'
import { listCategories, listPartnerCategories } from '@/features/category/api/category.api'
import { getPartner } from '@/features/couple/api/couple.api'
import { getAvatarUrl } from '@/features/user/api/user.api'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import type { ExpenseFeedItem } from '@/features/expense/types'
import { ApiError } from '@/lib/request'

/** Merges the current user's recent expenses with their partner's (if
 * linked) into one feed, newest first, each tagged with its category
 * name/icon — resolved via `GET /categories/partner` for partner items,
 * since a partner's expense only carries a category_id the caller doesn't
 * otherwise have a way to look up — and the avatar of whoever spent it
 * (one lookup per person, not per expense), so the feed reads "who did
 * this" rather than just "mine or theirs". */
export function useRecentExpenses() {
  const auth = useAuthStore()

  const items = ref<ExpenseFeedItem[]>([])
  const partnerName = ref<string | null>(null)
  const myAvatarUrl = ref<string | null>(null)
  const partnerAvatarUrl = ref<string | null>(null)
  const loading = ref(true)

  async function load() {
    loading.value = true
    try {
      const [mine, categories, myAvatar] = await Promise.all([
        listExpenses(10),
        listCategories(),
        auth.user ? getAvatarUrl(auth.user.id) : Promise.resolve(null),
      ])
      myAvatarUrl.value = myAvatar
      const categoryById = new Map(categories.map((c) => [c.id, c]))

      const mineItems: ExpenseFeedItem[] = mine.map((e) => ({
        ...e,
        owner: 'me',
        categoryName: categoryById.get(e.category_id)?.name,
        categoryIcon: categoryById.get(e.category_id)?.icon,
        avatarUrl: myAvatarUrl.value,
      }))

      let partnerItems: ExpenseFeedItem[] = []
      try {
        const [couple, partnerExpenses, partnerCategories] = await Promise.all([
          getPartner(),
          listPartnerExpenses(10),
          listPartnerCategories(),
        ])
        partnerName.value = couple.partner.name
        partnerAvatarUrl.value = await getAvatarUrl(couple.partner.id)
        const partnerCategoryById = new Map(partnerCategories.map((c) => [c.id, c]))
        partnerItems = partnerExpenses.map((e) => ({
          ...e,
          owner: 'partner',
          categoryName: partnerCategoryById.get(e.category_id)?.name,
          categoryIcon: partnerCategoryById.get(e.category_id)?.icon,
          avatarUrl: partnerAvatarUrl.value,
        }))
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 404)) {
          console.warn('[dashboard] failed to load partner expenses:', err)
        }
      }

      // Sorted by when it was recorded, not the spending date — expense_date
      // is date-only, so two people recording on the same day tie, and the
      // tie used to be broken by concat order (mine always on top) rather
      // than by who actually recorded last.
      items.value = [...mineItems, ...partnerItems]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 10)
    } finally {
      loading.value = false
    }
  }

  load()

  return { items, partnerName, myAvatarUrl, partnerAvatarUrl, loading, reload: load }
}
