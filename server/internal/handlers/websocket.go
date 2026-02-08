package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"

	"roulette/internal/messages"

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

	client := &Client{
		hub:    s.Hub,
		conn:   conn,
		send:   make(chan []byte, 256),
		userID: userID,
	}

	s.Hub.register <- client

	// Register user with game manager and send welcome message
	if s.Hub.gameManager != nil {
		user := s.Hub.gameManager.RegisterUser(userID)
		welcome, err := json.Marshal(messages.WelcomeMessage{
			Type:    "welcome",
			UserID:  userID,
			Balance: user.Balance,
			History: s.Hub.gameManager.History(),
		})
		if err != nil {
			slog.Error("failed to marshal welcome message", "error", err)
		} else {
			client.send <- welcome
		}
	}

	go client.WritePump()
	go client.ReadPump()
}
