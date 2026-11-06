import { beforeEach, describe, expect, it } from 'vitest'
import { displayBalance, displaySignedBalance, MASKED_BALANCE } from '../utils/balance'
import {
  resetBalanceVisibilityForTests,
  useBalanceVisibility,
} from '../composables/useBalanceVisibility'

describe('balance visibility', () => {
  beforeEach(() => resetBalanceVisibilityForTests())

  // Like m-banking: the app opens with balances hidden.
  it('starts hidden', () => {
    expect(useBalanceVisibility().hidden.value).toBe(true)
  })

  it('is one switch shared by every caller', () => {
    const card = useBalanceVisibility()
    const sheet = useBalanceVisibility()
    card.toggle()
    expect(sheet.hidden.value).toBe(false)
    sheet.toggle()
    expect(card.hidden.value).toBe(true)
  })

  it('masks amounts while hidden', () => {
    expect(displayBalance(10_000_000, true)).toBe(MASKED_BALANCE)
    expect(displayBalance(10_000_000, false)).toMatch(/^Rp\s?10\.000\.000$/)
    expect(displaySignedBalance(-50_000, true)).toBe(MASKED_BALANCE)
    expect(displaySignedBalance(-50_000, false)).toMatch(/^−Rp\s?50\.000$/)
  })
})
