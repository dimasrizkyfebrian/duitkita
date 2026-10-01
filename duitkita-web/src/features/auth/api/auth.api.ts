import { publicHttp } from '@/lib/publicHttp'
import type { ApiEnvelope } from '@/types/api'
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

export async function register(payload: RegisterRequest) {
  const res = await publicHttp.post<ApiEnvelope<RegisterResponse>>('/auth/register', payload)
  return res.data.data!
}

export async function login(payload: LoginRequest) {
  const res = await publicHttp.post<ApiEnvelope<AuthResponse>>('/auth/login', payload)
  return res.data.data!
}

export async function verifyOtp(payload: VerifyOtpRequest) {
  const res = await publicHttp.post<ApiEnvelope<AuthResponse>>('/auth/verify-otp', payload)
  return res.data.data!
}

export async function resendOtp(payload: ResendOtpRequest) {
  await publicHttp.post<ApiEnvelope<null>>('/auth/resend-otp', payload)
}

export async function forgotPassword(payload: ForgotPasswordRequest) {
  await publicHttp.post<ApiEnvelope<null>>('/auth/forgot-password', payload)
}

export async function resetPassword(payload: ResetPasswordRequest) {
  await publicHttp.post<ApiEnvelope<null>>('/auth/reset-password', payload)
}

export async function refresh(refreshToken: string) {
  const res = await publicHttp.post<ApiEnvelope<AuthResponse>>('/auth/refresh', {
    refresh_token: refreshToken,
  })
  return res.data.data!
}

export async function logout(refreshToken: string) {
  await publicHttp.post<ApiEnvelope<null>>('/auth/logout', { refresh_token: refreshToken })
}
