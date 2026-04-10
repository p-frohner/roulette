import { Box, Stack, Typography } from "@mui/material";
import { COLOR_MAP, getNumberColor } from "../../data/rouletteNumbers";
import { useRouletteStore } from "../../stores/rouletteStore";
import { GamePanel } from "./GamePanel";

export const WinningHistory = () => {
	const history = useRouletteStore((s) => s.winningHistory);

	return (
		<GamePanel title="Recent Numbers" minHeight={120}>
			{history.length === 0 ? (
				<Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
					No rounds played yet
				</Typography>
			) : (
				<Stack direction="row" gap={0.75} flexWrap="wrap">
					{history.map(({ id, n }) => (
						<Box
							key={id}
							sx={{
								width: 40,
								height: 40,
								borderRadius: "50%",
								backgroundColor: COLOR_MAP[getNumberColor(n)],
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
								border: "1px solid rgba(255,255,255,0.15)",
							}}
						>
							<Typography
								variant="caption"
								sx={{ color: "#fff", fontWeight: 700, lineHeight: 1, fontSize: "1.2rem" }}
							>
								{n}
							</Typography>
						</Box>
					))}
				</Stack>
			)}
		</GamePanel>
	);
};
