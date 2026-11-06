import { describe, expect, it } from 'vitest'
import { componentLabel, tipMessage, tipMessages } from '../utils/scoreTips'

describe('tipMessage', () => {
  it.each([
    [
      { code: 'category_over', category_name: 'Makan', percent: 628 },
      'Makan udah 628% dari budget.',
    ],
    [
      { code: 'pace_over_budget', amount: 7_100_000, budget: 1_000_000 },
      'Dengan laju sekarang, bulan ini bakal habis sekitar Rp7,1jt dari budget Rp1jt.',
    ],
    [
      { code: 'recording_gap', weeks: 2 },
      'Ada 2 minggu tanpa catatan. Yuk dicatat biar laporannya akurat.',
    ],
    [{ code: 'all_good' }, 'Mantap, semua aman bulan ini.'],
    [{ code: 'no_budget' }, 'Atur budget dulu ya biar skornya bisa dihitung.'],
    [{ code: 'no_records_yet' }, 'Belum ada catatan bulan ini. Mulai catat biar skornya kebaca.'],
    [{ code: 'period_not_started' }, 'Bulan ini belum mulai.'],
    [{ code: 'something_new' }, ''],
  ])('phrases %o', (tip, expected) => {
    expect(tipMessage(tip)).toBe(expected)
  })

  it('drops tips it cannot phrase', () => {
    expect(tipMessages([{ code: 'something_new' }, { code: 'all_good' }])).toEqual([
      'Mantap, semua aman bulan ini.',
    ])
  })
})

describe('componentLabel', () => {
  it('names each part of the score', () => {
    expect(componentLabel('budget')).toBe('Budget total')
    expect(componentLabel('categories')).toBe('Budget per kategori')
    expect(componentLabel('recording')).toBe('Rutin mencatat')
  })
})

describe('tipMessages with an older API response', () => {
  it('treats missing tips as none', () => {
    expect(tipMessages(undefined)).toEqual([])
  })
})
