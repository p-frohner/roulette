package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"

	"roulette/internal/messages"
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
	s.Hub.Register(client)

	// Register user with game manager and send welcome message
	user := s.GameManager.RegisterUser(userID)
	welcome, err := json.Marshal(messages.WelcomeMessage{
		Type:    "welcome",
		UserID:  userID,
		Balance: user.Balance,
		History: s.GameManager.History(),
	})
	if err != nil {
		slog.Error("failed to marshal welcome message", "error", err)
	} else {
		client.Send <- welcome
	}

	go client.WritePump()
	go client.ReadPump()
}
