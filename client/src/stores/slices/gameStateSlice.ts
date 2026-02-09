import type { StateCreator } from "zustand";
import type { GamePhase, ResultMessage } from "../../types/game";
import { formatCents } from "../../utils/format";
import type { RouletteStore } from "../rouletteStore";

export interface GameStateSlice {
	gamePhase: GamePhase;
	countdown: number;
	winningNumber: number | null;
	lastResult: ResultMessage | null;
	pendingResult: ResultMessage | null;
	handleGameState: (
		phase: GamePhase,
		winningNumber: number | null,
		countdown?: number,
	) => void;
	setCountdown: (secondsRemaining: number) => void;
	handleResult: (message: ResultMessage) => void;
	applyResult: () => void;
}

export const createGameStateSlice: StateCreator<
	RouletteStore,
	[],
	[],
	GameStateSlice
> = (set, get, _api) => ({
	gamePhase: "BETTING",
	countdown: 0,
	winningNumber: null,
	lastResult: null,
	pendingResult: null,

	handleGameState: (phase, winningNumber, countdown) => {
		const { addActivityLog, clearPendingBets, clearLastBetResponse } = get();

		const updates: Partial<GameStateSlice> = {
			gamePhase: phase,
			winningNumber,
		};

		if (countdown !== undefined) {
			updates.countdown = countdown;
		}

		if (phase === "BETTING") {
			updates.lastResult = null;
			updates.pendingResult = null;
			clearPendingBets();
			clearLastBetResponse();
			set(updates);
			addActivityLog("Round started — Place your bets!", "info");
		} else if (phase === "SPINNING") {
			set(updates);
			addActivityLog("No more bets!", "info");
		} else {
			set(updates);
		}
	},

	setCountdown: (secondsRemaining) => {
		set({ countdown: secondsRemaining });
	},

	handleResult: (message) => {
		set({
			pendingResult: message,
			lastResult: message,
		});
	},

	applyResult: () => {
		const { pendingResult, addActivityLog } = get();

		if (!pendingResult) {
			return;
		}

		const msg = pendingResult;

		set({
			balance: msg.balance,
			pendingResult: null,
		});

		addActivityLog(`Ball landed on ${msg.winning_number}`, "result");

		if (msg.total_won > 0) {
			addActivityLog(`You won ${formatCents(msg.total_won)}!`, "win");
		}
	},
});
