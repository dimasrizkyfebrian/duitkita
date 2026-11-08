import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import type { AccountTransaction } from '../types'
import { MASKED_BALANCE } from '../utils/balance'
import {
  resetBalanceVisibilityForTests,
  useBalanceVisibility,
} from '../composables/useBalanceVisibility'
import AccountTransactionList from '../components/AccountTransactionList.vue'

// formatRupiah separates "Rp" from the number with a non-breaking space.
const nbsp = (text: string) => text.replace(/ /g, ' ')

function tx(overrides: Partial<AccountTransaction> & Pick<AccountTransaction, 'id'>) {
  return {
    kind: 'expense',
    date: '2026-11-05',
    amount: -25_000,
    label: 'Makanan',
    before_opening: false,
    ...overrides,
  } as AccountTransaction
}

const items: AccountTransaction[] = [
  tx({ id: 'e1', kind: 'expense', amount: -25_000, label: 'Makanan', note: 'Bakso' }),
  tx({ id: 'i1', kind: 'income', amount: 5_000_000, label: 'salary' }),
  tx({ id: 'a1', kind: 'adjustment', amount: -10_000, label: '', note: 'Selisih admin' }),
  tx({ id: 'e2', kind: 'expense', amount: -9_000, label: 'Transport', before_opening: true }),
]

function mountList(props: Partial<{ hasMore: boolean; loadingMore: boolean }> = {}) {
  return mount(AccountTransactionList, {
    props: { items, hasMore: false, loadingMore: false, ...props },
  })
}

function rowOf(wrapper: ReturnType<typeof mountList>, id: string) {
  return wrapper.get(`[data-testid="tx-${id}"]`)
}

describe('AccountTransactionList', () => {
  beforeEach(() => {
    resetBalanceVisibilityForTests()
    useBalanceVisibility().toggle() // visible
  })

  it('labels each kind: category, income source, adjustment', () => {
    const wrapper = mountList()
    expect(rowOf(wrapper, 'e1').text()).toContain('Makanan')
    expect(rowOf(wrapper, 'e1').text()).toContain('Bakso')
    expect(rowOf(wrapper, 'i1').text()).toContain('Gaji')
    expect(rowOf(wrapper, 'i1').text()).not.toContain('salary')
    expect(rowOf(wrapper, 'a1').text()).toContain('Penyesuaian saldo')
    expect(rowOf(wrapper, 'a1').text()).toContain('Selisih admin')
  })

  it('shows the date as written, with no timezone shift', () => {
    const wrapper = mountList()
    expect(rowOf(wrapper, 'e1').text()).toContain('5 Nov 2026')
  })

  it('signs amounts: positive green with +, negative ink with a true minus', () => {
    const wrapper = mountList()
    const income = rowOf(wrapper, 'i1').get('[data-testid="tx-amount"]')
    expect(nbsp(income.text())).toBe('+Rp 5.000.000')
    expect(income.classes()).toContain('text-success')

    const expense = rowOf(wrapper, 'e1').get('[data-testid="tx-amount"]')
    expect(nbsp(expense.text())).toBe('−Rp 25.000')
    expect(expense.classes()).toContain('text-ink')
    expect(expense.classes()).not.toContain('text-success')
    expect(expense.classes()).not.toContain('text-danger')
  })

  it('dims rows before the opening balance and tags them', () => {
    const wrapper = mountList()
    const before = rowOf(wrapper, 'e2')
    expect(before.classes()).toContain('opacity-50')
    expect(before.text()).toContain('sebelum saldo awal')

    const normal = rowOf(wrapper, 'e1')
    expect(normal.classes()).not.toContain('opacity-50')
    expect(normal.text()).not.toContain('sebelum saldo awal')
  })

  it('masks every amount while balances are hidden', () => {
    useBalanceVisibility().toggle() // hidden again
    const wrapper = mountList()
    const text = wrapper.text()
    for (const amount of ['5.000.000', '25.000', '10.000', '9.000']) {
      expect(text).not.toContain(amount)
    }
    expect(wrapper.findAll('[data-testid="tx-amount"]').map((a) => a.text())).toEqual(
      items.map(() => MASKED_BALANCE),
    )
  })

  it('is read-only: the only button is "Muat lagi", and rows do nothing', async () => {
    const none = mountList()
    expect(none.findAll('button')).toHaveLength(0)

    const wrapper = mountList({ hasMore: true })
    const buttons = wrapper.findAll('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]!.text()).toBe('Muat lagi')

    for (const li of wrapper.findAll('li')) await li.trigger('click')
    expect(Object.keys(wrapper.emitted())).not.toContain('select')
    expect(wrapper.emitted('more')).toBeUndefined()
  })

  it('shows "Muat lagi" only when there is more, and emits more', async () => {
    expect(mountList({ hasMore: false }).text()).not.toContain('Muat lagi')

    const wrapper = mountList({ hasMore: true })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('more')).toHaveLength(1)
  })

  it('disables the button while the next page loads', () => {
    const wrapper = mountList({ hasMore: true, loadingMore: true })
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
  })
})
