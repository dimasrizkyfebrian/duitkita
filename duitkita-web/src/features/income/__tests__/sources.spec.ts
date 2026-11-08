import { describe, expect, it } from 'vitest'
import { INCOME_SOURCES, incomeSourceLabel } from '../utils/sources'

describe('income sources', () => {
  it('lists the six sources in order with Indonesian labels', () => {
    expect(INCOME_SOURCES).toEqual([
      { value: 'salary', label: 'Gaji' },
      { value: 'bonus', label: 'Bonus' },
      { value: 'freelance', label: 'Freelance' },
      { value: 'gift', label: 'Hadiah' },
      { value: 'investment', label: 'Investasi' },
      { value: 'other', label: 'Lainnya' },
    ])
  })

  it('labels each known source code', () => {
    expect(incomeSourceLabel('salary')).toBe('Gaji')
    expect(incomeSourceLabel('investment')).toBe('Investasi')
    expect(incomeSourceLabel('other')).toBe('Lainnya')
  })

  it('falls back to Lainnya for an unknown code', () => {
    expect(incomeSourceLabel('lottery')).toBe('Lainnya')
    expect(incomeSourceLabel('')).toBe('Lainnya')
  })
})
