import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '../api/auth.api'
import type { RegisterRequest, User } from '../types'

const REFRESH_TOKEN_KEY = 'duitkita.refresh_token'

export const useAuthStore = defineStore('auth', () => {
  // Access token lives in memory only — lost on reload by design, a fresh
  // one is minted from the refresh token during bootstrap. sessionId follows
  // the same lifetime — it's re-populated by that same bootstrap refresh.
  const accessToken = ref<string | null>(null)
  const sessionId = ref<string | null>(null)
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => accessToken.value !== null)

  function setSession(payload: {
    accessToken: string
    refreshToken: string
    sessionId: string
    user: User
  }) {
    accessToken.value = payload.accessToken
    sessionId.value = payload.sessionId
    user.value = payload.user
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken)
  }

  function clearSession() {
    accessToken.value = null
    sessionId.value = null
    user.value = null
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  async function login(email: string, password: string) {
    const res = await authApi.login({ email, password })
    setSession({
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      sessionId: res.session_id,
      user: res.user,
    })
  }

  /** Creates the account. No session yet — the email still has to be verified
   * with the OTP, which is what actually logs the user in. */
  async function register(payload: RegisterRequest) {
    await authApi.register(payload)
  }

  async function verifyOtp(email: string, otp: string) {
    const res = await authApi.verifyOtp({ email, otp })
    setSession({
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      sessionId: res.session_id,
      user: res.user,
    })
  }

  async function logout() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {
        // Best-effort — clear the local session regardless of server state.
      })
    }
    clearSession()
  }

  /** Exchanges the stored refresh token for a new access token. Used both by
   * the 401 interceptor and by app bootstrap (to restore a session on reload). */
  async function refreshSession() {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (!refreshToken) {
      throw new Error('no refresh token available')
    }
    const res = await authApi.refresh(refreshToken)
    setSession({
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
      sessionId: res.session_id,
      user: res.user,
    })
  }

  return {
    accessToken,
    sessionId,
    user,
    isAuthenticated,
    login,
    register,
    verifyOtp,
    logout,
    clearSession,
    refreshSession,
  }
})
