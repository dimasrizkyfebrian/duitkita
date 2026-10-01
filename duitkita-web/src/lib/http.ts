import { useAuthStore } from '@/features/auth/stores/auth.store'
import { ApiError, request, type RequestOptions } from './request'

// Shared so parallel requests that all hit a stale access token trigger exactly
// one refresh instead of a stampede.
let refreshPromise: Promise<void> | null = null

/**
 * Authenticated request: attaches the access token and, on a 401, refreshes
 * the session once and replays the call with the new token.
 */
export async function authRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const auth = useAuthStore()

  const withAuth = (): RequestOptions => ({
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${auth.accessToken}` },
  })

  try {
    return await request<T>(path, withAuth())
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) {
      throw error
    }

    try {
      refreshPromise ??= auth.refreshSession().finally(() => {
        refreshPromise = null
      })
      await refreshPromise
    } catch (refreshError) {
      auth.clearSession()
      throw refreshError
    }

    return await request<T>(path, withAuth())
  }
}
