/** A YYYY-MM-DD calendar date as "5 Nov 2026". Built from the parts:
 * `new Date('2026-11-05')` is read as UTC midnight and would show the previous
 * day west of Greenwich. */
export function formatYmd(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number)
  return new Date(year!, month! - 1, day!).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
