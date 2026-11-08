import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { MASKED_BALANCE } from '@/features/account/utils/balance'
import { resetBalanceVisibilityForTests } from '@/features/account/composables/useBalanceVisibility'
import type { Income } from '../types'

const total = ref(0)
const items = ref<Income[]>([])
const loading = ref(false)
vi.mock('../composables/useIncomes', () => ({
  // `total` is the rupiah sum of ALL the month's incomes; `items` is only the
  // first page, so the two are deliberately independent here.
  useIncomes: () => ({
    items,
    total,
    loading,
    reload: vi.fn<() => Promise<void>>(),
  }),
}))

const { default: IncomeSummaryCard } = await import('../components/IncomeSummaryCard.vue')

function income(id: string, amount: number): Income {
  return {
    id,
    source: 'salary',
    amount,
    income_date: '2026-11-01',
    account_id: null,
    account: null,
    created_at: '2026-11-01T00:00:00Z',
  }
}

function mountCard() {
  return mount(IncomeSummaryCard, {
    global: {
      stubs: {
        IncomeListSheet: { name: 'IncomeListSheet', props: ['open'], template: '<i />' },
      },
    },
  })
}

const sheetOpen = (w: ReturnType<typeof mountCard>) =>
  w.findComponent({ name: 'IncomeListSheet' }).props('open')

describe('IncomeSummaryCard', () => {
  beforeEach(() => {
    resetBalanceVisibilityForTests()
    loading.value = false
    // Only the first page of items is loaded (sum 300_000); the API's total
    // covers the whole month.
    items.value = [income('a', 200_000), income('b', 100_000)]
    total.value = 1_250_000
  })

  it('is labelled "Pemasukan bulan ini" and hides the total when the app opens', () => {
    const wrapper = mountCard()
    expect(wrapper.text()).toContain('Pemasukan bulan ini')
    expect(wrapper.text()).toContain(MASKED_BALANCE)
    expect(wrapper.text()).not.toContain('1.250.000')
  })

  it('reveals the whole-month total, not the sum of the loaded items, with its own eye button', async () => {
    const wrapper = mountCard()

    await wrapper.get('button[aria-label="Tampilkan saldo"]').trigger('click')
    expect(wrapper.text()).toContain('1.250.000')
    expect(wrapper.text()).not.toContain('300.000')
    expect(sheetOpen(wrapper)).toBe(false)

    await wrapper.get('button[aria-label="Sembunyikan saldo"]').trigger('click')
    expect(wrapper.text()).toContain(MASKED_BALANCE)
  })

  it('opens the income list from the card', async () => {
    const wrapper = mountCard()
    expect(sheetOpen(wrapper)).toBe(false)
    await wrapper.get('button[aria-label="Buka pemasukan bulan ini"]').trigger('click')
    expect(sheetOpen(wrapper)).toBe(true)
  })

  it('invites recording income and shows no eye button when there is none this month', () => {
    items.value = []
    total.value = 0
    const wrapper = mountCard()
    expect(wrapper.text()).toContain('Catat gaji atau pemasukan lain')
    expect(wrapper.find('button[aria-label="Tampilkan saldo"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain(MASKED_BALANCE)
  })

  it('shows a skeleton instead of the empty copy while the first load runs', () => {
    items.value = []
    total.value = 0
    loading.value = true
    const wrapper = mountCard()
    expect(wrapper.find('.animate-pulse').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Catat gaji')
  })
})
