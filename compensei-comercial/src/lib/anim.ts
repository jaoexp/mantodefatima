import {Color} from 'three';
import {Easing, interpolate} from 'remotion';

export type Vec3 = [number, number, number];

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const lerp3 = (a: Vec3, b: Vec3, t: number): Vec3 => [
	lerp(a[0], b[0], t),
	lerp(a[1], b[1], t),
	lerp(a[2], b[2], t),
];

/** Progresso 0..1 entre `start` e `start + duration`, com easing opcional. */
export const progress = (
	frame: number,
	start: number,
	duration: number,
	easing: (t: number) => number = (t) => t,
) =>
	interpolate(frame, [start, start + duration], [0, 1], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing,
	});

/** Sobe de 0 a 1 em [a, b] e desce de 1 a 0 em [c, d]. */
export const window4 = (
	frame: number,
	a: number,
	b: number,
	c: number,
	d: number,
	easing: (t: number) => number = Easing.inOut(Easing.quad),
) =>
	interpolate(frame, [a, b, c, d], [0, 1, 1, 0], {
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
		easing,
	});

export const smoothstep = (e0: number, e1: number, x: number) => {
	const t = clamp01((x - e0) / (e1 - e0));
	return t * t * (3 - 2 * t);
};

const tmpA = new Color();
const tmpB = new Color();
/** Mistura duas cores hex e devolve hex. */
export const mixHex = (a: string, b: string, t: number) =>
	'#' + tmpA.set(a).lerp(tmpB.set(b), clamp01(t)).getHexString();

/**
 * Interpola uma trilha de keyframes. Cada segmento usa o easing do keyframe
 * de destino.
 */
export type Key<T> = {frame: number; value: T; easing?: (t: number) => number};

export const track = <T extends number | Vec3>(frame: number, keys: Key<T>[]): T => {
	if (frame <= keys[0].frame) return keys[0].value;
	for (let i = 1; i < keys.length; i++) {
		const k0 = keys[i - 1];
		const k1 = keys[i];
		if (frame <= k1.frame) {
			const t = (k1.easing ?? Easing.inOut(Easing.cubic))(
				(frame - k0.frame) / (k1.frame - k0.frame),
			);
			if (typeof k0.value === 'number') return lerp(k0.value, k1.value as number, t) as T;
			return lerp3(k0.value as Vec3, k1.value as Vec3, t) as T;
		}
	}
	return keys[keys.length - 1].value;
};
