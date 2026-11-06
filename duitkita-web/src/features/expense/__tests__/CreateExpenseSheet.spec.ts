import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import type { Account } from '@/features/account/types'

const activeAccounts = ref<Account[]>([])
vi.mock('@/features/account/composables/useAccounts', () => ({
  useAccounts: () => ({ activeAccounts, reload: vi.fn<() => Promise<void>>() }),
}))
vi.mock('../api/expense.api', () => ({ createExpense: vi.fn<() => Promise<unknown>>() }))

const { default: CreateExpenseSheet } = await import('../components/CreateExpenseSheet.vue')

function account(id: string): Account {
  return {
    id,
    name: id.toUpperCase(),
    // cash renders a wallet icon, so the chip's text is just the name
    institution: { id: 'i', code: id, name: id, type: 'cash', logo_path: null },
    opening_balance: null,
    opening_balance_date: null,
    balance: null,
    archived: false,
    archived_at: null,
    created_at: '2026-10-01T00:00:00Z',
  }
}

const category = { category_id: 'cat-1', name: 'Makan', spent: 0, budget: 100, budgetId: 'b-1' }

function mountSheet() {
  return mount(CreateExpenseSheet, {
    props: { open: false, categories: [category] },
    global: { stubs: { teleport: true } },
  })
}

function pressed(wrapper: ReturnType<typeof mountSheet>) {
  return wrapper
    .findAll('[role="group"] button')
    .filter((b) => b.attributes('aria-pressed') === 'true')
    .map((b) => b.text())
}

describe('CreateExpenseSheet account default', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().user = { id: 'user-a' } as never
    localStorage.clear()
    localStorage.setItem('duitkita:last-account:user-a', 'bca')
    activeAccounts.value = [account('bca'), account('gopay')]
  })

  it('keeps an explicit "Tanpa akun" when the account list reloads', async () => {
    const wrapper = mountSheet()
    await wrapper.setProps({ open: true })
    expect(pressed(wrapper)).toEqual(['BCA'])

    const none = wrapper.findAll('[role="group"] button').find((b) => b.text() === 'Tanpa akun')
    await none!.trigger('click')
    expect(pressed(wrapper)).toEqual(['Tanpa akun'])

    // e.g. a balance changed elsewhere and useAccounts reloaded
    activeAccounts.value = [account('bca'), account('gopay')]
    await nextTick()

    expect(pressed(wrapper)).toEqual(['Tanpa akun'])
  })

  it('drops a picked account that stopped being active while open', async () => {
    const wrapper = mountSheet()
    await wrapper.setProps({ open: true })
    const gopay = wrapper.findAll('[role="group"] button').find((b) => b.text() === 'GOPAY')
    await gopay!.trigger('click')

    // archived from the accounts sheet while this form is still open
    activeAccounts.value = [account('bca')]
    await nextTick()

    expect(pressed(wrapper)).toEqual(['Tanpa akun'])
  })

  it('applies the remembered account when accounts arrive after opening', async () => {
    activeAccounts.value = []
    const wrapper = mountSheet()
    await wrapper.setProps({ open: true })

    activeAccounts.value = [account('bca'), account('gopay')]
    await nextTick()

    expect(pressed(wrapper)).toEqual(['BCA'])
  })
})
