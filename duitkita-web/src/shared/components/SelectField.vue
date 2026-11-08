<script setup lang="ts" generic="T">
import { computed, ref, useId } from 'vue'
import IconChevronDown from '@/shared/icons/IconChevronDown.vue'
import OptionSheet from './OptionSheet.vue'
import type { SelectOption } from './selectOption'

const props = defineProps<{
  label: string
  options: SelectOption<T>[]
  placeholder?: string
  /** Title of the options sheet; falls back to `label`. */
  sheetTitle?: string
}>()

const model = defineModel<string>()
const id = useId()
const open = ref(false)

defineSlots<{
  value?(props: { option: SelectOption<T> }): unknown
  option?(props: { option: SelectOption<T>; selected: boolean }): unknown
}>()

const current = computed(() => props.options.find((option) => option.value === model.value))

function pick(value: string) {
  model.value = value
  open.value = false
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <label :for="id" class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase">
      {{ label }}
    </label>

    <button
      :id="id"
      type="button"
      aria-haspopup="dialog"
      :aria-expanded="open"
      class="rounded-control border-hairline focus-visible:border-azure focus-visible:ring-azure/15 flex min-h-12 w-full items-center gap-3 border bg-white px-4 py-3.5 text-left text-[0.9375rem] font-medium transition-colors duration-150 focus-visible:ring-4 focus-visible:outline-none"
      @click="open = true"
    >
      <span class="flex min-w-0 flex-1 items-center gap-2 truncate">
        <slot v-if="current" name="value" :option="current">
          <span class="text-ink truncate font-bold">{{ current.label }}</span>
        </slot>
        <span v-else class="text-muted/45 truncate">{{ placeholder }}</span>
      </span>
      <IconChevronDown
        class="text-muted h-4 w-4 shrink-0 transition-transform duration-200"
        :class="open ? 'rotate-180' : ''"
      />
    </button>

    <OptionSheet
      v-model:open="open"
      :title="sheetTitle ?? label"
      :options="options"
      :selected="model ?? ''"
      @select="pick"
    >
      <template v-if="$slots.option" #option="slotProps">
        <slot name="option" v-bind="slotProps" />
      </template>
    </OptionSheet>
  </div>
</template>
