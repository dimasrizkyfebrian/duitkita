export interface NotificationPreferences {
  budget_alert: boolean
  partner_activity: boolean
  weekly_summary: boolean
  reminder_alert: boolean
  recurring_alert: boolean
}

export interface Session {
  id: string
  device_name?: string
  ip_address?: string
  user_agent?: string
  last_active_at: string
  created_at: string
  // Backend-computed flag that's currently always false (the access token
  // carries no session identity to compare against) — the UI determines
  // "this device" itself by comparing `id` against the auth store's own
  // sessionId instead of trusting this field.
  is_current: boolean
}

export type SecurityAuditEventType =
  | 'register_success'
  | 'login_success'
  | 'login_failure'
  | 'password_changed'
  | 'session_revoked'
  | 'sessions_revoked_others'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_rejected'
  | 'invitation_cancelled'
  | 'partner_linked'
  | 'partner_unlinked'

export interface SecurityAuditLog {
  id: string
  event_type: SecurityAuditEventType
  ip_address?: string
  user_agent?: string
  created_at: string
}
