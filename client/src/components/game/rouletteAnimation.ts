import { WHEEL_ORDER } from "../../data/rouletteNumbers";

// ─── Constants ────────────────────────────────────────────────
export const CX = 140;
export const CY = 140;
export const BALL_TRACK_RADIUS = 135;
export const POCKET_RADIUS = 112;
export const BALL_VISUAL_RADIUS = 4.5;
export const DECEL_DURATION = 2500; // ms
export const SEGMENT_ANGLE = 360 / WHEEL_ORDER.length;

// Speeds during fast spin (degrees per second)
export const WHEEL_SPEED = 900;
export const BALL_SPEED = 1200;

// ─── Types ────────────────────────────────────────────────────
export interface AnimationSnapshot {
	wheelAngle: number;
	ballAngle: number;
	ballRadius: number;
}

export interface DropProfile {
	/** Extra full ball orbits during deceleration (2-4) */
	extraBallOrbits: number;
	/** Fraction of deceleration before ball drops inward (0.5-0.75) */
	dropStartFraction: number;
	/** Whether ball overshoots inward then settles back */
	hasBounce: boolean;
	/** Extra full wheel turns during deceleration (1-3) */
	extraWheelTurns: number;
	/** Exponent for the main deceleration easing (3-5) */
	easingPower: number;
}

export type AnimationPhase = "IDLE" | "FAST_SPIN" | "DECELERATION" | "SETTLED";

export interface AnimState {
	phase: AnimationPhase;
	wheelAngle: number;
	ballAngle: number;
	ballRadius: number;
	wheelSpeed: number;
	ballSpeed: number;
	lastTimestamp: number;
	decelStartTime: number;
	decelSnapshot: AnimationSnapshot | null;
	decelEndState: AnimationSnapshot | null;
	decelProfile: DropProfile;
	onSettle: (() => void) | null;
}

// ─── Drop Profiles ───────────────────────────────────────────
export const DROP_PROFILES: DropProfile[] = [
	{ extraBallOrbits: 2, dropStartFraction: 0.55, hasBounce: false, extraWheelTurns: 2, easingPower: 4 },
	{ extraBallOrbits: 3, dropStartFraction: 0.65, hasBounce: true, extraWheelTurns: 2, easingPower: 3 },
	{ extraBallOrbits: 2, dropStartFraction: 0.7, hasBounce: false, extraWheelTurns: 3, easingPower: 5 },
	{ extraBallOrbits: 4, dropStartFraction: 0.5, hasBounce: true, extraWheelTurns: 1, easingPower: 4 },
	{ extraBallOrbits: 3, dropStartFraction: 0.6, hasBounce: false, extraWheelTurns: 2, easingPower: 3 },
];

// ─── Easing Functions ────────────────────────────────────────
export function easeOutPow(t: number, power: number): number {
	return 1 - (1 - t) ** power;
}

function easeInQuad(t: number): number {
	return t * t;
}

function easeOutCubic(t: number): number {
	return 1 - (1 - t) ** 3;
}

// ─── End State Computation ───────────────────────────────────
export function computeEndState(
	winningNumber: number,
	currentWheelAngle: number,
	currentBallAngle: number,
	profile: DropProfile,
): AnimationSnapshot {
	const segmentIndex = WHEEL_ORDER.indexOf(winningNumber);

	// Center of winning segment on the unrotated wheel.
	// Segments are laid out starting at -90° (top), each SEGMENT_ANGLE wide.
	const segmentCenterOnWheel = segmentIndex * SEGMENT_ANGLE - 90 + SEGMENT_ANGLE / 2;

	// Pick a random screen angle where the ball will visually come to rest.
	const ballScreenAngle = Math.random() * 360;

	// The wheel must be rotated so that the winning segment center aligns
	// with ballScreenAngle on screen.
	// A point at angle A on the unrotated wheel appears at screen angle (A + wheelRotation).
	// So: segmentCenterOnWheel + wheelRotation ≡ ballScreenAngle (mod 360)
	// => wheelRotation = ballScreenAngle - segmentCenterOnWheel
	let targetWheelMod = ballScreenAngle - segmentCenterOnWheel;
	targetWheelMod = ((targetWheelMod % 360) + 360) % 360;

	// From current wheel angle, compute additional rotation needed
	const currentMod = ((currentWheelAngle % 360) + 360) % 360;
	let additionalWheel = targetWheelMod - currentMod;
	if (additionalWheel < 0) {
		additionalWheel += 360;
	}
	additionalWheel += profile.extraWheelTurns * 360;

	const wheelEndAngle = currentWheelAngle + additionalWheel;

	// Ball travels counter-clockwise (angle decreasing) from current position
	// to ballScreenAngle, plus extra orbits.
	// Normalize to [0,360) first — ballAngle can be hugely negative after long spins.
	const currentBallMod = ((currentBallAngle % 360) + 360) % 360;
	let additionalBall = currentBallMod - ballScreenAngle;
	if (additionalBall < 0) {
		additionalBall += 360;
	}
	additionalBall += profile.extraBallOrbits * 360;

	const ballEndAngle = currentBallAngle - additionalBall;

	return {
		wheelAngle: wheelEndAngle,
		ballAngle: ballEndAngle,
		ballRadius: POCKET_RADIUS,
	};
}

// ─── Animation Interpolation ─────────────────────────────────
export function interpolateAnimation(
	start: AnimationSnapshot,
	end: AnimationSnapshot,
	t: number,
	profile: DropProfile,
): AnimationSnapshot {
	const eased = easeOutPow(t, profile.easingPower);

	const wheelAngle = start.wheelAngle + (end.wheelAngle - start.wheelAngle) * eased;
	const ballAngle = start.ballAngle + (end.ballAngle - start.ballAngle) * eased;

	// Ball radius: stays on outer track until dropStartFraction, then drops inward
	let ballRadius: number;
	if (t < profile.dropStartFraction) {
		ballRadius = BALL_TRACK_RADIUS;
	} else {
		const dropT = (t - profile.dropStartFraction) / (1 - profile.dropStartFraction);
		if (profile.hasBounce) {
			ballRadius = bounceRadius(dropT, BALL_TRACK_RADIUS, POCKET_RADIUS);
		} else {
			ballRadius = BALL_TRACK_RADIUS + (POCKET_RADIUS - BALL_TRACK_RADIUS) * easeInQuad(dropT);
		}
	}

	return { wheelAngle, ballAngle, ballRadius };
}

function bounceRadius(t: number, from: number, to: number): number {
	if (t < 0.7) {
		// Drop past the target (overshoot inward by 4 SVG units)
		const overT = t / 0.7;
		const overshoot = to - 4;
		return from + (overshoot - from) * easeInQuad(overT);
	}
	// Settle back to target
	const settleT = (t - 0.7) / 0.3;
	const overshoot = to - 4;
	return overshoot + (to - overshoot) * easeOutCubic(settleT);
}

// ─── Initial Animation State ─────────────────────────────────
export function createInitialAnimState(): AnimState {
	return {
		phase: "IDLE",
		wheelAngle: 0,
		ballAngle: 0,
		ballRadius: BALL_TRACK_RADIUS,
		wheelSpeed: WHEEL_SPEED,
		ballSpeed: BALL_SPEED,
		lastTimestamp: 0,
		decelStartTime: 0,
		decelSnapshot: null,
		decelEndState: null,
		decelProfile: DROP_PROFILES[0],
		onSettle: null,
	};
}
