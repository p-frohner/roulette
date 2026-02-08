package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"roulette/internal/game"
	"roulette/internal/messages"

	"github.com/coder/websocket"
)

const (
	writeWait      = 10 * time.Second
	pingPeriod     = 54 * time.Second
	maxMessageSize = 1024
)

type Hub struct {
	clients      map[*Client]bool
	broadcastAll chan []byte
	register     chan *Client
	unregister   chan *Client
	mu           sync.RWMutex
	gameManager  *game.Manager
}

type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	userID string
}

type ClientMessage struct {
	Action   string `json:"action"`
	BetType  string `json:"bet_type"`
	BetValue string `json:"bet_value"`
	Amount   int64  `json:"amount"`
	Name     string `json:"name"`
}

func NewHub() *Hub {
	return &Hub{
		clients:      make(map[*Client]bool),
		broadcastAll: make(chan []byte, 256),
		register:     make(chan *Client),
		unregister:   make(chan *Client),
	}
}

// SetGameManager sets the game manager on the hub.
func (h *Hub) SetGameManager(gm *game.Manager) {
	h.gameManager = gm
}

// BroadcastToAll sends a message to all connected clients.
func (h *Hub) BroadcastToAll(msg []byte) {
	h.broadcastAll <- msg
}

// SendToUser sends a message to a specific user by their user ID.
func (h *Hub) SendToUser(userID string, msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		if client.userID == userID {
			select {
			case client.send <- msg:
			default:
				// Client too slow, will be cleaned up
			}
			return
		}
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
			h.mu.Unlock()

		case message := <-h.broadcastAll:
			var slowClients []*Client

			h.mu.RLock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					slowClients = append(slowClients, client)
				}
			}
			h.mu.RUnlock()

			for _, client := range slowClients {
				h.unregister <- client
			}
		}
	}
}

func (c *Client) ReadPump() {
	defer func() {
		if c.hub.gameManager != nil {
			c.hub.gameManager.UnregisterUser(c.userID)
		}
		c.hub.unregister <- c
		c.conn.CloseNow()
	}()

	c.conn.SetReadLimit(maxMessageSize)

	for {
		_, message, err := c.conn.Read(context.Background())
		if err != nil {
			status := websocket.CloseStatus(err)
			if status != websocket.StatusNormalClosure && status != websocket.StatusGoingAway {
				slog.Error("WebSocket read error", "error", err, "user_id", c.userID)
			}
			break
		}

		var msg ClientMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			slog.Warn("failed to parse client message", "error", err, "user_id", c.userID)
			continue
		}

		switch msg.Action {
		case "set_name":
			if c.hub.gameManager == nil {
				continue
			}
			c.hub.gameManager.SetUserName(c.userID, msg.Name)

		case "place_bet":
			if c.hub.gameManager == nil {
				continue
			}

			errMsg, newBalance := c.hub.gameManager.PlaceBet(c.userID, msg.BetType, msg.BetValue, msg.Amount)
			if errMsg != "" {
				resp, err := json.Marshal(messages.BetRejectedMessage{
					Type:   "bet_rejected",
					Reason: errMsg,
				})
				if err != nil {
					slog.Error("failed to marshal bet_rejected", "error", err)
					continue
				}
				c.send <- resp
			} else {
				resp, err := json.Marshal(messages.BetAcceptedMessage{
					Type:     "bet_accepted",
					BetType:  messages.BetType(msg.BetType),
					BetValue: msg.BetValue,
					Amount:   msg.Amount,
					Balance:  newBalance,
				})
				if err != nil {
					slog.Error("failed to marshal bet_accepted", "error", err)
					continue
				}
				c.send <- resp

				// Broadcast bet to all players
				playerName := c.hub.gameManager.GetUserName(c.userID)
				broadcast, err := json.Marshal(messages.BetPlacedMessage{
					Type:       "bet_placed",
					PlayerName: playerName,
					BetType:    messages.BetType(msg.BetType),
					BetValue:   msg.BetValue,
					Amount:     msg.Amount,
				})
				if err != nil {
					slog.Error("failed to marshal bet_placed", "error", err)
					continue
				}
				c.hub.BroadcastToAll(broadcast)
			}
		}
	}
}

func (c *Client) WritePump() {
	pingTicker := time.NewTicker(pingPeriod)
	defer func() {
		pingTicker.Stop()
		c.conn.CloseNow()
	}()

	for {
		select {
		case message, ok := <-c.send:
			if !ok {
				c.conn.Close(websocket.StatusNormalClosure, "")
				return
			}

			ctx, cancel := context.WithTimeout(context.Background(), writeWait)
			err := c.conn.Write(ctx, websocket.MessageText, message)
			cancel()
			if err != nil {
				return
			}

		case <-pingTicker.C:
			ctx, cancel := context.WithTimeout(context.Background(), writeWait)
			err := c.conn.Ping(ctx)
			cancel()
			if err != nil {
				return
			}
		}
	}
}
