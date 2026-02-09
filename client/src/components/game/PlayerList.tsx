import { Box, Paper, Stack, Typography } from "@mui/material";
import type { Player } from "../../types/game";

type Props = {
	players: Player[];
	currentUserId: string | null;
};

const formatBalance = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

export const PlayerList = ({ players, currentUserId }: Props) => {
	return (
		<Paper sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", minHeight: 0 }}>
			<Typography variant="h6" mb={2}>
				Players ({players.length})
			</Typography>
			<Stack spacing={1} sx={{ flex: 1, minHeight: 0, overflowY: "auto", "&::-webkit-scrollbar": { width: 4 }, "&::-webkit-scrollbar-thumb": { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 2 } }}>
				{players.map((player) => {
					const isYou = player.user_id === currentUserId;
					return (
						<Box
							key={player.user_id}
							sx={{
								p: 1.5,
								border: isYou ? "2px solid gold" : "1px solid rgba(255,255,255,0.2)",
								borderRadius: 1,
								backgroundColor: isYou ? "rgba(255,215,0,0.1)" : "transparent",
							}}
						>
							<Stack direction="row" alignItems="center" spacing={1}>
								<Box
									sx={{
										width: 8,
										height: 8,
										borderRadius: "50%",
										backgroundColor: player.connected ? "#4caf50" : "#757575",
									}}
								/>
								<Typography variant="body2" flex={1}>
									{player.name} {isYou && "(You)"}
								</Typography>
								<Typography variant="body2" fontWeight="bold">
									{formatBalance(player.balance)}
								</Typography>
							</Stack>
						</Box>
					);
				})}
			</Stack>
		</Paper>
	);
};
