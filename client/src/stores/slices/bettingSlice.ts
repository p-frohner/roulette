import type { StateCreator } from "zustand";
import type {
	BetAcceptedMessage,
	BetRejectedMessage,
	BetType,
} from "../../types/game";
import { showGlobalNotification } from "../../utils/notificationHandler";
import type { RouletteStore } from "../rouletteStore";

type PendingBet = {
	betType: BetType;
	betValue: string;
	amount: number;
};

export interface BettingSlice {
	balance: number;
	lastBetResponse: BetAcceptedMessage | BetRejectedMessage | null;
	pendingBets: PendingBet[];
	handleBetAccepted: (message: BetAcceptedMessage) => void;
	handleBetRejected: (message: BetRejectedMessage) => void;
	clearPendingBets: () => void;
	clearLastBetResponse: () => void;
}

export const createBettingSlice: StateCreator<
	RouletteStore,
	[],
	[],
	BettingSlice
> = (set, get, _api) => ({
	balance: 0,
	lastBetResponse: null,
	pendingBets: [],

	handleBetAccepted: (message) => {
		const { pendingBets } = get();

		set({
			balance: message.balance,
			lastBetResponse: message,
			pendingBets: [
				...pendingBets,
				{
					betType: message.bet_type,
					betValue: message.bet_value,
					amount: message.amount,
				},
			],
		});
	},

	handleBetRejected: (message) => {
		set({ lastBetResponse: message });
		showGlobalNotification(message.reason, "error");
	},

	clearPendingBets: () => {
		set({ pendingBets: [] });
	},

	clearLastBetResponse: () => {
		set({ lastBetResponse: null });
	},
});
