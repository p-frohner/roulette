package game

import (
	"crypto/rand"
	"fmt"
	"math/big"
)

// SpinWheel generates a cryptographically random roulette number between 0 and 36.
func SpinWheel() (int, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(37))
	if err != nil {
		return 0, fmt.Errorf("failed to generate random number: %w", err)
	}
	return int(n.Int64()), nil
}
