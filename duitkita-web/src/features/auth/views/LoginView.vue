<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError } from '@/lib/request'
import AuthLayout from '@/shared/layouts/AuthLayout.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import { useAuthStore } from '../stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const email = ref('')
const password = ref('')
const loading = ref(false)

if (route.query.reset === '1') {
  toast.success('Password kamu udah diganti. Masuk pakai yang baru ya.')
}

async function onSubmit() {
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    toast.success('Yes, kamu berhasil masuk!')
    const redirect = route.query.redirect
    router.push(typeof redirect === 'string' ? redirect : '/')
  } catch (err) {
    // 403 means the account exists but was never verified — send them straight
    // to the OTP screen instead of making them figure that out themselves.
    if (err instanceof ApiError && err.status === 403) {
      toast.error('Email kamu belum diverifikasi. Kami bantu arahkan ya.')
      router.push({ name: 'verify-otp', query: { email: email.value } })
      return
    }
    toast.error(apiErrorMessage(err, 'Email atau password-nya belum cocok. Coba cek lagi ya.'))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout
    eyebrow="Selamat datang kembali"
    title="Masuk ke DuitKita"
    subtitle="Lanjut atur keuangan bareng, dari mana aja."
  >
    <form class="flex flex-col gap-5" @submit.prevent="onSubmit">
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
        autocomplete="current-password"
        placeholder="••••••••"
        required
      />

      <BaseButton type="submit" :loading="loading" loading-label="Sebentar ya...">
        Masuk
      </BaseButton>

      <RouterLink
        :to="{ name: 'forgot-password' }"
        class="text-azure -mt-1 text-center text-[0.8125rem] font-semibold"
      >
        Lupa password?
      </RouterLink>
    </form>

    <template #footer>
      Belum punya akun?
      <RouterLink :to="{ name: 'register' }" class="text-navy font-extrabold">
        Daftar dulu
      </RouterLink>
    </template>
  </AuthLayout>
</template>
