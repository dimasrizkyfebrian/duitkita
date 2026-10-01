import { describe, expect, it, vi } from 'vitest'
import { ApiError, NetworkError } from '@/lib/request'
import { apiErrorMessage } from '../apiError'

function apiError(status: number, message: string) {
  return new ApiError(status, { success: false, error: message })
}

describe('apiErrorMessage', () => {
  it('translates known backend messages to Indonesian', () => {
    expect(apiErrorMessage(apiError(401, 'invalid email or password'))).toBe(
      'Email atau password-nya belum cocok. Coba cek lagi ya.',
    )
    expect(apiErrorMessage(apiError(409, 'email already registered'))).toBe(
      'Email ini udah kedaftar. Coba masuk aja.',
    )
  })

  it('matches case-insensitively', () => {
    expect(apiErrorMessage(apiError(401, 'Invalid Email Or Password'))).toBe(
      'Email atau password-nya belum cocok. Coba cek lagi ya.',
    )
  })

  it('translates field validation errors', () => {
    expect(apiErrorMessage(apiError(400, 'Password: must be at least 8'))).toBe(
      'Password minimal 8 karakter.',
    )
    expect(apiErrorMessage(apiError(400, 'Email: must be a valid email'))).toBe(
      'Format emailnya belum benar.',
    )
    expect(apiErrorMessage(apiError(400, 'Name: is required'))).toBe('Nama belum diisi.')
  })

  it('explains network failures', () => {
    expect(apiErrorMessage(new NetworkError())).toBe(
      'Gagal nyambung ke server. Cek koneksi kamu ya.',
    )
  })

  it('never leaks untranslated English to the user', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const message = apiErrorMessage(apiError(500, 'some brand new backend failure'))

    expect(message).toBe('Aduh, ada yang error. Coba lagi ya.')
    expect(message).not.toContain('backend failure')
    expect(warn).toHaveBeenCalled()

    warn.mockRestore()
  })

  it('uses the caller-supplied fallback when provided', () => {
    expect(apiErrorMessage(apiError(400, 'unmapped thing'), 'Kodenya belum pas.')).toBe(
      'Kodenya belum pas.',
    )
  })
})
