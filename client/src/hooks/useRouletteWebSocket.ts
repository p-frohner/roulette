import { useCallback, useEffect, useRef } from "react";
import { type RouletteStore, useRouletteStore } from "../stores/rouletteStore";
import type { BetType, PlaceBetAction, ServerMessage } from "../types/game";

const getWebSocketUrl = () => {
	const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
	const url = new URL(apiUrl);
	url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
	return `${url.origin}/ws`;
};

export const useRouletteWebSocket = () => {
	const store = useRouletteStore();
	const playerName = useRouletteStore((s) => s.playerName);
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
					const { setConnected, userId } = useRouletteStore.getState();
					setConnected(true);

					if (userId) {
						// Reconnect with persisted identity
						ws.send(
							JSON.stringify({
								action: "reconnect",
								user_id: userId,
								name: playerName,
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
					handleServerMessage(JSON.parse(event.data), useRouletteStore.getState(), playerName);
				} catch {
					// Ignore malformed messages
				}
			};

			ws.onclose = () => {
				if (!unmounted) {
					useRouletteStore.getState().setConnected(false);
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

	return { ...store, placeBet };
};

const handleServerMessage = (
	msg: ServerMessage,
	store: RouletteStore,
	playerName: string,
): void => {
	switch (msg.type) {
		case "welcome":
			store.handleWelcome(msg.user_id, msg.balance, playerName, msg.players);
			break;
		case "game_state":
			store.handleGameState(msg.state, msg.winning_number ?? null, msg.countdown);
			break;
		case "countdown":
			store.setCountdown(msg.seconds_remaining);
			break;
		case "bet_accepted":
			store.handleBetAccepted(msg);
			break;
		case "bet_rejected":
			store.handleBetRejected(msg);
			break;
		case "result":
			store.handleResult(msg);
			break;
		case "bet_placed":
			store.addBetLog(msg.user_id, msg.player_name, msg.bet_value, msg.amount);
			break;
		case "player_list":
			store.setPlayers(msg.players);
			break;
		case "player_joined":
			store.addPlayer(msg.player);
			break;
		case "player_left":
			store.markPlayerDisconnected(msg.user_id);
			break;
		case "player_balance_updated":
			store.updatePlayerBalance(msg.user_id, msg.balance);
			break;
		case "session_expired":
			store.handleSessionExpired();
			break;
	}
};
