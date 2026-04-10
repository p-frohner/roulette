import { getNumberColor } from "../data/rouletteNumbers";
import type { BetType } from "../types/game";

export function isBetWinner(betType: BetType, betValue: string, winningNumber: number | null): boolean {
	if (winningNumber === null) {
		return false;
	}
	switch (betType) {
		case "straight":
			return winningNumber === Number(betValue);
		case "color":
			if (winningNumber === 0) return false;
			return getNumberColor(winningNumber) === betValue;
		case "even_odd":
			if (winningNumber === 0) return false;
			return betValue === "even" ? winningNumber % 2 === 0 : winningNumber % 2 !== 0;
		case "dozens":
			if (winningNumber === 0) return false;
			if (betValue === "first") return winningNumber >= 1 && winningNumber <= 12;
			if (betValue === "second") return winningNumber >= 13 && winningNumber <= 24;
			return winningNumber >= 25 && winningNumber <= 36;
	}
}
