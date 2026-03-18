import { useCallback, useEffect, useRef, useState } from "react";
import { Subject, Subscription, timer, zip } from "rxjs";
import { filter, retry, share, switchMap, take, timeout } from "rxjs/operators";
import { type WebSocketSubject, webSocket } from "rxjs/webSocket";
import { type RouletteStore, useRouletteStore } from "../stores/rouletteStore";
import type { BetType, GameStateMessage, ResultMessage, ServerMessage } from "../types/game";

const getWebSocketUrl = () => {
	const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
	const url = new URL(apiUrl);
	url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
	return `${url.origin}/ws`;
};

export interface RouletteWebSocketHandle {
	placeBet: (betType: BetType, betValue: string, amount: number) => void;
	notifySettled: () => void;
	wheelSettled: boolean;
}

export const useRouletteWebSocket = (): RouletteWebSocketHandle => {
	const playerName = useRouletteStore((s) => s.playerName);
	const gamePhase = useRouletteStore((s) => s.gamePhase);
	const subjectRef = useRef<WebSocketSubject<ServerMessage> | null>(null);
	const settled$Ref = useRef(new Subject<void>());
	const [wheelSettled, setWheelSettled] = useState(false);
	const sawSpinningRef = useRef(false);

	const notifySettled = useCallback(() => {
		setWheelSettled(true);
		settled$Ref.current.next();
	}, []);

	// Track phase transitions for late-join detection
	useEffect(() => {
		if (gamePhase === "SPINNING") {
			setWheelSettled(false);
			sawSpinningRef.current = true;
		} else if (gamePhase === "RESULT") {
			// Late join: if we never saw SPINNING for this round, settle immediately
			if (!sawSpinningRef.current) {
				setWheelSettled(true);
			}
		} else if (gamePhase === "BETTING") {
			setWheelSettled(false);
			sawSpinningRef.current = false;
		}
	}, [gamePhase]);

	useEffect(() => {
		if (!playerName) {
			return;
		}

		const subject = webSocket<ServerMessage>({
			url: getWebSocketUrl(),
			openObserver: {
				next: () => {
					const s = useRouletteStore.getState();
					s.setConnected(true);
					const auth = s.userId
						? {
								action: "reconnect",
								user_id: s.userId,
								session_token: s.sessionToken ?? "",
								name: playerName,
							}
						: { action: "set_name", name: playerName };
					subject.next(auth as unknown as ServerMessage);
				},
			},
			closeObserver: {
				next: () => useRouletteStore.getState().setConnected(false),
			},
		});
		subjectRef.current = subject;

		const messages$ = subject.pipe(
			timeout({ first: 10_000 }),
			retry({
				delay: (_, retryCount) => {
					useRouletteStore.getState().setReconnectAttempt(retryCount);
					return timer(Math.min(2000 * 2 ** (retryCount - 1), 2_000));
				},
			}),
			share(),
		);

		const result$ = messages$.pipe(filter((m): m is ResultMessage => m.type === "result"));

		const spinning$ = messages$.pipe(
			filter((m): m is GameStateMessage => m.type === "game_state" && m.state === "SPINNING"),
		);

		const subs = new Subscription();

		// reveal result exactly when animation settles
		subs.add(
			spinning$
				.pipe(switchMap(() => zip(result$, settled$Ref.current).pipe(take(1))))
				.subscribe(([resultMsg]) => useRouletteStore.getState().applyResultMsg(resultMsg)),
		);

		// session_expired: server kept the WS open, re-register immediately
		subs.add(
			messages$.pipe(filter((m) => m.type === "session_expired")).subscribe(() => {
				subject.next({ action: "set_name", name: playerName } as unknown as ServerMessage);
			}),
		);

		// other message routing
		subs.add(
			messages$.subscribe((msg) =>
				handleServerMessage(msg, useRouletteStore.getState(), playerName),
			),
		);

		return () => {
			subs.unsubscribe();
			subject.complete();
		};
	}, [playerName]);

	const placeBet = useCallback((betType: BetType, betValue: string, amount: number) => {
		subjectRef.current?.next({
			action: "place_bet",
			bet_type: betType,
			bet_value: betValue,
			amount,
		} as unknown as ServerMessage);
	}, []);

	return { placeBet, notifySettled, wheelSettled };
};

const handleServerMessage = (
	msg: ServerMessage,
	store: RouletteStore,
	playerName: string,
): void => {
	switch (msg.type) {
		case "welcome":
			store.handleWelcome(msg.user_id, msg.session_token, msg.balance, playerName, msg.players);
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
		case "bet_placed":
			store.addBetLog(msg.player_name, msg.bet_value, msg.amount);
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
