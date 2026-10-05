<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AuthLayout from '@/shared/layouts/AuthLayout.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import * as authApi from '../api/auth.api'

const router = useRouter()
const toast = useToast()

const email = ref('')
const loading = ref(false)

async function onSubmit() {
  loading.value = true
  try {
    await authApi.forgotPassword({ email: email.value })
    toast.success('Kode udah dikirim, cek email kamu ya.')
    router.push({ name: 'reset-password', query: { email: email.value } })
  } catch (err) {
    toast.error(apiErrorMessage(err))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthLayout
    eyebrow="Tenang aja"
    title="Lupa password?"
    subtitle="Masukin email kamu, nanti kami kirim kode buat bikin password baru."
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

      <BaseButton type="submit" :loading="loading" loading-label="Mengirim kode...">
        Kirim kode
      </BaseButton>
    </form>

    <template #footer>
      Udah inget password-nya?
      <RouterLink :to="{ name: 'login' }" class="text-navy font-extrabold">
        Balik ke masuk
      </RouterLink>
    </template>
  </AuthLayout>
</template>
