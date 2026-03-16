import { Box, Button, Paper, Stack, useMediaQuery, useTheme } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouletteWebSocket } from "../../hooks/useRouletteWebSocket";
import { useRouletteStore } from "../../stores/rouletteStore";
import type { BetType } from "../../types/game";
import { formatAmount } from "../../utils/format";
import { ActivityLog } from "./ActivityLog";
import { BetAmount } from "./BetAmount";
import { BettingBoard } from "./BettingBoard";
import { BettingDialog } from "./BettingDialog";
import { NameDialog } from "./NameDialog";
import { PlayerList } from "./PlayerList";
import { RouletteWheel } from "./RouletteWheel";

export const RouletteGame = () => {
	const playerName = useRouletteStore((s) => s.playerName);
	const setPlayerName = useRouletteStore((s) => s.setPlayerName);
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
		placeBet,
		notifySettled,
	} = useRouletteWebSocket();

	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));

	const [selectedBet, setSelectedBet] = useState(1000);
	const [wheelSettled, setWheelSettled] = useState(false);
	const [bettingDialogOpen, setBettingDialogOpen] = useState(false);
	const sawSpinningRef = useRef(false);

	const bettingDisabled = !connected || gamePhase !== "BETTING";

	const handleSelectBet = useCallback(
		(betType: BetType, betValue: string) => {
			placeBet(betType, betValue, selectedBet);
		},
		[placeBet, selectedBet],
	);

	const handleWheelSettle = useCallback(() => {
		setWheelSettled(true);
		notifySettled();
	}, [notifySettled]);

	// Track phase transitions for late-join detection
	useEffect(() => {
		if (gamePhase === "SPINNING") {
			setWheelSettled(false);
			sawSpinningRef.current = true;
		} else if (gamePhase === "RESULT") {
			// Late join: if we never saw SPINNING for this round, settle immediately
			if (!sawSpinningRef.current) {
				setWheelSettled(true);
			}
		} else if (gamePhase === "BETTING") {
			setWheelSettled(false);
			sawSpinningRef.current = false;
		}
	}, [gamePhase]);

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
				minHeight: "600px",
				boxSizing: "border-box",
				overflow: "hidden",
				display: "flex",
				flexDirection: "column",
				gap: 2,
			}}
		>
			{/* Top row: wheel + bet selector + activity log + player list */}
			<Stack direction="row" gap={2} flex={1} minHeight={0}>
				<BetAmount
					balance={balance}
					selectedBet={selectedBet}
					onSelectBet={setSelectedBet}
					disabled={bettingDisabled}
				/>

				<Box flex={1} minHeight={0}>
					{wheelElement}
				</Box>
				<Stack direction="column" width={260} flexShrink={0} gap={2} minHeight={0}>
					<Box flex={1} minHeight={0} overflow="hidden">
						<ActivityLog activityLog={activityLog} />
					</Box>
					<Box flexShrink={0} minHeight={120}>
						<PlayerList players={players} currentUserId={userId} />
					</Box>
				</Stack>
			</Stack>

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
