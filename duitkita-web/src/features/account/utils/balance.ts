import { formatRupiah } from '@/shared/utils/currency'

/** A balance difference with its direction spelled out — "+Rp 50.000" when
 * the real balance is higher than DuitKita's, "−Rp 50.000" (a true minus
 * sign, not a hyphen) when it's lower. */
export function formatSignedRupiah(delta: number) {
  if (delta === 0) return formatRupiah(0)
  return `${delta > 0 ? '+' : '−'}${formatRupiah(Math.abs(delta))}`
}

export function todayIso() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}
