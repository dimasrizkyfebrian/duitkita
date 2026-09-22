package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	App       AppConfig
	Database  DatabaseConfig
	JWT       JWTConfig
	GCS       GCSConfig
	Log       LogConfig
	Retention RetentionConfig
	Feature   FeatureConfig
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
	AccessSecret     string
	RefreshSecret    string
	AccessTTLMinutes int
	RefreshTTLDays   int
}

type GCSConfig struct {
	Enabled         bool
	BucketName      string
	CredentialsFile string
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
			AccessSecret:     getEnv("JWT_ACCESS_SECRET", ""),
			RefreshSecret:    getEnv("JWT_REFRESH_SECRET", ""),
			AccessTTLMinutes: getEnvAsInt("JWT_ACCESS_TTL_MINUTES", 15),
			RefreshTTLDays:   getEnvAsInt("JWT_REFRESH_TTL_DAYS", 30),
		},
		GCS: GCSConfig{
			Enabled:         getEnvAsBool("GCS_ENABLED", true),
			BucketName:      getEnv("GCS_BUCKET_NAME", ""),
			CredentialsFile: getEnv("GCS_CREDENTIALS_FILE", ""),
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
