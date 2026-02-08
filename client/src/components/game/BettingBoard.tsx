import { Box, styled } from "@mui/material";
import { COLOR_MAP, getNumberColor } from "../../data/rouletteNumbers";
import type { BetType } from "../../types/game";

type Props = {
	onSelectBet: (betType: BetType, betValue: string) => void;
	disabled: boolean;
	winningNumber: number | null;
	showResult: boolean;
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
		fontSize: "1rem",
		border: isWinner ? "3px solid #FFD700" : "3px solid rgba(255,255,255,0.2)",
		borderRadius: 4,
		cursor: disabled ? "default" : "pointer",
		opacity: disabled ? 0.7 : 1,
		padding: "10px 0",
		transition: "transform 0.1s, box-shadow 0.2s",
		boxShadow: isWinner ? "0 0 16px rgba(255, 215, 0, 0.6)" : "none",
		"&:hover": !disabled
			? {
					transform: "scale(1.05)",
					boxShadow: "0 0 12px rgba(255, 215, 0, 0.4)",
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
		backgroundColor: bgColor ?? "rgba(255,255,255,0.05)",
		color: "#fff",
		fontWeight: 600,
		fontSize: "0.9rem",
		border: isWinner ? "3px solid #FFD700" : "3px solid rgba(255,255,255,0.2)",
		borderRadius: 4,
		cursor: disabled ? "default" : "pointer",
		opacity: disabled ? 0.7 : 1,
		padding: "10px 8px",
		transition: "transform 0.1s, box-shadow 0.2s",
		boxShadow: isWinner ? "0 0 16px rgba(255, 215, 0, 0.6)" : "none",
		"&:hover": !disabled
			? {
					transform: "scale(1.02)",
					boxShadow: "0 0 8px rgba(255, 215, 0, 0.3)",
				}
			: {},
	}),
);

// Numbers 1-36 in 12 columns x 3 rows (standard roulette table layout)
const GRID_NUMBERS: number[][] = [];
for (let row = 0; row < 3; row++) {
	const rowNumbers: number[] = [];
	for (let col = 0; col < 12; col++) {
		rowNumbers.push(col * 3 + row + 1);
	}
	GRID_NUMBERS.push(rowNumbers);
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

export const BettingBoard = ({ onSelectBet, disabled, showResult, winningNumber }: Props) => {
	const handleClick = (betType: BetType, betValue: string) => {
		if (!disabled) {
			onSelectBet(betType, betValue);
		}
	};

	return (
		<Box>
			{/* Number grid: 3 rows, zero spanning left column */}
			<Box
				display="grid"
				gridTemplateColumns="auto repeat(12, 1fr)"
				gridTemplateRows="repeat(3, 1fr)"
				gap={0.5}
				mb={1}
			>
				<Cell
					bgColor={COLOR_MAP.green}
					isWinner={showResult && winningNumber === 0}
					disabled={disabled}
					onClick={() => handleClick("straight", "0")}
					style={{ gridRow: "1 / 4", fontSize: "1.2rem", width: 70 }}
				>
					0
				</Cell>
				{GRID_NUMBERS.map((row) =>
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
			<Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap={0.5} mb={1}>
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

			{/* Color and Even/Odd */}
			<Box display="grid" gridTemplateColumns="repeat(4, 1fr)" gap={0.5}>
				<OutsideBet
					disabled={disabled}
					isWinner={showResult && isWinnerOutside("color", "red", winningNumber)}
					bgColor="#C62828"
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
		</Box>
	);
};
