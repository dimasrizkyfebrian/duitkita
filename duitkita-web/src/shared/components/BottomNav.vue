<script setup lang="ts">
import { ref } from 'vue'
import { useToast } from '@/shared/composables/useToast'
import IconHome from '@/shared/icons/IconHome.vue'
import IconChart from '@/shared/icons/IconChart.vue'
import IconBell from '@/shared/icons/IconBell.vue'

defineProps<{
  // The signed-in user's avatar, passed down by whichever page renders this
  // nav (today only DashboardView, which already fetches it for the recent-
  // expenses feed) — keeps this component a dumb prop-driven shell instead
  // of reaching into feature stores/APIs itself.
  avatarUrl?: string | null
  avatarName?: string
}>()

const emit = defineEmits<{ catat: [] }>()

const toast = useToast()

// Only Beranda exists so far. The rest are shown so the shell reads as a real
// app, but they say so plainly instead of failing silently when tapped.
const items = [
  { key: 'beranda', label: 'Beranda', active: true, icon: IconHome },
  { key: 'laporan', label: 'Laporan', active: false, icon: IconChart },
] as const

const pengingat = { key: 'pengingat', label: 'Pengingat', active: false, icon: IconBell } as const

function onTap(label: string, active: boolean) {
  if (!active) {
    toast.error(`${label} belum jadi, masih kami garap ya.`)
  }
}

// Falls back to the initial if the avatar image fails to load (broken url,
// deleted file) — same pattern as the recent-expenses feed.
const avatarBroken = ref(false)
</script>

<template>
  <nav
    class="border-hairline bg-sheet/95 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur"
    style="padding-bottom: env(safe-area-inset-bottom)"
    aria-label="Navigasi utama"
  >
    <div class="mx-auto grid max-w-md grid-cols-5 items-end px-2 pt-2 pb-1.5">
      <button
        v-for="item in items"
        :key="item.key"
        type="button"
        class="flex flex-col items-center gap-1 rounded-lg py-1.5 text-[0.625rem] font-bold transition-colors"
        :class="item.active ? 'text-navy' : 'text-muted/70'"
        :aria-current="item.active ? 'page' : undefined"
        @click="onTap(item.label, item.active)"
      >
        <component :is="item.icon" class="h-5 w-5" />
        {{ item.label }}
      </button>

      <!-- Catat is the one thing people open this app to do, so it gets the
           centre slot and the only filled treatment in the bar — and it's a
           real action (emits to the parent), not a "belum jadi" placeholder
           like the rest of the nav. -->
      <div class="flex justify-center">
        <button
          type="button"
          class="bg-navy -mt-7 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_10px_24px_-8px_rgba(13,71,161,0.8)] transition-transform active:translate-y-px"
          aria-label="Catat pengeluaran"
          @click="emit('catat')"
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
        type="button"
        class="flex flex-col items-center gap-1 rounded-lg py-1.5 text-[0.625rem] font-bold transition-colors"
        :class="pengingat.active ? 'text-navy' : 'text-muted/70'"
        @click="onTap(pengingat.label, pengingat.active)"
      >
        <component :is="pengingat.icon" class="h-5 w-5" />
        {{ pengingat.label }}
      </button>

      <button
        type="button"
        class="text-muted/70 flex flex-col items-center gap-1 rounded-lg py-1.5 text-[0.625rem] font-bold transition-colors"
        @click="onTap('Profil', false)"
      >
        <img
          v-if="avatarUrl && !avatarBroken"
          :src="avatarUrl"
          :alt="avatarName || 'Profil'"
          class="h-5 w-5 rounded-full object-cover"
          @error="avatarBroken = true"
        />
        <span
          v-else
          class="bg-mist text-navy flex h-5 w-5 items-center justify-center rounded-full text-[0.5625rem] font-extrabold"
          aria-hidden="true"
        >
          {{ (avatarName || 'P').charAt(0).toUpperCase() }}
        </span>
        Profil
      </button>
    </div>
  </nav>
</template>
