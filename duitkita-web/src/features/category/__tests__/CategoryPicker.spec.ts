import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CategoryPicker from '../components/CategoryPicker.vue'

const categories = [
  { id: 'c1', name: 'Makan', icon: '🍜' },
  { id: 'c2', name: 'Transport', icon: '🚌' },
  { id: 'c3', name: 'Lainnya' },
]

function manyCategories(count: number) {
  return Array.from({ length: count }, (_, i) => ({ id: `c${i}`, name: `Kategori ${i}` }))
}

function mountPicker(props: Record<string, unknown> = {}) {
  return mount(CategoryPicker, {
    props: { categories, modelValue: 'c1', ...props },
    global: { stubs: { teleport: true } },
  })
}

const FIELD = 'button[aria-haspopup="dialog"]'

async function open(wrapper: ReturnType<typeof mountPicker>) {
  await wrapper.get(FIELD).trigger('click')
}

describe('CategoryPicker', () => {
  it('uses "Kategori" as the default label', () => {
    expect(mountPicker().get('label').text()).toBe('Kategori')
  })

  it('uses a custom label when given', () => {
    expect(mountPicker({ label: 'Pilih kategori' }).get('label').text()).toBe('Pilih kategori')
  })

  it('shows the icon and name of the selected category in the field', () => {
    const field = mountPicker({ modelValue: 'c2' }).get(FIELD)
    expect(field.text()).toContain('🚌')
    expect(field.text()).toContain('Transport')
  })

  it('shows just the name when the selected category has no icon', () => {
    const field = mountPicker({ modelValue: 'c3' }).get(FIELD)
    expect(field.text()).toBe('Lainnya')
  })

  it('lists every category, with its icon, once opened', async () => {
    const wrapper = mountPicker()
    expect(wrapper.findAll('[role="option"]')).toHaveLength(0)
    await open(wrapper)
    const texts = wrapper.findAll('[role="option"]').map((o) => o.text())
    expect(texts).toHaveLength(3)
    expect(texts[0]).toContain('🍜')
    expect(texts[0]).toContain('Makan')
    expect(texts[1]).toContain('Transport')
    expect(texts[2]).toBe('Lainnya')
  })

  it('emits the picked category id', async () => {
    const wrapper = mountPicker()
    await open(wrapper)
    await wrapper.findAll('[role="option"]')[1]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([['c2']])
  })

  it('shows the search box only above 7 categories', async () => {
    const few = mountPicker({ categories: manyCategories(7), modelValue: 'c0' })
    await open(few)
    expect(few.find('input[type="search"]').exists()).toBe(false)

    const many = mountPicker({ categories: manyCategories(8), modelValue: 'c0' })
    await open(many)
    expect(many.find('input[type="search"]').exists()).toBe(true)
  })
})
