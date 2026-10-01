import axios from 'axios'

/**
 * Plain axios instance with no auth interceptors — for endpoints that run
 * before a session exists (register/login/refresh/logout/otp). Keeping this
 * separate from `http.ts` avoids a circular import, since the authenticated
 * client depends on the auth store, which depends on these calls.
 */
export const publicHttp = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
})
