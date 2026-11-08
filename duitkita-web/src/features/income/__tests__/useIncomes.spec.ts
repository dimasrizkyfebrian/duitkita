import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import type { Income, IncomeList } from '../types'

type ListParams = Parameters<typeof import('../api/income.api').listIncomes>[0]
const listIncomes = vi.fn<(params?: ListParams) => Promise<IncomeList>>()
vi.mock('../api/income.api', () => ({ listIncomes: (p?: ListParams) => listIncomes(p) }))

const { useIncomes, resetIncomesForTests } = await import('../composables/useIncomes')

function income(id: string): Income {
  return {
    id,
    source: 'salary',
    amount: 5_000_000,
    income_date: '2026-10-01',
    account_id: null,
    account: null,
    created_at: '2026-10-01T00:00:00Z',
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('useIncomes', () => {
  beforeEach(() => {
    // Only the clock is faked, so `flush` (a real timeout) still works.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 18, 12, 0, 0))
    setActivePinia(createPinia())
    resetIncomesForTests()
    listIncomes.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('loads the current calendar month', async () => {
    useAuthStore().user = { id: 'user-a' } as never
    listIncomes.mockResolvedValue({ items: [income('i1'), income('i2')], total: 12_500_000 })

    const { items, total } = useIncomes()
    await flush()

    expect(listIncomes).toHaveBeenCalledWith({ from: '2026-10-01', to: '2026-10-31', limit: 100 })
    expect(items.value.map((i) => i.id)).toEqual(['i1', 'i2'])
    expect(total.value).toBe(12_500_000)
  })

  it.each([
    [new Date(2026, 1, 10), '2026-02-01', '2026-02-28'],
    [new Date(2028, 1, 10), '2028-02-01', '2028-02-29'],
    [new Date(2026, 3, 30), '2026-04-01', '2026-04-30'],
    [new Date(2026, 11, 31, 23, 59), '2026-12-01', '2026-12-31'],
  ])('uses the last day of the month for %s', async (now, from, to) => {
    vi.setSystemTime(now)
    useAuthStore().user = { id: 'user-a' } as never
    listIncomes.mockResolvedValue({ items: [], total: 0 })

    useIncomes()
    await flush()

    expect(listIncomes).toHaveBeenCalledWith({ from, to, limit: 100 })
  })

  it('is shared: a second caller reuses the first load', async () => {
    useAuthStore().user = { id: 'user-a' } as never
    listIncomes.mockResolvedValue({ items: [income('i1')], total: 7_500_000 })

    useIncomes()
    const second = useIncomes()
    await flush()

    expect(listIncomes).toHaveBeenCalledTimes(1)
    expect(second.items.value).toHaveLength(1)
  })

  it('does not load while signed out', async () => {
    useIncomes()
    await flush()
    expect(listIncomes).not.toHaveBeenCalled()
  })

  it('reload() fetches again', async () => {
    useAuthStore().user = { id: 'user-a' } as never
    listIncomes.mockResolvedValueOnce({ items: [income('i1')], total: 7_500_000 })
    const { items, total, reload } = useIncomes()
    await flush()
    expect(items.value.map((i) => i.id)).toEqual(['i1'])

    listIncomes.mockResolvedValueOnce({ items: [income('i1'), income('i2')], total: 12_500_000 })
    await reload()

    expect(listIncomes).toHaveBeenCalledTimes(2)
    expect(items.value.map((i) => i.id)).toEqual(['i1', 'i2'])
    expect(total.value).toBe(12_500_000)
  })

  it("reloads for a different user instead of showing the previous one's incomes", async () => {
    const auth = useAuthStore()
    auth.user = { id: 'user-a' } as never
    listIncomes.mockResolvedValueOnce({ items: [income('a1')], total: 7_500_000 })
    const { items } = useIncomes()
    await flush()
    expect(items.value.map((i) => i.id)).toEqual(['a1'])

    listIncomes.mockResolvedValueOnce({ items: [income('b1')], total: 7_500_000 })
    auth.user = { id: 'user-b' } as never
    await nextTick()
    await flush()

    expect(items.value.map((i) => i.id)).toEqual(['b1'])
  })

  it('clears the state when the user signs out', async () => {
    const auth = useAuthStore()
    auth.user = { id: 'user-a' } as never
    listIncomes.mockResolvedValueOnce({ items: [income('a1')], total: 7_500_000 })
    const { items, total } = useIncomes()
    await flush()

    auth.user = null
    await nextTick()
    await flush()

    expect(items.value).toEqual([])
    expect(total.value).toBe(0)
  })

  it('ignores a slow response for a user who has since signed out', async () => {
    const auth = useAuthStore()
    auth.user = { id: 'user-a' } as never
    let resolveA!: (v: IncomeList) => void
    listIncomes.mockReturnValueOnce(new Promise<IncomeList>((r) => (resolveA = r)))
    const { items, total } = useIncomes()

    auth.user = null
    await nextTick()
    resolveA({ items: [income('a1')], total: 7_500_000 })
    await flush()

    expect(items.value).toEqual([])
    expect(total.value).toBe(0)
  })

  it('ignores a slow response for the previous user after switching', async () => {
    const auth = useAuthStore()
    auth.user = { id: 'user-a' } as never
    let resolveA!: (v: IncomeList) => void
    listIncomes.mockReturnValueOnce(new Promise<IncomeList>((r) => (resolveA = r)))
    const { items, loading } = useIncomes()
    expect(loading.value).toBe(true)

    listIncomes.mockResolvedValueOnce({ items: [income('b1')], total: 7_500_000 })
    auth.user = { id: 'user-b' } as never
    await nextTick()
    await flush()
    resolveA({ items: [income('a1')], total: 7_500_000 })
    await flush()

    expect(items.value.map((i) => i.id)).toEqual(['b1'])
    expect(loading.value).toBe(false)
  })

  it('does not throw and keeps the old data when a request fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    useAuthStore().user = { id: 'user-a' } as never
    listIncomes.mockResolvedValueOnce({ items: [income('i1')], total: 7_500_000 })
    const { items, total, loading, reload } = useIncomes()
    await flush()

    listIncomes.mockRejectedValueOnce(new Error('network down'))
    await expect(reload()).resolves.toBeUndefined()

    expect(warn).toHaveBeenCalled()
    expect(items.value.map((i) => i.id)).toEqual(['i1'])
    expect(total.value).toBe(7_500_000)
    expect(loading.value).toBe(false)
  })

  it('can load again after a failed first load', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    useAuthStore().user = { id: 'user-a' } as never
    listIncomes.mockRejectedValueOnce(new Error('network down'))
    const { items, reload } = useIncomes()
    await flush()
    expect(items.value).toEqual([])

    listIncomes.mockResolvedValueOnce({ items: [income('i1')], total: 7_500_000 })
    await reload()

    expect(items.value.map((i) => i.id)).toEqual(['i1'])
  })
})
