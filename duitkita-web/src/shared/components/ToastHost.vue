<script setup lang="ts">
import { useToast } from '@/shared/composables/useToast'

const { items, dismiss } = useToast()
</script>

<template>
  <!-- Anchored to the top: the primary action sits at the bottom of the sheet,
       and a toast down there would cover the thing the user just pressed. -->
  <div
    class="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4"
    style="padding-top: calc(env(safe-area-inset-top) + 0.75rem)"
  >
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="-translate-y-3 opacity-0"
      leave-active-class="transition duration-200 ease-in absolute"
      leave-to-class="-translate-y-2 opacity-0"
      move-class="transition duration-200"
    >
      <div
        v-for="toast in items"
        :key="toast.id"
        :role="toast.type === 'error' ? 'alert' : 'status'"
        :aria-live="toast.type === 'error' ? 'assertive' : 'polite'"
        class="rounded-control pointer-events-auto flex w-full max-w-sm items-center gap-3 px-4 py-3 text-white shadow-[0_14px_32px_-12px_rgba(7,28,60,0.55)]"
        :class="toast.type === 'success' ? 'bg-success' : 'bg-danger'"
      >
        <span
          class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-3.5 w-3.5 text-white"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline v-if="toast.type === 'success'" points="4 12.5 9.5 18 20 6.5" />
            <template v-else>
              <line x1="12" y1="6" x2="12" y2="13.5" />
              <line x1="12" y1="18" x2="12" y2="18" />
            </template>
          </svg>
        </span>

        <p class="flex-1 text-[0.8125rem] leading-snug font-semibold text-white">
          {{ toast.message }}
        </p>

        <button
          type="button"
          class="text-white/75 hover:text-white -mr-1 shrink-0 rounded p-1 transition-colors"
          aria-label="Tutup notifikasi"
          @click="dismiss(toast.id)"
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
    </TransitionGroup>
  </div>
</template>
