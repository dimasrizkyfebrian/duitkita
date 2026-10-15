import { computed, ref } from 'vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import { listRecurringExpenses } from '../api/recurring.api'
import type { RecurringExpense } from '../types'

/** Loads the signed-in user's recurring expense templates and groups them:
 * active ones first (soonest next_run_at first, since that's the one
 * closest to actually firing), paused ones tucked at the bottom since
 * they're not doing anything right now. */
export function useRecurringExpenses() {
  const toast = useToast()
  const items = ref<RecurringExpense[]>([])
  const loading = ref(true)

  async function load() {
    loading.value = true
    try {
      items.value = await listRecurringExpenses()
    } catch (err) {
      // Without this the list just renders its empty state, which reads as
      // "you haven't set any up yet" when the truth is the request failed.
      toast.error(apiErrorMessage(err, 'Gagal muat pengeluaran rutin.'))
    } finally {
      loading.value = false
    }
  }

  const active = computed(() =>
    items.value
      .filter((r) => r.is_active)
      .sort((a, b) => a.next_run_at.localeCompare(b.next_run_at)),
  )
  const paused = computed(() => items.value.filter((r) => !r.is_active))

  load()

  return { items, active, paused, loading, reload: load }
}
