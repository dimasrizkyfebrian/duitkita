import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import OptionSheet from '../OptionSheet.vue'
import type { SelectOption } from '../selectOption'

function makeOptions(count: number): SelectOption[] {
  return Array.from({ length: count }, (_, i) => ({ value: `v${i}`, label: `Opsi ${i + 1}` }))
}

function mountSheet(
  options: SelectOption[],
  extra: { selected?: string; slots?: Record<string, string> } = {},
) {
  return mount(OptionSheet, {
    props: { open: true, title: 'Pilih', options, selected: extra.selected ?? '' },
    slots: extra.slots,
    global: { stubs: { teleport: true } },
  })
}

describe('OptionSheet', () => {
  it('tidak menampilkan pencarian untuk 7 opsi', () => {
    expect(mountSheet(makeOptions(7)).find('input[type="search"]').exists()).toBe(false)
  })

  it('menampilkan pencarian untuk 8 opsi', () => {
    expect(mountSheet(makeOptions(8)).find('input[type="search"]').exists()).toBe(true)
  })

  it('menyaring tanpa membedakan huruf besar/kecil', async () => {
    const options: SelectOption[] = [
      { value: 'a', label: 'Makan' },
      { value: 'b', label: 'Transport' },
      { value: 'c', label: 'Belanja' },
      { value: 'd', label: 'Hiburan' },
      { value: 'e', label: 'Kesehatan' },
      { value: 'f', label: 'Tagihan' },
      { value: 'g', label: 'Pendidikan' },
      { value: 'h', label: 'MAKANAN RINGAN' },
    ]
    const wrapper = mountSheet(options)
    await wrapper.get('input[type="search"]').setValue('mak')
    const labels = wrapper.findAll('[role="option"]').map((o) => o.text())
    expect(labels).toEqual(['Makan', 'MAKANAN RINGAN'])
  })

  it('menampilkan "Gak ada yang cocok." bila tidak ada hasil', async () => {
    const wrapper = mountSheet(makeOptions(8))
    await wrapper.get('input[type="search"]').setValue('zzz')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(0)
    expect(wrapper.text()).toContain('Gak ada yang cocok.')
  })

  it('menandai opsi terpilih dengan aria-selected="true"', () => {
    const wrapper = mountSheet(makeOptions(3), { selected: 'v1' })
    const flags = wrapper.findAll('[role="option"]').map((o) => o.attributes('aria-selected'))
    expect(flags).toEqual(['false', 'true', 'false'])
  })

  it('merender konten kustom lewat slot #option', () => {
    const wrapper = mountSheet(makeOptions(2), {
      selected: 'v0',
      slots: {
        option:
          '<template #option="{ option, selected }"><i data-testid="kustom">{{ option.label }}|{{ selected }}</i></template>',
      },
    })
    const custom = wrapper.findAll('[data-testid="kustom"]').map((n) => n.text())
    expect(custom).toEqual(['Opsi 1|true', 'Opsi 2|false'])
  })

  it('meng-emit select dengan value opsi yang diketuk', async () => {
    const wrapper = mountSheet(makeOptions(3))
    await wrapper.findAll('[role="option"]')[2]!.trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['v2'])
  })

  it('mengosongkan pencarian saat dibuka kembali dan tidak memaksa fokus', async () => {
    const wrapper = mountSheet(makeOptions(8))
    const input = wrapper.get('input[type="search"]')
    expect(document.activeElement).not.toBe(input.element)
    await input.setValue('opsi 3')
    expect(wrapper.findAll('[role="option"]')).toHaveLength(1)
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    expect(wrapper.findAll('[role="option"]')).toHaveLength(8)
  })
})
