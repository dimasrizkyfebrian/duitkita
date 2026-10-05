<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/shared/composables/useToast'
import IconHome from '@/shared/icons/IconHome.vue'
import IconChart from '@/shared/icons/IconChart.vue'
import IconBell from '@/shared/icons/IconBell.vue'

defineProps<{
  // The signed-in user's avatar, passed down by whichever page renders this
  // nav — keeps this component a dumb prop-driven shell instead of reaching
  // into feature stores/APIs itself.
  avatarUrl?: string | null
  avatarName?: string
}>()

const emit = defineEmits<{ catat: [] }>()

const route = useRoute()
const router = useRouter()
const toast = useToast()

// Beranda and Profil are real pages; Laporan/Pengingat aren't built yet, so
// they stay as "belum jadi" placeholders instead of routing anywhere.
const items = [
  { key: 'beranda', label: 'Beranda', routeName: 'home', icon: IconHome },
  { key: 'laporan', label: 'Laporan', routeName: null, icon: IconChart },
] as const

const pengingat = { key: 'pengingat', label: 'Pengingat', routeName: null, icon: IconBell } as const

function isActive(routeName: string | null) {
  return routeName !== null && route.name === routeName
}

function onTap(item: { label: string; routeName: string | null }) {
  if (item.routeName) {
    router.push({ name: item.routeName })
  } else {
    toast.error(`${item.label} belum jadi, masih kami garap ya.`)
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
        :class="isActive(item.routeName) ? 'text-navy' : 'text-muted/70'"
        :aria-current="isActive(item.routeName) ? 'page' : undefined"
        @click="onTap(item)"
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
        :class="isActive(pengingat.routeName) ? 'text-navy' : 'text-muted/70'"
        @click="onTap(pengingat)"
      >
        <component :is="pengingat.icon" class="h-5 w-5" />
        {{ pengingat.label }}
      </button>

      <button
        type="button"
        class="flex flex-col items-center gap-1 rounded-lg py-1.5 text-[0.625rem] font-bold transition-colors"
        :class="isActive('profile') ? 'text-navy' : 'text-muted/70'"
        @click="router.push({ name: 'profile' })"
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
