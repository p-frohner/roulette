import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { type ActivityLogSlice, createActivityLogSlice } from "./slices/activityLogSlice";
import { type BettingSlice, createBettingSlice } from "./slices/bettingSlice";
import { type ConnectionSlice, createConnectionSlice } from "./slices/connectionSlice";
import { createGameStateSlice, type GameStateSlice } from "./slices/gameStateSlice";
import { createPlayerSlice, type PlayerSlice } from "./slices/playerSlice";

export type RouletteStore = ConnectionSlice &
	GameStateSlice &
	BettingSlice &
	ActivityLogSlice &
	PlayerSlice;

export const useRouletteStore = create<RouletteStore>()(
	devtools(
		persist(
			(set, get, api) => ({
				...createConnectionSlice(set, get, api),
				...createGameStateSlice(set, get, api),
				...createBettingSlice(set, get, api),
				...createActivityLogSlice(set, get, api),
				...createPlayerSlice(set, get, api),
			}),
			{
				name: "roulette-connection",
				partialize: (state) => ({
					userId: state.userId,
					playerName: state.playerName,
				}),
			},
		),
		{ name: "RouletteStore" },
	),
);
