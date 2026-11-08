<script setup lang="ts">
import { computed } from 'vue'
import SelectField from '@/shared/components/SelectField.vue'
import type { SelectOption } from '@/shared/components/selectOption'
import AccountLogo from './AccountLogo.vue'
import type { PickableAccount } from '../types'

const props = withDefaults(
  defineProps<{
    // Pickable accounts — normally the active ones. Empty means the user has
    // no accounts at all, and the whole row disappears so the form looks
    // exactly like it did before accounts existed.
    accounts: PickableAccount[]
    label?: string
    // Whether "Tanpa akun" is offered. Off where an account is mandatory.
    allowNone?: boolean
  }>(),
  { label: 'Dari akun', allowNone: true },
)

/** The picked account id; `''` is "Tanpa akun". */
const model = defineModel<string>({ required: true })

type AccountData = PickableAccount['institution']

const options = computed<SelectOption<AccountData>[]>(() => {
  const accountOptions = props.accounts.map((account) => ({
    value: account.id,
    label: account.name,
    data: account.institution,
  }))
  return props.allowNone ? [{ value: '', label: 'Tanpa akun' }, ...accountOptions] : accountOptions
})
</script>

<template>
  <SelectField v-if="accounts.length > 0" v-model="model" :label="label" :options="options">
    <template #value="{ option }">
      <AccountLogo v-if="option.data" :institution="option.data" size="sm" />
      <span class="text-ink truncate font-bold">{{ option.label }}</span>
    </template>
    <template #option="{ option }">
      <AccountLogo v-if="option.data" :institution="option.data" size="sm" />
      <span class="truncate">{{ option.label }}</span>
    </template>
  </SelectField>
</template>
