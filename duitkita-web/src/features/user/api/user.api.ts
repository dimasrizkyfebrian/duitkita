import { authRequest } from '@/lib/http'
import type { User } from '@/features/auth/types'
import type { NotificationPreferences, SecurityAuditLog, Session } from '../types'

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

export function getProfile() {
  return authRequest<User>('/users/me')
}

export function updateProfile(name: string) {
  return authRequest<User>('/users/me', { method: 'PATCH', body: { name } })
}

export function uploadAvatar(file: File) {
  const form = new FormData()
  form.append('avatar', file)
  return authRequest<User>('/users/me/avatar', { method: 'POST', body: form })
}

export function deleteAvatar() {
  return authRequest<void>('/users/me/avatar', { method: 'DELETE' })
}

export function changePassword(currentPassword: string, newPassword: string) {
  return authRequest<void>('/users/me/password', {
    method: 'PATCH',
    body: { current_password: currentPassword, new_password: newPassword },
  })
}

export function getNotificationPreferences() {
  return authRequest<NotificationPreferences>('/users/me/notification-preferences')
}

export function updateNotificationPreferences(patch: Partial<NotificationPreferences>) {
  return authRequest<NotificationPreferences>('/users/me/notification-preferences', {
    method: 'PATCH',
    body: patch,
  })
}

// These live under /auth/sessions rather than /users/me — a route-naming
// leftover from when sessions were purely an auth concern — but they're a
// user-settings feature now, so they're grouped with the rest of this file.

export function listSessions() {
  return authRequest<Session[]>('/auth/sessions')
}

export function revokeSession(id: string) {
  return authRequest<void>(`/auth/sessions/${id}`, { method: 'DELETE' })
}

export function revokeOtherSessions(currentSessionId: string) {
  return authRequest<void>(
    `/auth/sessions/others?current_session_id=${encodeURIComponent(currentSessionId)}`,
    { method: 'DELETE' },
  )
}

export function getSecurityAudit() {
  return authRequest<SecurityAuditLog[]>('/users/me/security-audit')
}
