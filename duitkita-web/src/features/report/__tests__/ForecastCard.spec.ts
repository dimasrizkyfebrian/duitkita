import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ForecastCard from '../components/ForecastCard.vue'
import type { Forecast } from '../types'

const forecast: Forecast = {
  year: 2026,
  month: 12,
  projected_total: 6_300_000,
  projected_low: 5_800_000,
  projected_high: 6_900_000,
  recurring_total: 0,
  months_with_data: 3,
  confidence: 0.8,
  current_month: {
    year: 2026,
    month: 11,
    spent: 1_500_000,
    projected_total: 4_500_000,
    budget: 3_000_000,
    recurring_remaining: 0,
  },
}

const mountCard = (f: Forecast | null) =>
  mount(ForecastCard, { props: { forecast: f, loading: false } })

describe('ForecastCard', () => {
  it('shows where this month is heading against the budget', () => {
    const wrapper = mountCard(forecast)
    expect(wrapper.text()).toContain('Akhir bulan ini')
    expect(wrapper.text()).toContain('~Rp4,5jt')
    expect(wrapper.text()).toContain('dari budget Rp3jt')
    // over budget reads as a warning
    expect(wrapper.get('[data-current-total]').classes()).toContain('text-danger')
  })

  it('stays neutral when this month is within budget', () => {
    const wrapper = mountCard({
      ...forecast,
      current_month: { ...forecast.current_month!, projected_total: 2_000_000 },
    })
    expect(wrapper.get('[data-current-total]').classes()).not.toContain('text-danger')
  })

  it('shows next month as a range', () => {
    expect(mountCard(forecast).text()).toContain('Rp5,8jt–Rp6,9jt')
  })

  it('shows a single amount when the range has collapsed', () => {
    const text = mountCard({
      ...forecast,
      projected_low: 4_000_000,
      projected_high: 4_000_000,
      projected_total: 4_000_000,
    }).text()
    expect(text).toContain('Rp4jt')
    expect(text).not.toContain('–')
  })

  it('says there is not enough data yet', () => {
    const text = mountCard({
      ...forecast,
      projected_total: 0,
      projected_low: 0,
      projected_high: 0,
      confidence: 0,
      months_with_data: 0,
    }).text()
    expect(text).toContain('Belum cukup data')
  })
})
