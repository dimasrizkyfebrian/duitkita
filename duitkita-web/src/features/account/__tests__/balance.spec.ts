import { describe, expect, it } from 'vitest'
import { formatSignedRupiah } from '../utils/balance'

// Intl inserts a non-breaking space between "Rp" and the number.
const normalize = (s: string) => s.replace(/ /g, ' ')

describe('formatSignedRupiah', () => {
  it('prefixes a plus for money found', () => {
    expect(normalize(formatSignedRupiah(50_000))).toBe('+Rp 50.000')
  })

  it('prefixes a real minus sign for money missing', () => {
    expect(normalize(formatSignedRupiah(-50_000))).toBe('−Rp 50.000')
  })

  it('shows zero without a sign', () => {
    expect(normalize(formatSignedRupiah(0))).toBe('Rp 0')
  })
})
