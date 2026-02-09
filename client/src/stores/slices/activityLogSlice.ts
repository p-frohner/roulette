import type { StateCreator } from "zustand";
import type { ActivityLogEntry } from "../../types/game";
import { formatCents } from "../../utils/format";
import type { RouletteStore } from "../rouletteStore";

export interface ActivityLogSlice {
	activityLog: ActivityLogEntry[];
	addActivityLog: (message: string, variant: ActivityLogEntry["variant"]) => void;
	addBetLog: (
		userId: string | undefined,
		playerName: string,
		betValue: string,
		amount: number,
	) => void;
}

let logIdCounter = 0;
const nextLogId = () => `log-${++logIdCounter}`;

export const createActivityLogSlice: StateCreator<
	RouletteStore,
	[],
	[],
	ActivityLogSlice
> = (set, get, _api) => ({
	activityLog: [],

	addActivityLog: (message, variant) => {
		const { activityLog } = get();

		const entry: ActivityLogEntry = {
			id: nextLogId(),
			timestamp: new Date(),
			message,
			variant,
		};

		const newLog = [...activityLog, entry];
		// Keep only last 100 entries
		set({ activityLog: newLog.length > 100 ? newLog.slice(-100) : newLog });
	},

	addBetLog: (_userId, playerName, betValue, amount) => {
		const { addActivityLog } = get();
		addActivityLog(
			`${playerName} bet ${formatCents(amount)} on ${betValue}`,
			"bet",
		);
	},
});
