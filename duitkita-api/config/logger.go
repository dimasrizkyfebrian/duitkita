package config

import (
	"os"
	"strings"

	"github.com/rs/zerolog"
)

// NewLogger builds a zerolog.Logger configured from LogConfig.
func NewLogger(cfg LogConfig) zerolog.Logger {
	level, err := zerolog.ParseLevel(strings.ToLower(cfg.Level))
	if err != nil {
		level = zerolog.InfoLevel
	}

	zerolog.SetGlobalLevel(level)

	output := zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: "15:04:05"}

	return zerolog.New(output).With().Timestamp().Caller().Logger()
}
