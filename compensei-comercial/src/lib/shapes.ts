import {Shape, ShapeUtils, Vector2} from 'three';
import type {Font} from 'three-stdlib';
import {random} from 'remotion';

export type Bounds = {minX: number; minY: number; maxX: number; maxY: number};

export const shapeBounds = (shapes: Shape[]): Bounds => {
	const b = {minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity};
	for (const s of shapes) {
		for (const p of s.getPoints(4)) {
			b.minX = Math.min(b.minX, p.x);
			b.minY = Math.min(b.minY, p.y);
			b.maxX = Math.max(b.maxX, p.x);
			b.maxY = Math.max(b.maxY, p.y);
		}
	}
	return b;
};

/** Cria novas Shapes aplicando `fn` a cada ponto (contorno e furos). */
export const mapShapes = (
	shapes: Shape[],
	fn: (x: number, y: number) => [number, number],
	divisions = 12,
): Shape[] =>
	shapes.map((s) => {
		const out = new Shape(s.getPoints(divisions).map((p) => new Vector2(...fn(p.x, p.y))));
		out.holes = s.holes.map((h) => {
			const pts = h.getPoints(divisions).map((p) => new Vector2(...fn(p.x, p.y)));
			return new Shape(pts);
		});
		return out;
	});

/**
 * Amostra `count` pontos uniformemente distribuidos pela area das shapes.
 * Deterministico: usa random(seed) do Remotion.
 */
export const sampleShapes = (shapes: Shape[], count: number, seed: string): Float32Array => {
	const tris: number[][] = [];
	const areas: number[] = [];
	let total = 0;
	for (const s of shapes) {
		const contour = s.getPoints(8);
		const holes = s.holes.map((h) => h.getPoints(8));
		const all = contour.concat(...holes);
		for (const [a, b, c] of ShapeUtils.triangulateShape(contour, holes)) {
			const A = all[a];
			const B = all[b];
			const C = all[c];
			const area = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y)) / 2;
			if (area <= 0) continue;
			tris.push([A.x, A.y, B.x, B.y, C.x, C.y]);
			total += area;
			areas.push(total);
		}
	}
	const out = new Float32Array(count * 2);
	if (tris.length === 0) return out;
	for (let i = 0; i < count; i++) {
		const r = random(`${seed}-t-${i}`) * total;
		let lo = 0;
		let hi = areas.length - 1;
		while (lo < hi) {
			const mid = (lo + hi) >> 1;
			if (areas[mid] < r) lo = mid + 1;
			else hi = mid;
		}
		const t = tris[lo];
		let u = random(`${seed}-u-${i}`);
		let v = random(`${seed}-v-${i}`);
		if (u + v > 1) {
			u = 1 - u;
			v = 1 - v;
		}
		out[i * 2] = t[0] + (t[2] - t[0]) * u + (t[4] - t[0]) * v;
		out[i * 2 + 1] = t[1] + (t[3] - t[1]) * u + (t[5] - t[1]) * v;
	}
	return out;
};

/** Layout de uma linha de texto letra a letra, igual ao do TextGeometry. */
export type GlyphLayout = {
	char: string;
	/** Inicio (origem) do glifo em x */
	x: number;
	/** Centro do glifo (x, y) para girar a letra em torno de si mesma */
	cx: number;
	cy: number;
	width: number;
};

export const layoutText = (
	font: Font,
	text: string,
	size: number,
	letterSpacing = 0,
): {glyphs: GlyphLayout[]; width: number; capHeight: number} => {
	const data = font.data as unknown as {
		resolution: number;
		glyphs: Record<string, {ha: number; x_min: number; x_max: number}>;
		boundingBox: {yMax: number};
	};
	const scale = size / data.resolution;
	const capHeight = size * 0.727; // altura de caixa alta da Inter
	const glyphs: GlyphLayout[] = [];
	let x = 0;
	for (const char of text) {
		const g = data.glyphs[char] ?? data.glyphs['?'];
		const xMin = g.x_min * scale;
		const xMax = g.x_max * scale;
		glyphs.push({
			char,
			x,
			cx: x + (xMin + xMax) / 2,
			cy: capHeight / 2,
			width: xMax - xMin,
		});
		x += g.ha * scale + letterSpacing * size;
	}
	return {glyphs, width: x - letterSpacing * size, capHeight};
};

/**
 * Amostra pontos sobre o texto (no mesmo layout de layoutText), centralizado
 * em x e com a linha de base em y = 0. Devolve xy e o indice da letra.
 */
export const sampleText = (
	font: Font,
	text: string,
	size: number,
	count: number,
	seed: string,
	letterSpacing = 0,
) => {
	const {glyphs, width} = layoutText(font, text, size, letterSpacing);
	const per: {shapes: Shape[]; area: number; index: number}[] = [];
	let totalArea = 0;
	glyphs.forEach((g, index) => {
		if (g.char === ' ') return;
		const shapes = mapShapes(font.generateShapes(g.char, size), (x, y) => [
			x + g.x - width / 2,
			y,
		]);
		const b = shapeBounds(shapes);
		const area = Math.max(1e-4, (b.maxX - b.minX) * (b.maxY - b.minY));
		per.push({shapes, area, index});
		totalArea += area;
	});
	const xy = new Float32Array(count * 2);
	const letter = new Uint16Array(count);
	let filled = 0;
	per.forEach((p, k) => {
		const n = k === per.length - 1 ? count - filled : Math.round((p.area / totalArea) * count);
		const pts = sampleShapes(p.shapes, n, `${seed}-${k}`);
		xy.set(pts.subarray(0, Math.min(pts.length, (count - filled) * 2)), filled * 2);
		letter.fill(p.index, filled, Math.min(count, filled + n));
		filled = Math.min(count, filled + n);
	});
	return {xy, letter, width};
};
