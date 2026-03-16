import { Button, Stack, Typography } from "@mui/material";
import { formatAmount } from "../../utils/format";

type Props = {
	balance: number;
	selectedBet: number;
	onSelectBet: (amount: number) => void;
	disabled: boolean;
	horizontal?: boolean;
};

const CHIP_VALUES = [100, 500, 1000, 2500, 5000];

const CHIP_COLORS: Record<number, { bg: string; text: string }> = {
	100: { bg: "#E8E8E8", text: "#1a1a1a" },
	500: { bg: "#C62828", text: "#fff" },
	1000: { bg: "#1565C0", text: "#fff" },
	2500: { bg: "#2E7D32", text: "#fff" },
	5000: { bg: "#212121", text: "#fff" },
};

const chipSx = (chip: { bg: string; text: string }, isSelected: boolean, disabled: boolean) => ({
	width: 48,
	height: 48,
	minWidth: "48px !important",
	borderRadius: "50%",
	padding: 0,
	backgroundColor: chip.bg,
	color: chip.text,
	border: isSelected ? "3px solid #C9A84C" : "3px solid rgba(255,255,255,0.25)",
	boxShadow: isSelected ? "0 0 12px rgba(201,168,76,0.7)" : "inset 0 -2px 4px rgba(0,0,0,0.4)",
	fontSize: "0.6rem",
	fontWeight: 700,
	fontFamily: '"JetBrains Mono", monospace',
	transition: "box-shadow 0.2s, transform 0.1s, border-color 0.15s",
	"&:hover": !disabled
		? {
				transform: "translateY(-2px)",
				boxShadow: isSelected ? "0 4px 16px rgba(201,168,76,0.8)" : "0 4px 12px rgba(0,0,0,0.5)",
				backgroundColor: chip.bg,
			}
		: {},
	"&.Mui-disabled": {
		backgroundColor: chip.bg,
		color: chip.text,
		opacity: 0.5,
	},
});

export const BetAmount = ({ balance, selectedBet, onSelectBet, disabled, horizontal }: Props) => {
	const chips = CHIP_VALUES.map((value) => (
		<Button
			key={value}
			size="small"
			disabled={disabled}
			onClick={() => onSelectBet(value)}
			sx={chipSx(CHIP_COLORS[value], selectedBet === value, disabled)}
		>
			{formatAmount(value)}
		</Button>
	));

	if (horizontal) {
		return (
			<Stack direction="row" alignItems="center" gap={2}>
				<Typography
					variant="h6"
					fontWeight={700}
					color="secondary.main"
					sx={{
						fontFamily: '"JetBrains Mono", monospace',
						letterSpacing: "0.02em",
						whiteSpace: "nowrap",
					}}
				>
					{formatAmount(balance)}
				</Typography>
				<Stack direction="row" spacing={1} flexWrap="wrap">
					{chips}
				</Stack>
			</Stack>
		);
	}

	return (
		<Stack alignItems="center" justifyContent="flex-end" height="100%" minWidth={108}>
			<Stack direction="column" spacing={1}>
				{chips}
			</Stack>
			<Typography
				variant="h6"
				fontWeight={700}
				color="secondary.main"
				mt={1.5}
				sx={{ fontFamily: '"JetBrains Mono", monospace', letterSpacing: "0.02em" }}
			>
				{formatAmount(balance)}
			</Typography>
		</Stack>
	);
};
