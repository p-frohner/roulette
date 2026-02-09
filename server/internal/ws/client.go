package ws

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"roulette/internal/messages"

	"github.com/coder/websocket"
)

const (
	writeWait      = 10 * time.Second
	pingPeriod     = 54 * time.Second
	maxMessageSize = 1024
)

type Client struct {
	Hub    *Hub
	conn   *websocket.Conn
	Send   chan []byte
	UserID string
}

type ClientMessage struct {
	Action   string `json:"action"`
	BetType  string `json:"bet_type"`
	BetValue string `json:"bet_value"`
	Amount   int64  `json:"amount"`
	Name     string `json:"name"`
	UserID   string `json:"user_id"`
}

func NewClient(hub *Hub, conn *websocket.Conn, userID string) *Client {
	return &Client{
		Hub:    hub,
		conn:   conn,
		Send:   make(chan []byte, 256),
		UserID: userID,
	}
}

func (c *Client) ReadPump() {
	defer func() {
		if c.Hub.gameManager != nil {
			c.Hub.gameManager.NotifyPlayerLeft(c.UserID)
			c.Hub.gameManager.MarkUserDisconnected(c.UserID)
		}
		c.Hub.Unregister(c)
		c.conn.CloseNow()
	}()

	c.conn.SetReadLimit(maxMessageSize)

	for {
		_, message, err := c.conn.Read(context.Background())
		if err != nil {
			status := websocket.CloseStatus(err)
			if status != websocket.StatusNormalClosure && status != websocket.StatusGoingAway {
				slog.Error("WebSocket read error", "error", err, "user_id", c.UserID)
			}
			break
		}

		var msg ClientMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			slog.Warn("failed to parse client message", "error", err, "user_id", c.UserID)
			continue
		}

		switch msg.Action {
		case "reconnect":
			if c.Hub.gameManager == nil {
				continue
			}

			// Try to restore existing user
			user := c.Hub.gameManager.GetUser(msg.UserID)
			if user != nil {
				// User exists (reconnection), restore their identity
				slog.Info("reconnecting existing user",
					"user_id", msg.UserID,
					"name", msg.Name,
					"balance", user.Balance)
				c.UserID = msg.UserID
				c.Hub.gameManager.SetUserName(msg.UserID, msg.Name)
				c.Hub.gameManager.MarkUserReconnected(msg.UserID)
			} else {
				// User not found (server restart), register new user
				slog.Info("old user not found, using new userID",
					"old_user_id", msg.UserID,
					"new_user_id", c.UserID,
					"name", msg.Name)
				c.Hub.gameManager.RegisterUser(c.UserID)
				c.Hub.gameManager.SetUserName(c.UserID, msg.Name)
			}

			// Register in Hub immediately (atomic with game manager registration)
			c.Hub.Register(c)

			// Send welcome with player list
			user = c.Hub.gameManager.GetUser(c.UserID)
			if user == nil {
				slog.Error("user not found after reconnect setup",
					"user_id", c.UserID,
					"client_sent_user_id", msg.UserID)
				continue
			}
			players := c.Hub.gameManager.GetAllPlayers()
			welcome, err := json.Marshal(messages.WelcomeMessage{
				Type:    "welcome",
				UserID:  c.UserID,
				Balance: user.Balance,
				History: c.Hub.gameManager.History(),
				Players: players,
			})
			if err != nil {
				slog.Error("failed to marshal welcome message", "error", err)
				continue
			}
			c.Send <- welcome

			// Send current game state immediately after welcome
			currentState, winningNum, countdown := c.Hub.gameManager.GetCurrentGameState()
			gameState := messages.GameStateMessage{
				Type:          "game_state",
				State:         currentState,
				WinningNumber: winningNum,
				Countdown:     countdown,
				History:       c.Hub.gameManager.History(),
			}
			stateData, err := json.Marshal(gameState)
			if err != nil {
				slog.Error("failed to marshal game state", "error", err)
			} else {
				c.Send <- stateData
			}

			// Notify others of connection
			c.Hub.gameManager.NotifyPlayerJoined(c.UserID)

		case "set_name":
			if c.Hub.gameManager == nil {
				continue
			}

			// Register user in GameManager
			c.Hub.gameManager.RegisterUser(c.UserID)
			c.Hub.gameManager.SetUserName(c.UserID, msg.Name)

			// Register in Hub immediately (atomic registration)
			c.Hub.Register(c)

			// Send welcome message
			user := c.Hub.gameManager.GetUser(c.UserID)
			if user == nil {
				slog.Error("user not found after set_name", "user_id", c.UserID)
				continue
			}
			players := c.Hub.gameManager.GetAllPlayers()
			welcome, err := json.Marshal(messages.WelcomeMessage{
				Type:    "welcome",
				UserID:  c.UserID,
				Balance: user.Balance,
				History: c.Hub.gameManager.History(),
				Players: players,
			})
			if err != nil {
				slog.Error("failed to marshal welcome message", "error", err)
				continue
			}
			c.Send <- welcome

			// Send current game state immediately
			currentState, winningNum, countdown := c.Hub.gameManager.GetCurrentGameState()
			gameState := messages.GameStateMessage{
				Type:          "game_state",
				State:         currentState,
				WinningNumber: winningNum,
				Countdown:     countdown,
				History:       c.Hub.gameManager.History(),
			}
			stateData, err := json.Marshal(gameState)
			if err != nil {
				slog.Error("failed to marshal game state", "error", err)
			} else {
				c.Send <- stateData
			}

			// Notify others (after we're fully synced)
			c.Hub.gameManager.NotifyPlayerJoined(c.UserID)

		case "place_bet":
			if c.Hub.gameManager == nil {
				continue
			}

			newBalance, betErr := c.Hub.gameManager.PlaceBet(c.UserID, msg.BetType, msg.BetValue, msg.Amount)
			if betErr != nil {
				resp, err := json.Marshal(messages.BetRejectedMessage{
					Type:   "bet_rejected",
					Reason: betErr.Error(),
				})
				if err != nil {
					slog.Error("failed to marshal bet_rejected", "error", err)
					continue
				}
				c.Send <- resp
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
				c.Send <- resp

				// Broadcast bet to all players
				playerName := c.Hub.gameManager.GetUserName(c.UserID)
				broadcast, err := json.Marshal(messages.BetPlacedMessage{
					Type:       "bet_placed",
					UserID:     c.UserID,
					PlayerName: playerName,
					BetType:    messages.BetType(msg.BetType),
					BetValue:   msg.BetValue,
					Amount:     msg.Amount,
				})
				if err != nil {
					slog.Error("failed to marshal bet_placed", "error", err)
					continue
				}
				c.Hub.BroadcastToAll(broadcast)
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
		case message, ok := <-c.Send:
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
