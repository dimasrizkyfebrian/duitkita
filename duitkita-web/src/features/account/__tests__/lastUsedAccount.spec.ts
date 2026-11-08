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

  it('keeps the expense key unchanged so existing remembered picks survive', () => {
    setLastUsedAccountId('u1', 'bca')
    expect(localStorage.getItem('duitkita:last-account:u1')).toBe('bca')
    localStorage.setItem('duitkita:last-account:u2', 'ovo')
    expect(getLastUsedAccountId('u2')).toBe('ovo')
    expect(getLastUsedAccountId('u2', 'expense')).toBe('ovo')
  })

  it('stores income under its own key', () => {
    setLastUsedAccountId('u1', 'bca', 'income')
    expect(localStorage.getItem('duitkita:last-account:income:u1')).toBe('bca')
    expect(localStorage.getItem('duitkita:last-account:u1')).toBeNull()
  })

  it('does not let income and expense overwrite each other for the same user', () => {
    setLastUsedAccountId('u1', 'bca', 'expense')
    setLastUsedAccountId('u1', 'ovo', 'income')
    expect(getLastUsedAccountId('u1', 'expense')).toBe('bca')
    expect(getLastUsedAccountId('u1', 'income')).toBe('ovo')
    setLastUsedAccountId('u1', '', 'expense')
    expect(getLastUsedAccountId('u1', 'income')).toBe('ovo')
  })

  it('reports null for a kind that was never picked', () => {
    setLastUsedAccountId('u1', 'bca', 'expense')
    expect(getLastUsedAccountId('u1', 'income')).toBeNull()
  })
})
