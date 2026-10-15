<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandMark from '@/shared/components/BrandMark.vue'
import BottomNav from '@/shared/components/BottomNav.vue'
import ReminderSheet from '../components/ReminderSheet.vue'
import ReminderListItem from '../components/ReminderListItem.vue'
import { useReminders } from '../composables/useReminders'
import { useAuthStore } from '@/features/auth/stores/auth.store'
import { getAvatarUrl } from '@/features/user/api/user.api'
import type { Reminder } from '../types'

const router = useRouter()
const auth = useAuthStore()
const myAvatarUrl = ref<string | null>(null)
if (auth.user) getAvatarUrl(auth.user.id).then((url) => (myAvatarUrl.value = url))

const { overdue, upcoming, done, loading, reload } = useReminders()

const sheetOpen = ref(false)
const editTarget = ref<Reminder | null>(null)

function openCreate() {
  editTarget.value = null
  sheetOpen.value = true
}

function openEdit(reminder: Reminder) {
  editTarget.value = reminder
  sheetOpen.value = true
}
</script>

<template>
  <main class="bg-ink relative min-h-screen overflow-hidden">
    <div
      class="pointer-events-none absolute inset-0"
      style="
        background-image:
          radial-gradient(circle at 100% 0%, rgba(33, 150, 243, 0.28), transparent 55%),
          radial-gradient(circle at 0% 100%, rgba(144, 202, 249, 0.12), transparent 45%);
      "
      aria-hidden="true"
    ></div>

    <div class="relative">
      <header class="safe-top flex items-center justify-between px-5 pb-4">
        <div class="flex items-center gap-2.5">
          <BrandMark :with-wordmark="false" />
          <h1 class="text-[1.375rem] font-extrabold tracking-tight text-white">Pengingat</h1>
        </div>
        <button
          type="button"
          class="bg-azure flex h-9 w-9 items-center justify-center rounded-full text-white shadow-[0_8px_18px_-6px_rgba(33,150,243,0.75)] transition-transform active:translate-y-px"
          aria-label="Tambah pengingat"
          @click="openCreate"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-5 w-5"
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
      </header>

      <section class="flex-1 px-5 pb-28">
        <div v-if="loading" class="flex flex-col gap-3">
          <div v-for="n in 3" :key="n" class="h-16 animate-pulse rounded-2xl bg-white/5"></div>
        </div>

        <div
          v-else-if="overdue.length === 0 && upcoming.length === 0 && done.length === 0"
          class="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-6 py-12 text-center"
        >
          <p class="text-[0.9375rem] font-bold text-white">Belum ada pengingat</p>
          <p class="text-sky/60 text-[0.8125rem] leading-relaxed">
            Bikin pengingat buat tagihan biar gak lupa bayar.
          </p>
        </div>

        <div v-else class="flex flex-col gap-6">
          <div v-if="overdue.length > 0" class="flex flex-col gap-2.5">
            <p class="text-danger text-[0.75rem] font-bold tracking-wide uppercase">
              Lewat jatuh tempo
            </p>
            <div class="flex flex-col gap-2">
              <ReminderListItem
                v-for="reminder in overdue"
                :key="reminder.id"
                :reminder="reminder"
                @tap="openEdit(reminder)"
              />
            </div>
          </div>

          <div v-if="upcoming.length > 0" class="flex flex-col gap-2.5">
            <p class="text-sky/60 text-[0.75rem] font-bold tracking-wide uppercase">Mendatang</p>
            <div class="flex flex-col gap-2">
              <ReminderListItem
                v-for="reminder in upcoming"
                :key="reminder.id"
                :reminder="reminder"
                @tap="openEdit(reminder)"
              />
            </div>
          </div>

          <div v-if="done.length > 0" class="flex flex-col gap-2.5">
            <p class="text-sky/60 text-[0.75rem] font-bold tracking-wide uppercase">Udah lunas</p>
            <div class="flex flex-col gap-2">
              <ReminderListItem
                v-for="reminder in done"
                :key="reminder.id"
                :reminder="reminder"
                @tap="openEdit(reminder)"
              />
            </div>
          </div>
        </div>
      </section>

      <BottomNav
        :avatar-url="myAvatarUrl"
        :avatar-name="auth.user?.name"
        @catat="router.push({ name: 'home' })"
      />
    </div>

    <ReminderSheet v-model:open="sheetOpen" :existing="editTarget" @saved="reload" />
  </main>
</template>
