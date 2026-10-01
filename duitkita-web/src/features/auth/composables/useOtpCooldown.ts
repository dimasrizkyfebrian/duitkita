import { onUnmounted, ref } from 'vue'

/** Mirrors the backend's OTP resend cooldown so the button stays disabled
 * instead of letting the user fire requests that will just 429. */
export function useOtpCooldown(seconds = 60) {
  const remaining = ref(0)
  let timer: ReturnType<typeof setInterval> | undefined

  function start() {
    remaining.value = seconds
    clearInterval(timer)
    timer = setInterval(() => {
      remaining.value -= 1
      if (remaining.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  }

  onUnmounted(() => clearInterval(timer))

  return { remaining, start }
}
