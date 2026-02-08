export const RED_NUMBERS = new Set([
	1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export type NumberColor = "red" | "black" | "green";

export const getNumberColor = (n: number): NumberColor => {
	if (n === 0) {
		return "green";
	}
	return RED_NUMBERS.has(n) ? "red" : "black";
};

export const COLOR_MAP: Record<NumberColor, string> = {
	red: "#C62828",
	black: "#212121",
	green: "#2E7D32",
};

// Standard European roulette wheel order
export const WHEEL_ORDER = [
	0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14,
	31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];
