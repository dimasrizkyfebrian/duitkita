package config

import (
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	App        AppConfig
	Database   DatabaseConfig
	JWT        JWTConfig
	GCS        GCSConfig
	Redis      RedisConfig
	RateLimit  RateLimitConfig
	CORS       CORSConfig
	SMTP       SMTPConfig
	OTP        OTPConfig
	Internal   InternalConfig
	CloudTasks CloudTasksConfig
	Log        LogConfig
	Retention  RetentionConfig
	Feature    FeatureConfig
}

type AppConfig struct {
	Env  string
	Port string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	Name     string
	SSLMode  string
}

type JWTConfig struct {
	AccessSecret         string
	AccessSecretPrevious string
	AccessTTLMinutes     int
	RefreshTTLDays       int
}

type GCSConfig struct {
	Enabled         bool
	BucketName      string
	CredentialsFile string
}

type RedisConfig struct {
	Host       string
	Port       string
	Password   string
	DB         int
	TLSEnabled bool
}

type RateLimitConfig struct {
	Enabled           bool
	AuthMax           int
	AuthWindowSeconds int
}

type CORSConfig struct {
	AllowedOrigins []string
}

type SMTPConfig struct {
	Host        string
	Port        string
	User        string
	AppPassword string
	FromName    string
}

type OTPConfig struct {
	TTLMinutes            int
	MaxAttempts           int
	ResendCooldownSeconds int
}

type InternalConfig struct {
	JobsSecret string
}

type CloudTasksConfig struct {
	Enabled       bool
	ProjectID     string
	LocationID    string
	QueueID       string
	TargetBaseURL string
}

type LogConfig struct {
	Level string
}

type RetentionConfig struct {
	SessionDays       int
	NotificationDays  int
	ActivityDays      int
	SecurityAuditDays int
}

type FeatureConfig struct {
	InsightsEnabled bool
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		App: AppConfig{
			Env:  getEnv("APP_ENV", "development"),
			Port: getEnv("APP_PORT", "8080"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			Name:     getEnv("DB_NAME", "duitkita"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		JWT: JWTConfig{
			AccessSecret:         getEnv("JWT_ACCESS_SECRET", ""),
			AccessSecretPrevious: getEnv("JWT_ACCESS_SECRET_PREVIOUS", ""),
			AccessTTLMinutes:     getEnvAsInt("JWT_ACCESS_TTL_MINUTES", 15),
			RefreshTTLDays:       getEnvAsInt("JWT_REFRESH_TTL_DAYS", 30),
		},
		GCS: GCSConfig{
			Enabled:         getEnvAsBool("GCS_ENABLED", true),
			BucketName:      getEnv("GCS_BUCKET_NAME", ""),
			CredentialsFile: getEnv("GCS_CREDENTIALS_FILE", ""),
		},
		Redis: RedisConfig{
			Host:       getEnv("REDIS_HOST", "localhost"),
			Port:       getEnv("REDIS_PORT", "6379"),
			Password:   getEnv("REDIS_PASSWORD", ""),
			DB:         getEnvAsInt("REDIS_DB", 0),
			TLSEnabled: getEnvAsBool("REDIS_TLS_ENABLED", false),
		},
		RateLimit: RateLimitConfig{
			Enabled:           getEnvAsBool("RATE_LIMIT_ENABLED", true),
			AuthMax:           getEnvAsInt("RATE_LIMIT_AUTH_MAX", 20),
			AuthWindowSeconds: getEnvAsInt("RATE_LIMIT_AUTH_WINDOW_SECONDS", 60),
		},
		CORS: CORSConfig{
			AllowedOrigins: getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:5173", "http://localhost:3000"}),
		},
		SMTP: SMTPConfig{
			Host:        getEnv("SMTP_HOST", "smtp.gmail.com"),
			Port:        getEnv("SMTP_PORT", "587"),
			User:        getEnv("SMTP_USER", ""),
			AppPassword: getEnv("SMTP_APP_PASSWORD", ""),
			FromName:    getEnv("SMTP_FROM_NAME", "DuitKita"),
		},
		OTP: OTPConfig{
			TTLMinutes:            getEnvAsInt("OTP_TTL_MINUTES", 10),
			MaxAttempts:           getEnvAsInt("OTP_MAX_ATTEMPTS", 5),
			ResendCooldownSeconds: getEnvAsInt("OTP_RESEND_COOLDOWN_SECONDS", 60),
		},
		Internal: InternalConfig{
			JobsSecret: getEnv("INTERNAL_JOBS_SECRET", ""),
		},
		CloudTasks: CloudTasksConfig{
			Enabled:       getEnvAsBool("CLOUD_TASKS_ENABLED", false),
			ProjectID:     getEnv("CLOUD_TASKS_PROJECT_ID", ""),
			LocationID:    getEnv("CLOUD_TASKS_LOCATION_ID", ""),
			QueueID:       getEnv("CLOUD_TASKS_QUEUE_ID", "report-exports-queue"),
			TargetBaseURL: getEnv("CLOUD_TASKS_TARGET_BASE_URL", ""),
		},
		Log: LogConfig{
			Level: getEnv("LOG_LEVEL", "info"),
		},
		Retention: RetentionConfig{
			SessionDays:       getEnvAsInt("RETENTION_SESSION_DAYS", 30),
			NotificationDays:  getEnvAsInt("RETENTION_NOTIFICATION_DAYS", 90),
			ActivityDays:      getEnvAsInt("RETENTION_ACTIVITY_DAYS", 180),
			SecurityAuditDays: getEnvAsInt("RETENTION_SECURITY_AUDIT_DAYS", 365),
		},
		Feature: FeatureConfig{
			InsightsEnabled: getEnvAsBool("FEATURE_INSIGHTS_ENABLED", true),
		},
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}

func getEnvAsBool(key string, fallback bool) bool {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(v)
	if err != nil {
		return fallback
	}
	return parsed
}

func getEnvAsSlice(key string, fallback []string) []string {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		return fallback
	}
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}

func getEnvAsInt(key string, fallback int) int {
	v, ok := os.LookupEnv(key)
	if !ok || v == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return parsed
}
