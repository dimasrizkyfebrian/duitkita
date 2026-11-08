import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BottomSheet from '../BottomSheet.vue'

function mountSheet() {
  return mount(BottomSheet, {
    props: { open: true, title: 'Judul' },
    slots: { default: '<div data-testid="tall" style="height: 2000px">Konten tinggi</div>' },
    global: { stubs: { teleport: true } },
  })
}

describe('BottomSheet', () => {
  it('membatasi tinggi panel dan menyusunnya sebagai kolom flex', () => {
    const panel = mountSheet().get('[data-sheet-panel]')
    expect(panel.classes()).toContain('max-h-[90dvh]')
    expect(panel.classes()).toContain('flex-col')
  })

  it('menjaga header (tombol Tutup) di luar area scroll', () => {
    const wrapper = mountSheet()
    const header = wrapper.get('[data-sheet-header]')
    expect(header.classes()).toContain('shrink-0')
    expect(header.find('button[aria-label="Tutup"]').exists()).toBe(true)
    expect(wrapper.get('[data-sheet-body]').find('[data-sheet-header]').exists()).toBe(false)
    expect(wrapper.get('[data-sheet-body]').find('button[aria-label="Tutup"]').exists()).toBe(false)
  })

  it('membuat body bisa di-scroll dan memuat slot', () => {
    const body = mountSheet().get('[data-sheet-body]')
    expect(body.classes()).toContain('overflow-y-auto')
    expect(body.classes()).toContain('overscroll-contain')
    // overflow-y-auto alone makes x "auto" too; a child poking past the p-1 room would pan sideways
    expect(body.classes()).toContain('overflow-x-hidden')
    expect(body.find('[data-testid="tall"]').exists()).toBe(true)
  })

  it('memberi ruang untuk focus ring 4px di body tanpa menggeser layout (p-1 diimbangi -m-1)', () => {
    const body = mountSheet().get('[data-sheet-body]')
    expect(body.classes()).toContain('-m-1')
    expect(body.classes()).toContain('p-1')
  })

  it('meng-emit update:open false saat tombol Tutup diklik', async () => {
    const wrapper = mountSheet()
    await wrapper.get('button[aria-label="Tutup"]').trigger('click')
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })
})
