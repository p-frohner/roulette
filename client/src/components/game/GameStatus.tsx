import { Box, Chip, LinearProgress, Typography } from "@mui/material";
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

export const GameStatus = ({ gamePhase, countdown, winningNumber, connected, showResult }: Props) => {
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
		<Box py={2}>
			{gamePhase === "BETTING" && (
				<>
					<Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
						<Typography variant="h6" fontWeight={700} color="secondary.main">
							Place Your Bets
						</Typography>
						<Typography variant="h6" fontWeight={700}>
							{countdown}s
						</Typography>
					</Box>
					<LinearProgress
						variant="determinate"
						value={(countdown / BETTING_DURATION) * 100}
						sx={{
							height: 8,
							borderRadius: 4,
							backgroundColor: "rgba(255,255,255,0.1)",
							"& .MuiLinearProgress-bar": {
								borderRadius: 4,
								backgroundColor: countdown <= 5 ? "error.main" : "secondary.main",
							},
						}}
					/>
				</>
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
