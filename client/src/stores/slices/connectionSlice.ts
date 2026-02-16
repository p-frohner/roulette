import type { StateCreator } from "zustand";
import type { Player } from "../../types/game";
import type { RouletteStore } from "../rouletteStore";

export interface ConnectionSlice {
	connected: boolean;
	userId: string | null;
	playerName: string | null;
	setConnected: (connected: boolean) => void;
	setPlayerName: (name: string) => void;
	handleWelcome: (
		userId: string,
		balance: number,
		playerName: string,
		players?: Player[],
	) => void;
	handleSessionExpired: () => void;
}

export const createConnectionSlice: StateCreator<
	RouletteStore,
	[],
	[],
	ConnectionSlice
> = (set, get, _api) => ({
	connected: false,
	userId: null,
	playerName: null,

	setConnected: (connected) => {
		set({ connected });
	},

	setPlayerName: (name) => {
		set({ playerName: name });
	},

	handleWelcome: (userId, balance, playerName, players) => {
		const displayName = `${playerName}#${userId.slice(0, 4)}`;

		const { addActivityLog, setPlayers } = get();

		set({ userId, balance });

		if (players) {
			setPlayers(players);
		}

		addActivityLog(`Connected as ${displayName}`, "info");
	},

	handleSessionExpired: () => {
		set({ userId: null, playerName: null });
	},
});
