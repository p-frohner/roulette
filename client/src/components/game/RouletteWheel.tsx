import { Box, styled } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";

import { COLOR_MAP, getNumberColor, WHEEL_ORDER } from "../../data/rouletteNumbers";
import type { GamePhase } from "../../types/game";
import {
	BALL_TRACK_RADIUS,
	BALL_VISUAL_RADIUS,
	computeEndState,
	createInitialAnimState,
	DECEL_DURATION,
	DROP_PROFILES,
	interpolateAnimation,
} from "./rouletteAnimation";

const BETTING_DURATION = 20;
const COUNTDOWN_RADIUS = 30;
const COUNTDOWN_CIRCUMFERENCE = 2 * Math.PI * COUNTDOWN_RADIUS;

interface Props {
	gamePhase: GamePhase;
	winningNumber: number | null;
	countdown: number;
	connected: boolean;
	onSettle?: () => void;
}

const SEGMENT_COUNT = WHEEL_ORDER.length; // 37
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;

// Geometry constants (viewBox 0 0 280 280, center at 140,140)
const CX = 140;
const CY = 140;
const OUTER_RIM_RADIUS = 138;
const OUTER_RADIUS = 130;
const INNER_RADIUS = 108;
const HUB_OUTER_RADIUS = 106;
const HUB_MAIN_RADIUS = 85;
const HUB_INNER_RADIUS = 25;
const POCKET_DIVIDER_RADIUS = 117;
const TEXT_RADIUS = 124;

const DEFLECTOR_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];

function annularSegmentPath(
	cx: number,
	cy: number,
	outerR: number,
	innerR: number,
	startAngleDeg: number,
	endAngleDeg: number,
): string {
	const startRad = (startAngleDeg * Math.PI) / 180;
	const endRad = (endAngleDeg * Math.PI) / 180;

	const ox1 = cx + outerR * Math.cos(startRad);
	const oy1 = cy + outerR * Math.sin(startRad);
	const ox2 = cx + outerR * Math.cos(endRad);
	const oy2 = cy + outerR * Math.sin(endRad);

	const ix1 = cx + innerR * Math.cos(startRad);
	const iy1 = cy + innerR * Math.sin(startRad);
	const ix2 = cx + innerR * Math.cos(endRad);
	const iy2 = cy + innerR * Math.sin(endRad);

	return [
		`M${ox1},${oy1}`,
		`A${outerR},${outerR} 0 0,1 ${ox2},${oy2}`,
		`L${ix2},${iy2}`,
		`A${innerR},${innerR} 0 0,0 ${ix1},${iy1}`,
		"Z",
	].join(" ");
}

const WheelContainer = styled(Box)({
	width: "100%",
	height: "100%",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	filter: "drop-shadow(0 4px 12px rgba(0,0,0,0.6))",
	"& > svg": {
		maxWidth: "100%",
		maxHeight: "100%",
	},
});

export const RouletteWheel = ({
	gamePhase,
	winningNumber,
	countdown,
	connected,
	onSettle,
}: Props) => {
	const [settled, setSettled] = useState(false);

	// Refs for direct DOM manipulation (60fps without re-renders)
	const wheelGroupRef = useRef<SVGGElement>(null);
	const ballRef = useRef<SVGCircleElement>(null);
	const animFrameRef = useRef<number>(0);
	const animStateRef = useRef(createInitialAnimState());

	// Animation loop — runs continuously on mount
	const animate = useCallback((timestamp: number) => {
		const state = animStateRef.current;

		// Skip computation when nothing is animating
		if (state.phase === "IDLE") {
			if (ballRef.current) {
				ballRef.current.setAttribute("opacity", "0");
			}
			animFrameRef.current = requestAnimationFrame(animate);
			return;
		}
		if (state.phase === "SETTLED") {
			animFrameRef.current = requestAnimationFrame(animate);
			return;
		}

		if (state.lastTimestamp === 0) {
			state.lastTimestamp = timestamp;
		}
		// Cap delta to avoid huge jumps when tab regains focus
		const delta = Math.min((timestamp - state.lastTimestamp) / 1000, 0.1);
		state.lastTimestamp = timestamp;

		if (state.phase === "FAST_SPIN") {
			state.wheelAngle += state.wheelSpeed * delta;
			state.ballAngle -= state.ballSpeed * delta;
			state.ballRadius = BALL_TRACK_RADIUS;
		} else if (state.phase === "DECELERATION") {
			if (!state.decelSnapshot || !state.decelEndState) {
				animFrameRef.current = requestAnimationFrame(animate);
				return;
			}

			const elapsed = timestamp - state.decelStartTime;
			const t = Math.min(elapsed / DECEL_DURATION, 1);

			const result = interpolateAnimation(
				state.decelSnapshot,
				state.decelEndState,
				t,
				state.decelProfile,
			);

			state.wheelAngle = result.wheelAngle;
			state.ballAngle = result.ballAngle;
			state.ballRadius = result.ballRadius;

			if (t >= 1) {
				state.phase = "SETTLED";
				state.onSettle?.();
			}
		}

		// Apply to DOM directly
		if (wheelGroupRef.current) {
			wheelGroupRef.current.setAttribute("transform", `rotate(${state.wheelAngle} ${CX} ${CY})`);
		}
		if (ballRef.current) {
			const rad = (state.ballAngle * Math.PI) / 180;
			const bx = CX + state.ballRadius * Math.cos(rad);
			const by = CY + state.ballRadius * Math.sin(rad);
			ballRef.current.setAttribute("cx", String(bx));
			ballRef.current.setAttribute("cy", String(by));
			ballRef.current.setAttribute("opacity", "1");
		}

		animFrameRef.current = requestAnimationFrame(animate);
	}, []);

	// Start/stop the rAF loop
	useEffect(() => {
		animFrameRef.current = requestAnimationFrame(animate);
		return () => cancelAnimationFrame(animFrameRef.current);
	}, [animate]);

	// React to game phase transitions
	useEffect(() => {
		const anim = animStateRef.current;

		if (gamePhase === "SPINNING") {
			anim.phase = "FAST_SPIN";
			anim.ballRadius = BALL_TRACK_RADIUS;
			setSettled(false);
		} else if (gamePhase === "RESULT" && winningNumber !== null) {
			// Snapshot current state and compute deceleration target
			const snapshot = {
				wheelAngle: anim.wheelAngle,
				ballAngle: anim.ballAngle,
				ballRadius: BALL_TRACK_RADIUS,
			};

			const profile = DROP_PROFILES[Math.floor(Math.random() * DROP_PROFILES.length)];
			const endState = computeEndState(
				winningNumber,
				snapshot.wheelAngle,
				snapshot.ballAngle,
				profile,
			);

			anim.decelSnapshot = snapshot;
			anim.decelEndState = endState;
			anim.decelProfile = profile;
			anim.decelStartTime = performance.now();
			anim.phase = "DECELERATION";
			anim.onSettle = () => {
				setSettled(true);
				onSettle?.();
			};
		} else if (gamePhase === "BETTING") {
			// Keep ball settled; it will hide when next spin starts
			if (anim.phase !== "SETTLED") {
				anim.phase = "IDLE";
			}
			setSettled(false);
		}
	}, [gamePhase, winningNumber, onSettle]);

	return (
		<WheelContainer>
			<svg viewBox="0 0 280 280" width="100%" height="100%" role="img">
				<title>Roulette wheel</title>
				<defs>
					<radialGradient id="rimGradient" cx="50%" cy="50%" r="50%">
						<stop offset="0%" stopColor="#C0C0C0" />
						<stop offset="40%" stopColor="#E8E8E8" />
						<stop offset="60%" stopColor="#A0A0A0" />
						<stop offset="80%" stopColor="#D4D4D4" />
						<stop offset="100%" stopColor="#808080" />
					</radialGradient>
					<radialGradient id="hubGradient" cx="40%" cy="40%" r="60%">
						<stop offset="0%" stopColor="#3E8E41" />
						<stop offset="100%" stopColor="#1B5E20" />
					</radialGradient>
					<filter id="winnerGlow" x="-20%" y="-20%" width="140%" height="140%">
						<feGaussianBlur stdDeviation="2" result="blur" />
						<feMerge>
							<feMergeNode in="blur" />
							<feMergeNode in="SourceGraphic" />
						</feMerge>
					</filter>
					<radialGradient id="ballGradient" cx="35%" cy="35%" r="65%">
						<stop offset="0%" stopColor="#FFFFFF" />
						<stop offset="50%" stopColor="#E8E8E8" />
						<stop offset="100%" stopColor="#A0A0A0" />
					</radialGradient>
				</defs>

				{/* Rotating wheel group */}
				<g ref={wheelGroupRef}>
					{/* Layer 1: Outer metallic rim */}
					<circle cx={CX} cy={CY} r={OUTER_RIM_RADIUS} fill="url(#rimGradient)" />

					{/* Layer 2: Dark base under pockets (visible as dividers) */}
					<circle cx={CX} cy={CY} r={OUTER_RADIUS} fill="#111" />

					{/* Layer 3: 37 segments — number ring (outer) + pocket (inner) */}
					{WHEEL_ORDER.map((num, i) => {
						const startAngle = i * SEGMENT_ANGLE - 90;
						const endAngle = startAngle + SEGMENT_ANGLE;

						const midRad = (((startAngle + endAngle) / 2) * Math.PI) / 180;
						const tx = CX + TEXT_RADIUS * Math.cos(midRad);
						const ty = CY + TEXT_RADIUS * Math.sin(midRad);
						const textAngle = (startAngle + endAngle) / 2 + 90;

						const color = COLOR_MAP[getNumberColor(num)];
						const isWinner = settled && winningNumber === num;

						return (
							<g key={num}>
								{/* Number ring (outer) */}
								<path
									d={annularSegmentPath(
										CX,
										CY,
										OUTER_RADIUS,
										POCKET_DIVIDER_RADIUS,
										startAngle,
										endAngle,
									)}
									fill={color}
									stroke="#111"
									strokeWidth={1.2}
								/>
								{/* Pocket (inner) — darker for depth */}
								<path
									d={annularSegmentPath(
										CX,
										CY,
										POCKET_DIVIDER_RADIUS,
										INNER_RADIUS,
										startAngle,
										endAngle,
									)}
									fill={color}
									stroke={isWinner ? "#FFD700" : "#111"}
									strokeWidth={isWinner ? 2.5 : 1.2}
									filter={isWinner ? "url(#winnerGlow)" : undefined}
									opacity={0.75}
								/>
								<text
									x={tx}
									y={ty}
									fill="#fff"
									fontSize="9"
									fontWeight="700"
									textAnchor="middle"
									dominantBaseline="central"
									transform={`rotate(${textAngle}, ${tx}, ${ty})`}
								>
									{num}
								</text>
							</g>
						);
					})}

					{/* Layer 3b: Pocket divider ring (ledge between numbers and pockets) */}
					<circle
						cx={CX}
						cy={CY}
						r={POCKET_DIVIDER_RADIUS}
						fill="none"
						stroke="#333"
						strokeWidth={1}
					/>

					{/* Layer 4: Ball track groove */}
					<circle
						cx={CX}
						cy={CY}
						r={OUTER_RADIUS + 2}
						fill="none"
						stroke="rgba(0,0,0,0.3)"
						strokeWidth={0.5}
					/>

					{/* Layer 5: Ball deflectors on rim */}
					{DEFLECTOR_ANGLES.map((angle) => {
						const rad = (angle * Math.PI) / 180;
						const dx = CX + (OUTER_RIM_RADIUS - 3) * Math.cos(rad);
						const dy = CY + (OUTER_RIM_RADIUS - 3) * Math.sin(rad);
						return (
							<circle
								key={angle}
								cx={dx}
								cy={dy}
								r={2}
								fill="#C0C0C0"
								stroke="#888"
								strokeWidth={0.3}
							/>
						);
					})}

					{/* Layer 6: Inner ring edge (pocket wall) */}
					<circle cx={CX} cy={CY} r={INNER_RADIUS} fill="none" stroke="#333" strokeWidth={1.5} />

					{/* Layer 7: Decorative center hub */}
					<circle
						cx={CX}
						cy={CY}
						r={HUB_OUTER_RADIUS}
						fill="#1a1a1a"
						stroke="#444"
						strokeWidth={1}
					/>
					<circle
						cx={CX}
						cy={CY}
						r={HUB_MAIN_RADIUS}
						fill="url(#hubGradient)"
						stroke="#2E7D32"
						strokeWidth={1}
					/>
					<circle
						cx={CX}
						cy={CY}
						r={60}
						fill="none"
						stroke="#FFD700"
						strokeWidth={0.8}
						opacity={0.6}
					/>
					<circle cx={CX} cy={CY} r={HUB_INNER_RADIUS} fill="#111" stroke="#555" strokeWidth={1} />
				</g>

				{/* Ball — in static SVG space, outside the rotating group */}
				<circle
					ref={ballRef}
					cx={CX}
					cy={CY - BALL_TRACK_RADIUS}
					r={BALL_VISUAL_RADIUS}
					fill="url(#ballGradient)"
					stroke="rgba(0,0,0,0.3)"
					strokeWidth={0.5}
					opacity={0}
				/>

				{/* Game status — static overlay in wheel center */}
				{!connected && (
					<>
						<circle cx={CX} cy={CY} r={40} fill="rgba(0,0,0,0.6)" />
						<text
							x={CX}
							y={CY}
							textAnchor="middle"
							dominantBaseline="central"
							fill="#FFF"
							fontSize="12"
						>
							Connecting...
						</text>
					</>
				)}

				{connected && gamePhase === "BETTING" && (
					<>
						{/* Background track */}
						<circle
							cx={CX}
							cy={CY}
							r={COUNTDOWN_RADIUS}
							fill="none"
							stroke="rgba(255,255,255,0.1)"
							strokeWidth={4}
						/>
						{/* Progress arc */}
						<circle
							cx={CX}
							cy={CY}
							r={COUNTDOWN_RADIUS}
							fill="none"
							stroke={countdown <= 5 ? "#d32f2f" : "#afb3b0"}
							strokeWidth={4}
							strokeDasharray={COUNTDOWN_CIRCUMFERENCE}
							strokeDashoffset={COUNTDOWN_CIRCUMFERENCE * (1 - countdown / BETTING_DURATION)}
							strokeLinecap="round"
							transform={`rotate(-90 ${CX} ${CY})`}
						/>
						<text
							x={CX}
							y={CY}
							textAnchor="middle"
							dominantBaseline="central"
							fill="rgba(255,255,255,0.7)"
							fontSize="16"
							fontWeight="700"
						>
							{Math.round(countdown)}s
						</text>
					</>
				)}

				{connected && gamePhase === "RESULT" && settled && winningNumber !== null && (
					<>
						<circle
							cx={CX}
							cy={CY}
							r={24}
							fill={
								getNumberColor(winningNumber) === "green"
									? "#2E7D32"
									: getNumberColor(winningNumber) === "red"
										? "#C62828"
										: "#212121"
							}
							stroke="rgba(255,255,255,0.3)"
							strokeWidth={1}
						/>
						<text
							x={CX}
							y={CY}
							textAnchor="middle"
							dominantBaseline="central"
							fill="#fff"
							fontSize="20"
							fontWeight="700"
						>
							{winningNumber}
						</text>
					</>
				)}
			</svg>
		</WheelContainer>
	);
};
