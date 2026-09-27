package service

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"

	"duitkita-api/config"
	"duitkita-api/utils"
)

// Mailer sends transactional emails. Structurally satisfied by
// infrastructure.Mailer — kept local to avoid service importing
// infrastructure (which already imports service for the DI container).
type Mailer interface {
	Send(to, subject, body string) error
}

type OTPPurpose string

const (
	OTPPurposeRegister      OTPPurpose = "register"
	OTPPurposeResetPassword OTPPurpose = "reset_password"

	otpCodeLength = 6
)

type OTPService interface {
	// Generate creates a new OTP, stores its hash in Redis, and emails it to the user.
	Generate(ctx context.Context, email string, purpose OTPPurpose) error
	// Verify checks the submitted code against the stored hash. On success the
	// OTP is consumed (deleted) so it can't be reused.
	Verify(ctx context.Context, email string, purpose OTPPurpose, code string) error
}

type otpService struct {
	redis  *redis.Client
	mailer Mailer
	cfg    config.OTPConfig
}

func NewOTPService(redisClient *redis.Client, mailer Mailer, cfg config.OTPConfig) OTPService {
	return &otpService{redis: redisClient, mailer: mailer, cfg: cfg}
}

func (s *otpService) Generate(ctx context.Context, email string, purpose OTPPurpose) error {
	cooldownKey := otpCooldownKey(purpose, email)
	cooldown := time.Duration(s.cfg.ResendCooldownSeconds) * time.Second
	acquired, err := s.redis.SetNX(ctx, cooldownKey, "1", cooldown).Result()
	if err != nil {
		return utils.ErrInternal("failed to check otp cooldown")
	}
	if !acquired {
		return utils.ErrTooManyRequests("please wait before requesting another otp")
	}

	code, err := utils.GenerateOTPCode(otpCodeLength)
	if err != nil {
		return utils.ErrInternal("failed to generate otp")
	}

	ttl := time.Duration(s.cfg.TTLMinutes) * time.Minute
	codeKey := otpCodeKey(purpose, email)
	attemptsKey := otpAttemptsKey(purpose, email)

	if err := s.redis.Set(ctx, codeKey, utils.HashToken(code), ttl).Err(); err != nil {
		return utils.ErrInternal("failed to store otp")
	}
	s.redis.Del(ctx, attemptsKey)

	subject, body := otpEmailContent(purpose, code, s.cfg.TTLMinutes)
	if err := s.mailer.Send(email, subject, body); err != nil {
		return utils.ErrInternal("failed to send otp email")
	}

	return nil
}

func (s *otpService) Verify(ctx context.Context, email string, purpose OTPPurpose, code string) error {
	codeKey := otpCodeKey(purpose, email)
	attemptsKey := otpAttemptsKey(purpose, email)

	storedHash, err := s.redis.Get(ctx, codeKey).Result()
	if err == redis.Nil {
		return utils.ErrBadRequest("otp expired or not found, please request a new one")
	}
	if err != nil {
		return utils.ErrInternal("failed to verify otp")
	}

	if utils.HashToken(code) != storedHash {
		attempts, incrErr := s.redis.Incr(ctx, attemptsKey).Result()
		if incrErr == nil && attempts == 1 {
			s.redis.Expire(ctx, attemptsKey, time.Duration(s.cfg.TTLMinutes)*time.Minute)
		}
		if incrErr == nil && attempts >= int64(s.cfg.MaxAttempts) {
			s.redis.Del(ctx, codeKey, attemptsKey)
			return utils.ErrBadRequest("too many incorrect attempts, please request a new otp")
		}
		return utils.ErrBadRequest("invalid otp")
	}

	s.redis.Del(ctx, codeKey, attemptsKey)
	return nil
}

func otpCodeKey(purpose OTPPurpose, email string) string {
	return fmt.Sprintf("otp:%s:%s", purpose, email)
}

func otpAttemptsKey(purpose OTPPurpose, email string) string {
	return fmt.Sprintf("otp:%s:%s:attempts", purpose, email)
}

func otpCooldownKey(purpose OTPPurpose, email string) string {
	return fmt.Sprintf("otp:%s:%s:cooldown", purpose, email)
}
