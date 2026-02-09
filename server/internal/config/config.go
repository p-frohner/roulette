package config

import (
	"os"
	"strings"
)

type Config struct {
	Port           string
	AllowedOrigins []string
}

func Load() *Config {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	origins := os.Getenv("ALLOWED_ORIGINS")
	if origins == "" {
		origins = "http://localhost:5173,http://localhost:3000"
	}

	parts := strings.Split(origins, ",")
	allowedOrigins := make([]string, 0, len(parts))
	for _, o := range parts {
		if trimmed := strings.TrimSpace(o); trimmed != "" {
			allowedOrigins = append(allowedOrigins, trimmed)
		}
	}

	return &Config{
		Port:           port,
		AllowedOrigins: allowedOrigins,
	}
}
