package main

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"roulette/internal/config"
	"roulette/internal/handlers"
)

func main() {
	cfg := config.Load()

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	server := handlers.NewServer(cfg.AllowedOrigins)

	slog.Info("Roulette Server starting", "port", cfg.Port, "allowedOrigins", cfg.AllowedOrigins)
	if err := server.Start(ctx, ":"+cfg.Port); err != nil {
		slog.Error("Server failed", "error", err)
		os.Exit(1)
	}
	slog.Info("Server stopped gracefully")
}
