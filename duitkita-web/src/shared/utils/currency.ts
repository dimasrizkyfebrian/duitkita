const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatRupiah(value: number) {
  return rupiah.format(value)
}

/** Shortened form for tight spots: 1250000 -> "Rp1,25jt". */
export function formatRupiahShort(value: number) {
  if (value >= 1_000_000) {
    return `Rp${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 2 })}jt`
  }
  if (value >= 1_000) {
    return `Rp${(value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })}rb`
  }
  return formatRupiah(value)
}
