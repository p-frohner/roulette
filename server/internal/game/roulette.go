package game

import (
	"sync"
	"time"

	"roulette/internal/messages"
)

// Bet and Payout are defined in the messages package (single source of truth).
type Bet = messages.Bet
type Payout = messages.Payout

// Game state enum
type GameState int

const (
	StateBetting GameState = iota
	StateSpinning
	StateResult
)

func (s GameState) String() string {
	switch s {
	case StateBetting:
		return "BETTING"
	case StateSpinning:
		return "SPINNING"
	case StateResult:
		return "RESULT"
	default:
		return "UNKNOWN"
	}
}

// Phase durations
const (
	BettingDuration  = 20 * time.Second
	SpinningDuration = 5 * time.Second
	ResultDuration   = 7 * time.Second // 2.5s of this is the wheel decelrate animation
	StartingBalance  = 10000           // $100.00 in cents
)

// RedNumbers maps roulette numbers that are red
var RedNumbers = map[int]bool{
	1: true, 3: true, 5: true, 7: true, 9: true,
	12: true, 14: true, 16: true, 18: true, 19: true,
	21: true, 23: true, 25: true, 27: true, 30: true,
	32: true, 34: true, 36: true,
}

// User represents a connected player
type User struct {
	ID             string     `json:"id"`
	Name           string     `json:"name"`
	Balance        int64      `json:"balance"`
	LastDisconnect *time.Time `json:"last_disconnect,omitempty"` // nil when connected, set when disconnected
	mu             sync.Mutex
}

// GameSession represents a single round of roulette
type GameSession struct {
	State         GameState `json:"state"`
	Bets          []Bet     `json:"bets"`
	WinningNumber int       `json:"winning_number"`
	mu            sync.Mutex
}
