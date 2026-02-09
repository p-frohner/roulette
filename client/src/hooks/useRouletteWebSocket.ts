import { useCallback, useEffect, useReducer, useRef } from "react";
import type {
	ActivityLogEntry,
	BetAcceptedMessage,
	BetRejectedMessage,
	BetType,
	GamePhase,
	PlaceBetAction,
	Player,
	ResultMessage,
	ServerMessage,
} from "../types/game";
import { showGlobalNotification } from "../utils/notificationHandler";

const USER_ID_KEY = "gameUserId";
const PLAYER_NAME_KEY = "gamePlayerName";

type PendingBet = {
	betType: BetType;
	betValue: string;
	amount: number;
};

type GameState = {
	connected: boolean;
	userId: string | null;
	balance: number;
	gamePhase: GamePhase;
	countdown: number;
	winningNumber: number | null;
	lastResult: ResultMessage | null;
	pendingResult: ResultMessage | null;
	lastBetResponse: BetAcceptedMessage | BetRejectedMessage | null;
	pendingBets: PendingBet[];
	activityLog: ActivityLogEntry[];
	players: Player[];
};

type Action =
	| { type: "connected" }
	| { type: "disconnected" }
	| { type: "welcome"; userId: string; balance: number; playerName: string; players?: Player[] }
	| { type: "game_state"; phase: GamePhase; winningNumber: number | null; countdown?: number }
	| { type: "countdown"; secondsRemaining: number }
	| { type: "bet_accepted"; message: BetAcceptedMessage }
	| { type: "bet_rejected"; message: BetRejectedMessage }
	| { type: "result"; message: ResultMessage }
	| { type: "apply_result" }
	| {
			type: "bet_placed";
			userId?: string;
			playerName: string;
			betType: string;
			betValue: string;
			amount: number;
	  }
	| { type: "player_list"; players: Player[] }
	| { type: "player_joined"; player: Player }
	| { type: "player_left"; userId: string }
	| { type: "player_balance_updated"; userId: string; balance: number };

let logIdCounter = 0;
const nextLogId = () => `log-${++logIdCounter}`;

const formatCents = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

const addLog = (
	state: GameState,
	message: string,
	variant: ActivityLogEntry["variant"],
): GameState => {
	const entry: ActivityLogEntry = { id: nextLogId(), timestamp: new Date(), message, variant };
	const log = [...state.activityLog, entry];
	return { ...state, activityLog: log.length > 100 ? log.slice(-100) : log };
};

const initialState: GameState = {
	connected: false,
	userId: null,
	balance: 0,
	gamePhase: "BETTING",
	countdown: 0,
	winningNumber: null,
	lastResult: null,
	pendingResult: null,
	lastBetResponse: null,
	pendingBets: [],
	activityLog: [],
	players: [],
};

function reducer(state: GameState, action: Action): GameState {
	switch (action.type) {
		case "connected":
			return { ...state, connected: true };
		case "disconnected":
			return { ...state, connected: false };
		case "welcome": {
			const displayName = `${action.playerName}#${action.userId.slice(0, 4)}`;
			const next = { ...state, userId: action.userId, balance: action.balance };
			if (action.players) {
				next.players = action.players;
			}
			return addLog(next, `Connected as ${displayName}`, "info");
		}
		case "game_state": {
			let next: GameState = {
				...state,
				gamePhase: action.phase,
				winningNumber: action.winningNumber,
			};
			if (action.countdown !== undefined) {
				next.countdown = action.countdown;
			}
			if (action.phase === "BETTING") {
				next.pendingBets = [];
				next.lastResult = null;
				next.pendingResult = null;
				next.lastBetResponse = null;
				next = addLog(next, "Round started — Place your bets!", "info");
			} else if (action.phase === "SPINNING") {
				next = addLog(next, "No more bets!", "info");
			}
			return next;
		}
		case "countdown":
			return { ...state, countdown: action.secondsRemaining };
		case "bet_accepted":
			return {
				...state,
				balance: action.message.balance,
				lastBetResponse: action.message,
				pendingBets: [
					...state.pendingBets,
					{
						betType: action.message.bet_type,
						betValue: action.message.bet_value,
						amount: action.message.amount,
					},
				],
			};
		case "bet_rejected":
			return { ...state, lastBetResponse: action.message };
		case "result":
			return {
				...state,
				pendingResult: action.message,
				lastResult: action.message,
			};
		case "apply_result": {
			if (!state.pendingResult) {
				return state;
			}
			const msg = state.pendingResult;
			let next: GameState = { ...state, balance: msg.balance, pendingResult: null };
			next = addLog(next, `Ball landed on ${msg.winning_number}`, "result");
			if (msg.total_won > 0) {
				next = addLog(next, `You won ${formatCents(msg.total_won)}!`, "win");
			}
			return next;
		}
		case "bet_placed": {
			// If bet is from another player, log it
			if (action.userId && action.userId !== state.userId) {
				return addLog(
					state,
					`${action.playerName} bet ${formatCents(action.amount)} on ${action.betValue}`,
					"bet",
				);
			}
			// Own bet - just log it
			return addLog(
				state,
				`${action.playerName} bet ${formatCents(action.amount)} on ${action.betValue}`,
				"bet",
			);
		}
		case "player_list":
			return { ...state, players: action.players };
		case "player_joined":
			return { ...state, players: [...state.players, action.player] };
		case "player_left":
			return {
				...state,
				players: state.players.map((p) =>
					p.user_id === action.userId ? { ...p, connected: false } : p,
				),
			};
		case "player_balance_updated":
			return {
				...state,
				players: state.players.map((p) =>
					p.user_id === action.userId ? { ...p, balance: action.balance } : p,
				),
			};
	}
}

const handleServerMessage = (
	msg: ServerMessage,
	dispatch: (action: Action) => void,
	playerName: string,
): void => {
	switch (msg.type) {
		case "welcome":
			// Save to localStorage for reconnection
			localStorage.setItem(USER_ID_KEY, msg.user_id);
			localStorage.setItem(PLAYER_NAME_KEY, playerName);
			dispatch({
				type: "welcome",
				userId: msg.user_id,
				balance: msg.balance,
				playerName,
				players: msg.players,
			});
			break;
		case "game_state":
			dispatch({
				type: "game_state",
				phase: msg.state,
				winningNumber: msg.winning_number ?? null,
				countdown: msg.countdown,
			});
			break;
		case "countdown":
			dispatch({ type: "countdown", secondsRemaining: msg.seconds_remaining });
			break;
		case "bet_accepted":
			dispatch({ type: "bet_accepted", message: msg });
			break;
		case "bet_rejected":
			dispatch({ type: "bet_rejected", message: msg });
			showGlobalNotification(msg.reason, "error");
			break;
		case "result":
			dispatch({ type: "result", message: msg });
			break;
		case "bet_placed":
			dispatch({
				type: "bet_placed",
				userId: msg.user_id,
				playerName: msg.player_name,
				betType: msg.bet_type,
				betValue: msg.bet_value,
				amount: msg.amount,
			});
			break;
		case "player_list":
			dispatch({ type: "player_list", players: msg.players });
			break;
		case "player_joined":
			dispatch({ type: "player_joined", player: msg.player });
			break;
		case "player_left":
			dispatch({ type: "player_left", userId: msg.user_id });
			break;
		case "player_balance_updated":
			dispatch({ type: "player_balance_updated", userId: msg.user_id, balance: msg.balance });
			break;
	}
};

const getWebSocketUrl = () => {
	const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
	const url = new URL(apiUrl);
	url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
	return `${url.origin}/ws`;
};

export const useRouletteWebSocket = (playerName: string | null) => {
	const [state, dispatch] = useReducer(reducer, initialState);
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

	useEffect(() => {
		if (!playerName) {
			return;
		}

		let unmounted = false;

		const connect = () => {
			if (unmounted) {
				return;
			}

			const ws = new WebSocket(getWebSocketUrl());
			wsRef.current = ws;

			ws.onopen = () => {
				if (!unmounted) {
					dispatch({ type: "connected" });

					// Check for saved identity
					const savedUserId = localStorage.getItem(USER_ID_KEY);
					const savedName = localStorage.getItem(PLAYER_NAME_KEY);

					if (savedUserId && savedName && savedName === playerName) {
						// Reconnect with saved identity
						ws.send(
							JSON.stringify({
								action: "reconnect",
								user_id: savedUserId,
								name: savedName,
							}),
						);
					} else {
						// New connection
						ws.send(JSON.stringify({ action: "set_name", name: playerName }));
					}
				}
			};

			ws.onmessage = (event) => {
				try {
					handleServerMessage(JSON.parse(event.data), dispatch, playerName);
				} catch {
					// Ignore malformed messages
				}
			};

			ws.onclose = () => {
				if (!unmounted) {
					dispatch({ type: "disconnected" });
					reconnectTimerRef.current = setTimeout(connect, 2000);
				}
			};

			ws.onerror = () => {
				ws.close();
			};
		};

		connect();

		return () => {
			unmounted = true;
			clearTimeout(reconnectTimerRef.current);
			if (wsRef.current) {
				wsRef.current.onclose = null; // Prevent reconnect on intentional close
				wsRef.current.close();
			}
		};
	}, [playerName]);

	const applyResult = useCallback(() => {
		dispatch({ type: "apply_result" });
	}, []);

	const placeBet = useCallback((betType: BetType, betValue: string, amount: number) => {
		if (wsRef.current?.readyState === WebSocket.OPEN) {
			const msg: PlaceBetAction = {
				action: "place_bet",
				bet_type: betType,
				bet_value: betValue,
				amount,
			};
			wsRef.current.send(JSON.stringify(msg));
		}
	}, []);

	return { ...state, placeBet, applyResult };
};
