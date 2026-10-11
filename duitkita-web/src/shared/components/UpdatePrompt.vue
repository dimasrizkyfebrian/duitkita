<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'

// registerType is 'prompt' (see vite.config.ts) specifically so this is the
// only place a new service worker ever takes over an open session — never
// silently mid-request. updateServiceWorker(true) tells the waiting worker
// to skip waiting and reloads once it's in control.
const { needRefresh, updateServiceWorker } = useRegisterSW()

function reload() {
  updateServiceWorker(true)
}

function dismiss() {
  needRefresh.value = false
}
</script>

<template>
  <div
    v-if="needRefresh"
    class="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4"
    style="padding-bottom: calc(env(safe-area-inset-bottom) + 5.5rem)"
  >
    <div
      class="bg-navy pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-control px-4 py-3 text-white shadow-[0_14px_32px_-12px_rgba(7,28,60,0.55)]"
      role="status"
    >
      <p class="flex-1 text-[0.8125rem] leading-snug font-semibold text-white">
        Ada versi baru DuitKita. Reload buat update ya.
      </p>
      <button
        type="button"
        class="rounded-control shrink-0 bg-white/15 px-3 py-2 text-[0.75rem] font-bold text-white transition-colors active:bg-white/25"
        @click="reload"
      >
        Reload
      </button>
      <button
        type="button"
        class="text-white/75 hover:text-white -mr-1 shrink-0 rounded p-1 transition-colors"
        aria-label="Nanti aja"
        @click="dismiss"
      >
        <svg
          viewBox="0 0 24 24"
          class="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </svg>
      </button>
    </div>
  </div>
</template>
