import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import type { Account } from '@/features/account/types'

const activeAccounts = ref<Account[]>([])
vi.mock('@/features/account/composables/useAccounts', () => ({
  useAccounts: () => ({ activeAccounts, reload: vi.fn<() => Promise<void>>() }),
}))
vi.mock('@/features/income/composables/useIncomes', () => ({
  useIncomes: () => ({ reload: vi.fn<() => Promise<void>>() }),
}))
vi.mock('@/features/expense/api/expense.api', () => ({
  createExpense: vi.fn<() => Promise<unknown>>(),
}))
vi.mock('@/features/income/api/income.api', () => ({
  createIncome: vi.fn<() => Promise<unknown>>(),
}))

const { default: ExpenseForm } = await import('@/features/expense/components/ExpenseForm.vue')
const { default: IncomeForm } = await import('@/features/income/components/IncomeForm.vue')
const { default: CatatSheet } = await import('../components/CatatSheet.vue')

const category = { category_id: 'cat-1', name: 'Makan', spent: 0, budget: 100, budgetId: 'b-1' }

function mountSheet(open: boolean, stubForms = true) {
  return mount(CatatSheet, {
    props: { open, categories: [category] },
    global: {
      stubs: stubForms
        ? { teleport: true, ExpenseForm: true, IncomeForm: true }
        : { teleport: true },
    },
  })
}
type Wrapper = ReturnType<typeof mountSheet>

const tab = (wrapper: Wrapper, name: string) =>
  wrapper.findAll('[role="tab"]').find((t) => t.text() === name)!

// The wrapper element each form sits in; `v-show` toggles its display.
const panelOf = (wrapper: Wrapper, form: typeof ExpenseForm | typeof IncomeForm) =>
  wrapper.getComponent(form).element.closest('[role="tabpanel"]') as HTMLElement

describe('CatatSheet', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    activeAccounts.value = []
  })

  it('renders the forms when open', () => {
    const wrapper = mountSheet(true)

    expect(wrapper.text()).toContain('Catat pengeluaran')
    expect(wrapper.findComponent(ExpenseForm).exists()).toBe(true)
    expect(wrapper.findComponent(IncomeForm).exists()).toBe(true)
  })

  it('renders nothing while closed', () => {
    const wrapper = mountSheet(false)

    expect(wrapper.findComponent(ExpenseForm).exists()).toBe(false)
    expect(wrapper.findComponent(IncomeForm).exists()).toBe(false)
  })

  it('closes and re-emits created when the expense form reports a created expense', async () => {
    const wrapper = mountSheet(true)

    wrapper.findComponent(ExpenseForm).vm.$emit('created')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('created')).toHaveLength(1)
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })

  it('closes without re-emitting when the income form reports a created income', async () => {
    const wrapper = mountSheet(true)

    wrapper.findComponent(IncomeForm).vm.$emit('created')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('created')).toBeUndefined()
    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })
})

describe('CatatSheet tabs', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    activeAccounts.value = []
  })

  it('shows a Keluar | Masuk tab strip with Keluar selected by default', () => {
    const wrapper = mountSheet(true)

    expect(wrapper.find('[role="tablist"]').exists()).toBe(true)
    expect(wrapper.get('[role="tablist"]').attributes('aria-label')).toBe('Jenis catatan')
    expect(wrapper.findAll('[role="tab"]').map((t) => t.text())).toEqual(['Keluar', 'Masuk'])
    expect(tab(wrapper, 'Keluar').attributes('aria-selected')).toBe('true')
    expect(tab(wrapper, 'Masuk').attributes('aria-selected')).toBe('false')
    expect(panelOf(wrapper, ExpenseForm).style.display).not.toBe('none')
    expect(panelOf(wrapper, IncomeForm).style.display).toBe('none')
  })

  it('switches to the income form on Masuk and follows with the title', async () => {
    const wrapper = mountSheet(true)
    expect(wrapper.get('h2').text()).toBe('Catat pengeluaran')

    await tab(wrapper, 'Masuk').trigger('click')

    expect(tab(wrapper, 'Masuk').attributes('aria-selected')).toBe('true')
    expect(tab(wrapper, 'Keluar').attributes('aria-selected')).toBe('false')
    expect(panelOf(wrapper, IncomeForm).style.display).not.toBe('none')
    expect(panelOf(wrapper, ExpenseForm).style.display).toBe('none')
    expect(wrapper.get('h2').text()).toBe('Catat pemasukan')

    await tab(wrapper, 'Keluar').trigger('click')
    expect(wrapper.get('h2').text()).toBe('Catat pengeluaran')
  })

  it('keeps what was typed in the expense form while the Masuk tab is open', async () => {
    // Real Teleport on purpose: VTU's teleport stub re-creates the sheet's
    // content whenever the title changes, which would hide the very remount
    // this test is meant to catch.
    const wrapper = mount(CatatSheet, {
      props: { open: true, categories: [category] },
      attachTo: document.body,
    })
    try {
      const amountOf = () => {
        const label = [...document.body.querySelectorAll('label')].find(
          (l) => l.textContent?.trim() === 'Besaran pengeluaran',
        )!
        return document.getElementById(label.getAttribute('for')!) as HTMLInputElement
      }
      const tabNamed = (name: string) =>
        [...document.body.querySelectorAll<HTMLElement>('[role="tab"]')].find(
          (t) => t.textContent?.trim() === name,
        )!

      const typed = amountOf()
      typed.value = '45000'
      typed.dispatchEvent(new Event('input'))
      await nextTick()

      tabNamed('Masuk').click()
      await nextTick()
      expect(document.body.querySelector('h2')?.textContent).toBe('Catat pemasukan')
      tabNamed('Keluar').click()
      await nextTick()

      // Same element, same value: the form was hidden, never rebuilt.
      expect(amountOf()).toBe(typed)
      expect(amountOf().value).toBe('45000')
      expect(wrapper.findAllComponents(ExpenseForm)).toHaveLength(1)
    } finally {
      wrapper.unmount()
    }
  })

  it('goes back to Keluar every time the sheet is reopened', async () => {
    const wrapper = mountSheet(true)
    await tab(wrapper, 'Masuk').trigger('click')
    expect(wrapper.get('h2').text()).toBe('Catat pemasukan')

    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })

    expect(tab(wrapper, 'Keluar').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('h2').text()).toBe('Catat pengeluaran')
    expect(panelOf(wrapper, ExpenseForm).style.display).not.toBe('none')
    expect(panelOf(wrapper, IncomeForm).style.display).toBe('none')
  })
})
