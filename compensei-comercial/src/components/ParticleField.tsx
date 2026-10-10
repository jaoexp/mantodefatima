import React, {useMemo} from 'react';
import {CatmullRomCurve3, Color, Vector3} from 'three';
import {random} from 'remotion';
import {SoftPoints} from './SoftPoints';
import {lerp, smoothstep} from '../lib/anim';

const ca = new Color();
const cb = new Color();
const cc = new Color();

/**
 * Particulas de ar e polen em suspensao. Posicao = funcao pura do frame:
 * base aleatoria (seed) + deriva constante, com wrap dentro de uma caixa.
 */
export const ParticleField: React.FC<{
	frame: number;
	count: number;
	seed: string;
	min: [number, number, number];
	max: [number, number, number];
	deriva: [number, number, number];
	tamanho: [number, number];
	/** Cor fria, cor quente (polen) e verde; `calor` 0..1 mistura de fria para as outras */
	corFria: string;
	corQuente: string;
	corVerde: string;
	calor: number;
	opacity: number;
	brilho?: number;
}> = ({frame, count, seed, min, max, deriva, tamanho, corFria, corQuente, corVerde, calor, opacity, brilho = 1}) => {
	const base = useMemo(
		() =>
			Array.from({length: count}, (_, i) => ({
				p: [0, 1, 2].map((k) => lerp(min[k], max[k], random(`${seed}-${i}-${k}`))),
				v: [0, 1, 2].map((k) => deriva[k] * (0.4 + random(`${seed}-v-${i}-${k}`) * 1.2)),
				fase: random(`${seed}-f-${i}`) * Math.PI * 2,
				tam: lerp(tamanho[0], tamanho[1], Math.pow(random(`${seed}-s-${i}`), 3)),
				polen: random(`${seed}-q-${i}`) < 0.22,
				lim: random(`${seed}-l-${i}`),
			})),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[count, seed],
	);
	ca.set(corFria);
	cb.set(corQuente);
	cc.set(corVerde);
	return (
		<SoftPoints
			count={count}
			opacity={opacity}
			update={(b) => {
				base.forEach((q, i) => {
					for (let k = 0; k < 3; k++) {
						const span = max[k] - min[k];
						let v = q.p[k] - min[k] + q.v[k] * frame;
						v = ((v % span) + span) % span;
						b.pos[i * 3 + k] = min[k] + v;
					}
					// Oscilacao lenta, como ar em suspensao
					b.pos[i * 3] += Math.sin(frame * 0.02 + q.fase) * 0.12;
					b.pos[i * 3 + 1] += Math.cos(frame * 0.017 + q.fase) * 0.1;
					// Fade perto das bordas da caixa (sem "pipocar" no wrap)
					let borda = 1;
					for (let k = 0; k < 3; k++) {
						const u = (b.pos[i * 3 + k] - min[k]) / (max[k] - min[k]);
						borda *= smoothstep(0, 0.08, u) * smoothstep(1, 0.92, u);
					}
					const aquece = smoothstep(q.lim * 0.6, q.lim * 0.6 + 0.4, calor);
					const c = cc.clone();
					if (q.polen) c.lerp(cb, 0.85);
					const fria = ca.clone().lerp(c, aquece);
					b.col[i * 3] = fria.r * brilho;
					b.col[i * 3 + 1] = fria.g * brilho;
					b.col[i * 3 + 2] = fria.b * brilho;
					b.size[i] = q.tam;
					b.alpha[i] = borda * (0.55 + 0.45 * Math.sin(frame * 0.05 + q.fase * 3));
				});
			}}
		/>
	);
};

/**
 * Fluxos de particulas de luz ao longo de curvas (cadeias produtivas e
 * emissoes como fluxos de informacao). Posicao = funcao do frame.
 */
export const FluxoParticulas: React.FC<{
	frame: number;
	seed: string;
	fluxos: number;
	porFluxo: number;
	opacity: number;
	cor: string;
	corDestaque: string;
}> = ({frame, seed, fluxos, porFluxo, opacity, cor, corDestaque}) => {
	const curvas = useMemo(() => {
		return Array.from({length: fluxos}, (_, f) => {
			const r = (k: string) => random(`${seed}-${f}-${k}`);
			const y0 = (r('y0') - 0.5) * 6;
			const z0 = lerp(22, -26, f / Math.max(1, fluxos - 1));
			const pts = Array.from({length: 6}, (_, k) => {
				const t = k / 5;
				return new Vector3(
					lerp(-18, 18, t) + (r(`x${k}`) - 0.5) * 3,
					y0 + Math.sin(t * Math.PI * 1.5 + r('fy') * 6) * 1.6,
					z0 + (r(`z${k}`) - 0.5) * 10,
				);
			});
			const curva = new CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
			// Pre-amostra a curva por comprimento de arco
			return curva.getSpacedPoints(400).map((p) => [p.x, p.y, p.z]);
		});
	}, [fluxos, seed]);

	const total = fluxos * porFluxo;
	const c1 = useMemo(() => new Color(), []);
	const c2 = useMemo(() => new Color(), []);
	c1.set(cor);
	c2.set(corDestaque);

	return (
		<SoftPoints
			count={total}
			opacity={opacity}
			update={(b) => {
				for (let i = 0; i < total; i++) {
					const f = i % fluxos;
					const r = (k: string) => random(`${seed}-p-${i}-${k}`);
					const vel = 0.0012 + r('v') * 0.0016;
					const u = (((r('u') + frame * vel) % 1) + 1) % 1;
					const pts = curvas[f];
					const x = u * (pts.length - 1);
					const i0 = Math.floor(x);
					const i1 = Math.min(pts.length - 1, i0 + 1);
					const t = x - i0;
					const raio = 0.05 + r('r') * 0.35;
					const ang = r('a') * Math.PI * 2 + frame * 0.01;
					b.pos[i * 3] = lerp(pts[i0][0], pts[i1][0], t);
					b.pos[i * 3 + 1] = lerp(pts[i0][1], pts[i1][1], t) + Math.sin(ang) * raio;
					b.pos[i * 3 + 2] = lerp(pts[i0][2], pts[i1][2], t) + Math.cos(ang) * raio;
					const destaque = r('d') < 0.08;
					const c = destaque ? c2 : c1;
					const k = destaque ? 1.6 : 1;
					b.col[i * 3] = c.r * k;
					b.col[i * 3 + 1] = c.g * k;
					b.col[i * 3 + 2] = c.b * k;
					b.size[i] = destaque ? 0.06 : 0.025 + r('s') * 0.025;
					b.alpha[i] = Math.sin(Math.PI * u) * (0.35 + r('o') * 0.5);
				}
			}}
		/>
	);
};
