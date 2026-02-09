package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"

	"roulette/internal/ws"

	"github.com/coder/websocket"
)

func generateUserID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		slog.Error("failed to generate user ID", "error", err)
		return "unknown"
	}
	return hex.EncodeToString(b)
}

func (s *Server) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, &websocket.AcceptOptions{
		OriginPatterns: s.AllowedOrigins,
	})
	if err != nil {
		slog.Error("WebSocket accept failed", "error", err)
		return
	}

	userID := generateUserID()

	client := ws.NewClient(s.Hub, conn, userID)

	go client.WritePump()
	go client.ReadPump()
}
