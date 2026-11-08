import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { ref } from 'vue'
import type { Account } from '@/features/account/types'
import type { CategoryOverviewItem } from '@/features/dashboard/types'
import type { Expense } from '../types'

const activeAccounts = ref<Account[]>([])
vi.mock('@/features/account/composables/useAccounts', () => ({
  useAccounts: () => ({ activeAccounts, reload: vi.fn<() => Promise<void>>() }),
}))

const updateExpense = vi.fn<(id: string, body: Record<string, unknown>) => Promise<unknown>>()
vi.mock('../api/expense.api', () => ({
  updateExpense: (id: string, body: Record<string, unknown>) => updateExpense(id, body),
  deleteExpense: vi.fn<() => Promise<unknown>>(),
}))

const { default: EditExpenseSheet } = await import('../components/EditExpenseSheet.vue')

const budgeted = [
  { category_id: 'cat-1', name: 'Makan', icon: '🍜', spent: 0, budget: 100, budgetId: 'b-1' },
  { category_id: 'cat-2', name: 'Transport', spent: 0, budget: 100, budgetId: 'b-2' },
]
// A category with no budget this month: known to the dashboard, not pickable.
const unbudgeted = { category_id: 'cat-9', name: 'Hobi', icon: '🎮', spent: 0, budget: 0 }

function expenseIn(categoryId: string): Expense {
  return {
    id: 'exp-1',
    category_id: categoryId,
    monthly_budget_id: 'b-old',
    amount: 25000,
    note: 'catatan',
    expense_date: '2026-10-30T00:00:00Z',
    created_at: '2026-10-30T00:00:00Z',
  }
}

async function mountSheet(categoryId: string, lookupCategories?: CategoryOverviewItem[]) {
  const wrapper = mount(EditExpenseSheet, {
    props: {
      open: false,
      expense: expenseIn(categoryId),
      categories: budgeted,
      ...(lookupCategories ? { lookupCategories } : {}),
    },
    global: { stubs: { teleport: true } },
  })
  await wrapper.setProps({ open: true })
  return wrapper
}

function categoryField(wrapper: Awaited<ReturnType<typeof mountSheet>>) {
  const label = wrapper.findAll('label').find((l) => l.text() === 'Kategori')
  return wrapper.get(`#${label!.attributes('for')}`)
}

function optionTexts(wrapper: Awaited<ReturnType<typeof mountSheet>>) {
  return wrapper.findAll('[role="option"]').map((o) => o.text())
}

describe('EditExpenseSheet category field', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    activeAccounts.value = []
    updateExpense.mockReset()
    updateExpense.mockResolvedValue({})
  })

  it('shows the expense category when it is budgeted', async () => {
    const wrapper = await mountSheet('cat-1')
    expect(categoryField(wrapper).text()).toContain('🍜')
    expect(categoryField(wrapper).text()).toContain('Makan')
  })

  it('shows the real name and icon of an unbudgeted category it can resolve', async () => {
    const wrapper = await mountSheet('cat-9', [...budgeted, unbudgeted])
    expect(categoryField(wrapper).text()).toContain('🎮')
    expect(categoryField(wrapper).text()).toContain('Hobi')
  })

  it('keeps the unbudgeted current category as an option next to the budgeted ones only', async () => {
    const wrapper = await mountSheet('cat-9', [
      ...budgeted,
      unbudgeted,
      { category_id: 'cat-8', name: 'Lain', spent: 0, budget: 0 },
    ])
    await categoryField(wrapper).trigger('click')
    const texts = optionTexts(wrapper)
    expect(texts).toHaveLength(3)
    expect(texts.join('|')).toContain('Hobi')
    // other unbudgeted categories are not offered: the backend would reject them
    expect(texts.join('|')).not.toContain('Lain')
  })

  it('shows a placeholder, never a blank field, when the category cannot be resolved', async () => {
    const wrapper = await mountSheet('cat-gone')
    expect(categoryField(wrapper).text()).toBe('Kategori sebelumnya')
  })

  it('still submits the original category id when it is not budgeted', async () => {
    const wrapper = await mountSheet('cat-9', [...budgeted, unbudgeted])
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(updateExpense).toHaveBeenCalledTimes(1)
    expect(updateExpense.mock.calls[0]?.[1]).toMatchObject({ category_id: 'cat-9' })
  })

  it('still submits the original category id when it cannot be resolved', async () => {
    const wrapper = await mountSheet('cat-gone')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(updateExpense.mock.calls[0]?.[1]).toMatchObject({ category_id: 'cat-gone' })
  })
})
