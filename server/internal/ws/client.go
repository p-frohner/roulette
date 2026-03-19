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
	Action       string `json:"action"`
	BetType      string `json:"bet_type"`
	BetValue     string `json:"bet_value"`
	Amount       int64  `json:"amount"`
	Name         string `json:"name"`
	UserID       string `json:"user_id"`
	SessionToken string `json:"session_token"`
}

func NewClient(hub *Hub, conn *websocket.Conn, userID string) *Client {
	return &Client{
		Hub:    hub,
		conn:   conn,
		Send:   make(chan []byte, 256),
		UserID: userID,
	}
}

// mustJSON marshals v to JSON and panics if it fails.
// All message structs are well-typed and never contain un-serializable fields,
// so a failure here indicates a programming error, not a runtime condition.
func mustJSON(v any) []byte {
	data, err := json.Marshal(v)
	if err != nil {
		panic("ws: failed to marshal message: " + err.Error())
	}
	return data
}

// trySend delivers data to the client's send buffer without blocking.
// Returns false (and logs a warning) if the buffer is full.
func (c *Client) trySend(data []byte) bool {
	select {
	case c.Send <- data:
		return true
	default:
		slog.Warn("client send buffer full, dropping message", "user_id", c.UserID)
		return false
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
			c.handleReconnect(msg)
		case "set_name":
			c.handleSetName(msg)
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

func (c *Client) handleReconnect(msg ClientMessage) {
	if c.Hub.gameManager.ValidateSessionToken(msg.UserID, msg.SessionToken) {
		c.UserID = msg.UserID
		c.Hub.gameManager.SetUserName(msg.UserID, msg.Name)
		c.Hub.gameManager.MarkUserReconnected(msg.UserID)

		c.Hub.Register(c)
		c.sendSessionData()
		c.Hub.gameManager.NotifyPlayerJoined(c.UserID)
	} else {
		// Either the user was cleaned up or the token is invalid.
		c.trySend(mustJSON(messages.SessionExpiredMessage{
			Type:   "session_expired",
			Reason: "Session expired due to inactivity",
		}))
	}
}

func (c *Client) handleSetName(msg ClientMessage) {
	c.Hub.gameManager.RegisterUser(c.UserID)
	c.Hub.gameManager.SetUserName(c.UserID, msg.Name)

	c.Hub.Register(c)
	c.sendSessionData()
	c.Hub.gameManager.NotifyPlayerJoined(c.UserID)
}

// sendSessionData handles the Welcome and Game State sync sequence
func (c *Client) sendSessionData() {
	user := c.Hub.gameManager.GetUser(c.UserID)
	if user == nil {
		slog.Error("failed to sync session: user not found", "user_id", c.UserID)
		return
	}

	c.trySend(mustJSON(messages.WelcomeMessage{
		Type:         "welcome",
		UserID:       c.UserID,
		SessionToken: c.Hub.gameManager.GetSessionToken(c.UserID),
		Balance:      user.Balance,
		Players:      c.Hub.gameManager.GetAllPlayers(),
	}))

	state, winNum, count := c.Hub.gameManager.GetCurrentGameState()
	c.trySend(mustJSON(messages.GameStateMessage{
		Type:          "game_state",
		State:         state,
		WinningNumber: winNum,
		Countdown:     count,
	}))
}

// handlePlaceBet encapsulates the betting logic and notifications
func (c *Client) handlePlaceBet(msg ClientMessage) {
	newBalance, betErr := c.Hub.gameManager.PlaceBet(c.UserID, msg.BetType, msg.BetValue, msg.Amount)

	if betErr != nil {
		c.trySend(mustJSON(messages.BetRejectedMessage{
			Type:   "bet_rejected",
			Reason: betErr.Error(),
		}))
		return
	}

	// Send confirmation back to the bettor
	c.trySend(mustJSON(messages.BetAcceptedMessage{
		Type:     "bet_accepted",
		BetType:  messages.BetType(msg.BetType),
		BetValue: msg.BetValue,
		Amount:   msg.Amount,
		Balance:  newBalance,
	}))

	// Broadcast the bet details to everyone else
	c.Hub.BroadcastToAll(mustJSON(messages.BetPlacedMessage{
		Type:       "bet_placed",
		UserID:     c.UserID,
		PlayerName: c.Hub.gameManager.GetUserName(c.UserID),
		BetType:    messages.BetType(msg.BetType),
		BetValue:   msg.BetValue,
		Amount:     msg.Amount,
	}))

	// Sync balance update to all client UI lists
	c.Hub.gameManager.NotifyBalanceUpdated(c.UserID, newBalance)
}
