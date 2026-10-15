import { computed, ref } from 'vue'
import { listReminders } from '../api/reminder.api'
import type { Reminder } from '../types'

/** Loads the signed-in user's bill reminders and groups them for display:
 * overdue first (most urgent), then upcoming sorted by nearest due date,
 * then done ones tucked at the bottom since they no longer need attention. */
export function useReminders() {
  const items = ref<Reminder[]>([])
  const loading = ref(true)

  async function load() {
    loading.value = true
    try {
      items.value = await listReminders()
    } finally {
      loading.value = false
    }
  }

  const overdue = computed(() =>
    items.value
      .filter((r) => r.status === 'overdue')
      .sort((a, b) => a.due_date.localeCompare(b.due_date)),
  )
  const upcoming = computed(() =>
    items.value
      .filter((r) => r.status === 'upcoming')
      .sort((a, b) => a.due_date.localeCompare(b.due_date)),
  )
  const done = computed(() =>
    items.value
      .filter((r) => r.status === 'done')
      .sort((a, b) => b.due_date.localeCompare(a.due_date)),
  )

  load()

  return { items, overdue, upcoming, done, loading, reload: load }
}
