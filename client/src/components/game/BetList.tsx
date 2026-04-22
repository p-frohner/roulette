import { Box } from "@mui/material";
import { COLOR_MAP, getNumberColor } from "../../data/rouletteNumbers";
import { useRouletteStore } from "../../stores/rouletteStore";
import { GOLD, GOLD_80 } from "../../theme/colors";
import type { BetType } from "../../types/game";
import { isBetWinner } from "../../utils/betUtils";
import { formatAmount } from "../../utils/format";

type Props = {
	winningNumber: number | null;
	showResult: boolean;
};

function formatBetLabel(betType: BetType, betValue: string): string {
	switch (betType) {
		case "straight": {
			return `#${betValue}`;
		}
		case "color": {
			return betValue.charAt(0).toUpperCase() + betValue.slice(1);
		}
		case "even_odd": {
			return betValue.charAt(0).toUpperCase() + betValue.slice(1);
		}
		case "dozens": {
			return betValue === "first" ? "1st 12" : betValue === "second" ? "2nd 12" : "3rd 12";
		}
	}
}

function getChipBgColor(betType: BetType, betValue: string): string {
	switch (betType) {
		case "straight": {
			return COLOR_MAP[getNumberColor(Number(betValue))];
		}
		case "color": {
			return betValue === "red" ? "#9B1B1B" : "#212121";
		}
		default: {
			return "#2A2A2A";
		}
	}
}

export const BetList = ({ winningNumber, showResult }: Props) => {
	const pendingBets = useRouletteStore((s) => s.pendingBets);

	const mergedBets = Object.values(
		pendingBets.reduce<
			Record<
				string,
				{ betType: (typeof pendingBets)[0]["betType"]; betValue: string; amount: number }
			>
		>((acc, bet) => {
			const key = `${bet.betType}-${bet.betValue}`;
			if (acc[key]) {
				acc[key].amount += bet.amount;
			} else {
				acc[key] = { ...bet };
			}
			return acc;
		}, {}),
	);

	if (mergedBets.length === 0) {
		return null;
	}

	return (
		<Box sx={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 0.75 }}>
			{mergedBets.map((bet) => {
				const winner = showResult && isBetWinner(bet.betType, bet.betValue, winningNumber);
				return (
					<Box
						key={`${bet.betType}-${bet.betValue}-${bet.amount}`}
						sx={{
							display: "inline-flex",
							alignItems: "center",
							gap: 0.5,
							px: 1,
							py: 0.25,
							borderRadius: "12px",
							bgcolor: getChipBgColor(bet.betType, bet.betValue),
							border: winner ? `2px solid ${GOLD}` : "2px solid transparent",
							boxShadow: winner ? `0 0 0 2px ${GOLD}, 0 0 12px ${GOLD_80}` : "none",
							fontSize: "1rem",
							lineHeight: 1.5,
							whiteSpace: "nowrap",
							color: "#fff",
							transition: "border-color 0.2s, box-shadow 0.2s",
						}}
					>
						<Box component="span" sx={{ opacity: 0.8 }}>
							{formatBetLabel(bet.betType, bet.betValue)}
						</Box>
						<Box component="span" sx={{ fontWeight: 700 }}>
							{formatAmount(bet.amount)}
						</Box>
					</Box>
				);
			})}
		</Box>
	);
};
