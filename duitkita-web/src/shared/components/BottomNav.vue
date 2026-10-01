<script setup lang="ts">
import { useToast } from '@/shared/composables/useToast'

const toast = useToast()

// Only Beranda exists so far. The rest are shown so the shell reads as a real
// app, but they say so plainly instead of failing silently when tapped.
const items = [
  { key: 'beranda', label: 'Beranda', active: true },
  { key: 'laporan', label: 'Laporan', active: false },
  { key: 'pengingat', label: 'Pengingat', active: false },
  { key: 'profil', label: 'Profil', active: false },
] as const

function onTap(label: string, active: boolean) {
  if (!active) {
    toast.error(`${label} belum jadi, masih kami garap ya.`)
  }
}
</script>

<template>
  <nav
    class="border-hairline bg-sheet/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur"
    style="padding-bottom: env(safe-area-inset-bottom)"
    aria-label="Navigasi utama"
  >
    <div class="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-2 pb-1.5">
      <button
        v-for="item in items.slice(0, 2)"
        :key="item.key"
        type="button"
        class="flex flex-col items-center gap-1 rounded-lg py-1.5 text-[0.625rem] font-bold transition-colors"
        :class="item.active ? 'text-navy' : 'text-muted/70'"
        :aria-current="item.active ? 'page' : undefined"
        @click="onTap(item.label, item.active)"
      >
        <span
          class="h-1.5 w-1.5 rounded-full transition-colors"
          :class="item.active ? 'bg-azure' : 'bg-transparent'"
          aria-hidden="true"
        ></span>
        {{ item.label }}
      </button>

      <!-- Catat is the one thing people open this app to do, so it gets the
           centre slot and the only filled treatment in the bar. -->
      <div class="flex justify-center">
        <button
          type="button"
          class="bg-navy -mt-7 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_10px_24px_-8px_rgba(13,71,161,0.8)] transition-transform active:translate-y-px"
          aria-label="Catat pengeluaran"
          @click="onTap('Catat pengeluaran', false)"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-6 w-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      <button
        v-for="item in items.slice(2)"
        :key="item.key"
        type="button"
        class="flex flex-col items-center gap-1 rounded-lg py-1.5 text-[0.625rem] font-bold transition-colors"
        :class="item.active ? 'text-navy' : 'text-muted/70'"
        @click="onTap(item.label, item.active)"
      >
        <span
          class="h-1.5 w-1.5 rounded-full transition-colors"
          :class="item.active ? 'bg-azure' : 'bg-transparent'"
          aria-hidden="true"
        ></span>
        {{ item.label }}
      </button>
    </div>
  </nav>
</template>
