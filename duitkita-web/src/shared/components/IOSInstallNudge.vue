<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthStore } from '@/features/auth/stores/auth.store'

// iOS Safari only exposes the Push API to a PWA that's been added to the
// Home Screen — a tab open in regular Safari can never subscribe, no
// matter what we do in JS. This banner is the only way those users find
// out why the push toggle in Profil never seems to do anything.
const DISMISSED_KEY = 'duitkita_ios_install_nudge_dismissed'

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window)
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function wasDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

const auth = useAuthStore()
// Platform/dismissal state can't change mid-session, but auth state can —
// App.vue (and this component) mounts once for the whole SPA lifetime, so
// a user who logs in without reloading must still make this reactive, not
// a value frozen at setup time from whatever auth.isAuthenticated was then.
const eligiblePlatform = isIOS() && !isStandalone()
const dismissed = ref(wasDismissed())
const visible = computed(() => auth.isAuthenticated && eligiblePlatform && !dismissed.value)

function dismiss() {
  dismissed.value = true
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // Private browsing or storage disabled — worst case it shows again
    // next visit, not worth a toast over.
  }
}
</script>

<template>
  <div v-if="visible" class="safe-top fixed inset-x-0 top-0 z-50 flex justify-center px-4">
    <div
      class="bg-navy flex w-full max-w-sm items-start gap-3 rounded-control px-4 py-3 text-white shadow-[0_14px_32px_-12px_rgba(7,28,60,0.55)]"
      role="status"
    >
      <p class="flex-1 text-[0.8125rem] leading-snug font-semibold text-white">
        Biar notifikasi bisa nyala di iPhone, tambahin DuitKita ke Home Screen dulu ya — tap tombol
        Share
        <span aria-hidden="true">⬆️</span>
        di Safari, lalu pilih "Add to Home Screen".
      </p>
      <button
        type="button"
        class="text-white/75 hover:text-white -mr-1 -mt-0.5 shrink-0 rounded p-1 transition-colors"
        aria-label="Tutup"
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
