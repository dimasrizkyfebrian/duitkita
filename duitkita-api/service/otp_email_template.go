package service

import "fmt"

// Brand palette (matches the planned frontend).
const (
	colorPrimaryDark = "#0D47A1"
	colorPrimary     = "#2196F3"
	colorPrimarySoft = "#90CAF9"
	colorBackground  = "#E3F2FD"
)

// otpEmailContent builds the subject + HTML body for an OTP email. The
// copy is deliberately casual (Bahasa Indonesia) — this app is just for the
// two of us, not a big SaaS product.
func otpEmailContent(purpose OTPPurpose, code string, ttlMinutes int) (subject, body string) {
	switch purpose {
	case OTPPurposeResetPassword:
		return "DuitKita - Kode Reset Password", otpEmailHTML(
			"Reset Password",
			"Ada yang mau ganti password nih 👀",
			"Kamu (atau seseorang yang tau emailmu) minta reset password akun DuitKita. Masukin kode di bawah ini buat lanjut:",
			code,
			ttlMinutes,
			"Bukan kamu yang minta? Santai aja, abaikan email ini — passwordmu tetap aman selama kamu gak share kode ini ke siapa pun.",
		)
	default:
		return "DuitKita - Kode Verifikasi Email", otpEmailHTML(
			"Verifikasi Email",
			"Yuk, satu langkah lagi! 🎉",
			"Makasih udah daftar di DuitKita. Sebelum mulai atur keuangan bareng pasangan, verifikasi dulu email kamu pakai kode berikut:",
			code,
			ttlMinutes,
			"Gak ngerasa daftar akun ini? Abaikan aja email ini, gak ada yang perlu kamu lakuin.",
		)
	}
}

func otpEmailHTML(headerTitle, greeting, intro, code string, ttlMinutes int, footnote string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background-color:%[1]s;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:%[1]s;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(13,71,161,0.08);">
            <tr>
              <td style="background-color:%[2]s;padding:24px 32px;">
                <p style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">DuitKita 💙</p>
                <p style="margin:4px 0 0;color:%[3]s;font-size:13px;">%[4]s</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 16px;color:%[2]s;font-size:18px;font-weight:600;">%[5]s</p>
                <p style="margin:0 0 24px;color:#455A64;font-size:14px;line-height:1.6;">%[6]s</p>
                <div style="text-align:center;margin:0 0 24px;">
                  <span style="display:inline-block;background-color:%[7]s;color:#ffffff;font-size:32px;font-weight:700;letter-spacing:8px;padding:16px 24px;border-radius:8px;">%[8]s</span>
                </div>
                <p style="margin:0 0 24px;color:#78909C;font-size:13px;text-align:center;">Kode ini berlaku selama <strong>%[9]d menit</strong>.</p>
                <hr style="border:none;border-top:1px solid %[3]s;margin:0 0 16px;" />
                <p style="margin:0;color:#90A4AE;font-size:12px;line-height:1.5;">%[10]s</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;color:%[2]s;font-size:12px;">Dikirim otomatis dari DuitKita, jangan dibales ya 🙂</p>
        </td>
      </tr>
    </table>
  </body>
</html>`, colorBackground, colorPrimaryDark, colorPrimarySoft, headerTitle, greeting, intro, colorPrimary, code, ttlMinutes, footnote)
}
