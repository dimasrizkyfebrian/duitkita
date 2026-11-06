import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mount } from '@vue/test-utils'
import type { Account } from '../types'
import { MASKED_BALANCE } from '../utils/balance'
import { resetBalanceVisibilityForTests } from '../composables/useBalanceVisibility'

const activeAccounts = ref<Account[]>([])
const totalBalance = ref(0)
vi.mock('../composables/useAccounts', () => ({
  useAccounts: () => ({
    activeAccounts,
    totalBalance,
    hasAnyBalance: computed(() => activeAccounts.value.some((a) => a.balance !== null)),
    loading: ref(false),
  }),
}))

const { default: AccountsSummaryCard } = await import('../components/AccountsSummaryCard.vue')

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

function mountCard() {
  return mount(AccountsSummaryCard, {
    global: {
      stubs: {
        ManageAccountsSheet: { name: 'ManageAccountsSheet', props: ['open'], template: '<i />' },
      },
    },
  })
}

const sheetOpen = (w: ReturnType<typeof mountCard>) =>
  w.findComponent({ name: 'ManageAccountsSheet' }).props('open')

describe('AccountsSummaryCard', () => {
  beforeEach(() => {
    resetBalanceVisibilityForTests()
    activeAccounts.value = [account('bca', 10_000_000)]
    totalBalance.value = 10_000_000
  })

  it('hides the total when the app opens', () => {
    const wrapper = mountCard()
    expect(wrapper.text()).toContain(MASKED_BALANCE)
    expect(wrapper.text()).not.toContain('10.000.000')
  })

  it('reveals and hides the total with the eye button, without opening the sheet', async () => {
    const wrapper = mountCard()
    const eye = wrapper.get('button[aria-label="Tampilkan saldo"]')

    await eye.trigger('click')
    expect(wrapper.text()).toContain('10.000.000')
    expect(sheetOpen(wrapper)).toBe(false)

    await wrapper.get('button[aria-label="Sembunyikan saldo"]').trigger('click')
    expect(wrapper.text()).toContain(MASKED_BALANCE)
  })

  it('still opens the accounts sheet from the card', async () => {
    const wrapper = mountCard()
    await wrapper.get('button[aria-label="Buka akun saya"]').trigger('click')
    expect(sheetOpen(wrapper)).toBe(true)
  })

  it('shows no eye button when no account has a balance', () => {
    activeAccounts.value = [account('bca', null)]
    totalBalance.value = 0
    const wrapper = mountCard()
    expect(wrapper.find('button[aria-label="Tampilkan saldo"]').exists()).toBe(false)
  })
})
