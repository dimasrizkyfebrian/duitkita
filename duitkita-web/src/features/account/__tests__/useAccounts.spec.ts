import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import type { AccountList } from '../types'

const listAccounts = vi.fn<(includeArchived?: boolean) => Promise<AccountList>>()
vi.mock('../api/account.api', () => ({ listAccounts: (a?: boolean) => listAccounts(a) }))

const { useAccounts, resetAccountsForTests } = await import('../composables/useAccounts')

function account(id: string, archived = false, balance: number | null = null) {
  return {
    id,
    name: id,
    institution: { id: 'i', code: 'bca', name: 'BCA', type: 'bank' as const, logo_path: null },
    opening_balance: balance,
    opening_balance_date: balance === null ? null : '2026-10-01',
    balance,
    archived,
    archived_at: archived ? '2026-10-02T00:00:00Z' : null,
    created_at: '2026-10-01T00:00:00Z',
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('useAccounts', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    resetAccountsForTests()
    listAccounts.mockReset()
  })

  it('splits active and archived and exposes the total', async () => {
    useAuthStore().user = { id: 'user-a' } as never
    listAccounts.mockResolvedValue({
      accounts: [account('bca', false, 100), account('lama', true, 50)],
      total_balance: 100,
    })

    const { activeAccounts, archivedAccounts, totalBalance, hasAnyBalance } = useAccounts()
    await flush()

    expect(listAccounts).toHaveBeenCalledWith(true)
    expect(activeAccounts.value.map((a) => a.id)).toEqual(['bca'])
    expect(archivedAccounts.value.map((a) => a.id)).toEqual(['lama'])
    expect(totalBalance.value).toBe(100)
    expect(hasAnyBalance.value).toBe(true)
  })

  // Expense rows carry the account name from when they were fetched; after a
  // rename the reloaded list is the one to trust.
  it('names an account by its current name, falling back to the given one', async () => {
    useAuthStore().user = { id: 'user-a' } as never
    listAccounts.mockResolvedValueOnce({ accounts: [account('bca')], total_balance: 0 })
    const { accountName, reload } = useAccounts()
    await flush()
    expect(accountName('bca', 'old')).toBe('bca')

    listAccounts.mockResolvedValueOnce({
      accounts: [{ ...account('bca'), name: 'BCA Gajian' }],
      total_balance: 0,
    })
    await reload()

    expect(accountName('bca', 'old')).toBe('BCA Gajian')
    expect(accountName('unknown', 'Dari baris')).toBe('Dari baris')
    expect(accountName(null, undefined)).toBeUndefined()
  })

  it('is shared: a second caller reuses the first load', async () => {
    useAuthStore().user = { id: 'user-a' } as never
    listAccounts.mockResolvedValue({ accounts: [account('bca')], total_balance: 0 })

    useAccounts()
    const second = useAccounts()
    await flush()

    expect(listAccounts).toHaveBeenCalledTimes(1)
    expect(second.accounts.value).toHaveLength(1)
  })

  it('reloads for a different user instead of showing the previous one’s accounts', async () => {
    const auth = useAuthStore()
    auth.user = { id: 'user-a' } as never
    listAccounts.mockResolvedValueOnce({ accounts: [account('a-bca')], total_balance: 0 })
    const { accounts } = useAccounts()
    await flush()
    expect(accounts.value.map((a) => a.id)).toEqual(['a-bca'])

    listAccounts.mockResolvedValueOnce({ accounts: [account('b-ovo')], total_balance: 0 })
    auth.user = { id: 'user-b' } as never
    await nextTick()
    await flush()

    expect(accounts.value.map((a) => a.id)).toEqual(['b-ovo'])
  })
})
