package game

import (
	"errors"
	"fmt"
	"strconv"
)

var (
	ErrBetAmountZero       = errors.New("bet amount must be greater than 0")
	ErrUnknownBetType      = errors.New("unknown bet type")
	ErrInvalidBetValue     = errors.New("invalid bet value")
	ErrBettingClosed       = errors.New("betting is closed")
	ErrUserNotFound        = errors.New("user not found")
	ErrInsufficientBalance = errors.New("insufficient balance")
)

// ValidateBet checks whether the given bet parameters are valid.
func ValidateBet(betType, betValue string, amount int64) error {
	if amount <= 0 {
		return ErrBetAmountZero
	}

	switch betType {
	case "straight":
		n, err := strconv.Atoi(betValue)
		if err != nil || n < 0 || n > 36 {
			return fmt.Errorf("%w: straight bet %s (must be 0-36)", ErrInvalidBetValue, betValue)
		}
	case "color":
		if betValue != "red" && betValue != "black" {
			return fmt.Errorf("%w: color bet %s (must be red or black)", ErrInvalidBetValue, betValue)
		}
	case "even_odd":
		if betValue != "even" && betValue != "odd" {
			return fmt.Errorf("%w: even_odd bet %s (must be even or odd)", ErrInvalidBetValue, betValue)
		}
	case "dozens":
		if betValue != "first" && betValue != "second" && betValue != "third" {
			return fmt.Errorf("%w: dozens bet %s (must be first, second, or third)", ErrInvalidBetValue, betValue)
		}
	default:
		return fmt.Errorf("%w: %s", ErrUnknownBetType, betType)
	}

	return nil
}
