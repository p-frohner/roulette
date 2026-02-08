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

	return &Config{
		Port:           port,
		AllowedOrigins: strings.Split(origins, ","),
	}
}
