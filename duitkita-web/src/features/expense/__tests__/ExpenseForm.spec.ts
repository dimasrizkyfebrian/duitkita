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

const { default: ExpenseForm } = await import('../components/ExpenseForm.vue')

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

function mountForm() {
  return mount(ExpenseForm, {
    props: { categories: [category] },
    global: { stubs: { teleport: true } },
  })
}

// The account field is the button its "Dari akun" label points at.
function accountField(wrapper: ReturnType<typeof mountForm>) {
  const label = wrapper.findAll('label').find((l) => l.text() === 'Dari akun')
  return wrapper.get(`#${label!.attributes('for')}`)
}

// The account label currently shown in the field (as a one-item list so the
// assertions below read like they did for the old chips).
function pressed(wrapper: ReturnType<typeof mountForm>) {
  return [accountField(wrapper).text()]
}

// Opens the account sheet and taps the option with exactly this label.
async function pick(wrapper: ReturnType<typeof mountForm>, optionLabel: string) {
  await accountField(wrapper).trigger('click')
  const option = wrapper.findAll('[role="option"]').find((o) => o.text() === optionLabel)
  await option!.trigger('click')
}

describe('ExpenseForm category field', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    activeAccounts.value = []
  })

  it('selects the first category and shows its icon and name in the field', async () => {
    const wrapper = mount(ExpenseForm, {
      props: {
        categories: [
          { ...category, icon: '🍜' },
          { ...category, category_id: 'cat-2', name: 'Ojek' },
        ],
      },
      global: { stubs: { teleport: true } },
    })

    const label = wrapper.findAll('label').find((l) => l.text() === 'Kategori')
    const field = wrapper.get(`#${label!.attributes('for')}`)
    expect(field.text()).toContain('🍜')
    expect(field.text()).toContain('Makan')
  })
})

describe('ExpenseForm account default', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    useAuthStore().user = { id: 'user-a' } as never
    localStorage.clear()
    localStorage.setItem('duitkita:last-account:user-a', 'bca')
    activeAccounts.value = [account('bca'), account('gopay')]
  })

  it('keeps an explicit "Tanpa akun" when the account list reloads', async () => {
    const wrapper = mountForm()
    expect(pressed(wrapper)).toEqual(['BCA'])

    await pick(wrapper, 'Tanpa akun')
    expect(pressed(wrapper)).toEqual(['Tanpa akun'])

    // e.g. a balance changed elsewhere and useAccounts reloaded
    activeAccounts.value = [account('bca'), account('gopay')]
    await nextTick()

    expect(pressed(wrapper)).toEqual(['Tanpa akun'])
  })

  it('drops a picked account that stopped being active while mounted', async () => {
    const wrapper = mountForm()
    await pick(wrapper, 'GOPAY')
    expect(pressed(wrapper)).toEqual(['GOPAY'])

    // archived from the accounts sheet while this form is still mounted
    activeAccounts.value = [account('bca')]
    await nextTick()

    expect(pressed(wrapper)).toEqual(['Tanpa akun'])
  })

  it('applies the remembered account when accounts arrive after mounting', async () => {
    activeAccounts.value = []
    const wrapper = mountForm()

    activeAccounts.value = [account('bca'), account('gopay')]
    await nextTick()

    expect(pressed(wrapper)).toEqual(['BCA'])
  })
})
