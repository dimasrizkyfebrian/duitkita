package infrastructure

import (
	"fmt"
	"net/smtp"

	"duitkita-api/config"
)

// Mailer sends transactional emails (OTP codes) via SMTP.
type Mailer interface {
	Send(to, subject, body string) error
}

type smtpMailer struct {
	cfg config.SMTPConfig
}

func NewMailer(cfg config.SMTPConfig) Mailer {
	return &smtpMailer{cfg: cfg}
}

// Send delivers an HTML email. body is expected to already be a full HTML
// fragment (see service.otpEmailContent) — this just wraps it in the MIME
// envelope.
func (m *smtpMailer) Send(to, subject, body string) error {
	addr := m.cfg.Host + ":" + m.cfg.Port
	auth := smtp.PlainAuth("", m.cfg.User, m.cfg.AppPassword, m.cfg.Host)

	from := fmt.Sprintf("%s <%s>", m.cfg.FromName, m.cfg.User)
	msg := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=\"utf-8\"\r\n\r\n%s\r\n",
		from, to, subject, body,
	)

	return smtp.SendMail(addr, auth, m.cfg.User, []string{to}, []byte(msg))
}
