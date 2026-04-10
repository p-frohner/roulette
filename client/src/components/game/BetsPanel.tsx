import { Box, Typography } from "@mui/material";
import { useRouletteStore } from "../../stores/rouletteStore";
import { scrollbarStyles } from "../../utils/scrollbarStyles";
import { BetAmount } from "./BetAmount";
import { BetList } from "./BetList";
import { GamePanel } from "./GamePanel";

type Props = {
	balance: number;
	selectedBet: number;
	onSelectBet: (amount: number) => void;
	disabled: boolean;
	winningNumber: number | null;
	showResult: boolean;
};

export const BetsPanel = ({
	balance,
	selectedBet,
	onSelectBet,
	disabled,
	winningNumber,
	showResult,
}: Props) => {
	const hasBets = useRouletteStore((s) => s.pendingBets.length > 0);

	return (
		<GamePanel title="Bets" flex={1}>
			<Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
				<Box sx={{ width: "50%", flexShrink: 0, display: "flex" }}>
					<BetAmount
						balance={balance}
						selectedBet={selectedBet}
						onSelectBet={onSelectBet}
						disabled={disabled}
					/>
				</Box>
				<Box
					sx={{
						width: "50%",
						overflowY: "auto",
						display: "flex",
						flexDirection: "column",
						pt: 0.5,
						...scrollbarStyles,
					}}
				>
					{hasBets ? (
						<BetList winningNumber={winningNumber} showResult={showResult} />
					) : (
						<Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
							No bets placed
						</Typography>
					)}
				</Box>
			</Box>
		</GamePanel>
	);
};
