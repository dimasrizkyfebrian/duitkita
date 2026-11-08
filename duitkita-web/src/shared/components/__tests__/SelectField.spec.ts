import { describe, expect, it } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import SelectField from '../SelectField.vue'
import OptionSheet from '../OptionSheet.vue'
import type { SelectOption } from '../selectOption'

const options: SelectOption[] = [
  { value: 'food', label: 'Makan' },
  { value: 'ride', label: 'Transport' },
]

function mountField(props: Record<string, unknown> = {}, slots: Record<string, string> = {}) {
  return mount(SelectField, {
    props: { label: 'Kategori', options, modelValue: 'ride', ...props },
    slots,
    global: { stubs: { teleport: true } },
  })
}

// OptionSheet is generic, so its typed props() collapses to never; read the raw vnode props.
function sheetProp(wrapper: VueWrapper, key: string) {
  return (
    wrapper.getComponent(OptionSheet) as unknown as { vm: { $props: Record<string, unknown> } }
  ).vm.$props[key]
}

describe('SelectField', () => {
  it('menampilkan label opsi terpilih', () => {
    expect(mountField().get('button[aria-haspopup="dialog"]').text()).toContain('Transport')
  })

  it('menampilkan placeholder bila nilai tidak cocok opsi mana pun', () => {
    const wrapper = mountField({ modelValue: '', placeholder: 'Pilih kategori' })
    const field = wrapper.get('button[aria-haspopup="dialog"]')
    expect(field.text()).toContain('Pilih kategori')
    expect(field.text()).not.toContain('Transport')
  })

  it('menghubungkan label dengan field', () => {
    const wrapper = mountField()
    const field = wrapper.get('button[aria-haspopup="dialog"]')
    const label = wrapper.get('label')
    expect(label.text()).toBe('Kategori')
    expect(label.attributes('for')).toBe(field.attributes('id'))
  })

  it('membuka OptionSheet saat field diketuk', async () => {
    const wrapper = mountField()
    const field = wrapper.get('button[aria-haspopup="dialog"]')
    expect(sheetProp(wrapper, 'open')).toBe(false)
    expect(field.attributes('aria-expanded')).toBe('false')
    await field.trigger('click')
    expect(sheetProp(wrapper, 'open')).toBe(true)
    expect(field.attributes('aria-expanded')).toBe('true')
  })

  it('memakai sheetTitle, atau label bila sheetTitle tidak diberikan', async () => {
    const wrapper = mountField()
    expect(sheetProp(wrapper, 'title')).toBe('Kategori')
    await wrapper.setProps({ sheetTitle: 'Pilih kategori' })
    expect(sheetProp(wrapper, 'title')).toBe('Pilih kategori')
  })

  it('meng-emit update:modelValue lalu menutup sheet saat opsi dipilih', async () => {
    const wrapper = mountField()
    await wrapper.get('button[aria-haspopup="dialog"]').trigger('click')
    await wrapper.findAll('[role="option"]')[0]!.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['food'])
    expect(sheetProp(wrapper, 'open')).toBe(false)
  })

  it('merender slot #value untuk opsi terpilih dan meneruskan #option ke sheet', async () => {
    const wrapper = mountField(
      {},
      {
        value:
          '<template #value="{ option }"><b data-testid="isi">{{ option.label }}!</b></template>',
        option:
          '<template #option="{ option }"><i data-testid="kustom">{{ option.label }}</i></template>',
      },
    )
    expect(wrapper.get('[data-testid="isi"]').text()).toBe('Transport!')
    await wrapper.get('button[aria-haspopup="dialog"]').trigger('click')
    expect(wrapper.findAll('[data-testid="kustom"]').map((n) => n.text())).toEqual([
      'Makan',
      'Transport',
    ])
  })
})
