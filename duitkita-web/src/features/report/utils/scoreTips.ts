import { formatRupiahShort } from '@/shared/utils/currency'
import type { ScoreComponentKey, ScoreTip } from '../types'

/** The backend sends tips as codes plus numbers; the sentences live here so
 * they read like the rest of the app. Unknown codes come back as '' and are
 * dropped rather than shown as raw codes. */
export function tipMessage(tip: ScoreTip): string {
  switch (tip.code) {
    case 'category_over':
      return `${tip.category_name} udah ${tip.percent}% dari budget.`
    case 'pace_over_budget':
      return `Dengan laju sekarang, bulan ini bakal habis sekitar ${formatRupiahShort(tip.amount ?? 0)} dari budget ${formatRupiahShort(tip.budget ?? 0)}.`
    case 'recording_gap':
      return `Ada ${tip.weeks} minggu tanpa catatan. Yuk dicatat biar laporannya akurat.`
    case 'all_good':
      return 'Mantap, semua aman bulan ini.'
    case 'no_budget':
      return 'Atur budget dulu ya biar skornya bisa dihitung.'
    case 'no_records_yet':
      return 'Belum ada catatan bulan ini. Mulai catat biar skornya kebaca.'
    case 'period_not_started':
      return 'Bulan ini belum mulai.'
    default:
      return ''
  }
}

// Missing tips (an older API) read as none.
export function tipMessages(tips: ScoreTip[] | undefined): string[] {
  return (tips ?? []).map(tipMessage).filter((m) => m !== '')
}

const labels: Record<ScoreComponentKey, string> = {
  budget: 'Budget total',
  categories: 'Budget per kategori',
  recording: 'Rutin mencatat',
}

export function componentLabel(key: ScoreComponentKey): string {
  return labels[key]
}
