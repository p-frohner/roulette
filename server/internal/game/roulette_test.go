package game

import (
	"testing"
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
