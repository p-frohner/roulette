import { Box, Button, Paper, Stack, useMediaQuery, useTheme } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { useRouletteWebSocket } from "../../hooks/useRouletteWebSocket";
import { useRouletteStore } from "../../stores/rouletteStore";
import type { BetType } from "../../types/game";
import { formatAmount } from "../../utils/format";
import { ActivityLog } from "./ActivityLog";
import { BetsPanel } from "./BetsPanel";
import { BettingBoard } from "./BettingBoard";
import { BettingDialog } from "./BettingDialog";
import { NameDialog } from "./NameDialog";
import { PlayerList } from "./PlayerList";
import { RouletteWheel } from "./RouletteWheel";
import { WinningHistory } from "./WinningHistory";

export const RouletteGame = () => {
	const {
		connected,
		reconnectAttempt,
		userId,
		balance,
		gamePhase,
		countdown,
		winningNumber,
		activityLog,
		players,
		playerName,
		setPlayerName,
	} = useRouletteStore();
	const { placeBet, notifySettled, wheelSettled } = useRouletteWebSocket();

	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));

	const [selectedBet, setSelectedBet] = useState(1000);
	const [bettingDialogOpen, setBettingDialogOpen] = useState(false);

	const bettingDisabled = !connected || gamePhase !== "BETTING";

	const handleSelectBet = useCallback(
		(betType: BetType, betValue: string) => {
			placeBet(betType, betValue, selectedBet);
		},
		[placeBet, selectedBet],
	);

	const handleWheelSettle = useCallback(() => notifySettled(), [notifySettled]);

	// Auto-close betting dialog when betting phase ends
	useEffect(() => {
		if (gamePhase !== "BETTING") {
			setBettingDialogOpen(false);
		}
	}, [gamePhase]);

	if (!playerName) {
		return <NameDialog onSubmit={setPlayerName} />;
	}

	const wheelElement = (
		<RouletteWheel
			gamePhase={gamePhase}
			winningNumber={winningNumber}
			countdown={countdown}
			connected={connected}
			reconnectAttempt={reconnectAttempt}
			settled={wheelSettled}
			onSettle={handleWheelSettle}
		/>
	);

	if (isMobile) {
		return (
			<Paper
				sx={{
					p: 2,
					height: "100dvh",
					boxSizing: "border-box",
					overflow: "hidden",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<Stack direction="column" gap={2} flex={1} minHeight={0}>
					<Box flex={1} minHeight={150}>
						{wheelElement}
					</Box>
					<Button
						variant="contained"
						color="secondary"
						size="large"
						fullWidth
						disabled={bettingDisabled}
						onClick={() => setBettingDialogOpen(true)}
						sx={{
							flexShrink: 0,
							height: 48,
							fontSize: "1rem",
							fontWeight: 700,
							color: "#000",
						}}
					>
						Place Bets {balance > 0 && `(${formatAmount(balance)})`}
					</Button>
					<Box flex={1} minHeight={0} overflow="hidden">
						<ActivityLog activityLog={activityLog} />
					</Box>
				</Stack>
				<BettingDialog
					open={bettingDialogOpen}
					onClose={() => setBettingDialogOpen(false)}
					balance={balance}
					selectedBet={selectedBet}
					onSelectBet={setSelectedBet}
					onPlaceBet={handleSelectBet}
					disabled={bettingDisabled}
					winningNumber={winningNumber}
					showResult={wheelSettled}
				/>
			</Paper>
		);
	}

	// Desktop: wheel + sidebar on top, full-width betting board on bottom
	return (
		<Paper
			sx={{
				p: 2,
				height: "100vh",
				minHeight: "850px",
				boxSizing: "border-box",
				overflow: "visible",
				display: "flex",
				flexDirection: "column",
				gap: 2,
			}}
		>
			{/* Top row: wheel + bet selector + activity log + player list */}
			<Box
				display="grid"
				gridTemplateColumns="minmax(260px, 1fr) minmax(0, auto) minmax(260px, 1fr)"
				gap={2}
				flex={1}
				minHeight={0}
				minWidth={0}
			>
				<Stack direction="column" gap={1} minHeight={0} height="100%">
					<WinningHistory />
					<BetsPanel
						balance={balance}
						selectedBet={selectedBet}
						onSelectBet={setSelectedBet}
						disabled={bettingDisabled}
						winningNumber={winningNumber}
						showResult={wheelSettled}
					/>
				</Stack>
				<Box flex={1} minHeight={0} padding={2}>
					{wheelElement}
				</Box>
				<Stack direction="column" gap={2} minHeight={0}>
					<Box flexShrink={0} minHeight={120}>
						<PlayerList players={players} currentUserId={userId} />
					</Box>
					<Box flex={1} minHeight={0} overflow="hidden">
						<ActivityLog activityLog={activityLog} />
					</Box>
				</Stack>
			</Box>
			{/* Bottom: betting board */}
			<Box flexShrink={0}>
				<BettingBoard
					onSelectBet={handleSelectBet}
					disabled={bettingDisabled}
					winningNumber={winningNumber}
					showResult={wheelSettled}
				/>
			</Box>
		</Paper>
	);
};
