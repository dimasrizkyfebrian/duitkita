<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/shared/layouts/AuthLayout.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import OtpInput from '@/shared/components/OtpInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import * as authApi from '../api/auth.api'
import { useOtpCooldown } from '../composables/useOtpCooldown'
import { useAuthStore } from '../stores/auth.store'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()
const { remaining, start } = useOtpCooldown()

// Carried through the query string so a reload (or the PWA being backgrounded)
// doesn't lose track of which account is being verified.
const email = String(route.query.email ?? '')

const otp = ref('')
const invalid = ref(false)
const loading = ref(false)
const resending = ref(false)

// Clear the red state as soon as they start correcting the code.
watch(otp, () => {
  invalid.value = false
})

async function onSubmit() {
  loading.value = true
  try {
    await auth.verifyOtp(email, otp.value)
    toast.success('Akun kamu udah aktif. Selamat datang!')
    router.push('/')
  } catch (err) {
    invalid.value = true
    toast.error(apiErrorMessage(err, 'Kodenya belum pas. Coba cek lagi ya.'))
  } finally {
    loading.value = false
  }
}

async function onResend() {
  resending.value = true
  try {
    await authApi.resendOtp({ email, purpose: 'register' })
    toast.success('Kode baru udah dikirim, cek email kamu ya.')
    start()
  } catch (err) {
    toast.error(apiErrorMessage(err))
  } finally {
    resending.value = false
  }
}
</script>

<template>
  <AuthLayout
    eyebrow="Satu langkah lagi"
    title="Cek email kamu"
    subtitle="Kami kirim 6 digit kode buat mastiin ini beneran kamu."
  >
    <p class="text-muted mb-5 text-[0.8125rem]">
      Dikirim ke <span class="text-navy font-extrabold">{{ email }}</span>
    </p>

    <form class="flex flex-col gap-5" @submit.prevent="onSubmit">
      <OtpInput v-model="otp" :invalid="invalid" />

      <BaseButton
        type="submit"
        :loading="loading"
        :disabled="otp.length !== 6"
        loading-label="Mengecek kode..."
      >
        Verifikasi
      </BaseButton>

      <BaseButton variant="ghost" :loading="resending" :disabled="remaining > 0" @click="onResend">
        {{ remaining > 0 ? `Kirim ulang dalam ${remaining}s` : 'Belum masuk? Kirim ulang' }}
      </BaseButton>
    </form>
  </AuthLayout>
</template>
