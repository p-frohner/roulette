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
			break
		}

		var msg ClientMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			continue
		}

		if c.Hub.gameManager == nil {
			continue
		}

		switch msg.Action {
		case "reconnect":
			// Identify/Restore User
			if user := c.Hub.gameManager.GetUser(msg.UserID); user != nil {
				c.UserID = msg.UserID
				c.Hub.gameManager.SetUserName(msg.UserID, msg.Name)
				c.Hub.gameManager.MarkUserReconnected(msg.UserID)
			} else {
				c.Hub.gameManager.RegisterUser(c.UserID)
				c.Hub.gameManager.SetUserName(c.UserID, msg.Name)
			}

			// Sync State
			c.Hub.Register(c)
			c.sendSessionData()
			c.Hub.gameManager.NotifyPlayerJoined(c.UserID)

		case "set_name":
			c.Hub.gameManager.RegisterUser(c.UserID)
			c.Hub.gameManager.SetUserName(c.UserID, msg.Name)

			c.Hub.Register(c)
			c.sendSessionData()
			c.Hub.gameManager.NotifyPlayerJoined(c.UserID)

		case "place_bet":
			c.handlePlaceBet(msg)
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

// sendSessionData handles the Welcome and Game State sync sequence
func (c *Client) sendSessionData() {
	user := c.Hub.gameManager.GetUser(c.UserID)
	if user == nil {
		slog.Error("failed to sync session: user not found", "user_id", c.UserID)
		return
	}

	// Send Welcome Message
	welcome, _ := json.Marshal(messages.WelcomeMessage{
		Type:    "welcome",
		UserID:  c.UserID,
		Balance: user.Balance,
		Players: c.Hub.gameManager.GetAllPlayers(),
	})
	c.Send <- welcome

	// Send Current Game State
	state, winNum, count := c.Hub.gameManager.GetCurrentGameState()
	gameState, _ := json.Marshal(messages.GameStateMessage{
		Type:          "game_state",
		State:         state,
		WinningNumber: winNum,
		Countdown:     count,
	})
	c.Send <- gameState
}

// handlePlaceBet encapsulates the betting logic and notifications
func (c *Client) handlePlaceBet(msg ClientMessage) {
	newBalance, betErr := c.Hub.gameManager.PlaceBet(c.UserID, msg.BetType, msg.BetValue, msg.Amount)

	if betErr != nil {
		resp, _ := json.Marshal(messages.BetRejectedMessage{
			Type:   "bet_rejected",
			Reason: betErr.Error(),
		})
		c.Send <- resp
		return
	}

	// Send confirmation back to the bettor
	resp, _ := json.Marshal(messages.BetAcceptedMessage{
		Type:     "bet_accepted",
		BetType:  messages.BetType(msg.BetType),
		BetValue: msg.BetValue,
		Amount:   msg.Amount,
		Balance:  newBalance,
	})
	c.Send <- resp

	// Broadcast the bet details to everyone else
	playerName := c.Hub.gameManager.GetUserName(c.UserID)
	broadcast, _ := json.Marshal(messages.BetPlacedMessage{
		Type:       "bet_placed",
		UserID:     c.UserID,
		PlayerName: playerName,
		BetType:    messages.BetType(msg.BetType),
		BetValue:   msg.BetValue,
		Amount:     msg.Amount,
	})
	c.Hub.BroadcastToAll(broadcast)

	// Sync balance update to all client UI lists
	c.Hub.gameManager.NotifyBalanceUpdated(c.UserID, newBalance)
}
