import { ref } from 'vue'
import { getForecast } from '../api/report.api'
import type { Forecast } from '../types'

/** Always "next real calendar month" — not steppable, same reasoning as
 * useSpendingTrend. */
export function useForecast() {
  const forecast = ref<Forecast | null>(null)
  const loading = ref(true)

  async function load() {
    loading.value = true
    try {
      forecast.value = await getForecast()
    } catch (err) {
      console.warn('[report] failed to load forecast:', err)
      forecast.value = null
    } finally {
      loading.value = false
    }
  }

  load()

  return { forecast, loading }
}
