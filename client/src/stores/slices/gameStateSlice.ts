import type { StateCreator } from "zustand";
import type { GamePhase, ResultMessage } from "../../types/game";
import { formatAmount } from "../../utils/format";
import type { RouletteStore } from "../rouletteStore";

export interface GameStateSlice {
	gamePhase: GamePhase;
	countdown: number;
	winningNumber: number | null;
	handleGameState: (phase: GamePhase, winningNumber: number | null, countdown?: number) => void;
	setCountdown: (secondsRemaining: number) => void;
	applyResultMsg: (msg: ResultMessage) => void;
}

export const createGameStateSlice: StateCreator<RouletteStore, [], [], GameStateSlice> = (
	set,
	get,
	_api,
) => ({
	gamePhase: "BETTING",
	countdown: 0,
	winningNumber: null,

	handleGameState: (phase, winningNumber, countdown) => {
		const updates: Partial<GameStateSlice> = { gamePhase: phase, winningNumber };
		if (countdown !== undefined) {
			updates.countdown = countdown;
		}
		set(updates);
	},

	setCountdown: (secondsRemaining) => {
		set({ countdown: secondsRemaining });
	},

	applyResultMsg: (msg) => {
		const { addActivityLog } = get();
		set({ balance: msg.balance });
		addActivityLog(`Ball landed on ${msg.winning_number}`, "result");
		if (msg.total_won > 0) {
			addActivityLog(`You won ${formatAmount(msg.total_won)}!`, "win");
		}
	},
});
