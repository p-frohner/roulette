package messages

// GamePhase represents the current phase of a game round.
type GamePhase string

const (
	GamePhaseBetting  GamePhase = "BETTING"
	GamePhaseSpinning GamePhase = "SPINNING"
	GamePhaseResult   GamePhase = "RESULT"
)

// BetType represents the type of bet a player can place.
type BetType string

const (
	BetTypeStraight BetType = "straight"
	BetTypeColor    BetType = "color"
	BetTypeEvenOdd  BetType = "even_odd"
	BetTypeDozens   BetType = "dozens"
)

// Bet represents a single bet placed by a user.
type Bet struct {
	UserID string  `json:"user_id"`
	Type   BetType `json:"type"`
	Value  string  `json:"value"`
	Amount int64   `json:"amount"`
}

// Payout represents the result of a bet after a spin.
type Payout struct {
	Bet      Bet   `json:"bet"`
	Winnings int64 `json:"winnings"`
}

// --- Server → Client messages ---

type WelcomeMessage struct {
	Type    string `json:"type"    tstype:"'welcome'"`
	UserID  string `json:"user_id"`
	Balance int64  `json:"balance"`
	History []int  `json:"history"`
}

type GameStateMessage struct {
	Type          string    `json:"type"           tstype:"'game_state'"`
	State         GamePhase `json:"state"`
	WinningNumber *int      `json:"winning_number,omitempty"`
	Countdown     *int      `json:"countdown,omitempty"`
	History       []int     `json:"history"`
}

type CountdownMessage struct {
	Type             string    `json:"type"              tstype:"'countdown'"`
	State            GamePhase `json:"state"`
	SecondsRemaining int       `json:"seconds_remaining"`
}

type BetAcceptedMessage struct {
	Type     string  `json:"type"      tstype:"'bet_accepted'"`
	BetType  BetType `json:"bet_type"`
	BetValue string  `json:"bet_value"`
	Amount   int64   `json:"amount"`
	Balance  int64   `json:"balance"`
}

type BetRejectedMessage struct {
	Type   string `json:"type"   tstype:"'bet_rejected'"`
	Reason string `json:"reason"`
}

type ResultMessage struct {
	Type          string   `json:"type"           tstype:"'result'"`
	WinningNumber int      `json:"winning_number"`
	Payouts       []Payout `json:"payouts"`
	TotalWon      int64    `json:"total_won"`
	Balance       int64    `json:"balance"`
}

type BetPlacedMessage struct {
	Type       string  `json:"type"        tstype:"'bet_placed'"`
	PlayerName string  `json:"player_name"`
	BetType    BetType `json:"bet_type"`
	BetValue   string  `json:"bet_value"`
	Amount     int64   `json:"amount"`
}

// --- Client → Server messages ---

type PlaceBetAction struct {
	Action   string  `json:"action"    tstype:"'place_bet'"`
	BetType  BetType `json:"bet_type"`
	BetValue string  `json:"bet_value"`
	Amount   int64   `json:"amount"`
}

type SetNameAction struct {
	Action string `json:"action" tstype:"'set_name'"`
	Name   string `json:"name"`
}
