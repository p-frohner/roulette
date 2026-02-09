package handlers

import (
	"context"
	"net/http"
	"roulette/internal/game"
	"roulette/internal/ws"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

type Server struct {
	Hub            *ws.Hub
	GameManager    *game.Manager
	AllowedOrigins []string
}

func NewServer(allowedOrigins []string) *Server {
	hub := ws.NewHub()
	go hub.Run()

	gm := game.NewManager(hub.BroadcastToAll, hub.SendToUser)
	gm.SetConnectionChecker(hub)
	hub.SetGameManager(gm)
	go gm.RunGameLoop()

	return &Server{
		Hub:            hub,
		GameManager:    gm,
		AllowedOrigins: allowedOrigins,
	}
}

func (s *Server) Routes() http.Handler {
	r := chi.NewRouter()

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   s.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(middleware.Logger)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	})

	// WebSocket endpoint
	r.Get("/ws", s.HandleWebSocket)

	return r
}

func (s *Server) Start(ctx context.Context, addr string) error {
	srv := &http.Server{
		Addr:         addr,
		Handler:      s.Routes(),
		WriteTimeout: 30 * time.Second,  // Increased for WebSocket writes
		IdleTimeout:  120 * time.Second, // Increased for long-lived WebSocket connections
	}

	errCh := make(chan error, 1)
	go func() {
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
		s.GameManager.Stop()
		s.Hub.Stop()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		return srv.Shutdown(shutdownCtx)
	}
}
