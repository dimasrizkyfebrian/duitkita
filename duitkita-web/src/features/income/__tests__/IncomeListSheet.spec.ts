import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { mount } from '@vue/test-utils'
import { MASKED_BALANCE } from '@/features/account/utils/balance'
import { resetBalanceVisibilityForTests } from '@/features/account/composables/useBalanceVisibility'
import type { Income } from '../types'

const items = ref<Income[]>([])
vi.mock('../composables/useIncomes', () => ({
  useIncomes: () => ({
    items,
    total: ref(0),
    loading: ref(false),
    reload: vi.fn<() => Promise<void>>(),
  }),
}))
vi.mock('@/features/account/composables/useAccounts', () => ({
  useAccounts: () => ({
    // the live name wins over the one embedded in the income
    accountName: (id: string | null | undefined, fallback: string | undefined) =>
      id === 'acc-1' ? 'BCA Utama' : fallback,
  }),
}))

const { default: IncomeListSheet } = await import('../components/IncomeListSheet.vue')

function income(over: Partial<Income> & { id: string }): Income {
  return {
    source: 'salary',
    amount: 5_000_000,
    income_date: '2026-11-01',
    account_id: null,
    account: null,
    created_at: '2026-11-01T00:00:00Z',
    ...over,
  }
}

function mountSheet(open = true) {
  return mount(IncomeListSheet, {
    props: { open },
    global: {
      stubs: {
        teleport: true,
        EditIncomeSheet: { name: 'EditIncomeSheet', props: ['open', 'income'], template: '<i />' },
      },
    },
  })
}

const editSheet = (w: ReturnType<typeof mountSheet>) => w.findComponent({ name: 'EditIncomeSheet' })

describe('IncomeListSheet', () => {
  beforeEach(() => {
    resetBalanceVisibilityForTests()
    items.value = [
      income({
        id: 'i1',
        source: 'freelance',
        amount: 750_000,
        note: 'proyek landing page',
        income_date: '2026-11-03',
        account_id: 'acc-1',
        account: {
          id: 'acc-1',
          name: 'Nama Lama',
          archived: false,
          institution: { id: 'i', code: 'bca', name: 'BCA', type: 'bank', logo_path: null },
        },
      }),
      income({ id: 'i2', source: 'salary', amount: 5_000_000, income_date: '2026-11-01' }),
    ]
  })

  it('lists the Indonesian source label, note, live account name and short date', () => {
    const text = mountSheet().text()
    expect(text).toContain('Freelance')
    expect(text).toContain('proyek landing page')
    expect(text).toContain('BCA Utama')
    expect(text).not.toContain('Nama Lama')
    expect(text).toContain('Gaji')
    // parsed by its parts: 3 and 1 November, whatever the timezone
    expect(text).toContain('3 Nov · BCA Utama')
    expect(text).toContain('1 Nov')
  })

  it('masks the amounts while hidden and shows them as green "+Rp" once revealed', async () => {
    const wrapper = mountSheet()
    expect(wrapper.text()).toContain(MASKED_BALANCE)
    expect(wrapper.text()).not.toContain('750.000')

    await wrapper.get('button[aria-label="Tampilkan saldo"]').trigger('click')
    const amounts = wrapper.findAll('[data-income-amount]')
    expect(amounts.map((a) => a.text().replace(/\s/g, ' '))).toEqual([
      '+Rp 750.000',
      '+Rp 5.000.000',
    ])
    expect(amounts.every((a) => a.classes().includes('text-success'))).toBe(true)
  })

  it('sends the tapped income to the edit sheet and opens it', async () => {
    const wrapper = mountSheet()
    expect(editSheet(wrapper).props('open')).toBe(false)

    await wrapper.findAll('[data-income-row]')[1]!.trigger('click')

    expect(editSheet(wrapper).props('open')).toBe(true)
    expect(editSheet(wrapper).props('income')).toMatchObject({ id: 'i2' })
  })

  it('says so when there is no income this month', () => {
    items.value = []
    expect(mountSheet().text()).toContain('Belum ada pemasukan bulan ini.')
  })
})
