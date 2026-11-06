import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountPicker from '../components/AccountPicker.vue'
import type { PickableAccount } from '../types'

const accounts: PickableAccount[] = [
  {
    id: 'acc-1',
    name: 'BCA Utama',
    institution: { id: 'i1', code: 'bca', name: 'BCA', type: 'bank', logo_path: null },
  },
  {
    id: 'acc-2',
    name: 'ShopeePay Kerja',
    institution: {
      id: 'i2',
      code: 'shopeepay',
      name: 'ShopeePay',
      type: 'ewallet',
      logo_path: null,
    },
  },
]

describe('AccountPicker', () => {
  it('offers "no account" plus one chip per account', () => {
    const wrapper = mount(AccountPicker, { props: { accounts, modelValue: '' } })
    const chips = wrapper.findAll('button')
    expect(chips).toHaveLength(3)
    expect(chips[0]?.text()).toBe('Tanpa akun')
    expect(chips[1]?.text()).toContain('BCA Utama')
    expect(chips[2]?.text()).toContain('ShopeePay Kerja')
  })

  it('marks the selected account as pressed', () => {
    const wrapper = mount(AccountPicker, { props: { accounts, modelValue: 'acc-2' } })
    const pressed = wrapper.findAll('button').filter((c) => c.attributes('aria-pressed') === 'true')
    expect(pressed).toHaveLength(1)
    expect(pressed[0]?.text()).toContain('ShopeePay Kerja')
  })

  it('emits the picked account, and "" for no account', async () => {
    const wrapper = mount(AccountPicker, { props: { accounts, modelValue: '' } })
    await wrapper.findAll('button')[1]?.trigger('click')
    await wrapper.findAll('button')[0]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['acc-1'], ['']])
  })

  it('renders nothing when the user has no accounts', () => {
    const wrapper = mount(AccountPicker, { props: { accounts: [], modelValue: '' } })
    expect(wrapper.find('button').exists()).toBe(false)
  })
})
