package game

import (
	"encoding/json"
	"log/slog"
	"strings"
	"sync"
	"time"
	"unicode"

	"roulette/internal/messages"
)

const maxNameLength = 20
const cleanupInterval = 1 * time.Minute
const disconnectGracePeriod = 1 * time.Minute

func sanitizeName(name string) string {
	name = strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, name)
	name = strings.TrimSpace(name)
	runes := []rune(name)
	if len(runes) > maxNameLength {
		runes = runes[:maxNameLength]
	}
	return string(runes)
}

// BroadcastFunc sends a message to all connected clients.
type BroadcastFunc func([]byte)

// SendToUserFunc sends a message to a specific user by ID.
type SendToUserFunc func(string, []byte)

// ConnectionChecker checks if a user has an active connection.
type ConnectionChecker interface {
	IsUserConnected(userID string) bool
}

// Manager orchestrates the roulette game loop and manages users.
type Manager struct {
	users            map[string]*User
	usersMu          sync.RWMutex
	session          *GameSession
	sessionMu        sync.RWMutex
	currentCountdown int // Track countdown for mid-join sync
	broadcast        BroadcastFunc
	sendToUser       SendToUserFunc
	connChecker      ConnectionChecker
	stopCh           chan struct{}
	cleanupTicker    *time.Ticker
	cleanupStopCh    chan struct{}
}

// NewManager creates a new game Manager with the given broadcast functions.
func NewManager(broadcastAll BroadcastFunc, sendToUser SendToUserFunc) *Manager {
	m := &Manager{
		users:         make(map[string]*User),
		session:       &GameSession{State: StateBetting},
		broadcast:     broadcastAll,
		sendToUser:    sendToUser,
		stopCh:        make(chan struct{}),
		cleanupStopCh: make(chan struct{}),
	}

	// Start cleanup goroutine
	go m.runCleanup()

	return m
}

// SetConnectionChecker sets the connection checker (typically the Hub).
func (m *Manager) SetConnectionChecker(cc ConnectionChecker) {
	m.connChecker = cc
}

// RegisterUser creates a new user with the starting balance.
func (m *Manager) RegisterUser(userID string) *User {
	m.usersMu.Lock()
	defer m.usersMu.Unlock()

	user := &User{
		ID:      userID,
		Balance: StartingBalance,
	}
	m.users[userID] = user
	return user
}

// UnregisterUser removes a user from the manager.
func (m *Manager) UnregisterUser(userID string) {
	m.usersMu.Lock()
	defer m.usersMu.Unlock()
	delete(m.users, userID)
}

// MarkUserDisconnected marks a user as disconnected without removing them.
// This allows them to reconnect within the grace period.
func (m *Manager) MarkUserDisconnected(userID string) {
	user := m.GetUser(userID)
	if user == nil {
		return
	}
	now := time.Now()
	user.mu.Lock()
	user.LastDisconnect = &now
	user.mu.Unlock()
}

// MarkUserReconnected clears the disconnect timestamp when a user reconnects.
func (m *Manager) MarkUserReconnected(userID string) {
	user := m.GetUser(userID)
	if user == nil {
		return
	}
	user.mu.Lock()
	user.LastDisconnect = nil
	user.mu.Unlock()
}

// GetUser returns a user by ID, or nil if not found.
func (m *Manager) GetUser(userID string) *User {
	m.usersMu.RLock()
	defer m.usersMu.RUnlock()
	return m.users[userID]
}

// SetUserName sets a display name for the user, appending #<first 4 chars of userID>.
func (m *Manager) SetUserName(userID, name string) {
	name = sanitizeName(name)
	if name == "" {
		return
	}
	user := m.GetUser(userID)
	if user == nil {
		return
	}
	suffix := userID
	if len(suffix) > 4 {
		suffix = suffix[:4]
	}
	user.mu.Lock()
	user.Name = name + "#" + suffix
	user.mu.Unlock()
}

// GetUserName returns the display name for a user, or empty string if not found.
func (m *Manager) GetUserName(userID string) string {
	user := m.GetUser(userID)
	if user == nil {
		return ""
	}
	user.mu.Lock()
	defer user.mu.Unlock()
	return user.Name
}

// GetAllPlayers returns a snapshot of all players with their connection status.
func (m *Manager) GetAllPlayers() []messages.Player {
	m.usersMu.RLock()
	defer m.usersMu.RUnlock()

	players := make([]messages.Player, 0, len(m.users))
	for userID, user := range m.users {
		user.mu.Lock()
		name := user.Name
		balance := user.Balance
		user.mu.Unlock()

		connected := false
		if m.connChecker != nil {
			connected = m.connChecker.IsUserConnected(userID)
		}

		players = append(players, messages.Player{
			UserID:    userID,
			Name:      name,
			Balance:   balance,
			Connected: connected,
		})
	}
	return players
}

// GetCurrentGameState returns the current game state for syncing new players.
func (m *Manager) GetCurrentGameState() (state messages.GamePhase, winningNumber *int, countdown *int) {
	m.sessionMu.RLock()
	defer m.sessionMu.RUnlock()

	switch m.session.State {
	case StateBetting:
		state = messages.GamePhaseBetting
		// Include countdown for BETTING phase if available
		if m.currentCountdown > 0 {
			countdown = &m.currentCountdown
		}
	case StateSpinning:
		state = messages.GamePhaseSpinning
	case StateResult:
		state = messages.GamePhaseResult
		if m.session.WinningNumber >= 0 {
			winningNumber = &m.session.WinningNumber
		}
	}

	return state, winningNumber, countdown
}

// BroadcastPlayerList sends the full player list to all clients.
func (m *Manager) BroadcastPlayerList() {
	players := m.GetAllPlayers()
	msg, err := json.Marshal(messages.PlayerListMessage{
		Type:    "player_list",
		Players: players,
	})
	if err != nil {
		slog.Error("failed to marshal player list", "error", err)
		return
	}
	m.broadcast(msg)
}

// broadcastExcept sends a message to all connected users except the specified one.
func (m *Manager) broadcastExcept(excludeUserID string, msg []byte) {
	m.usersMu.RLock()
	defer m.usersMu.RUnlock()

	for userID := range m.users {
		if userID != excludeUserID && m.connChecker != nil && m.connChecker.IsUserConnected(userID) {
			m.sendToUser(userID, msg)
		}
	}
}

// NotifyPlayerJoined broadcasts when a new player connects.
func (m *Manager) NotifyPlayerJoined(userID string) {
	user := m.GetUser(userID)
	if user == nil {
		return
	}

	user.mu.Lock()
	name := user.Name
	balance := user.Balance
	user.mu.Unlock()

	msg, err := json.Marshal(messages.PlayerJoinedMessage{
		Type: "player_joined",
		Player: messages.Player{
			UserID:    userID,
			Name:      name,
			Balance:   balance,
			Connected: true,
		},
	})
	if err != nil {
		slog.Error("failed to marshal player joined", "error", err, "user_id", userID)
		return
	}
	// Broadcast to everyone EXCEPT the joining player
	m.broadcastExcept(userID, msg)
}

// NotifyPlayerLeft broadcasts when a player disconnects.
func (m *Manager) NotifyPlayerLeft(userID string) {
	msg, err := json.Marshal(messages.PlayerLeftMessage{
		Type:   "player_left",
		UserID: userID,
	})
	if err != nil {
		slog.Error("failed to marshal player left", "error", err, "user_id", userID)
		return
	}
	m.broadcast(msg)
}

// NotifyBalanceUpdated broadcasts when a player's balance changes.
func (m *Manager) NotifyBalanceUpdated(userID string, balance int64) {
	msg, err := json.Marshal(messages.PlayerBalanceUpdatedMessage{
		Type:    "player_balance_updated",
		UserID:  userID,
		Balance: balance,
	})
	if err != nil {
		slog.Error("failed to marshal balance update", "error", err, "user_id", userID)
		return
	}
	m.broadcast(msg)
}

// PlaceBet validates and places a bet for a user.
// Returns the user's new balance and an error if the bet was rejected.
func (m *Manager) PlaceBet(userID, betType, betValue string, amount int64) (int64, error) {
	// Validate bet (pure function, no lock needed)
	if err := ValidateBet(betType, betValue, amount); err != nil {
		return 0, err
	}

	// Hold session RLock for the entire state-check + bet-append window.
	// This prevents runSpinningPhase from acquiring the write lock
	// until all in-flight PlaceBet calls have completed.
	m.sessionMu.RLock()
	defer m.sessionMu.RUnlock()

	if m.session.State != StateBetting {
		return 0, ErrBettingClosed
	}

	// Find user
	user := m.GetUser(userID)
	if user == nil {
		return 0, ErrUserNotFound
	}

	// Deduct balance
	user.mu.Lock()
	if user.Balance < amount {
		user.mu.Unlock()
		return 0, ErrInsufficientBalance
	}
	user.Balance -= amount
	newBalance := user.Balance
	user.mu.Unlock()

	// Record bet
	bet := Bet{
		UserID: userID,
		Type:   messages.BetType(betType),
		Value:  betValue,
		Amount: amount,
	}

	m.session.mu.Lock()
	m.session.Bets = append(m.session.Bets, bet)
	m.session.mu.Unlock()

	return newBalance, nil
}

// RunGameLoop runs the infinite game loop cycling through phases.
func (m *Manager) RunGameLoop() {
	for {
		select {
		case <-m.stopCh:
			return
		default:
		}

		m.runBettingPhase()
		m.runSpinningPhase()
		m.runResultPhase()
	}
}

// runCleanup periodically removes users who have been disconnected for too long.
func (m *Manager) runCleanup() {
	m.cleanupTicker = time.NewTicker(cleanupInterval)
	defer m.cleanupTicker.Stop()

	for {
		select {
		case <-m.cleanupStopCh:
			return
		case <-m.cleanupTicker.C:
			now := time.Now()
			m.usersMu.Lock()
			for userID, user := range m.users {
				user.mu.Lock()
				lastDisconnect := user.LastDisconnect
				user.mu.Unlock()

				if lastDisconnect != nil && now.Sub(*lastDisconnect) > disconnectGracePeriod {
					slog.Info("cleaning up disconnected user",
						"user_id", userID,
						"name", user.Name,
						"disconnected_for", now.Sub(*lastDisconnect))
					delete(m.users, userID)
				}
			}
			m.usersMu.Unlock()
		}
	}
}

// Stop shuts down the game loop.
func (m *Manager) Stop() {
	close(m.stopCh)
	if m.cleanupStopCh != nil {
		close(m.cleanupStopCh)
	}
}

func (m *Manager) runBettingPhase() {
	// Reset session
	m.sessionMu.Lock()
	m.session = &GameSession{State: StateBetting}
	m.currentCountdown = int(BettingDuration.Seconds())
	m.sessionMu.Unlock()

	// Broadcast betting state
	m.broadcastGameState(messages.GamePhaseBetting, 0, int(BettingDuration.Seconds()))

	// Countdown
	remaining := int(BettingDuration.Seconds())
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()
	for remaining > 0 {
		select {
		case <-m.stopCh:
			return
		case <-ticker.C:
		}
		remaining--
		m.sessionMu.Lock()
		m.currentCountdown = remaining
		m.sessionMu.Unlock()
		m.broadcastCountdown(messages.GamePhaseBetting, remaining)
	}
}

func (m *Manager) runSpinningPhase() {
	// Transition to spinning — blocks until all PlaceBet RLocks are released
	m.sessionMu.Lock()
	m.session.State = StateSpinning
	m.sessionMu.Unlock()

	// Spin the wheel
	winningNumber, err := SpinWheel()
	if err != nil {
		slog.Error("SpinWheel failed", "error", err)
		return
	}

	m.sessionMu.Lock()
	m.session.WinningNumber = winningNumber
	m.sessionMu.Unlock()

	// Broadcast spinning state
	m.broadcastGameState(messages.GamePhaseSpinning, 0, 0)

	// Wait for spinning duration
	select {
	case <-m.stopCh:
		return
	case <-time.After(SpinningDuration):
	}
}

func (m *Manager) runResultPhase() {
	m.sessionMu.Lock()
	m.session.State = StateResult
	winningNumber := m.session.WinningNumber

	m.session.mu.Lock()
	bets := make([]Bet, len(m.session.Bets))
	copy(bets, m.session.Bets)
	m.session.mu.Unlock()
	m.sessionMu.Unlock()

	// Calculate payouts
	payouts := CalculatePayouts(winningNumber, bets)

	// Group payouts by user and credit winnings
	userPayouts := make(map[string][]Payout)
	userTotalWon := make(map[string]int64)

	for _, p := range payouts {
		userPayouts[p.Bet.UserID] = append(userPayouts[p.Bet.UserID], p)
		if p.Winnings > 0 {
			totalReturn := p.Winnings + p.Bet.Amount
			userTotalWon[p.Bet.UserID] += totalReturn

			user := m.GetUser(p.Bet.UserID)
			if user != nil {
				user.mu.Lock()
				user.Balance += totalReturn
				user.mu.Unlock()
			}
		}
	}

	// Send per-user result messages to ALL connected users
	m.usersMu.RLock()
	for userID, user := range m.users {
		user.mu.Lock()
		balance := user.Balance
		user.mu.Unlock()

		payouts := userPayouts[userID]
		if payouts == nil {
			payouts = []Payout{}
		}
		msg, err := json.Marshal(messages.ResultMessage{
			Type:          "result",
			WinningNumber: winningNumber,
			Payouts:       payouts,
			TotalWon:      userTotalWon[userID],
			Balance:       balance,
		})
		if err != nil {
			slog.Error("failed to marshal result message", "error", err, "user_id", userID)
			continue
		}
		m.sendToUser(userID, msg)
	}
	m.usersMu.RUnlock()

	// Broadcast result state to all
	m.broadcastGameState(messages.GamePhaseResult, winningNumber, 0)

	// Wait for result duration
	select {
	case <-m.stopCh:
		return
	case <-time.After(ResultDuration):
	}

	// Sync all player balances in the player list after payouts
	// (delayed until after ResultDuration so the wheel animation finishes first)
	m.BroadcastPlayerList()

	// Refill any players who hit zero
	m.usersMu.RLock()
	for userID, user := range m.users {
		user.mu.Lock()
		if user.Balance == 0 {
			user.Balance = StartingBalance
			user.mu.Unlock()
			// Notify all clients of balance refill
			m.NotifyBalanceUpdated(userID, StartingBalance)
		} else {
			user.mu.Unlock()
		}
	}
	m.usersMu.RUnlock()
}

func (m *Manager) broadcastGameState(state messages.GamePhase, winningNumber int, countdown int) {
	msg := messages.GameStateMessage{
		Type:  "game_state",
		State: state,
	}
	if state == messages.GamePhaseResult {
		msg.WinningNumber = &winningNumber
	}
	if countdown > 0 {
		msg.Countdown = &countdown
	}

	data, err := json.Marshal(msg)
	if err != nil {
		slog.Error("failed to marshal game state", "error", err, "state", state)
		return
	}
	m.broadcast(data)
}

func (m *Manager) broadcastCountdown(state messages.GamePhase, secondsRemaining int) {
	msg, err := json.Marshal(messages.CountdownMessage{
		Type:             "countdown",
		State:            state,
		SecondsRemaining: secondsRemaining,
	})
	if err != nil {
		slog.Error("failed to marshal countdown", "error", err)
		return
	}
	m.broadcast(msg)
}
