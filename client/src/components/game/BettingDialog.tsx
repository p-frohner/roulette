import CloseIcon from "@mui/icons-material/Close";
import { Dialog, DialogContent, DialogTitle, IconButton, Stack } from "@mui/material";
import type { BetType } from "../../types/game";
import { BetAmount } from "./BetAmount";
import { BettingBoard } from "./BettingBoard";

type Props = {
	open: boolean;
	onClose: () => void;
	balance: number;
	selectedChip: number;
	onSelectChip: (amount: number) => void;
	onSelectBet: (betType: BetType, betValue: string) => void;
	disabled: boolean;
	winningNumber: number | null;
	showResult: boolean;
};

export const BettingDialog = ({
	open,
	onClose,
	balance,
	selectedChip,
	onSelectChip,
	onSelectBet,
	disabled,
	winningNumber,
	showResult,
}: Props) => {
	return (
		<Dialog open={open} onClose={onClose} fullScreen>
			<DialogTitle>
				Place Your Bets
				<IconButton
					onClick={onClose}
					sx={{
						position: "absolute",
						right: 8,
						top: 8,
						color: "text.secondary",
					}}
				>
					<CloseIcon />
				</IconButton>
			</DialogTitle>
			<DialogContent>
				<Stack spacing={2}>
					<BetAmount
						balance={balance}
						selectedChip={selectedChip}
						onSelectChip={onSelectChip}
						disabled={disabled}
						horizontal
					/>
					<BettingBoard
						onSelectBet={onSelectBet}
						disabled={disabled}
						winningNumber={winningNumber}
						showResult={showResult}
						vertical
					/>
				</Stack>
			</DialogContent>
		</Dialog>
	);
};
