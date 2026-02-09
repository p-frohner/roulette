import { Box, Paper, Stack } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouletteWebSocket } from "../../hooks/useRouletteWebSocket";
import { useRouletteStore } from "../../stores/rouletteStore";
import type { BetType } from "../../types/game";
import { ActivityLog } from "./ActivityLog";
import { BetControls } from "./BetControls";
import { BettingBoard } from "./BettingBoard";
import { GameStatus } from "./GameStatus";
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

	const [selectedChip, setSelectedChip] = useState(100);
	const [wheelSettled, setWheelSettled] = useState(false);
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

	if (!playerName) {
		return <NameDialog onSubmit={setPlayerName} />;
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
						<RouletteWheel
							gamePhase={gamePhase}
							winningNumber={winningNumber}
							onSettle={handleWheelSettle}
						/>
					</Box>
					<Box flex="none">
						<Stack direction="row" flex={1} alignItems="center" gap={4} height={80}>
							<Box flex="1" alignItems="center">
								<GameStatus
									gamePhase={gamePhase}
									countdown={countdown}
									winningNumber={winningNumber}
									connected={connected}
									showResult={wheelSettled}
								/>
							</Box>
							<Box flex="1" justifyContent="end">
								<BetControls
									balance={balance}
									selectedChip={selectedChip}
									onSelectChip={setSelectedChip}
									disabled={bettingDisabled}
								/>
							</Box>
						</Stack>
					</Box>
					<Box flex="none">
						<BettingBoard
							onSelectBet={handleSelectBet}
							disabled={bettingDisabled}
							winningNumber={winningNumber}
							showResult={wheelSettled}
						/>
					</Box>
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
