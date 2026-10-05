<script setup lang="ts">
defineProps<{
  label: string
  description?: string
  disabled?: boolean
}>()

const model = defineModel<boolean>({ required: true })

function toggle() {
  model.value = !model.value
}
</script>

<template>
  <div class="flex items-center justify-between gap-4 py-3.5">
    <span class="min-w-0 flex-1">
      <span class="text-ink block text-[0.875rem] font-bold">{{ label }}</span>
      <span v-if="description" class="text-muted mt-0.5 block text-[0.75rem] leading-snug">
        {{ description }}
      </span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="model"
      :aria-label="label"
      :disabled="disabled"
      class="relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 disabled:opacity-50"
      :class="model ? 'bg-navy' : 'bg-black/15'"
      @click="toggle"
    >
      <span
        class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-150"
        :class="model ? 'translate-x-5' : 'translate-x-0'"
      ></span>
    </button>
  </div>
</template>
