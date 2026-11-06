<script setup lang="ts">
import { useId } from 'vue'
import AccountLogo from './AccountLogo.vue'
import type { PickableAccount } from '../types'

defineProps<{
  // Pickable accounts — normally the active ones. Empty means the user has
  // no accounts at all, and the whole row disappears so the form looks
  // exactly like it did before accounts existed.
  accounts: PickableAccount[]
}>()

/** The picked account id; `''` is "Tanpa akun". */
const model = defineModel<string>({ required: true })
const labelId = useId()

const chip =
  'rounded-control focus-visible:ring-azure/30 flex items-center gap-1.5 border px-3 py-2 text-[0.8125rem] font-bold transition-colors focus-visible:ring-4 focus-visible:outline-none'
const selected = 'border-navy bg-navy text-white'
const idle = 'border-hairline text-ink bg-white'
</script>

<template>
  <div v-if="accounts.length > 0" class="flex flex-col gap-2">
    <span :id="labelId" class="text-muted text-[0.6875rem] font-semibold tracking-widest uppercase">
      Dari akun
    </span>
    <div class="flex flex-wrap gap-2" role="group" :aria-labelledby="labelId">
      <button
        type="button"
        :aria-pressed="model === ''"
        :class="[chip, model === '' ? selected : idle]"
        @click="model = ''"
      >
        Tanpa akun
      </button>
      <button
        v-for="account in accounts"
        :key="account.id"
        type="button"
        :aria-pressed="model === account.id"
        :class="[chip, model === account.id ? selected : idle]"
        @click="model = account.id"
      >
        <AccountLogo :institution="account.institution" size="sm" />
        {{ account.name }}
      </button>
    </div>
  </div>
</template>
