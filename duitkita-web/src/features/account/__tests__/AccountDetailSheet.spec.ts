import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { Account, AccountTransaction, AccountTransactionPage } from '../types'
import { MASKED_BALANCE } from '../utils/balance'
import {
  resetBalanceVisibilityForTests,
  useBalanceVisibility,
} from '../composables/useBalanceVisibility'

const ovo: Account = {
  id: 'ovo',
  name: 'OVO',
  institution: { id: 'i', code: 'ovo', name: 'OVO', type: 'ewallet', logo_path: null },
  opening_balance: 500_000,
  opening_balance_date: '2026-11-05',
  balance: 30_000_000,
  archived: false,
  archived_at: null,
  created_at: '2026-11-05T00:00:00Z',
}
const noOpening: Account = {
  ...ovo,
  id: 'tunai',
  name: 'Tunai',
  opening_balance: null,
  opening_balance_date: null,
  balance: null,
}

function tx(overrides: Partial<AccountTransaction> & Pick<AccountTransaction, 'id'>) {
  return {
    kind: 'expense',
    date: '2026-11-06',
    amount: -25_000,
    label: 'Makanan',
    before_opening: false,
    ...overrides,
  } as AccountTransaction
}

const page1: AccountTransactionPage = {
  items: [
    tx({ id: 'a1', kind: 'adjustment', amount: 29_500_000, label: '', note: 'Gajian' }),
    tx({ id: 'e1', label: 'Makanan', amount: -25_000 }),
  ],
  next_cursor: 'cur 1/+=',
}
const page2: AccountTransactionPage = {
  items: [tx({ id: 'i1', kind: 'income', label: 'bonus', amount: 1_250_000 })],
  next_cursor: null,
}

const accounts = ref<Account[]>([ovo])
const listAccountTransactions =
  vi.fn<(id: string, cursor?: string, limit?: number) => Promise<AccountTransactionPage>>()

vi.mock('../composables/useAccounts', () => ({
  useAccounts: () => ({ accounts, reload: vi.fn<() => Promise<void>>() }),
}))
vi.mock('../api/account.api', () => ({
  listAccountTransactions: (id: string, cursor?: string, limit?: number) =>
    listAccountTransactions(id, cursor, limit),
  archiveAccount: vi.fn<() => Promise<void>>(),
  unarchiveAccount: vi.fn<() => Promise<void>>(),
}))

const { default: AccountDetailSheet } = await import('../components/AccountDetailSheet.vue')

async function openSheet(accountId = 'ovo') {
  const wrapper = mount(AccountDetailSheet, {
    props: { open: false, accountId },
    global: { stubs: { teleport: true, AccountFormSheet: true, AdjustBalanceSheet: true } },
  })
  await wrapper.setProps({ open: true })
  await flushPromises()
  return wrapper
}

function loadMoreButton(wrapper: Awaited<ReturnType<typeof openSheet>>) {
  return wrapper.findAll('button').find((b) => b.text() === 'Muat lagi')
}

describe('AccountDetailSheet balances', () => {
  beforeEach(() => {
    resetBalanceVisibilityForTests()
    accounts.value = [ovo, noOpening]
    listAccountTransactions.mockReset()
    listAccountTransactions.mockImplementation(async (_id, cursor) =>
      cursor === undefined ? page1 : page2,
    )
  })

  it('hides the balance, the opening balance and the mutasi amounts', async () => {
    const text = (await openSheet()).text()
    for (const amount of ['30.000.000', '500.000', '29.500.000', '25.000']) {
      expect(text).not.toContain(amount)
    }
    expect(text).toContain(MASKED_BALANCE)
    expect(text).toContain('Gajian')
  })

  it('shows them once the shared eye is open', async () => {
    useBalanceVisibility().toggle()
    const text = (await openSheet()).text().replace(/ /g, ' ')
    expect(text).toContain('30.000.000')
    expect(text).toContain('500.000')
    expect(text).toContain('+Rp 29.500.000')
    expect(text).toContain('−Rp 25.000')
  })
})

describe('AccountDetailSheet mutasi', () => {
  beforeEach(() => {
    resetBalanceVisibilityForTests()
    accounts.value = [ovo, noOpening]
    listAccountTransactions.mockReset()
    listAccountTransactions.mockImplementation(async (_id, cursor) =>
      cursor === undefined ? page1 : page2,
    )
  })

  it('loads the first page of 20 when the sheet opens', async () => {
    const wrapper = await openSheet()
    expect(listAccountTransactions).toHaveBeenCalledTimes(1)
    expect(listAccountTransactions).toHaveBeenCalledWith('ovo', undefined, undefined)
    expect(wrapper.text()).toContain('Mutasi')
    expect(wrapper.text()).toContain('Penyesuaian saldo')
    expect(wrapper.text()).toContain('Makanan')
    expect(wrapper.text()).not.toContain('Riwayat penyesuaian')
  })

  it('"Muat lagi" appends the next page using next_cursor, then goes away', async () => {
    const wrapper = await openSheet()
    await loadMoreButton(wrapper)!.trigger('click')
    await flushPromises()

    expect(listAccountTransactions).toHaveBeenLastCalledWith('ovo', 'cur 1/+=', undefined)
    const text = wrapper.text()
    expect(text).toContain('Makanan')
    expect(text).toContain('Bonus')
    expect(wrapper.findAll('li')).toHaveLength(3)
    expect(loadMoreButton(wrapper)).toBeUndefined()
  })

  it('shows no "Muat lagi" when the first page is the last', async () => {
    listAccountTransactions.mockResolvedValue({ items: page2.items, next_cursor: null })
    expect(loadMoreButton(await openSheet())).toBeUndefined()
  })

  it('still shows mutasi for an account without an opening balance', async () => {
    listAccountTransactions.mockResolvedValue({
      items: [tx({ id: 'e9', label: 'Transport', before_opening: true })],
      next_cursor: null,
    })
    const wrapper = await openSheet('tunai')
    expect(listAccountTransactions).toHaveBeenCalledWith('tunai', undefined, undefined)
    expect(wrapper.text()).toContain('Saldo belum diisi')
    expect(wrapper.text()).toContain('Transport')
  })

  it('shows an empty state when there is no mutasi', async () => {
    listAccountTransactions.mockResolvedValue({ items: [], next_cursor: null })
    const wrapper = await openSheet()
    expect(wrapper.text()).toContain('Belum ada mutasi.')
  })

  it('reloads the first page (replacing, not appending) after a balance change', async () => {
    const wrapper = await openSheet()
    await loadMoreButton(wrapper)!.trigger('click')
    await flushPromises()
    expect(wrapper.findAll('li')).toHaveLength(3)

    wrapper.findComponent({ name: 'AdjustBalanceSheet' }).vm.$emit('saved')
    await flushPromises()

    expect(listAccountTransactions).toHaveBeenLastCalledWith('ovo', undefined, undefined)
    expect(wrapper.findAll('li')).toHaveLength(2)
    expect(loadMoreButton(wrapper)).toBeDefined()
  })
})
