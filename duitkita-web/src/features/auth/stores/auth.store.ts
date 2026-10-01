import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import * as authApi from '../api/auth.api'
import type { User } from '../types'

const REFRESH_TOKEN_KEY = 'duitkita.refresh_token'

export const useAuthStore = defineStore('auth', () => {
  // Access token lives in memory only — lost on reload by design, a fresh
  // one is minted from the refresh token during bootstrap.
  const accessToken = ref<string | null>(null)
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => accessToken.value !== null)

  function setSession(payload: { accessToken: string; refreshToken: string; user: User }) {
    accessToken.value = payload.accessToken
    user.value = payload.user
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken)
  }

  function clearSession() {
    accessToken.value = null
    user.value = null
    localStorage.removeItem(REFRESH_TOKEN_KEY)
  }

  async function login(email: string, password: string) {
    const res = await authApi.login({ email, password })
    setSession({ accessToken: res.access_token, refreshToken: res.refresh_token, user: res.user })
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
    setSession({ accessToken: res.access_token, refreshToken: res.refresh_token, user: res.user })
  }

  return {
    accessToken,
    user,
    isAuthenticated,
    login,
    logout,
    clearSession,
    refreshSession,
  }
})
