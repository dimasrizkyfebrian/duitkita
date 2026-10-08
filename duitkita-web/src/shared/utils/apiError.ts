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
  'category not found': 'Kategorinya gak ketemu. Coba refresh dulu ya.',
  'budget not set for that category and period':
    'Kategori itu belum punya budget di bulan tersebut. Atur budgetnya dulu ya.',
  'expense not found': 'Pengeluarannya gak ketemu. Mungkin udah dihapus.',
  'budget already exists for this category and period': 'Budget kategori ini bulan ini udah ada.',
  'budget is already finalized': 'Budget ini udah dikunci, gak bisa diubah lagi.',
  'no linked partner': 'Kamu belum nyambung sama pasangan.',
  'invalid expense_date': 'Tanggalnya belum valid.',
  'you already have a linked partner': 'Kamu udah punya pasangan yang nyambung.',
  'no user found with that email': 'Gak ketemu akun dengan email itu.',
  'cannot invite yourself': 'Gak bisa ngundang diri sendiri ya.',
  'invitation not found': 'Undangannya gak ketemu.',
  'invitation is no longer pending': 'Undangan ini udah gak berlaku lagi.',
  'invitation has expired': 'Undangannya udah kedaluwarsa.',
  'category still has budgets set, delete those first':
    'Kategori ini masih punya budget yang diatur. Hapus budgetnya dulu ya.',
  'budget still has expenses recorded, delete those first':
    'Budget ini masih punya pengeluaran yang tercatat. Hapus pengeluarannya dulu ya.',
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Nama',
  email: 'Email',
  password: 'Password',
  newpassword: 'Password baru',
  currentpassword: 'Password lama',
  otp: 'Kode OTP',
  icon: 'Ikon',
}

/** Turns "Password: must be at least 8" into "Password minimal 8 karakter." */
function translateValidation(raw: string): string | null {
  const match = raw.match(/^(\w+):\s*(.+)$/)
  if (!match) {
    return null
  }

  const [, rawField, rawRule] = match
  if (!rawField || !rawRule) {
    return null
  }

  const field = FIELD_LABELS[rawField.toLowerCase()] ?? rawField

  if (rawRule === 'is required') return `${field} belum diisi.`
  if (rawRule === 'must be a valid email') return 'Format emailnya belum benar.'

  const min = rawRule.match(/^must be at least (\d+)$/)
  if (min?.[1]) return `${field} minimal ${min[1]} karakter.`

  const max = rawRule.match(/^must be at most (\d+)$/)
  if (max?.[1]) return `${field} maksimal ${max[1]} karakter.`

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
