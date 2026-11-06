import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import HealthScoreSheet from '../components/HealthScoreSheet.vue'
import type { HealthScore } from '../types'

const score: HealthScore = {
  score: 20,
  grade: 'D',
  reasons: ['spending is over budget'],
  provisional: false,
  period: 'current',
  projected_spent: 7_100_000,
  total_budget: 1_000_000,
  components: [
    { key: 'budget', points: 0, max: 50 },
    { key: 'categories', points: 0, max: 30 },
    { key: 'recording', points: 20, max: 20 },
  ],
  tips: [
    { code: 'category_over', category_name: 'Makan', percent: 628 },
    { code: 'pace_over_budget', amount: 7_100_000, budget: 1_000_000 },
  ],
}

function mountSheet(s: HealthScore) {
  return mount(HealthScoreSheet, {
    props: { open: true, score: s },
    global: { stubs: { teleport: true } },
  })
}

describe('HealthScoreSheet', () => {
  it('shows each part with its points and every tip', () => {
    const text = mountSheet(score).text()
    expect(text).toContain('Budget total')
    expect(text).toContain('0/50')
    expect(text).toContain('Budget per kategori')
    expect(text).toContain('0/30')
    expect(text).toContain('Rutin mencatat')
    expect(text).toContain('20/20')
    expect(text).toContain('Makan udah 628% dari budget.')
    expect(text).toContain('bulan ini bakal habis sekitar Rp7,1jt')
  })

  it('says when the score is only provisional', () => {
    expect(mountSheet(score).text()).not.toContain('sementara')
    expect(mountSheet({ ...score, provisional: true }).text()).toContain(
      'Skor masih sementara karena bulan baru jalan.',
    )
  })
})

// During a deploy the new app can briefly talk to the old API, which only
// sends score, grade and reasons.
describe('HealthScoreSheet with an older API response', () => {
  it('renders without components or tips', () => {
    const old = {
      score: 30,
      grade: 'A',
      reasons: ['spending is well under budget'],
    } as unknown as HealthScore
    const wrapper = mountSheet(old)
    expect(wrapper.text()).toContain('30/100')
  })
})
