import { Box, Button, Paper, Stack, useMediaQuery, useTheme } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouletteWebSocket } from "../../hooks/useRouletteWebSocket";
import { useRouletteStore } from "../../stores/rouletteStore";
import type { BetType } from "../../types/game";
import { formatCents } from "../../utils/format";
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
		userId,
		balance,
		gamePhase,
		countdown,
		winningNumber,
		pendingResult,
		activityLog,
		players,
		placeBet,
		applyResult,
	} = useRouletteWebSocket();

	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));

	const [selectedChip, setSelectedChip] = useState(100);
	const [wheelSettled, setWheelSettled] = useState(false);
	const [bettingDialogOpen, setBettingDialogOpen] = useState(false);
	const sawSpinningRef = useRef(false);

	const bettingDisabled = !connected || gamePhase !== "BETTING";

	const handleSelectBet = useCallback(
		(betType: BetType, betValue: string) => {
			placeBet(betType, betValue, selectedChip);
		},
		[placeBet, selectedChip],
	);

	const handleWheelSettle = useCallback(() => {
		setWheelSettled(true);
	}, []);

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

	// Apply result (balance + log entries) once wheel animation completes
	useEffect(() => {
		if (wheelSettled && pendingResult) {
			applyResult();
		}
	}, [wheelSettled, pendingResult, applyResult]);

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
			onSettle={handleWheelSettle}
		/>
	);

	if (isMobile) {
		return (
			<Paper
				sx={{
					p: 2,
					height: "100vh",
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
						Place Bets {balance > 0 && `(${formatCents(balance)})`}
					</Button>
					<Box flex={1} minHeight={0} overflow="hidden">
						<ActivityLog activityLog={activityLog} />
					</Box>
				</Stack>
				<BettingDialog
					open={bettingDialogOpen}
					onClose={() => setBettingDialogOpen(false)}
					balance={balance}
					selectedChip={selectedChip}
					onSelectChip={setSelectedChip}
					onSelectBet={handleSelectBet}
					disabled={bettingDisabled}
					winningNumber={winningNumber}
					showResult={wheelSettled}
				/>
			</Paper>
		);
	}

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
			}}
		>
			<Stack direction="row" gap={4} flex={1} minHeight={0}>
				<Stack direction="column" flex={1} minHeight={0} gap={2}>
					<Box flex={1} minHeight={200} p={2}>
						{wheelElement}
					</Box>
					<Stack direction="row" alignItems="start" gap={2}>
						<Box flex={1}>
							<BettingBoard
								onSelectBet={handleSelectBet}
								disabled={bettingDisabled}
								winningNumber={winningNumber}
								showResult={wheelSettled}
							/>
						</Box>
						<BetAmount
							balance={balance}
							selectedChip={selectedChip}
							onSelectChip={setSelectedChip}
							disabled={bettingDisabled}
						/>
					</Stack>
				</Stack>
				<Box flex={0.5} display="flex" flexDirection="column" gap={2}>
					<Box flex={1} minHeight={0} overflow="hidden">
						<ActivityLog activityLog={activityLog} />
					</Box>
					<Box flex={0.6} minHeight={0}>
						<PlayerList players={players} currentUserId={userId} />
					</Box>
				</Box>
			</Stack>
		</Paper>
	);
};
