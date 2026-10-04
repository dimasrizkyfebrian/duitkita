import { authRequest } from '@/lib/http'

/** Returns null when the user has no avatar — a normal, common state
 * (`404 user has no avatar`), not an error worth surfacing to a caller
 * that's just trying to render a profile picture. */
export async function getAvatarUrl(userId: string): Promise<string | null> {
  try {
    const res = await authRequest<{ url: string }>(`/users/${userId}/avatar`)
    return res.url
  } catch {
    return null
  }
}
