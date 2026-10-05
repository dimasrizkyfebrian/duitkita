import { request } from '@/lib/request'
import type {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
  ResendOtpRequest,
  ResetPasswordRequest,
  VerifyOtpRequest,
} from '../types'

// These all run before a session exists (or, for logout, when the access token
// may already be expired), so they use the plain client with no auth header.

export function register(payload: RegisterRequest) {
  return request<RegisterResponse>('/auth/register', { method: 'POST', body: payload })
}

export function login(payload: LoginRequest) {
  return request<AuthResponse>('/auth/login', { method: 'POST', body: payload })
}

export function verifyOtp(payload: VerifyOtpRequest) {
  return request<AuthResponse>('/auth/verify-otp', { method: 'POST', body: payload })
}

export function resendOtp(payload: ResendOtpRequest) {
  return request<void>('/auth/resend-otp', { method: 'POST', body: payload })
}

export function forgotPassword(payload: ForgotPasswordRequest) {
  return request<void>('/auth/forgot-password', { method: 'POST', body: payload })
}

export function resetPassword(payload: ResetPasswordRequest) {
  return request<void>('/auth/reset-password', { method: 'POST', body: payload })
}

export function refresh(refreshToken: string) {
  return request<AuthResponse>('/auth/refresh', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  })
}

export function logout(refreshToken: string) {
  return request<void>('/auth/logout', { method: 'POST', body: { refresh_token: refreshToken } })
}
