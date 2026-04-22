import { Box, Divider, Stack, Typography } from "@mui/material";
import { useRouletteStore } from "../../stores/rouletteStore";
import { GOLD_20 } from "../../theme/colors";
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
			<Stack direction="column" spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
				<BetAmount
					balance={balance}
					selectedBet={selectedBet}
					onSelectBet={onSelectBet}
					disabled={disabled}
				/>
				<Divider sx={{ borderColor: GOLD_20 }} />
				<Box
					sx={{
						flex: 1,
						overflowY: "auto",
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
			</Stack>
		</GamePanel>
	);
};
