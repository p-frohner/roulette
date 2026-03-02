import { Button, Stack, Typography } from "@mui/material";
import { formatAmount } from "../../utils/format";

type Props = {
	balance: number;
	selectedChip: number;
	onSelectChip: (amount: number) => void;
	disabled: boolean;
	horizontal?: boolean;
};

const CHIP_VALUES = [100, 500, 1000, 2500, 5000];

export const BetAmount = ({ balance, selectedChip, onSelectChip, disabled, horizontal }: Props) => {
	return (
		<Stack alignItems="center" minWidth={100}>
			{/* Balance */}
			<Typography variant="h6" fontWeight={700} color="secondary.main" mb={1}>
				{formatAmount(balance)}
			</Typography>

			{/* Chip selector */}
			<Stack
				direction={horizontal ? "row" : "column"}
				spacing={1}
				flexWrap="wrap"
				justifyContent="center"
			>
				{CHIP_VALUES.map((value) => (
					<Button
						key={value}
						variant={selectedChip === value ? "contained" : "outlined"}
						size="small"
						disabled={disabled}
						onClick={() => onSelectChip(value)}
						sx={{
							height: "auto",
							minWidth: 64,
							color: selectedChip === value ? "#000" : "secondary.main",
							backgroundColor: selectedChip === value ? "secondary.main" : "transparent",
							borderColor: "secondary.main",
							"&:hover": {
								backgroundColor:
									selectedChip === value ? "secondary.dark" : "rgba(255, 215, 0, 0.1)",
								borderColor: "secondary.main",
							},
						}}
					>
						{formatAmount(value)}
					</Button>
				))}
			</Stack>
		</Stack>
	);
};
