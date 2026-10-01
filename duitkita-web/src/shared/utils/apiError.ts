import { ApiError, NetworkError } from '@/lib/request'

/**
 * The API speaks English (it's also what lands in logs and the OpenAPI spec),
 * but the UI speaks casual Indonesian. This is the translation layer — an
 * unmapped message falls back to something friendly rather than leaking raw
 * backend copy to the user.
 */
const MESSAGES: Record<string, string> = {
  'invalid email or password': 'Email atau password-nya belum cocok. Coba cek lagi ya.',
  'email not verified, please verify your account first':
    'Email kamu belum diverifikasi. Kami bantu arahkan ya.',
  'email already registered': 'Email ini udah kedaftar. Coba masuk aja.',
  'user not found': 'Akunnya gak ketemu. Coba cek emailnya lagi.',
  'account already verified': 'Akun ini udah terverifikasi. Langsung masuk aja.',
  'invalid otp': 'Kodenya belum pas. Coba cek lagi ya.',
  'otp expired or not found, please request a new one':
    'Kodenya udah kedaluwarsa. Minta kode baru ya.',
  'too many incorrect attempts, please request a new otp':
    'Udah kebanyakan salah. Minta kode baru dulu ya.',
  'please wait before requesting another otp': 'Sabar sebentar ya, kodenya baru aja dikirim.',
  'session expired or revoked': 'Sesi kamu udah berakhir. Masuk lagi ya.',
  'invalid refresh token': 'Sesi kamu udah gak berlaku. Masuk lagi ya.',
  'malformed refresh token': 'Sesi kamu bermasalah. Masuk lagi ya.',
  'current password is incorrect': 'Password lama kamu belum pas.',
  'too many requests': 'Kebanyakan percobaan. Tunggu sebentar ya.',
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nama',
  email: 'Email',
  password: 'Password',
  newpassword: 'Password baru',
  otp: 'Kode OTP',
}

/** Turns "Password: must be at least 8" into "Password minimal 8 karakter." */
function translateValidation(raw: string): string | null {
  const match = raw.match(/^(\w+):\s*(.+)$/)
  if (!match) {
    return null
  }

  const field = FIELD_LABELS[match[1].toLowerCase()] ?? match[1]
  const rule = match[2]

  if (rule === 'is required') return `${field} belum diisi.`
  if (rule === 'must be a valid email') return 'Format emailnya belum benar.'

  const min = rule.match(/^must be at least (\d+)$/)
  if (min) return `${field} minimal ${min[1]} karakter.`

  const max = rule.match(/^must be at most (\d+)$/)
  if (max) return `${field} maksimal ${max[1]} karakter.`

  return null
}

export function apiErrorMessage(error: unknown, fallback = 'Aduh, ada yang error. Coba lagi ya.') {
  if (error instanceof NetworkError) {
    return 'Gagal nyambung ke server. Cek koneksi kamu ya.'
  }

  if (error instanceof ApiError) {
    const raw = error.envelope?.error
    if (raw) {
      const known = MESSAGES[raw.toLowerCase()] ?? translateValidation(raw)
      if (known) {
        return known
      }
      // Keep the original reachable for debugging without showing it to the user.
      console.warn('[api] untranslated error message:', raw)
    }
  }

  return fallback
}
