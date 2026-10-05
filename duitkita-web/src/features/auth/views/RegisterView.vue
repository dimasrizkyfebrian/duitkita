<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '@/shared/layouts/AuthLayout.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import { useAuthStore } from '../stores/auth.store'

const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await auth.register({ name: name.value, email: email.value, password: password.value })
    toast.success('Akun kamu udah dibuat! Cek email buat kodenya ya.')
    router.push({ name: 'verify-otp', query: { email: email.value } })
  } catch (err) {
    toast.error(apiErrorMessage(err))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout
    eyebrow="Mulai dari sini"
    title="Bikin akun kamu"
    subtitle="Satu akun buat kamu, satu buat pasangan kamu. Nanti tinggal disambungin."
  >
    <form class="flex flex-col gap-5" @submit.prevent="onSubmit">
      <BaseInput
        v-model="name"
        label="Nama"
        autocomplete="name"
        placeholder="Nama panggilan kamu"
        required
      />
      <BaseInput
        v-model="email"
        label="Email"
        type="email"
        autocomplete="email"
        placeholder="kamu@email.com"
        required
      />
      <BaseInput
        v-model="password"
        label="Password"
        type="password"
        autocomplete="new-password"
        placeholder="••••••••"
        hint="Minimal 8 karakter."
        required
      />

      <BaseButton type="submit" :loading="loading" loading-label="Bikin akun...">
        Daftar
      </BaseButton>
    </form>

    <template #footer>
      Udah punya akun?
      <RouterLink :to="{ name: 'login' }" class="text-navy font-extrabold">Masuk</RouterLink>
    </template>
  </AuthLayout>
</template>
