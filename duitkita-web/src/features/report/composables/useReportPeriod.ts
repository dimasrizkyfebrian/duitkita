import { computed, ref } from 'vue'

/** Month stepper shared by every period-scoped tile on the report page
 * (monthly summary, health score, couple split, category breakdown).
 * Capped at the current calendar month — there's no "future" period to
 * report on, and the trend/forecast tiles are deliberately NOT driven by
 * this (they're always "last N months up to today", see useSpendingTrend
 * and useForecast). */
export function useReportPeriod() {
  const now = new Date()
  const maxYear = now.getFullYear()
  const maxMonth = now.getMonth() + 1

  const year = ref(maxYear)
  const month = ref(maxMonth)

  const isCurrent = computed(() => year.value === maxYear && month.value === maxMonth)

  const label = computed(() =>
    new Date(year.value, month.value - 1).toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    }),
  )

  function goPrev() {
    if (month.value === 1) {
      month.value = 12
      year.value -= 1
    } else {
      month.value -= 1
    }
  }

  function goNext() {
    if (isCurrent.value) return
    if (month.value === 12) {
      month.value = 1
      year.value += 1
    } else {
      month.value += 1
    }
  }

  return { year, month, label, isCurrent, goPrev, goNext }
}
