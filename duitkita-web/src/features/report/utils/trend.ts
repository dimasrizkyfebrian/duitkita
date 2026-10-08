import type { TrendPoint } from '../types'

/**
 * The backend only returns rows for months that actually have expenses —
 * a brand-new account with spending only in October gets back exactly one
 * point, not six. That collapsed the chart to a single full-width bar.
 * Zero-fills every month in the trailing window instead, oldest first and
 * the current month always last/rightmost, so the chart reads as a fixed
 * 6-month strip that slides left as time passes rather than stretching or
 * shrinking with however much history exists.
 */
export function fillTrailingMonths(
  points: TrendPoint[],
  months: number,
  anchor = new Date(),
): TrendPoint[] {
  const totalByKey = new Map(points.map((p) => [`${p.year}-${p.month}`, p.total]))

  const filled: TrendPoint[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(anchor.getFullYear(), anchor.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = d.getMonth() + 1
    filled.push({ year, month, total: totalByKey.get(`${year}-${month}`) ?? 0 })
  }
  return filled
}
