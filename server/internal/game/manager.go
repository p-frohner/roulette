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

// Manager orchestrates the roulette game loop and manages users.
type Manager struct {
	users      map[string]*User
	usersMu    sync.RWMutex
	session    *GameSession
	sessionMu  sync.RWMutex
	history    []int // last 10 winning numbers, most recent first
	broadcast  BroadcastFunc
	sendToUser SendToUserFunc
	stopCh     chan struct{}
}

// NewManager creates a new game Manager with the given broadcast functions.
func NewManager(broadcastAll BroadcastFunc, sendToUser SendToUserFunc) *Manager {
	return &Manager{
		users:      make(map[string]*User),
		session:    &GameSession{State: StateBetting},
		broadcast:  broadcastAll,
		sendToUser: sendToUser,
		stopCh:     make(chan struct{}),
	}
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

// History returns a copy of the last 10 winning numbers.
func (m *Manager) History() []int {
	m.sessionMu.RLock()
	defer m.sessionMu.RUnlock()
	h := make([]int, len(m.history))
	copy(h, m.history)
	return h
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

// Stop shuts down the game loop.
func (m *Manager) Stop() {
	close(m.stopCh)
}

func (m *Manager) runBettingPhase() {
	// Reset session
	m.sessionMu.Lock()
	m.session = &GameSession{State: StateBetting}
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

	// Record winning number in history (most recent first, max 10)
	m.history = append([]int{winningNumber}, m.history...)
	if len(m.history) > 10 {
		m.history = m.history[:10]
	}

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

	// Refill any players who hit zero
	m.usersMu.RLock()
	for _, user := range m.users {
		user.mu.Lock()
		if user.Balance == 0 {
			user.Balance = StartingBalance
		}
		user.mu.Unlock()
	}
	m.usersMu.RUnlock()
}

func (m *Manager) broadcastGameState(state messages.GamePhase, winningNumber int, countdown int) {
	m.sessionMu.RLock()
	history := make([]int, len(m.history))
	copy(history, m.history)
	m.sessionMu.RUnlock()

	msg := messages.GameStateMessage{
		Type:    "game_state",
		State:   state,
		History: history,
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
