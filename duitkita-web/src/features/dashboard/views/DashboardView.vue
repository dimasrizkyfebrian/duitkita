<script setup lang="ts">
import { useAuthStore } from '@/features/auth/stores/auth.store'

const auth = useAuthStore()
</script>

<template>
  <main class="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-4">
    <h1 class="text-xl font-semibold text-slate-900">Halo, {{ auth.user?.name }}</h1>
    <p class="text-sm text-slate-500">Dashboard — placeholder, fitur expenses/budgets menyusul.</p>
  </main>
</template>
