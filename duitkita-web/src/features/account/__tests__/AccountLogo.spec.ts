import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AccountLogo from '../components/AccountLogo.vue'
import type { Institution } from '../types'

const bca: Institution = {
  id: 'inst-bca',
  code: 'bca',
  name: 'Bank Central Asia',
  type: 'bank',
  logo_path: '/institutions/bca.svg',
}

describe('AccountLogo', () => {
  it('shows the logo when the institution has one', () => {
    const wrapper = mount(AccountLogo, { props: { institution: bca } })
    expect(wrapper.find('img').attributes('src')).toBe('/institutions/bca.svg')
  })

  it('falls back to initials when the logo file fails to load', async () => {
    const wrapper = mount(AccountLogo, { props: { institution: bca } })
    await wrapper.find('img').trigger('error')
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toBe('BC')
  })

  it('uses initials when there is no logo at all', () => {
    const wrapper = mount(AccountLogo, {
      props: { institution: { ...bca, name: 'OVO', logo_path: null } },
    })
    expect(wrapper.text()).toBe('OV')
  })

  // Most logos are wordmarks, so they get a wide tile instead of a small
  // circle that would shrink the text past reading.
  it.each([
    ['sm', 'w-[3.25rem]'],
    ['md', 'w-16'],
    ['lg', 'w-20'],
  ] as const)('renders a wide %s tile, not a circle', (size, widthClass) => {
    const wrapper = mount(AccountLogo, { props: { institution: bca, size } })
    expect(wrapper.classes()).toContain(widthClass)
    expect(wrapper.classes()).not.toContain('rounded-full')
  })

  it('keeps the same tile size for the initials fallback', () => {
    const wrapper = mount(AccountLogo, {
      props: { institution: { ...bca, logo_path: null } },
    })
    expect(wrapper.classes()).toContain('w-16')
  })

  it('shows a wallet icon for cash', () => {
    const wrapper = mount(AccountLogo, {
      props: {
        institution: { ...bca, code: 'cash', name: 'Tunai', type: 'cash', logo_path: null },
      },
    })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.text()).toBe('')
  })
})
