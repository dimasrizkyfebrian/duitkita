import { beforeEach, describe, expect, it } from 'vitest'
import {
  getLastUsedAccountId,
  pickDefaultAccountId,
  setLastUsedAccountId,
} from '../utils/lastUsedAccount'

describe('pickDefaultAccountId', () => {
  const active = [{ id: 'bca' }, { id: 'ovo' }]

  it('uses the last account when it is still active', () => {
    expect(pickDefaultAccountId('ovo', active)).toBe('ovo')
  })

  it('falls back to no account when the last one is gone or archived', () => {
    expect(pickDefaultAccountId('archived-one', active)).toBe('')
  })

  it('starts with no account when nothing was picked yet', () => {
    expect(pickDefaultAccountId(null, active)).toBe('')
  })

  it('remembers an explicit "no account" choice', () => {
    expect(pickDefaultAccountId('', active)).toBe('')
  })
})

describe('last used account storage', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips per user', () => {
    setLastUsedAccountId('user-a', 'bca')
    expect(getLastUsedAccountId('user-a')).toBe('bca')
  })

  it('does not leak one user’s choice to another on the same device', () => {
    setLastUsedAccountId('user-a', 'bca')
    expect(getLastUsedAccountId('user-b')).toBeNull()
  })

  it('stores "no account" as an empty string, distinct from never picked', () => {
    setLastUsedAccountId('user-a', '')
    expect(getLastUsedAccountId('user-a')).toBe('')
  })
})
