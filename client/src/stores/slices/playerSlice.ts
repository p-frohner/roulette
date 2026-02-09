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

export const createPlayerSlice: StateCreator<
	RouletteStore,
	[],
	[],
	PlayerSlice
> = (set, get, _api) => ({
	players: [],

	setPlayers: (players) => {
		set({ players });
	},

	addPlayer: (player) => {
		const { players } = get();
		set({ players: [...players, player] });
	},

	markPlayerDisconnected: (userId) => {
		const { players } = get();
		set({
			players: players.map((p: Player) =>
				p.user_id === userId ? { ...p, connected: false } : p,
			),
		});
	},

	updatePlayerBalance: (userId, balance) => {
		const { players } = get();
		set({
			players: players.map((p: Player) =>
				p.user_id === userId ? { ...p, balance } : p,
			),
		});
	},
});
