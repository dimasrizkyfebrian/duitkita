<script setup lang="ts">
import { computed } from 'vue'
import SelectField from '@/shared/components/SelectField.vue'
import type { SelectOption } from '@/shared/components/selectOption'

const props = withDefaults(
  defineProps<{
    categories: { id: string; name: string; icon?: string }[]
    label?: string
    // Shown when the selected id matches none of `categories`, so the field is never blank.
    placeholder?: string
  }>(),
  { label: 'Kategori' },
)

/** The picked category id. */
const model = defineModel<string>({ required: true })

const options = computed<SelectOption<string | undefined>[]>(() =>
  props.categories.map((category) => ({
    value: category.id,
    label: category.name,
    data: category.icon,
  })),
)
</script>

<template>
  <SelectField v-model="model" :label="label" :placeholder="placeholder" :options="options">
    <template #value="{ option }">
      <span v-if="option.data">{{ option.data }}</span>
      <span class="text-ink truncate font-bold">{{ option.label }}</span>
    </template>
    <template #option="{ option }">
      <span v-if="option.data">{{ option.data }}</span>
      <span class="truncate">{{ option.label }}</span>
    </template>
  </SelectField>
</template>
