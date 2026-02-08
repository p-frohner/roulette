import { Box, Button, Stack, Typography } from "@mui/material";

type Props = {
	balance: number;
	selectedChip: number;
	onSelectChip: (amount: number) => void;
	disabled: boolean;
};

const CHIP_VALUES = [100, 500, 1000, 2500, 5000];

const formatCents = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

export const BetControls = ({ balance, selectedChip, onSelectChip, disabled }: Props) => {
	return (
		<Stack direction="column" alignItems="flex-end">
			{/* Balance */}
			<Box display="flex" flex={0} mb={2} alignItems="center">
				<Typography variant="body2" color="text.secondary" mr={2}>
					Balance
				</Typography>
				<Typography variant="h6" fontWeight={700} color="secondary.main">
					{formatCents(balance)}
				</Typography>
			</Box>

			{/* Chip selector */}
			<Box display="flex" gap={1} flexWrap="wrap" mb={2}>
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
						{formatCents(value)}
					</Button>
				))}
			</Box>
		</Stack>
	);
};
