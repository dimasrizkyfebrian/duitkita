<script setup lang="ts" generic="T">
import { computed, ref, watch } from 'vue'
import BottomSheet from './BottomSheet.vue'
import { SEARCH_THRESHOLD, type SelectOption } from './selectOption'

const props = defineProps<{
  title: string
  options: SelectOption<T>[]
  /** The currently selected option's `value`. */
  selected: string
}>()

const emit = defineEmits<{ select: [value: string] }>()
const open = defineModel<boolean>('open')

defineSlots<{
  option?(props: { option: SelectOption<T>; selected: boolean }): unknown
}>()

const query = ref('')

const searchable = computed(() => props.options.length > SEARCH_THRESHOLD)
const visible = computed(() => {
  const needle = query.value.trim().toLowerCase()
  if (!searchable.value || needle === '') return props.options
  return props.options.filter((option) => option.label.toLowerCase().includes(needle))
})

// Every opening starts from the full list.
watch(open, (isOpen) => {
  if (isOpen) query.value = ''
})
</script>

<template>
  <BottomSheet :open="open ?? false" :title="title" @update:open="open = $event">
    <div class="flex flex-col gap-3">
      <input
        v-if="searchable"
        v-model="query"
        type="search"
        aria-label="Cari"
        placeholder="Cari…"
        autocomplete="off"
        class="rounded-control border-hairline placeholder:text-muted/45 focus:border-azure focus:ring-azure/15 w-full border bg-white px-4 py-3.5 text-[0.9375rem] font-medium transition-colors duration-150 focus:ring-4 focus:outline-none"
      />

      <ul
        v-if="visible.length > 0"
        role="listbox"
        :aria-label="title"
        class="flex flex-col gap-1.5"
      >
        <li v-for="option in visible" :key="option.value" role="presentation">
          <button
            type="button"
            role="option"
            :aria-selected="option.value === selected"
            :class="[
              'rounded-control focus-visible:ring-azure/30 flex min-h-11 w-full items-center gap-3 border px-4 py-2.5 text-left text-[0.9375rem] font-bold transition-colors focus-visible:ring-4 focus-visible:outline-none',
              option.value === selected
                ? 'border-navy bg-navy text-white'
                : 'border-hairline text-ink active:bg-mist/40 bg-white',
            ]"
            @click="emit('select', option.value)"
          >
            <slot name="option" :option="option" :selected="option.value === selected">
              {{ option.label }}
            </slot>
          </button>
        </li>
      </ul>

      <p v-else class="text-muted py-6 text-center text-[0.875rem]">Gak ada yang cocok.</p>
    </div>
  </BottomSheet>
</template>
