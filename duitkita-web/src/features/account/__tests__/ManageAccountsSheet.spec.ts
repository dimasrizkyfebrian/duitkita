import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { Account } from '../types'
import { MASKED_BALANCE } from '../utils/balance'
import {
  resetBalanceVisibilityForTests,
  useBalanceVisibility,
} from '../composables/useBalanceVisibility'

const accounts = ref<Account[]>([])
vi.mock('../composables/useAccounts', () => ({
  useAccounts: () => ({
    activeAccounts: computed(() => accounts.value),
    archivedAccounts: computed(() => []),
    totalBalance: ref(10_200_000),
    hasAnyBalance: computed(() => true),
    loading: ref(false),
    reload: vi.fn<() => Promise<void>>(),
  }),
}))

const { default: ManageAccountsSheet } = await import('../components/ManageAccountsSheet.vue')

function account(id: string, balance: number | null): Account {
  return {
    id,
    name: id,
    institution: { id: 'i', code: id, name: id, type: 'bank', logo_path: null },
    opening_balance: balance,
    opening_balance_date: balance === null ? null : '2026-10-01',
    balance,
    archived: false,
    archived_at: null,
    created_at: '2026-10-01T00:00:00Z',
  }
}

function mountSheet() {
  return mount(ManageAccountsSheet, {
    props: { open: true },
    global: { stubs: { teleport: true, AccountFormSheet: true, AccountDetailSheet: true } },
  })
}

describe('ManageAccountsSheet balances', () => {
  beforeEach(() => {
    resetBalanceVisibilityForTests()
    accounts.value = [account('bca', 10_000_000), account('ovo', 200_000), account('tunai', null)]
  })

  it('hides the total and every account balance while balances are hidden', () => {
    const text = mountSheet().text()
    expect(text).not.toContain('10.200.000')
    expect(text).not.toContain('10.000.000')
    expect(text).not.toContain('200.000')
    // the total plus two accounts with a balance
    expect(text.split(MASKED_BALANCE)).toHaveLength(4)
    expect(text).toContain('Saldo belum diisi')
  })

  it('follows the same switch as the home card', async () => {
    const wrapper = mountSheet()
    useBalanceVisibility().toggle()
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('10.200.000')
    expect(wrapper.text()).toContain('200.000')
    expect(wrapper.find('button[aria-label="Sembunyikan saldo"]').exists()).toBe(true)
  })
})
