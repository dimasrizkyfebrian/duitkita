<script setup lang="ts">
import { useRouter } from 'vue-router'
import BaseButton from '@/shared/components/BaseButton.vue'
import BrandMark from '@/shared/components/BrandMark.vue'
import { useToast } from '@/shared/composables/useToast'
import { useAuthStore } from '@/features/auth/stores/auth.store'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

async function onLogout() {
  await auth.logout()
  toast.success('Kamu udah keluar. Sampai ketemu lagi!')
  router.push({ name: 'login' })
}
</script>

<template>
  <main class="bg-ink flex min-h-screen flex-col">
    <header class="safe-top px-6 pb-9">
      <BrandMark />
      <h1 class="mt-9 text-[1.75rem] leading-[1.15] font-extrabold tracking-tight text-white">
        Hai, {{ auth.user?.name }}!
      </h1>
      <p class="text-sky/85 mt-2.5 text-[0.9375rem]">Senang kamu balik lagi.</p>
    </header>

    <section class="bg-sheet rounded-t-sheet safe-bottom mt-auto flex flex-col gap-5 px-6 pt-8">
      <p class="text-muted text-[0.9375rem] leading-relaxed">
        Belum ada apa-apa di sini. Fitur catat pengeluaran dan budget bareng nyusul ya.
      </p>

      <BaseButton variant="ghost" @click="onLogout">Keluar</BaseButton>
    </section>
  </main>
</template>
