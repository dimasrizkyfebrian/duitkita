import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { useToast } from '@/shared/composables/useToast'
import type { Account } from '@/features/account/types'
import type { Income } from '../types'

const activeAccounts = ref<Account[]>([])
const reloadAccounts = vi.fn<() => Promise<void>>()
const reloadIncomes = vi.fn<() => Promise<void>>()
vi.mock('@/features/account/composables/useAccounts', () => ({
  useAccounts: () => ({ activeAccounts, reload: reloadAccounts }),
}))
vi.mock('../composables/useIncomes', () => ({
  useIncomes: () => ({ reload: reloadIncomes }),
}))
vi.mock('../api/income.api', () => ({ createIncome: vi.fn<(p: unknown) => Promise<unknown>>() }))

const { createIncome } = await import('../api/income.api')
const { default: IncomeForm } = await import('../components/IncomeForm.vue')

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

const created: Income = {
  id: 'inc-1',
  source: 'salary',
  amount: 1,
  income_date: '2026-11-08',
  account_id: null,
  account: null,
  created_at: '2026-11-08T00:00:00Z',
}

function localToday() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function mountForm() {
  return mount(IncomeForm, { global: { stubs: { teleport: true } } })
}
type Wrapper = ReturnType<typeof mountForm>

function fieldByLabel(wrapper: Wrapper, label: string) {
  const el = wrapper.findAll('label').find((l) => l.text() === label)
  return wrapper.get(`#${el!.attributes('for')}`)
}

const accountField = (wrapper: Wrapper) => fieldByLabel(wrapper, 'Ke akun')
const pressedAccount = (wrapper: Wrapper) => [accountField(wrapper).text()]

async function pick(wrapper: Wrapper, optionLabel: string) {
  await accountField(wrapper).trigger('click')
  const option = wrapper.findAll('[role="option"]').find((o) => o.text() === optionLabel)
  await option!.trigger('click')
}

async function typeAmount(wrapper: Wrapper, value: string) {
  await fieldByLabel(wrapper, 'Besaran pemasukan').setValue(value)
}

const submitButton = (wrapper: Wrapper) =>
  wrapper.findAll('button').find((b) => b.text() === 'Catat pemasukan')!

function lastToast() {
  const items = useToast().items.value
  return items[items.length - 1]
}

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
  activeAccounts.value = []
  vi.mocked(createIncome).mockReset()
  reloadAccounts.mockReset()
  reloadIncomes.mockReset()
})

describe('IncomeForm fields', () => {
  it('disables the submit button until the amount is above zero', async () => {
    const wrapper = mountForm()
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()

    await typeAmount(wrapper, '0')
    expect(submitButton(wrapper).attributes('disabled')).toBeDefined()

    await typeAmount(wrapper, '5000000')
    expect(submitButton(wrapper).attributes('disabled')).toBeUndefined()
  })

  it('offers the six sources as pressable chips with salary pressed by default', () => {
    const wrapper = mountForm()
    const group = wrapper.get('[role="group"]')
    const chips = group.findAll('button')

    expect(chips.map((c) => c.text())).toEqual([
      'Gaji',
      'Bonus',
      'Freelance',
      'Hadiah',
      'Investasi',
      'Lainnya',
    ])
    expect(chips.map((c) => c.attributes('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
      'false',
      'false',
      'false',
    ])
  })

  it('caps the date at today and shows the note placeholder', () => {
    const wrapper = mountForm()

    const date = fieldByLabel(wrapper, 'Tanggal')
    expect(date.attributes('type')).toBe('date')
    expect(date.attributes('max')).toBe(localToday())
    expect((date.element as HTMLInputElement).value).toBe(localToday())
    expect(fieldByLabel(wrapper, 'Catatan').attributes('placeholder')).toBe(
      'Misalnya: gaji Oktober',
    )
  })
})

describe('IncomeForm submit', () => {
  it('records a salary income with no account and no note by default', async () => {
    vi.mocked(createIncome).mockResolvedValue(created)
    const wrapper = mountForm()

    await typeAmount(wrapper, '5000000')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(createIncome).toHaveBeenCalledWith({
      source: 'salary',
      amount: 5000000,
      income_date: localToday(),
      account_id: undefined,
      note: undefined,
    })
    expect(reloadIncomes).toHaveBeenCalledTimes(1)
    expect(reloadAccounts).not.toHaveBeenCalled()
    expect(wrapper.emitted('created')).toHaveLength(1)
    expect(lastToast()).toMatchObject({ type: 'success', message: 'Pemasukan udah dicatat.' })
  })

  it('sends the chosen source, account and note, and refreshes the accounts', async () => {
    vi.mocked(createIncome).mockResolvedValue(created)
    useAuthStore().user = { id: 'user-a' } as never
    activeAccounts.value = [account('bca'), account('gopay')]
    const wrapper = mountForm()

    await typeAmount(wrapper, '750000')
    await wrapper
      .get('[role="group"]')
      .findAll('button')
      .find((b) => b.text() === 'Freelance')!
      .trigger('click')
    await pick(wrapper, 'GOPAY')
    await fieldByLabel(wrapper, 'Catatan').setValue('proyek landing page')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(createIncome).toHaveBeenCalledWith({
      source: 'freelance',
      amount: 750000,
      income_date: localToday(),
      account_id: 'gopay',
      note: 'proyek landing page',
    })
    expect(reloadIncomes).toHaveBeenCalledTimes(1)
    expect(reloadAccounts).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('created')).toHaveLength(1)
    expect(localStorage.getItem('duitkita:last-account:income:user-a')).toBe('gopay')
    expect(localStorage.getItem('duitkita:last-account:user-a')).toBeNull()
  })

  it('shows an error toast and does not emit created when saving fails', async () => {
    vi.mocked(createIncome).mockRejectedValue(new Error('boom'))
    const wrapper = mountForm()

    await typeAmount(wrapper, '5000000')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(lastToast()).toMatchObject({ type: 'error', message: 'Gagal nyatat pemasukan.' })
    expect(wrapper.emitted('created')).toBeUndefined()
    expect(reloadIncomes).not.toHaveBeenCalled()
  })
})

describe('IncomeForm account default', () => {
  beforeEach(() => {
    useAuthStore().user = { id: 'user-a' } as never
    activeAccounts.value = [account('bca'), account('gopay')]
  })

  it('pre-selects the last account used for income, not the one used for expenses', () => {
    localStorage.setItem('duitkita:last-account:user-a', 'bca')
    localStorage.setItem('duitkita:last-account:income:user-a', 'gopay')

    expect(pressedAccount(mountForm())).toEqual(['GOPAY'])
  })

  it('ignores the expense account when no income account was ever remembered', () => {
    localStorage.setItem('duitkita:last-account:user-a', 'bca')

    expect(pressedAccount(mountForm())).toEqual(['Tanpa akun'])
  })

  it('falls back to "Tanpa akun" when the remembered account is archived or gone', () => {
    localStorage.setItem('duitkita:last-account:income:user-a', 'dana')

    expect(pressedAccount(mountForm())).toEqual(['Tanpa akun'])
  })

  it('keeps an explicit "Tanpa akun" when the account list reloads', async () => {
    localStorage.setItem('duitkita:last-account:income:user-a', 'bca')
    const wrapper = mountForm()
    expect(pressedAccount(wrapper)).toEqual(['BCA'])

    await pick(wrapper, 'Tanpa akun')
    activeAccounts.value = [account('bca'), account('gopay')]
    await nextTick()

    expect(pressedAccount(wrapper)).toEqual(['Tanpa akun'])
  })

  it('drops a picked account that stopped being active while mounted', async () => {
    const wrapper = mountForm()
    await pick(wrapper, 'GOPAY')
    expect(pressedAccount(wrapper)).toEqual(['GOPAY'])

    activeAccounts.value = [account('bca')]
    await nextTick()

    expect(pressedAccount(wrapper)).toEqual(['Tanpa akun'])
  })

  it('applies the remembered account when accounts arrive after mounting', async () => {
    localStorage.setItem('duitkita:last-account:income:user-a', 'bca')
    activeAccounts.value = []
    const wrapper = mountForm()

    activeAccounts.value = [account('bca'), account('gopay')]
    await nextTick()

    expect(pressedAccount(wrapper)).toEqual(['BCA'])
  })
})
