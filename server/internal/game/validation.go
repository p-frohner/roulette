package game

import (
	"fmt"
	"strconv"
)

// ValidateBet checks whether the given bet parameters are valid.
// Returns an error message string, or "" if the bet is valid.
func ValidateBet(betType, betValue string, amount int64) string {
	if amount <= 0 {
		return "Bet amount must be greater than 0"
	}

	switch betType {
	case "straight":
		n, err := strconv.Atoi(betValue)
		if err != nil || n < 0 || n > 36 {
			return fmt.Sprintf("Invalid straight bet value: %s (must be 0-36)", betValue)
		}
	case "color":
		if betValue != "red" && betValue != "black" {
			return fmt.Sprintf("Invalid color bet value: %s (must be red or black)", betValue)
		}
	case "even_odd":
		if betValue != "even" && betValue != "odd" {
			return fmt.Sprintf("Invalid even_odd bet value: %s (must be even or odd)", betValue)
		}
	case "dozens":
		if betValue != "first" && betValue != "second" && betValue != "third" {
			return fmt.Sprintf("Invalid dozens bet value: %s (must be first, second, or third)", betValue)
		}
	default:
		return fmt.Sprintf("Unknown bet type: %s", betType)
	}

	return ""
}
