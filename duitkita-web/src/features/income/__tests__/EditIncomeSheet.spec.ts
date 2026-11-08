import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useToast } from '@/shared/composables/useToast'
import type { Account, AccountSummary } from '@/features/account/types'
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
vi.mock('../api/income.api', () => ({
  updateIncome: vi.fn<(id: string, p: unknown) => Promise<unknown>>(),
  deleteIncome: vi.fn<(id: string) => Promise<void>>(),
}))

const { updateIncome, deleteIncome } = await import('../api/income.api')
const { default: EditIncomeSheet } = await import('../components/EditIncomeSheet.vue')

const institution = { id: 'i', code: 'x', name: 'x', type: 'cash' as const, logo_path: null }

function account(id: string): Account {
  return {
    id,
    name: id.toUpperCase(),
    institution,
    opening_balance: null,
    opening_balance_date: null,
    balance: null,
    archived: false,
    archived_at: null,
    created_at: '2026-10-01T00:00:00Z',
  }
}

function summary(id: string, archived = false): AccountSummary {
  return { id, name: id.toUpperCase(), archived, institution }
}

const bonus: Income = {
  id: 'inc-1',
  source: 'bonus',
  amount: 2_500_000,
  note: 'bonus Q3',
  income_date: '2026-11-03',
  account_id: 'bca',
  account: summary('bca'),
  created_at: '2026-11-03T00:00:00Z',
}

async function mountSheet(income: Income | null = bonus) {
  const wrapper = mount(EditIncomeSheet, {
    props: { open: false, income },
    global: { stubs: { teleport: true } },
  })
  await wrapper.setProps({ open: true })
  return wrapper
}
type Wrapper = Awaited<ReturnType<typeof mountSheet>>

function fieldByLabel(wrapper: Wrapper, label: string) {
  const el = wrapper.findAll('label').find((l) => l.text() === label)
  return wrapper.get(`#${el!.attributes('for')}`)
}
const accountField = (wrapper: Wrapper) => fieldByLabel(wrapper, 'Ke akun')

async function pick(wrapper: Wrapper, optionLabel: string) {
  await accountField(wrapper).trigger('click')
  const option = wrapper.findAll('[role="option"]').find((o) => o.text() === optionLabel)
  await option!.trigger('click')
}

const button = (wrapper: Wrapper, text: string) =>
  wrapper.findAll('button').find((b) => b.text() === text)

function lastOpenEmit(wrapper: Wrapper) {
  const emits = wrapper.emitted('update:open') ?? []
  return emits[emits.length - 1]
}

function lastToast() {
  const items = useToast().items.value
  return items[items.length - 1]
}

beforeEach(() => {
  setActivePinia(createPinia())
  activeAccounts.value = [account('bca'), account('gopay')]
  vi.mocked(updateIncome).mockReset().mockResolvedValue(bonus)
  vi.mocked(deleteIncome).mockReset().mockResolvedValue(undefined)
  reloadAccounts.mockReset()
  reloadIncomes.mockReset()
})

describe('EditIncomeSheet prefill', () => {
  it('fills the fields from the income', async () => {
    const wrapper = await mountSheet()

    expect(
      wrapper
        .get('[role="group"]')
        .findAll('button')
        .filter((b) => b.attributes('aria-pressed') === 'true')
        .map((b) => b.text()),
    ).toEqual(['Bonus'])
    expect((fieldByLabel(wrapper, 'Besaran pemasukan').element as HTMLInputElement).value).toBe(
      '2500000',
    )
    expect((fieldByLabel(wrapper, 'Tanggal').element as HTMLInputElement).value).toBe('2026-11-03')
    expect((fieldByLabel(wrapper, 'Catatan').element as HTMLInputElement).value).toBe('bonus Q3')
    expect(accountField(wrapper).text()).toBe('BCA')
  })
})

describe('EditIncomeSheet save', () => {
  it('sends the whole form, refreshes incomes and accounts, then closes and emits saved', async () => {
    const wrapper = await mountSheet()

    await wrapper
      .get('[role="group"]')
      .findAll('button')
      .find((b) => b.text() === 'Gaji')!
      .trigger('click')
    await fieldByLabel(wrapper, 'Besaran pemasukan').setValue('3000000')
    await pick(wrapper, 'GOPAY')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(updateIncome).toHaveBeenCalledWith('inc-1', {
      source: 'salary',
      amount: 3_000_000,
      income_date: '2026-11-03',
      account_id: 'gopay',
      note: 'bonus Q3',
    })
    expect(reloadIncomes).toHaveBeenCalledTimes(1)
    expect(reloadAccounts).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('saved')).toHaveLength(1)
    expect(lastOpenEmit(wrapper)).toEqual([false])
    expect(lastToast()).toMatchObject({ type: 'success', message: 'Pemasukan udah diperbarui.' })
  })

  it('sends account_id "" when the account is cleared', async () => {
    const wrapper = await mountSheet()

    await pick(wrapper, 'Tanpa akun')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(updateIncome).toHaveBeenCalledWith('inc-1', expect.objectContaining({ account_id: '' }))
  })

  it('sends note "" when the note is emptied', async () => {
    const wrapper = await mountSheet()

    await fieldByLabel(wrapper, 'Catatan').setValue('')
    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(updateIncome).toHaveBeenCalledWith('inc-1', expect.objectContaining({ note: '' }))
  })

  it('keeps an archived account selected and selectable, and saves it unchanged', async () => {
    activeAccounts.value = [account('gopay')]
    const archived: Income = { ...bonus, account_id: 'dana', account: summary('dana', true) }
    const wrapper = await mountSheet(archived)

    expect(accountField(wrapper).text()).toBe('DANA')
    await accountField(wrapper).trigger('click')
    expect(wrapper.findAll('[role="option"]').map((o) => o.text())).toEqual([
      'Tanpa akun',
      'GOPAY',
      'DANA',
    ])
    await accountField(wrapper).trigger('click')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(updateIncome).toHaveBeenCalledWith(
      'inc-1',
      expect.objectContaining({ account_id: 'dana' }),
    )
  })

  it('shows an error toast and stays open when saving fails', async () => {
    vi.mocked(updateIncome).mockRejectedValue(new Error('boom'))
    const wrapper = await mountSheet()

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(lastToast()).toMatchObject({ type: 'error', message: 'Gagal memperbarui pemasukan.' })
    expect(wrapper.emitted('saved')).toBeUndefined()
    expect(reloadIncomes).not.toHaveBeenCalled()
  })

  it('disables saving while the amount is not above zero', async () => {
    const wrapper = await mountSheet()
    await fieldByLabel(wrapper, 'Besaran pemasukan').setValue('0')
    expect(button(wrapper, 'Simpan perubahan')!.attributes('disabled')).toBeDefined()
  })
})

describe('EditIncomeSheet delete', () => {
  it('needs a second tap, then deletes, refreshes, closes and emits deleted', async () => {
    const wrapper = await mountSheet()

    await button(wrapper, 'Hapus pemasukan')!.trigger('click')
    expect(deleteIncome).not.toHaveBeenCalled()
    expect(button(wrapper, 'Yakin? Tap lagi buat hapus')).toBeDefined()

    await button(wrapper, 'Yakin? Tap lagi buat hapus')!.trigger('click')
    await flushPromises()

    expect(deleteIncome).toHaveBeenCalledWith('inc-1')
    expect(reloadIncomes).toHaveBeenCalledTimes(1)
    expect(reloadAccounts).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('deleted')).toHaveLength(1)
    expect(lastOpenEmit(wrapper)).toEqual([false])
    expect(lastToast()).toMatchObject({ type: 'success', message: 'Pemasukan udah dihapus.' })
  })

  it('"Batal" backs out of the confirmation', async () => {
    const wrapper = await mountSheet()

    await button(wrapper, 'Hapus pemasukan')!.trigger('click')
    await button(wrapper, 'Batal')!.trigger('click')

    expect(button(wrapper, 'Hapus pemasukan')).toBeDefined()
    expect(deleteIncome).not.toHaveBeenCalled()
  })

  it('shows an error toast and does not emit deleted when deleting fails', async () => {
    vi.mocked(deleteIncome).mockRejectedValue(new Error('boom'))
    const wrapper = await mountSheet()

    await button(wrapper, 'Hapus pemasukan')!.trigger('click')
    await button(wrapper, 'Yakin? Tap lagi buat hapus')!.trigger('click')
    await flushPromises()

    expect(lastToast()).toMatchObject({ type: 'error', message: 'Gagal menghapus pemasukan.' })
    expect(wrapper.emitted('deleted')).toBeUndefined()
  })
})
