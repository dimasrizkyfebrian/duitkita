<script setup lang="ts">
import { useBalanceVisibility } from '../composables/useBalanceVisibility'

// The eye button next to a balance. Every instance flips the same shared
// switch (see useBalanceVisibility).
withDefaults(defineProps<{ tone?: 'light' | 'dark' }>(), { tone: 'light' })

const { hidden, toggle } = useBalanceVisibility()
</script>

<template>
  <button
    type="button"
    class="focus-visible:ring-azure/30 -m-1.5 shrink-0 rounded-lg p-1.5 transition-colors focus-visible:ring-4 focus-visible:outline-none"
    :class="tone === 'dark' ? 'text-sky/70 hover:text-white' : 'text-muted hover:text-navy'"
    :aria-label="hidden ? 'Tampilkan saldo' : 'Sembunyikan saldo'"
    :aria-pressed="!hidden"
    @click.stop="toggle"
  >
    <svg
      viewBox="0 0 24 24"
      class="h-5 w-5"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M1.5 12S5.7 5.5 12 5.5 22.5 12 22.5 12 18.3 18.5 12 18.5 1.5 12 1.5 12Z" />
      <circle cx="12" cy="12" r="3.25" />
      <line v-if="hidden" x1="4.2" y1="19.8" x2="19.8" y2="4.2" />
    </svg>
  </button>
</template>
