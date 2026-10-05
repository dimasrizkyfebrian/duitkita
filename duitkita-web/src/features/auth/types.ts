export interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
  created_at: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  // Identifies this login's own row in the sessions list — the access
  // token itself carries no session identity, only the user's.
  session_id: string
  user: User
}

export interface RegisterResponse {
  email: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface VerifyOtpRequest {
  email: string
  otp: string
}

export interface ResendOtpRequest {
  email: string
  purpose: 'register' | 'reset_password'
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  email: string
  otp: string
  new_password: string
}
