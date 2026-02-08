import { Box, Chip, CircularProgress, LinearProgress, Typography } from "@mui/material";
import { getNumberColor } from "../../data/rouletteNumbers";
import type { GamePhase } from "../../types/game";

const BETTING_DURATION = 20;

interface Props {
	gamePhase: GamePhase;
	countdown: number;
	winningNumber: number | null;
	connected: boolean;
	showResult: boolean;
}

export const GameStatus = ({
	gamePhase,
	countdown,
	winningNumber,
	connected,
	showResult,
}: Props) => {
	if (!connected) {
		return (
			<Box textAlign="center" py={2}>
				<Typography variant="h6" color="text.secondary">
					Connecting...
				</Typography>
			</Box>
		);
	}

	return (
		<Box py={2} display="flex" justifyContent="center">
			{gamePhase === "BETTING" && (
				<Box sx={{ position: "relative", display: "inline-flex" }}>
					<CircularProgress
						variant="determinate"
						value={(countdown / BETTING_DURATION) * 100}
						size={60}
						sx={{
							height: 60,
							width: 60,
							borderRadius: 30,
							backgroundColor: "rgba(255,255,255,0.1)",
							"& .MuiLinearProgress-bar": {
								borderRadius: 4,
								backgroundColor: countdown <= 5 ? "error.main" : "secondary.main",
							},
						}}
					/>
					<Box
						sx={{
							top: 0,
							left: 0,
							bottom: 0,
							right: 0,
							position: "absolute",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}
					>
						<Typography
							variant="caption"
							component="div"
							sx={{ color: "text.secondary" }}
						>{`${Math.round(countdown)}s`}</Typography>
					</Box>
				</Box>
			)}

			{(gamePhase === "SPINNING" || (gamePhase === "RESULT" && !showResult)) && (
				<Box textAlign="center">
					<Typography variant="h5" fontWeight={700} color="secondary.main">
						Spinning...
					</Typography>
				</Box>
			)}

			{gamePhase === "RESULT" && showResult && winningNumber !== null && (
				<Box textAlign="center">
					<Typography variant="body1" color="text.secondary" mb={1}>
						Winning Number
					</Typography>
					<Chip
						label={winningNumber}
						sx={{
							fontSize: "1.5rem",
							fontWeight: 700,
							height: 48,
							minWidth: 48,
							backgroundColor:
								getNumberColor(winningNumber) === "green"
									? "#2E7D32"
									: getNumberColor(winningNumber) === "red"
										? "#C62828"
										: "#212121",
							color: "#fff",
						}}
					/>
				</Box>
			)}
		</Box>
	);
};
