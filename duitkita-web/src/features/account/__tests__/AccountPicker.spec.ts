import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountPicker from '../components/AccountPicker.vue'
import AccountLogo from '../components/AccountLogo.vue'
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

function mountPicker(props: Record<string, unknown> = {}) {
  return mount(AccountPicker, {
    props: { accounts, modelValue: '', ...props },
    global: { stubs: { teleport: true } },
  })
}

const FIELD = 'button[aria-haspopup="dialog"]'

async function open(wrapper: ReturnType<typeof mountPicker>) {
  await wrapper.get(FIELD).trigger('click')
}

function optionTexts(wrapper: ReturnType<typeof mountPicker>) {
  return wrapper.findAll('[role="option"]').map((o) => o.text())
}

describe('AccountPicker', () => {
  it('uses "Dari akun" as the default label', () => {
    expect(mountPicker().get('label').text()).toBe('Dari akun')
  })

  it('uses a custom label when given', () => {
    expect(mountPicker({ label: 'Ke akun' }).get('label').text()).toBe('Ke akun')
  })

  it('lists "Tanpa akun" first, then every account, once opened', async () => {
    const wrapper = mountPicker()
    expect(wrapper.findAll('[role="option"]')).toHaveLength(0)
    await open(wrapper)
    const texts = optionTexts(wrapper)
    expect(texts).toHaveLength(3)
    expect(texts[0]).toBe('Tanpa akun')
    expect(texts[1]).toContain('BCA Utama')
    expect(texts[2]).toContain('ShopeePay Kerja')
  })

  it('omits "Tanpa akun" when allowNone is false', async () => {
    const wrapper = mountPicker({ allowNone: false, modelValue: 'acc-1' })
    await open(wrapper)
    const texts = optionTexts(wrapper)
    expect(texts).toHaveLength(2)
    expect(texts.join('|')).not.toContain('Tanpa akun')
  })

  it('shows the logo and name of the selected account in the field', () => {
    const wrapper = mountPicker({ modelValue: 'acc-2' })
    const field = wrapper.get(FIELD)
    expect(field.text()).toContain('ShopeePay Kerja')
    expect(field.findComponent(AccountLogo).exists()).toBe(true)
  })

  it('shows "Tanpa akun" without a logo when nothing is picked', () => {
    const field = mountPicker({ modelValue: '' }).get(FIELD)
    expect(field.text()).toContain('Tanpa akun')
    expect(field.findComponent(AccountLogo).exists()).toBe(false)
  })

  it('renders a logo on each account option but not on "Tanpa akun"', async () => {
    const wrapper = mountPicker()
    await open(wrapper)
    const options = wrapper.findAll('[role="option"]')
    expect(options[0]?.findComponent(AccountLogo).exists()).toBe(false)
    expect(options[1]?.findComponent(AccountLogo).exists()).toBe(true)
    expect(options[2]?.findComponent(AccountLogo).exists()).toBe(true)
  })

  it('emits the picked account, and "" for no account', async () => {
    const wrapper = mountPicker({ modelValue: 'acc-2' })
    await open(wrapper)
    await wrapper.findAll('[role="option"]')[1]?.trigger('click')
    await open(wrapper)
    await wrapper.findAll('[role="option"]')[0]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['acc-1'], ['']])
  })

  it('renders nothing when the user has no accounts', () => {
    const wrapper = mountPicker({ accounts: [] })
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.find('label').exists()).toBe(false)
  })
})
