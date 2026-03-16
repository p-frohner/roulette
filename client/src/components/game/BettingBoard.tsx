import { Box, styled } from "@mui/material";
import { COLOR_MAP, getNumberColor } from "../../data/rouletteNumbers";
import type { BetType } from "../../types/game";

type Props = {
	onSelectBet: (betType: BetType, betValue: string) => void;
	disabled: boolean;
	winningNumber: number | null;
	showResult: boolean;
	vertical?: boolean;
};

export const BettingBoard = ({
	onSelectBet,
	disabled,
	showResult,
	winningNumber,
	vertical,
}: Props) => {
	const grid = vertical ? V_GRID : H_GRID;
	const handleClick = (betType: BetType, betValue: string) => {
		if (!disabled) {
			onSelectBet(betType, betValue);
		}
	};

	return (
		<Box>
			{/* Color and Even/Odd */}
			<Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={0.5} mb={1}>
				<OutsideBet
					disabled={disabled}
					isWinner={showResult && isWinnerOutside("color", "red", winningNumber)}
					bgColor="#9B1B1B"
					onClick={() => handleClick("color", "red")}
				>
					Red
				</OutsideBet>
				<OutsideBet
					disabled={disabled}
					isWinner={showResult && isWinnerOutside("color", "black", winningNumber)}
					bgColor="#212121"
					onClick={() => handleClick("color", "black")}
				>
					Black
				</OutsideBet>
				<OutsideBet
					disabled={disabled}
					isWinner={showResult && isWinnerOutside("even_odd", "even", winningNumber)}
					onClick={() => handleClick("even_odd", "even")}
				>
					Even
				</OutsideBet>
				<OutsideBet
					disabled={disabled}
					isWinner={showResult && isWinnerOutside("even_odd", "odd", winningNumber)}
					onClick={() => handleClick("even_odd", "odd")}
				>
					Odd
				</OutsideBet>
			</Box>

			{/* Number grid */}
			<Box
				display="grid"
				gridTemplateColumns={
					vertical ? "repeat(3, 1fr)" : "minmax(45px, 70px) repeat(12, minmax(28px, 1fr))"
				}
				gridTemplateRows={vertical ? undefined : "repeat(3, 1fr)"}
				gap={0.5}
				mb={1}
			>
				<Cell
					bgColor={COLOR_MAP.green}
					isWinner={showResult && winningNumber === 0}
					disabled={disabled}
					onClick={() => handleClick("straight", "0")}
					style={
						vertical
							? { gridColumn: "1 / 4", fontSize: "1.2rem" }
							: { gridRow: "1 / 4", fontSize: "1.2rem" }
					}
				>
					0
				</Cell>
				{grid.map((row) =>
					row.map((n) => (
						<Cell
							key={n}
							bgColor={COLOR_MAP[getNumberColor(n)]}
							isWinner={showResult && winningNumber === n}
							disabled={disabled}
							onClick={() => handleClick("straight", String(n))}
						>
							{n}
						</Cell>
					)),
				)}
			</Box>

			{/* Dozens */}
			<Box
				display="grid"
				gridTemplateColumns={
					vertical ? "repeat(3, 1fr)" : "minmax(45px, 70px) repeat(3, 1fr)"
				}
				gap={0.5}
				mb={1}
			>
				{!vertical && <Box sx={{ minWidth: 45, maxWidth: 70 }} />}
				<OutsideBet
					disabled={disabled}
					isWinner={showResult && isWinnerOutside("dozens", "first", winningNumber)}
					onClick={() => handleClick("dozens", "first")}
				>
					1st 12
				</OutsideBet>
				<OutsideBet
					disabled={disabled}
					isWinner={showResult && isWinnerOutside("dozens", "second", winningNumber)}
					onClick={() => handleClick("dozens", "second")}
				>
					2nd 12
				</OutsideBet>
				<OutsideBet
					disabled={disabled}
					isWinner={showResult && isWinnerOutside("dozens", "third", winningNumber)}
					onClick={() => handleClick("dozens", "third")}
				>
					3rd 12
				</OutsideBet>
			</Box>
		</Box>
	);
};

const Cell = styled("button", {
	shouldForwardProp: (prop) => prop !== "bgColor" && prop !== "isWinner",
})<{ bgColor: string; isWinner: boolean; disabled: boolean }>(
	({ bgColor, isWinner, disabled }) => ({
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: bgColor,
		color: "#fff",
		fontWeight: 700,
		fontSize: "0.9rem",
		border: isWinner ? "3px solid #C9A84C" : "3px solid transparent",
		borderRadius: 3,
		cursor: disabled ? "default" : "pointer",
		opacity: disabled ? 0.65 : 1,
		padding: "10px 0",
		transition: "background-color 0.15s, border-color 0.15s, box-shadow 0.2s",
		boxShadow: isWinner ? "0 0 0 2px #C9A84C, 0 0 20px rgba(201,168,76,0.8)" : "none",
		"&:hover": !disabled
			? {
					backgroundColor: "rgba(201,168,76,0.15)",
					borderColor: "rgba(201,168,76,0.6)",
				}
			: {},
	}),
);

const OutsideBet = styled("button", {
	shouldForwardProp: (prop) => prop !== "bgColor" && prop !== "isWinner",
})<{ disabled: boolean; isWinner: boolean; bgColor?: string }>(
	({ disabled, isWinner, bgColor }) => ({
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: bgColor ?? "#2A2A2A",
		color: "#fff",
		fontWeight: 600,
		fontSize: "0.85rem",
		letterSpacing: "0.04em",
		border: isWinner ? "3px solid #C9A84C" : "3px solid transparent",
		borderRadius: 3,
		cursor: disabled ? "default" : "pointer",
		opacity: disabled ? 0.65 : 1,
		padding: "10px 8px",
		transition: "background-color 0.15s, border-color 0.15s, box-shadow 0.2s",
		boxShadow: isWinner ? "0 0 0 2px #C9A84C, 0 0 20px rgba(201,168,76,0.8)" : "none",
		"&:hover": !disabled
			? {
					backgroundColor: bgColor ? "rgba(201,168,76,0.15)" : "#3A3A3A",
					borderColor: "rgba(201,168,76,0.6)",
				}
			: {},
	}),
);

// Horizontal: 12 columns x 3 rows (standard roulette table layout)
const H_GRID: number[][] = [];
for (let row = 0; row < 3; row++) {
	const rowNumbers: number[] = [];
	for (let col = 0; col < 12; col++) {
		rowNumbers.push(col * 3 + row + 1);
	}
	H_GRID.push(rowNumbers);
}

// Vertical: 3 columns x 12 rows (mobile portrait)
const V_GRID: number[][] = [];
for (let row = 0; row < 12; row++) {
	const rowNumbers: number[] = [];
	for (let col = 0; col < 3; col++) {
		rowNumbers.push(row * 3 + col + 1);
	}
	V_GRID.push(rowNumbers);
}

const isWinnerOutside = (
	betType: BetType,
	betValue: string,
	winningNumber: number | null,
): boolean => {
	if (winningNumber === null || winningNumber === 0) {
		return false;
	}
	switch (betType) {
		case "color":
			return getNumberColor(winningNumber) === betValue;
		case "even_odd":
			return betValue === "even" ? winningNumber % 2 === 0 : winningNumber % 2 !== 0;
		case "dozens":
			if (betValue === "first") {
				return winningNumber >= 1 && winningNumber <= 12;
			}
			if (betValue === "second") {
				return winningNumber >= 13 && winningNumber <= 24;
			}
			return winningNumber >= 25 && winningNumber <= 36;
		default:
			return false;
	}
};
