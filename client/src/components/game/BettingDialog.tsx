import CloseIcon from "@mui/icons-material/Close";
import { Dialog, DialogContent, DialogTitle, IconButton, Stack } from "@mui/material";
import type { BetType } from "../../types/game";
import { BetAmount } from "./BetAmount";
import { BettingBoard } from "./BettingBoard";

type Props = {
	open: boolean;
	onClose: () => void;
	balance: number;
	selectedBet: number;
	onSelectBet: (amount: number) => void;
	onPlaceBet: (betType: BetType, betValue: string) => void;
	disabled: boolean;
	winningNumber: number | null;
	showResult: boolean;
};

export const BettingDialog = ({
	open,
	onClose,
	balance,
	selectedBet,
	onSelectBet,
	onPlaceBet,
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
						selectedBet={selectedBet}
						onSelectBet={onSelectBet}
						disabled={disabled}
						horizontal
					/>
					<BettingBoard
						onSelectBet={onPlaceBet}
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
