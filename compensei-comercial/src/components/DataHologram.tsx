import React, {useMemo} from 'react';
import {Line} from '@react-three/drei';
import {BufferGeometry, Float32BufferAttribute} from 'three';
import {random, useCurrentFrame} from 'remotion';
import {SoftPoints} from './SoftPoints';
import {clamp01, lerp, mixHex, progress, smoothstep} from '../lib/anim';
import {FOLHAS, NERVURAS_POR_FOLHA, nervurasMundo, PONTOS_POR_LINHA} from '../lib/folhas';
import {cores, easings, tempos} from '../theme';

/**
 * Hologramas minimalistas de dados (cena 1) que se transformam em nervuras de
 * folhas (cena 2). Cada painel tem 5 series de linhas; as 65 series viram as
 * 65 nervuras das 5 folhas, num morph continuo de posicao, forma e cor.
 */

const PAINEIS = 13;
const SERIES = 5;
const N = PONTOS_POR_LINHA;

type Painel = {
	x: number;
	y: number;
	z: number;
	ry: number;
	w: number;
	h: number;
	aparece: number;
	rede: boolean;
	seed: string;
};

const criaPaineis = (): Painel[] =>
	Array.from({length: PAINEIS}, (_, p) => {
		const seed = `painel-${p}`;
		const lado = p % 2 === 0 ? -1 : 1;
		const z = lerp(21, -24, p / (PAINEIS - 1)) + (random(seed + 'z') - 0.5) * 3;
		// Corredor livre no caminho da camera; atras do titulo os paineis abrem mais
		const abertura = z > -3 ? 3.4 : 5.2;
		// Paineis acima ou abaixo da faixa do titulo, deixando o centro livre
		const vert = random(seed + 'v') < 0.5 ? -1 : 1;
		return {
			x: lado * (abertura + random(seed + 'x') * 4.5),
			y: z > 10 ? (random(seed + 'y') - 0.5) * 4 : vert * (1.9 + random(seed + 'y') * 2.4),
			z,
			ry: -lado * (0.18 + random(seed + 'r') * 0.22),
			w: 3.2 + random(seed + 'w') * 1.2,
			h: 1.7 + random(seed + 'h') * 0.6,
			aparece: 2 + p * 5,
			rede: p % 3 === 0,
			seed,
		};
	});

/** Valor de uma serie (0..1) no ponto u, com leve movimento ao longo do tempo. */
const serie = (seed: string, s: number, u: number, frame: number) => {
	const a = random(`${seed}-a-${s}`) * 6;
	const b = random(`${seed}-b-${s}`) * 6;
	const trend = (random(`${seed}-t-${s}`) - 0.3) * 0.5;
	const base = 0.2 + s * 0.13;
	const t = frame * 0.012;
	return clamp01(
		base +
			trend * u +
			0.08 * Math.sin(u * 7.0 + a + t) +
			0.045 * Math.sin(u * 17.0 + b - t * 1.3) +
			0.02 * Math.sin(u * 41.0 + a * 2.0),
	);
};

/** Converte um ponto local do painel para o mundo. */
const noMundo = (p: Painel, lx: number, ly: number, lz = 0): [number, number, number] => {
	const c = Math.cos(p.ry);
	const s = Math.sin(p.ry);
	return [p.x + lx * c + lz * s, p.y + ly, p.z - lx * s + lz * c];
};

/** Geometria fixa de cada painel: cantoneiras, linhas de grade e barras. */
const estruturaPainel = (p: Painel) => {
	const v: number[] = [];
	const seg = (a: number[], b: number[]) => v.push(...noMundo(p, a[0], a[1]), ...noMundo(p, b[0], b[1]));
	const hw = p.w / 2;
	const hh = p.h / 2;
	const k = 0.22;
	// Cantoneiras
	for (const [sx, sy] of [
		[-1, -1],
		[1, -1],
		[-1, 1],
		[1, 1],
	]) {
		seg([sx * hw, sy * hh], [sx * (hw - k), sy * hh]);
		seg([sx * hw, sy * hh], [sx * hw, sy * (hh - k)]);
	}
	// Grade horizontal tenue (tracejada)
	for (let g = 1; g <= 3; g++) {
		const y = -hh + (p.h * g) / 4;
		for (let d = 0; d < 24; d++) {
			const x0 = -hw + 0.1 + (d / 24) * (p.w - 0.2);
			seg([x0, y], [x0 + (p.w - 0.2) / 60, y]);
		}
	}
	// Barras finas (contorno) na faixa inferior
	const barras = 16;
	for (let b = 0; b < barras; b++) {
		const bx = -hw + 0.2 + (b / barras) * (p.w - 0.4);
		const bw = ((p.w - 0.4) / barras) * 0.45;
		const bh = 0.08 + random(`${p.seed}-bar-${b}`) * 0.32;
		const y0 = -hh + 0.06;
		seg([bx, y0], [bx, y0 + bh]);
		seg([bx, y0 + bh], [bx + bw, y0 + bh]);
		seg([bx + bw, y0 + bh], [bx + bw, y0]);
	}
	return new Float32Array(v);
};

/** Rede de nos conectados (alguns paineis). */
const redePainel = (p: Painel) => {
	const nos: [number, number, number][] = [];
	for (let i = 0; i < 9; i++) {
		nos.push(
			noMundo(
				p,
				(random(`${p.seed}-nx-${i}`) - 0.5) * p.w * 0.85,
				(random(`${p.seed}-ny-${i}`) - 0.2) * p.h * 0.7,
				(random(`${p.seed}-nz-${i}`) - 0.5) * 0.8,
			),
		);
	}
	const arestas: number[] = [];
	for (let i = 0; i < nos.length; i++) {
		for (let j = i + 1; j < nos.length; j++) {
			const d = Math.hypot(nos[i][0] - nos[j][0], nos[i][1] - nos[j][1], nos[i][2] - nos[j][2]);
			if (d < 1.25) arestas.push(...nos[i], ...nos[j]);
		}
	}
	return {nos, arestas: new Float32Array(arestas)};
};

export const DataHologram: React.FC = () => {
	const frame = useCurrentFrame();
	const paineis = useMemo(criaPaineis, []);
	const veias = useMemo(nervurasMundo, []);
	const estruturas = useMemo(
		() =>
			paineis.map((p) => {
				const g = new BufferGeometry();
				g.setAttribute('position', new Float32BufferAttribute(estruturaPainel(p), 3));
				return g;
			}),
		[paineis],
	);
	const redes = useMemo(
		() =>
			paineis.map((p) => {
				if (!p.rede) return null;
				const r = redePainel(p);
				const g = new BufferGeometry();
				g.setAttribute('position', new Float32BufferAttribute(r.arestas, 3));
				return {nos: r.nos, geo: g};
			}),
		[paineis],
	);
	const todosNos = useMemo(() => redes.flatMap((r, p) => (r ? r.nos.map((n) => ({n, p})) : [])), [redes]);

	const [m0, m1] = tempos.morphDados;
	// Estrutura dos paineis (cantoneiras, barras, redes) some antes do morph
	const someEstrutura = 1 - progress(frame, m0 - 10, 50, easings.suave);

	return (
		<group>
			{paineis.map((p, pi) => {
				const entrada = progress(frame, p.aparece, 40, easings.entrada);
				const op = entrada * someEstrutura;
				if (op <= 0.001) return null;
				return (
					<group key={pi}>
						<lineSegments geometry={estruturas[pi]}>
							<lineBasicMaterial
								color={cores.frio}
								transparent
								opacity={0.22 * op}
								depthWrite={false}
							/>
						</lineSegments>
						{redes[pi] ? (
							<lineSegments geometry={redes[pi]!.geo}>
								<lineBasicMaterial
									color={cores.neon}
									transparent
									opacity={0.16 * op}
									depthWrite={false}
								/>
							</lineSegments>
						) : null}
					</group>
				);
			})}

			{/* Nos das redes */}
			<SoftPoints
				count={todosNos.length}
				opacity={someEstrutura}
				update={(b) => {
					todosNos.forEach(({n, p}, i) => {
						const e = progress(frame, paineis[p].aparece + 10, 30, easings.entrada);
						b.pos.set(n, i * 3);
						b.col.set([0.8, 1.0, 0.9], i * 3);
						b.size[i] = 0.07;
						b.alpha[i] = 0.75 * e;
					});
				}}
			/>

			{/* Series: linhas de grafico que viram nervuras */}
			{paineis.flatMap((p, pi) =>
				Array.from({length: SERIES}, (_, s) => {
					const j = pi * SERIES + s;
					const atraso = random(`morph-${j}`) * 40;
					const t = progress(frame, m0 + atraso, m1 - m0 - 40, easings.suave);
					// Desenho progressivo do grafico na entrada
					const desenho = progress(frame, p.aparece + 6 + s * 3, 36, easings.entrada);
					const pontos = Math.max(2, Math.round(desenho * N));
					const destino = veias[j];
					const arco = Math.sin(Math.PI * t);
					const pts: [number, number, number][] = [];
					for (let i = 0; i < pontos; i++) {
						const u = i / (N - 1);
						const lx = -p.w / 2 + 0.1 + u * (p.w - 0.2);
						const ly = -p.h / 2 + 0.12 + serie(p.seed, s, u, frame) * (p.h - 0.3);
						const a = noMundo(p, lx, ly, 0.02 * s);
						const bx = destino[i * 3];
						const by = destino[i * 3 + 1];
						const bz = destino[i * 3 + 2];
						// No meio do caminho as linhas se curvam (ondulacao organica)
						const onda = Math.sin(u * 3.5 + j * 0.7 + t * 3.0) * 0.32 * arco;
						pts.push([
							lerp(a[0], bx, t),
							lerp(a[1], by, t) + onda + arco * (random(`arco-${j}`) - 0.3) * 1.2,
							lerp(a[2], bz, t) + Math.cos(u * 2.5 + j) * 0.3 * arco,
						]);
					}
					// Cor: frio -> quente (pontual) -> verde-folha luminoso
					const quente = 0.45 * smoothstep(0.2, 0.5, t) * (1 - smoothstep(0.5, 0.85, t));
					const destaque = s === 2;
					const corFria = destaque ? cores.neon : cores.frio;
					const corFinal = s === 0 ? cores.neon : cores.folhaClara;
					const cor = mixHex(mixHex(corFria, cores.quente, quente), corFinal, smoothstep(0.55, 1, t));
					const opBase = lerp(destaque ? 0.55 : 0.3, s === 0 ? 0.75 : 0.55, t);
					// Nervuras somem junto com a propria folha
					const folha = FOLHAS[Math.floor(j / NERVURAS_POR_FOLHA)];
					const someNervura = 1 - progress(frame, folha.sai, 60, easings.suave);
					const op = opBase * progress(frame, p.aparece, 30) * someNervura;
					if (op <= 0.002) return null;
					return (
						<Line
							key={j}
							points={pts}
							color={cor}
							lineWidth={lerp(1.15, 1.6, t)}
							transparent
							opacity={op}
							depthWrite={false}
						/>
					);
				}),
			)}
		</group>
	);
};
