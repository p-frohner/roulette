import { Box, MenuItem, Select, Stack, Typography } from "@mui/material";
import { MONO_FONT } from "../../theme/colors";
import { formatAmount } from "../../utils/format";

type Props = {
	balance: number;
	selectedBet: number;
	onSelectBet: (amount: number) => void;
	disabled: boolean;
};

const CHIP_VALUES = [100, 500, 1000, 2500, 5000];

export const BetAmount = ({ balance, selectedBet, onSelectBet, disabled }: Props) => {
	return (
		<Stack direction="row" alignItems="center" spacing={2}>
			<Select
				size="small"
				value={selectedBet}
				disabled={disabled}
				onChange={(e) => onSelectBet(Number(e.target.value))}
				sx={{ minWidth: 120, width: "50%" }}
			>
				{CHIP_VALUES.map((v) => (
					<MenuItem key={v} value={v}>
						{formatAmount(v)}
					</MenuItem>
				))}
			</Select>
			<Box width="100%" textAlign="center">
				<Typography
					variant="h5"
					fontWeight={700}
					color="secondary.main"
					sx={{
						fontFamily: MONO_FONT,
					}}
				>
					{formatAmount(balance)}
				</Typography>
			</Box>
		</Stack>
	);
};
