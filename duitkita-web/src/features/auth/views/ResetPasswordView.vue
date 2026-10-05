<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthLayout from '@/shared/layouts/AuthLayout.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import BaseInput from '@/shared/components/BaseInput.vue'
import OtpInput from '@/shared/components/OtpInput.vue'
import { apiErrorMessage } from '@/shared/utils/apiError'
import { useToast } from '@/shared/composables/useToast'
import * as authApi from '../api/auth.api'
import { useOtpCooldown } from '../composables/useOtpCooldown'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const { remaining, start } = useOtpCooldown()

const email = String(route.query.email ?? '')

const otp = ref('')
const newPassword = ref('')
const invalid = ref(false)
const loading = ref(false)
const resending = ref(false)

watch(otp, () => {
  invalid.value = false
})

async function onSubmit() {
  loading.value = true
  try {
    await authApi.resetPassword({ email, otp: otp.value, new_password: newPassword.value })
    // Every session got revoked server-side, so there's nothing to restore —
    // they log in fresh with the new password.
    router.push({ name: 'login', query: { reset: '1' } })
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
    await authApi.resendOtp({ email, purpose: 'reset_password' })
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
    eyebrow="Bikin yang baru"
    title="Atur password baru"
    :subtitle="`Masukin kode yang kami kirim ke ${email}.`"
  >
    <form class="flex flex-col gap-5" @submit.prevent="onSubmit">
      <OtpInput v-model="otp" :invalid="invalid" />
      <BaseInput
        v-model="newPassword"
        label="Password baru"
        type="password"
        autocomplete="new-password"
        placeholder="••••••••"
        hint="Minimal 8 karakter."
        required
      />

      <BaseButton
        type="submit"
        :loading="loading"
        :disabled="otp.length !== 6"
        loading-label="Menyimpan..."
      >
        Simpan password baru
      </BaseButton>

      <BaseButton variant="ghost" :loading="resending" :disabled="remaining > 0" @click="onResend">
        {{ remaining > 0 ? `Kirim ulang dalam ${remaining}s` : 'Belum masuk? Kirim ulang' }}
      </BaseButton>
    </form>
  </AuthLayout>
</template>
