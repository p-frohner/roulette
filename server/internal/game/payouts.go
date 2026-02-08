package game

import "strconv"

// CalculatePayouts computes payouts for all bets given the winning number.
// Winnings represent profit only; the caller is responsible for returning the stake.
func CalculatePayouts(winningNumber int, bets []Bet) []Payout {
	payouts := make([]Payout, 0, len(bets))

	for _, bet := range bets {
		var winnings int64

		switch bet.Type {
		case "straight":
			n, _ := strconv.Atoi(bet.Value) // already validated
			if n == winningNumber {
				winnings = bet.Amount * 35
			}

		case "color":
			if winningNumber == 0 {
				// Zero is green — color bets lose
				winnings = 0
			} else {
				isRed := RedNumbers[winningNumber]
				if (bet.Value == "red" && isRed) || (bet.Value == "black" && !isRed) {
					winnings = bet.Amount
				}
			}

		case "even_odd":
			if winningNumber == 0 {
				// Zero — even/odd bets lose
				winnings = 0
			} else {
				isEven := winningNumber%2 == 0
				if (bet.Value == "even" && isEven) || (bet.Value == "odd" && !isEven) {
					winnings = bet.Amount
				}
			}

		case "dozens":
			if winningNumber == 0 {
				// Zero — dozens bets lose
				winnings = 0
			} else {
				var match bool
				switch bet.Value {
				case "first":
					match = winningNumber >= 1 && winningNumber <= 12
				case "second":
					match = winningNumber >= 13 && winningNumber <= 24
				case "third":
					match = winningNumber >= 25 && winningNumber <= 36
				}
				if match {
					winnings = bet.Amount * 2
				}
			}
		}

		payouts = append(payouts, Payout{
			Bet:      bet,
			Winnings: winnings,
		})
	}

	return payouts
}
