import type { StateCreator } from "zustand";
import type { Player } from "../../types/game";
import type { RouletteStore } from "../rouletteStore";

export interface PlayerSlice {
	players: Player[];
	setPlayers: (players: Player[]) => void;
	addPlayer: (player: Player) => void;
	markPlayerDisconnected: (userId: string) => void;
	updatePlayerBalance: (userId: string, balance: number) => void;
}

export const createPlayerSlice: StateCreator<RouletteStore, [], [], PlayerSlice> = (
	set,
	get,
	_api,
) => ({
	players: [],

	setPlayers: (players) => {
		set({ players });
	},

	addPlayer: (player) => {
		const { players } = get();
		// When someone disconnects, and reconnects before we clear the user
		const exists = players.some((p) => p.user_id === player.user_id);
		if (exists) {
			set({ players: players.map((p) => (p.user_id === player.user_id ? player : p)) });
		} else {
			set({ players: [...players, player] });
		}
	},

	markPlayerDisconnected: (userId) => {
		const { players } = get();
		set({
			players: players.map((p: Player) => (p.user_id === userId ? { ...p, connected: false } : p)),
		});
	},

	updatePlayerBalance: (userId, balance) => {
		const { players } = get();
		set({
			players: players.map((p: Player) => (p.user_id === userId ? { ...p, balance } : p)),
		});
	},
});
