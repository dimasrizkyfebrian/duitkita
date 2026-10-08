import { ref, watch, type Ref } from 'vue'
import { getHealthScore } from '../api/report.api'
import type { HealthScore } from '../types'

export function useHealthScore(year: Ref<number>, month: Ref<number>) {
  const score = ref<HealthScore | null>(null)
  const loading = ref(true)

  async function load() {
    loading.value = true
    try {
      score.value = await getHealthScore(year.value, month.value)
    } catch (err) {
      console.warn('[report] failed to load health score:', err)
      score.value = null
    } finally {
      loading.value = false
    }
  }

  watch([year, month], load, { immediate: true })

  return { score, loading }
}
