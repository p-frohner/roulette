import type { StateCreator } from "zustand";
import type { Player } from "../../types/game";
import type { RouletteStore } from "../rouletteStore";

export interface ConnectionSlice {
	connected: boolean;
	reconnectAttempt: number;
	userId: string | null;
	sessionToken: string | null;
	playerName: string | null;
	setConnected: (connected: boolean) => void;
	setReconnectAttempt: (n: number) => void;
	setPlayerName: (name: string) => void;
	handleWelcome: (
		userId: string,
		sessionToken: string,
		balance: number,
		playerName: string,
		players?: Player[],
	) => void;
	handleSessionExpired: () => void;
}

export const createConnectionSlice: StateCreator<RouletteStore, [], [], ConnectionSlice> = (
	set,
	get,
	_api,
) => ({
	connected: false,
	reconnectAttempt: 0,
	userId: null,
	sessionToken: null,
	playerName: null,

	setConnected: (connected) => {
		set({ connected, ...(connected ? { reconnectAttempt: 0 } : {}) });
	},

	setReconnectAttempt: (n) => {
		set({ reconnectAttempt: n });
	},

	setPlayerName: (name) => {
		set({ playerName: name });
	},

	handleWelcome: (userId, sessionToken, balance, playerName, players) => {
		const displayName = `${playerName}#${userId.slice(0, 4)}`;

		const { addActivityLog, setPlayers } = get();

		set({ userId, sessionToken, balance });

		if (players) {
			setPlayers(players);
		}

		addActivityLog(`Connected as ${displayName}`, "info");
	},

	handleSessionExpired: () => {
		set({ userId: null, sessionToken: null });
	},
});
