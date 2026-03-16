import { Box, Paper, Stack, Typography } from "@mui/material";
import type { Player } from "../../types/game";
import { formatAmount } from "../../utils/format";

type Props = {
	players: Player[];
	currentUserId: string | null;
};

export const PlayerList = ({ players, currentUserId }: Props) => {
	return (
		<Paper sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
			<Typography
				variant="h6"
				mb={2}
				sx={{ letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.95rem" }}
			>
				Players ({players.length})
			</Typography>
			<Stack
				spacing={1}
				sx={{
					flex: 1,
					minHeight: 0,
					overflowY: "auto",
					"&::-webkit-scrollbar": { width: 4 },
					"&::-webkit-scrollbar-thumb": {
						backgroundColor: "rgba(201,168,76,0.3)",
						borderRadius: 2,
					},
				}}
			>
				{players.map((player) => {
					const isYou = player.user_id === currentUserId;
					return (
						<Box
							key={player.user_id}
							sx={{
								p: 1.5,
								border: isYou ? "2px solid" : "1px solid rgba(201,168,76,0.15)",
								borderColor: isYou ? "secondary.main" : undefined,
								borderRadius: 1,
								backgroundColor: isYou ? "rgba(201,168,76,0.08)" : "transparent",
							}}
						>
							<Stack direction="row" alignItems="center" spacing={1}>
								<Box
									sx={{
										width: 8,
										height: 8,
										borderRadius: "50%",
										backgroundColor: player.connected ? "#4CAF50" : "#757575",
									}}
								/>
								<Typography variant="body2" flex={1}>
									{player.name} {isYou && "(You)"}
								</Typography>
								<Typography
									variant="body2"
									fontWeight="bold"
									sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: "0.8rem" }}
								>
									{formatAmount(player.balance)}
								</Typography>
							</Stack>
						</Box>
					);
				})}
			</Stack>
		</Paper>
	);
};
