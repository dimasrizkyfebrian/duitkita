import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { Account, BalanceAdjustment } from '../types'
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
const adjustment: BalanceAdjustment = {
  id: 'adj-1',
  account_id: 'ovo',
  previous_balance: 500_000,
  new_balance: 30_000_000,
  delta: 29_500_000,
  note: 'Gajian',
  created_at: '2026-11-05T10:00:00Z',
}

vi.mock('../composables/useAccounts', () => ({
  useAccounts: () => ({ accounts: ref([ovo]), reload: vi.fn<() => Promise<void>>() }),
}))
vi.mock('../api/account.api', () => ({
  listBalanceAdjustments: vi.fn<() => Promise<BalanceAdjustment[]>>(async () => [adjustment]),
  archiveAccount: vi.fn<() => Promise<void>>(),
  unarchiveAccount: vi.fn<() => Promise<void>>(),
}))

const { default: AccountDetailSheet } = await import('../components/AccountDetailSheet.vue')

async function openSheet() {
  const wrapper = mount(AccountDetailSheet, {
    props: { open: false, accountId: 'ovo' },
    global: { stubs: { teleport: true, AccountFormSheet: true, AdjustBalanceSheet: true } },
  })
  await wrapper.setProps({ open: true })
  await flushPromises()
  return wrapper
}

describe('AccountDetailSheet balances', () => {
  beforeEach(() => resetBalanceVisibilityForTests())

  it('hides the balance, the opening balance and the adjustment amounts', async () => {
    const text = (await openSheet()).text()
    for (const amount of ['30.000.000', '500.000', '29.500.000']) {
      expect(text).not.toContain(amount)
    }
    expect(text).toContain(MASKED_BALANCE)
    expect(text).toContain('Gajian')
  })

  it('shows them once the shared eye is open', async () => {
    useBalanceVisibility().toggle()
    const text = (await openSheet()).text()
    expect(text).toContain('30.000.000')
    expect(text).toContain('500.000')
    expect(text).toContain('29.500.000')
  })
})
