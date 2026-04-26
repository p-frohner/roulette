package game

import (
	"encoding/json"
	"fmt"
	"sync"
	"testing"
	"time"
)

// --- SpinWheel tests ---

func TestSpinWheelRange(t *testing.T) {
	for i := 0; i < 10000; i++ {
		n, err := SpinWheel()
		if err != nil {
			t.Fatalf("SpinWheel returned error: %v", err)
		}
		if n < 0 || n > 36 {
			t.Fatalf("SpinWheel returned %d, expected 0-36", n)
		}
	}
}

// --- CalculatePayouts tests ---

func TestCalculatePayouts_StraightWin(t *testing.T) {
	bets := []Bet{{UserID: "u1", Type: "straight", Value: "17", Amount: 100}}
	payouts := CalculatePayouts(17, bets)
	if len(payouts) != 1 {
		t.Fatalf("expected 1 payout, got %d", len(payouts))
	}
	if payouts[0].Winnings != 3500 {
		t.Errorf("expected winnings 3500, got %d", payouts[0].Winnings)
	}
}

func TestCalculatePayouts_StraightLoss(t *testing.T) {
	bets := []Bet{{UserID: "u1", Type: "straight", Value: "17", Amount: 100}}
	payouts := CalculatePayouts(5, bets)
	if payouts[0].Winnings != 0 {
		t.Errorf("expected winnings 0, got %d", payouts[0].Winnings)
	}
}

func TestCalculatePayouts_ColorWin(t *testing.T) {
	// 1 is red
	bets := []Bet{{UserID: "u1", Type: "color", Value: "red", Amount: 200}}
	payouts := CalculatePayouts(1, bets)
	if payouts[0].Winnings != 200 {
		t.Errorf("expected winnings 200, got %d", payouts[0].Winnings)
	}
}

func TestCalculatePayouts_ColorLoss(t *testing.T) {
	// 2 is black
	bets := []Bet{{UserID: "u1", Type: "color", Value: "red", Amount: 200}}
	payouts := CalculatePayouts(2, bets)
	if payouts[0].Winnings != 0 {
		t.Errorf("expected winnings 0, got %d", payouts[0].Winnings)
	}
}

func TestCalculatePayouts_ColorLossOnZero(t *testing.T) {
	bets := []Bet{{UserID: "u1", Type: "color", Value: "red", Amount: 200}}
	payouts := CalculatePayouts(0, bets)
	if payouts[0].Winnings != 0 {
		t.Errorf("expected winnings 0 on zero, got %d", payouts[0].Winnings)
	}
}

func TestCalculatePayouts_EvenOddWin(t *testing.T) {
	bets := []Bet{{UserID: "u1", Type: "even_odd", Value: "even", Amount: 300}}
	payouts := CalculatePayouts(4, bets)
	if payouts[0].Winnings != 300 {
		t.Errorf("expected winnings 300, got %d", payouts[0].Winnings)
	}
}

func TestCalculatePayouts_EvenOddLoss(t *testing.T) {
	bets := []Bet{{UserID: "u1", Type: "even_odd", Value: "even", Amount: 300}}
	payouts := CalculatePayouts(3, bets)
	if payouts[0].Winnings != 0 {
		t.Errorf("expected winnings 0, got %d", payouts[0].Winnings)
	}
}

func TestCalculatePayouts_EvenOddLossOnZero(t *testing.T) {
	bets := []Bet{{UserID: "u1", Type: "even_odd", Value: "odd", Amount: 300}}
	payouts := CalculatePayouts(0, bets)
	if payouts[0].Winnings != 0 {
		t.Errorf("expected winnings 0 on zero, got %d", payouts[0].Winnings)
	}
}

func TestCalculatePayouts_DozensWin(t *testing.T) {
	bets := []Bet{{UserID: "u1", Type: "dozens", Value: "second", Amount: 500}}
	payouts := CalculatePayouts(15, bets) // 15 is in second dozen (13-24)
	if payouts[0].Winnings != 1000 {
		t.Errorf("expected winnings 1000, got %d", payouts[0].Winnings)
	}
}

func TestCalculatePayouts_DozensLoss(t *testing.T) {
	bets := []Bet{{UserID: "u1", Type: "dozens", Value: "first", Amount: 500}}
	payouts := CalculatePayouts(25, bets) // 25 is in third dozen
	if payouts[0].Winnings != 0 {
		t.Errorf("expected winnings 0, got %d", payouts[0].Winnings)
	}
}

func TestCalculatePayouts_DozensLossOnZero(t *testing.T) {
	bets := []Bet{{UserID: "u1", Type: "dozens", Value: "first", Amount: 500}}
	payouts := CalculatePayouts(0, bets)
	if payouts[0].Winnings != 0 {
		t.Errorf("expected winnings 0 on zero, got %d", payouts[0].Winnings)
	}
}

// --- ValidateBet tests ---

func TestValidateBet_ValidStraight(t *testing.T) {
	if err := ValidateBet("straight", "0", 100); err != nil {
		t.Errorf("expected valid, got: %v", err)
	}
	if err := ValidateBet("straight", "36", 100); err != nil {
		t.Errorf("expected valid, got: %v", err)
	}
}

func TestValidateBet_InvalidStraight(t *testing.T) {
	if err := ValidateBet("straight", "37", 100); err == nil {
		t.Error("expected error for value 37")
	}
	if err := ValidateBet("straight", "-1", 100); err == nil {
		t.Error("expected error for value -1")
	}
	if err := ValidateBet("straight", "abc", 100); err == nil {
		t.Error("expected error for non-numeric value")
	}
}

func TestValidateBet_ValidColor(t *testing.T) {
	if err := ValidateBet("color", "red", 100); err != nil {
		t.Errorf("expected valid, got: %v", err)
	}
	if err := ValidateBet("color", "black", 100); err != nil {
		t.Errorf("expected valid, got: %v", err)
	}
}

func TestValidateBet_InvalidColor(t *testing.T) {
	if err := ValidateBet("color", "green", 100); err == nil {
		t.Error("expected error for green")
	}
}

func TestValidateBet_ValidEvenOdd(t *testing.T) {
	if err := ValidateBet("even_odd", "even", 100); err != nil {
		t.Errorf("expected valid, got: %v", err)
	}
	if err := ValidateBet("even_odd", "odd", 100); err != nil {
		t.Errorf("expected valid, got: %v", err)
	}
}

func TestValidateBet_InvalidEvenOdd(t *testing.T) {
	if err := ValidateBet("even_odd", "neither", 100); err == nil {
		t.Error("expected error for neither")
	}
}

func TestValidateBet_ValidDozens(t *testing.T) {
	for _, v := range []string{"first", "second", "third"} {
		if err := ValidateBet("dozens", v, 100); err != nil {
			t.Errorf("expected valid for %s, got: %v", v, err)
		}
	}
}

func TestValidateBet_InvalidDozens(t *testing.T) {
	if err := ValidateBet("dozens", "fourth", 100); err == nil {
		t.Error("expected error for fourth")
	}
}

func TestValidateBet_InvalidAmount(t *testing.T) {
	if err := ValidateBet("straight", "5", 0); err == nil {
		t.Error("expected error for zero amount")
	}
	if err := ValidateBet("straight", "5", -100); err == nil {
		t.Error("expected error for negative amount")
	}
}

func TestValidateBet_UnknownType(t *testing.T) {
	if err := ValidateBet("split", "1-2", 100); err == nil {
		t.Error("expected error for unknown bet type")
	}
}

// --- PlaceBet tests ---

func TestPlaceBet_RejectsWhenNotBetting(t *testing.T) {
	m := NewManager(func([]byte) {}, func(string, []byte) {})
	t.Cleanup(func() { m.Stop() })
	m.RegisterUser("u1")

	// Set state to spinning
	m.sessionMu.Lock()
	m.session.State = StateSpinning
	m.sessionMu.Unlock()

	_, err := m.PlaceBet("u1", "straight", "5", 100)
	if err == nil {
		t.Error("expected error when not in betting state")
	}
}

func TestPlaceBet_RejectsInsufficientBalance(t *testing.T) {
	m := NewManager(func([]byte) {}, func(string, []byte) {})
	t.Cleanup(func() { m.Stop() })
	m.RegisterUser("u1")

	// Set state to betting
	m.sessionMu.Lock()
	m.session.State = StateBetting
	m.sessionMu.Unlock()

	_, err := m.PlaceBet("u1", "straight", "5", StartingBalance+1)
	if err == nil {
		t.Error("expected error for insufficient balance")
	}
}

func TestPlaceBet_Success(t *testing.T) {
	m := NewManager(func([]byte) {}, func(string, []byte) {})
	t.Cleanup(func() { m.Stop() })
	user := m.RegisterUser("u1")

	m.sessionMu.Lock()
	m.session.State = StateBetting
	m.sessionMu.Unlock()

	newBalance, err := m.PlaceBet("u1", "straight", "5", 500)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if newBalance != StartingBalance-500 {
		t.Errorf("expected balance %d, got %d", StartingBalance-500, newBalance)
	}

	user.mu.Lock()
	if user.Balance != StartingBalance-500 {
		t.Errorf("expected user balance %d, got %d", StartingBalance-500, user.Balance)
	}
	user.mu.Unlock()

	m.sessionMu.RLock()
	m.session.mu.Lock()
	if len(m.session.Bets) != 1 {
		t.Errorf("expected 1 bet, got %d", len(m.session.Bets))
	}
	m.session.mu.Unlock()
	m.sessionMu.RUnlock()
}

// --- fakeClock helper ---

type fakeClock struct {
	afterCh chan time.Time
	tickCh  chan time.Time
}

func newFakeClock() *fakeClock {
	return &fakeClock{
		afterCh: make(chan time.Time, 4),
		tickCh:  make(chan time.Time, 25),
	}
}

func (f *fakeClock) After(time.Duration) <-chan time.Time { return f.afterCh }
func (f *fakeClock) NewTicker(time.Duration) (<-chan time.Time, func()) {
	return f.tickCh, func() {}
}
func (f *fakeClock) advanceBetting() {
	for i := 0; i < int(BettingDuration.Seconds()); i++ {
		f.tickCh <- time.Now()
	}
}
func (f *fakeClock) advanceAfter() { f.afterCh <- time.Now() }

// --- ValidateSessionToken tests ---

func TestValidateSessionToken_Valid(t *testing.T) {
	m := NewManager(func([]byte) {}, func(string, []byte) {})
	t.Cleanup(func() { m.Stop() })

	user := m.RegisterUser("u1")
	user.mu.Lock()
	token := user.SessionToken
	user.mu.Unlock()

	if !m.ValidateSessionToken("u1", token) {
		t.Error("expected valid token to be accepted")
	}
}

func TestValidateSessionToken_Invalid(t *testing.T) {
	m := NewManager(func([]byte) {}, func(string, []byte) {})
	t.Cleanup(func() { m.Stop() })

	m.RegisterUser("u1")

	if m.ValidateSessionToken("u1", "wrong-token") {
		t.Error("expected wrong token to be rejected")
	}
}

func TestValidateSessionToken_UnknownUser(t *testing.T) {
	m := NewManager(func([]byte) {}, func(string, []byte) {})
	t.Cleanup(func() { m.Stop() })

	if m.ValidateSessionToken("nonexistent", "any-token") {
		t.Error("expected unknown user to be rejected")
	}
}

// --- Cleanup tests ---

func TestCleanup_RemovesDisconnectedUser(t *testing.T) {
	m := NewManager(func([]byte) {}, func(string, []byte) {})
	t.Cleanup(func() { m.Stop() })

	userID := m.RegisterUser("u1").ID
	past := time.Now().Add(-(disconnectGracePeriod + time.Minute))
	user := m.GetUser(userID)
	user.mu.Lock()
	user.LastDisconnect = &past
	user.mu.Unlock()

	m.cleanupDisconnectedUsers(time.Now())

	if m.GetUser(userID) != nil {
		t.Error("expected user to be removed after grace period")
	}
}

func TestCleanup_KeepsRecentlyDisconnectedUser(t *testing.T) {
	m := NewManager(func([]byte) {}, func(string, []byte) {})
	t.Cleanup(func() { m.Stop() })

	userID := m.RegisterUser("u1").ID
	recent := time.Now().Add(-time.Minute)
	user := m.GetUser(userID)
	user.mu.Lock()
	user.LastDisconnect = &recent
	user.mu.Unlock()

	m.cleanupDisconnectedUsers(time.Now())

	if m.GetUser(userID) == nil {
		t.Error("expected user to be kept within grace period")
	}
}

func TestCleanup_KeepsConnectedUser(t *testing.T) {
	m := NewManager(func([]byte) {}, func(string, []byte) {})
	t.Cleanup(func() { m.Stop() })

	userID := m.RegisterUser("u1").ID
	m.cleanupDisconnectedUsers(time.Now())

	if m.GetUser(userID) == nil {
		t.Error("expected connected user to be kept")
	}
}

// --- Result phase tests ---

func TestResultPhase_RefillsZeroBalance(t *testing.T) {
	fc := newFakeClock()
	m := NewManager(func([]byte) {}, func(string, []byte) {})
	m.SetClock(fc)
	t.Cleanup(func() { m.Stop() })

	user := m.RegisterUser("u1")
	user.mu.Lock()
	user.Balance = 0
	user.mu.Unlock()

	fc.advanceAfter()
	m.runResultPhase()

	user.mu.Lock()
	got := user.Balance
	user.mu.Unlock()

	if got != StartingBalance {
		t.Errorf("expected balance %d after refill, got %d", StartingBalance, got)
	}
}

func TestResultPhase_NoRefillWithPositiveBalance(t *testing.T) {
	fc := newFakeClock()
	m := NewManager(func([]byte) {}, func(string, []byte) {})
	m.SetClock(fc)
	t.Cleanup(func() { m.Stop() })

	user := m.RegisterUser("u1")
	user.mu.Lock()
	user.Balance = 500
	user.mu.Unlock()

	fc.advanceAfter()
	m.runResultPhase()

	user.mu.Lock()
	got := user.Balance
	user.mu.Unlock()

	if got != 500 {
		t.Errorf("expected balance 500 (no refill), got %d", got)
	}
}

func TestResultPhase_PlayerListContainsRefilledBalance(t *testing.T) {
	fc := newFakeClock()
	var broadcastMu sync.Mutex
	var broadcasts [][]byte

	m := NewManager(
		func(data []byte) {
			broadcastMu.Lock()
			broadcasts = append(broadcasts, append([]byte{}, data...))
			broadcastMu.Unlock()
		},
		func(string, []byte) {},
	)
	m.SetClock(fc)
	t.Cleanup(func() { m.Stop() })

	user := m.RegisterUser("u1")
	user.mu.Lock()
	user.Balance = 0
	user.mu.Unlock()

	fc.advanceAfter()
	m.runResultPhase()

	broadcastMu.Lock()
	defer broadcastMu.Unlock()

	var playerListFound bool
	for _, b := range broadcasts {
		var msg struct {
			Type    string `json:"type"`
			Players []struct {
				UserID  string `json:"user_id"`
				Balance int64  `json:"balance"`
			} `json:"players"`
		}
		if err := json.Unmarshal(b, &msg); err != nil || msg.Type != "player_list" {
			continue
		}
		playerListFound = true
		for _, p := range msg.Players {
			if p.UserID == "u1" && p.Balance != StartingBalance {
				t.Errorf("player_list shows balance %d, want %d (refill must happen before broadcast)", p.Balance, StartingBalance)
			}
		}
	}
	if !playerListFound {
		t.Error("no player_list broadcast found")
	}
}

// --- Game loop integration tests ---

func TestGameLoop_FullCycle_NoBets(t *testing.T) {
	fc := newFakeClock()

	type userMsg struct {
		uid  string
		data []byte
	}
	userMsgs := make(chan userMsg, 10)

	m := NewManager(
		func([]byte) {},
		func(uid string, data []byte) { userMsgs <- userMsg{uid, data} },
	)
	m.SetClock(fc)
	t.Cleanup(func() { m.Stop() })

	m.RegisterUser("u1")

	fc.advanceBetting()
	fc.advanceAfter() // spinning
	fc.advanceAfter() // result

	go m.RunGameLoop()

	select {
	case msg := <-userMsgs:
		var result struct {
			Type    string        `json:"type"`
			Balance int64         `json:"balance"`
			Payouts []interface{} `json:"payouts"`
		}
		if err := json.Unmarshal(msg.data, &result); err != nil {
			t.Fatalf("unmarshal error: %v", err)
		}
		if result.Type != "result" {
			t.Errorf("expected result message type, got %s", result.Type)
		}
		if result.Balance != StartingBalance {
			t.Errorf("expected balance %d (no bets), got %d", StartingBalance, result.Balance)
		}
		if len(result.Payouts) != 0 {
			t.Errorf("expected 0 payouts, got %d", len(result.Payouts))
		}
	case <-time.After(5 * time.Second):
		t.Fatal("timeout waiting for result message")
	}
}

func TestGameLoop_FullCycle_PlayerListHasRefilledBalance(t *testing.T) {
	fc := newFakeClock()
	broadcasts := make(chan []byte, 50)

	m := NewManager(
		func(data []byte) {
			select {
			case broadcasts <- append([]byte{}, data...):
			default:
			}
		},
		func(string, []byte) {},
	)
	m.SetClock(fc)
	t.Cleanup(func() { m.Stop() })

	user := m.RegisterUser("u1")
	user.mu.Lock()
	user.Balance = 0
	user.mu.Unlock()

	fc.advanceBetting()
	fc.advanceAfter() // spinning
	fc.advanceAfter() // result

	go m.RunGameLoop()

	deadline := time.After(5 * time.Second)
	for {
		select {
		case data := <-broadcasts:
			var msg struct {
				Type    string `json:"type"`
				Players []struct {
					UserID  string `json:"user_id"`
					Balance int64  `json:"balance"`
				} `json:"players"`
			}
			if err := json.Unmarshal(data, &msg); err != nil || msg.Type != "player_list" {
				continue
			}
			for _, p := range msg.Players {
				if p.UserID == "u1" {
					if p.Balance != StartingBalance {
						t.Errorf("player_list balance = %d, want %d after refill", p.Balance, StartingBalance)
					}
					return
				}
			}
		case <-deadline:
			t.Fatal("timeout waiting for player_list with refilled balance")
		}
	}
}

// TestPlaceBet_ConcurrentBets verifies that simultaneous bets from multiple
// goroutines neither race nor corrupt the balance. Run with -race.
func TestPlaceBet_ConcurrentBets(t *testing.T) {
	const numBettors = 10
	const betAmount = int64(100)

	m := NewManager(func([]byte) {}, func(string, []byte) {})
	t.Cleanup(func() { m.Stop() })

	// Register one user per goroutine
	for i := range numBettors {
		m.RegisterUser(fmt.Sprintf("u%d", i))
	}

	m.sessionMu.Lock()
	m.session.State = StateBetting
	m.sessionMu.Unlock()

	var wg sync.WaitGroup
	wg.Add(numBettors)
	for i := range numBettors {
		go func(id string) {
			defer wg.Done()
			_, err := m.PlaceBet(id, "straight", "7", betAmount)
			if err != nil {
				t.Errorf("unexpected error for %s: %v", id, err)
			}
		}(fmt.Sprintf("u%d", i))
	}
	wg.Wait()

	// Every user should have been debited exactly betAmount
	for i := range numBettors {
		user := m.GetUser(fmt.Sprintf("u%d", i))
		user.mu.Lock()
		got := user.Balance
		user.mu.Unlock()
		if got != StartingBalance-betAmount {
			t.Errorf("u%d: expected balance %d, got %d", i, StartingBalance-betAmount, got)
		}
	}

	// All bets should be recorded
	m.sessionMu.RLock()
	m.session.mu.Lock()
	if len(m.session.Bets) != numBettors {
		t.Errorf("expected %d bets, got %d", numBettors, len(m.session.Bets))
	}
	m.session.mu.Unlock()
	m.sessionMu.RUnlock()
}
