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
			c.Hub.gameManager.UnregisterUser(c.UserID)
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
		case "set_name":
			if c.Hub.gameManager == nil {
				continue
			}
			c.Hub.gameManager.SetUserName(c.UserID, msg.Name)

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
