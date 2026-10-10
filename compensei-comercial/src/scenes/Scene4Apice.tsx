import React, {useMemo} from 'react';
import {random, spring, useCurrentFrame} from 'remotion';
import {Color, Euler, Matrix4, Quaternion, Vector3} from 'three';
import {Texto3D} from '../components/Texto3D';
import {SoftPoints} from '../components/SoftPoints';
import {Globo3D, Logo3D, useLogoGeo} from '../components/LogoCompensei';
import {useAssets} from '../lib/assets';
import {clamp01, lerp, mixHex, progress, smoothstep} from '../lib/anim';
import {layoutText, sampleShapes, sampleText} from '../lib/shapes';
import {SELO_VB, seloEscala, seloPose} from '../lib/selos';
import {LogoOficial} from '../components/LogoCompensei';
import {palcos} from '../lib/stage';
import {cenas, cores, easings, FPS, springs, tempos, textos} from '../theme';

const PALAVRA = {size: 0.8, spacing: 0.03};
const LINHAS = [1.3, 0, -1.3];

const POR_SELO = 850;
const TRILHA = 3;
const ENGOLE = 2800;
const OMPENSEI = 3400;

const neon = new Color(cores.neon);
const branco = new Color('#FFFFFF');
const tmpC = new Color();

/** Rotaciona (x, y) em torno da origem. */
const rot2 = (x: number, y: number, a: number): [number, number] => [
	x * Math.cos(a) - y * Math.sin(a),
	x * Math.sin(a) + y * Math.cos(a),
];

/** Angulo da rotacao do globo: termina com as Americas de frente. */
export const rotacaoGlobo = (frame: number) => (60 * Math.PI) / 180 - 0.006 * (1048 - frame);

/**
 * CENA 4 | APICE E REVELACAO DA MARCA (750-1050)
 * Selos viram rastros de luz -> MEDIR. REDUZIR. COMPENSAR. -> zoom em
 * COMPENSAR -> o C engole as letras -> globo -> "ompensei" -> logo oficial.
 */
export const Scene4Apice: React.FC = () => {
	const frame = useCurrentFrame() + cenas.apice.from;
	const {fontXBold, fontXBoldJson, seloShapes, globo} = useAssets();
	const logo = useLogoGeo();

	const cap = PALAVRA.size * 0.727;
	const compensar = useMemo(
		() => layoutText(fontXBold, textos.cena4[2], PALAVRA.size, PALAVRA.spacing),
		[fontXBold],
	);
	const gC = compensar.glyphs[0];
	// Centro do "C" de COMPENSAR (coordenadas do palco B)
	const c0: [number, number] = [gC.cx - compensar.width / 2, LINHAS[2]];
	const cEscalaFinal = logo.cAltura / (cap * 1.03);
	const cMove = progress(frame, tempos.cEngole, 30, easings.suave);
	const cAtual: [number, number] = [lerp(c0[0], logo.cCentro[0], cMove), lerp(c0[1], logo.cCentro[1], cMove)];

	// ------------------------------------------------ particulas dos selos
	const selos = useMemo(() => {
		const local = sampleShapes(seloShapes, POR_SELO, 'selo-p');
		const m = new Matrix4();
		const v = new Vector3();
		return Array.from({length: 4 * POR_SELO}, (_, i) => {
			const k = Math.floor(i / POR_SELO);
			const j = i % POR_SELO;
			const r = (s: string) => random(`sp-${i}-${s}`);
			const f0 = tempos.selosRecuam + 12 + r('f') * 14;
			const pose = seloPose(k, f0);
			m.compose(
				new Vector3(...pose.pos),
				new Quaternion().setFromEuler(new Euler(...pose.rot)),
				new Vector3(1, 1, 1).multiplyScalar(Math.max(0.2, pose.escala)),
			);
			v.set(
				(local[j * 2] - SELO_VB.w / 2) * seloEscala,
				(SELO_VB.h / 2 - local[j * 2 + 1]) * seloEscala,
				0.04,
			).applyMatrix4(m);
			return {s: [v.x, v.y, v.z], f0, giro: (k < 2 ? 1 : -1) * (1.6 + r('g') * 0.9), tam: 0.018 + r('t') * 0.02};
		});
	}, [seloShapes]);

	// ------------------------------------------------ letras sugadas pelo C
	const engole = useMemo(() => {
		const amostra = sampleText(fontXBold, textos.cena4[2], PALAVRA.size, ENGOLE + 400, 'engole', PALAVRA.spacing);
		const out: {p: [number, number, number]; ts: number; tg: number; giro: number; k: number}[] = [];
		const n = globo.length / 2;
		for (let i = 0; i < amostra.letter.length && out.length < ENGOLE; i++) {
			if (amostra.letter[i] === 0) continue; // o proprio C fica
			const x = amostra.xy[i * 2];
			const y = amostra.xy[i * 2 + 1] + LINHAS[2] - cap / 2;
			const r = (s: string) => random(`eg-${i}-${s}`);
			const dist = (x - c0[0]) / compensar.width;
			out.push({
				p: [x, y, PALAVRA.size * 0.12 * r('z')],
				ts: tempos.cEngole + 2 + dist * 20 + r('t') * 4,
				tg: tempos.globoForma + r('g') * 14,
				giro: 1.3 + r('a') * 0.9,
				k: Math.floor((out.length / ENGOLE) * n),
			});
		}
		return out;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [fontXBold, globo, cap, compensar]);

	// ------------------------------------------------ "ompensei" se materializa
	const ompensei = useMemo(() => {
		const pts = sampleShapes(logo.letrasShapes, OMPENSEI, 'ompensei');
		let minX = Infinity;
		let maxX = -Infinity;
		for (let i = 0; i < OMPENSEI; i++) {
			minX = Math.min(minX, pts[i * 2]);
			maxX = Math.max(maxX, pts[i * 2]);
		}
		return Array.from({length: OMPENSEI}, (_, i) => {
			const r = (s: string) => random(`om-${i}-${s}`);
			const a = r('a') * Math.PI * 2;
			const rr = Math.sqrt(r('r')) * logo.globoRaio;
			const x = pts[i * 2];
			return {
				de: [logo.globoCentro[0] + Math.cos(a) * rr, logo.globoCentro[1] + Math.sin(a) * rr, (r('z') - 0.5) * 0.4],
				para: [x, pts[i * 2 + 1], 0.01],
				ts: tempos.ompenseiForma + ((x - minX) / (maxX - minX)) * 18 + r('t') * 4,
				arco: (r('c') - 0.4) * 0.9,
			};
		});
	}, [logo]);

	const globoRot = rotacaoGlobo(frame);
	const glow = progress(frame, tempos.brilhoCompensar, 40, easings.suave);
	const fadeFinal = 1 - progress(frame, tempos.crossfadeLogo[0], tempos.crossfadeLogo[1] - tempos.crossfadeLogo[0], easings.suave);
	const branco3D = progress(frame, 1016, 18, easings.suave);
	const opGlobo = progress(frame, 970, 24, easings.suave) * (1 - progress(frame, 1020, 16, easings.suave));

	return (
		<group position={palcos.B.position} rotation={[0, palcos.B.rotationY, 0]}>
			{/* Rastros de luz dos selos convergindo para o centro */}
			<SoftPoints
				count={selos.length * TRILHA}
				update={(b) => {
					const centro = [0, 0, -1.6];
					selos.forEach((q, i) => {
						for (let tr = 0; tr < TRILHA; tr++) {
							const idx = i * TRILHA + tr;
							const t = clamp01((frame - q.f0) / 44 - tr * 0.035);
							const e = Math.pow(t, 1.5);
							const [rx, ry] = rot2(q.s[0] - centro[0], q.s[1] - centro[1], e * q.giro);
							const k = 1 - e;
							b.pos[idx * 3] = centro[0] + rx * k;
							b.pos[idx * 3 + 1] = centro[1] + ry * k;
							b.pos[idx * 3 + 2] = lerp(q.s[2], centro[2], e) + Math.sin(Math.PI * t) * 0.8;
							tmpC.copy(neon).lerp(branco, e * 0.4);
							const intens = 1.1 + e * 0.8;
							b.col[idx * 3] = tmpC.r * intens;
							b.col[idx * 3 + 1] = tmpC.g * intens;
							b.col[idx * 3 + 2] = tmpC.b * intens;
							b.size[idx] = q.tam * (1 - tr * 0.25);
							b.alpha[idx] =
								smoothstep(q.f0 - 2, q.f0 + 5, frame) * (1 - smoothstep(0.82, 1, t)) * (1 - tr * 0.33);
						}
					});
				}}
			/>
			<pointLight
				position={[0, 0, 0.5]}
				intensity={14 * smoothstep(785, 805, frame) * (1 - smoothstep(812, 840, frame))}
				distance={10}
				color={cores.neon}
			/>

			{/* MEDIR. REDUZIR. COMPENSAR. */}
			{textos.cena4.map((palavra, w) => {
				const inicio = tempos.palavras[w];
				if (frame < inicio - 1) return null;
				const s = spring({frame: frame - inicio, fps: FPS, config: springs.palavra});
				const ehCompensar = w === 2;
				// a) MEDIR. e REDUZIR. recuam e saem de quadro no zoom
				const sai = ehCompensar ? 0 : progress(frame, tempos.zoomCompensar[0], 50, easings.suave);
				if (sai >= 1) return null;
				return (
					<group key={palavra} position={[0, LINHAS[w] - cap / 2 + sai * 1.2, -sai * 3.5]}>
						<Texto3D
							text={palavra}
							font={fontXBold}
							fontJson={fontXBoldJson}
							size={PALAVRA.size}
							letterSpacing={PALAVRA.spacing}
							estilo={(i) => {
								const base = {
									offset: [0, 0, lerp(-1.4, 0, s)] as [number, number, number],
									scale: lerp(0.9, 1, s),
									opacity: Math.min(1, s * 1.4) * (1 - sai),
								};
								if (!ehCompensar) return base;
								// b) brilho crescente e giro leve no proprio eixo
								const giro = Math.sin(i * 1.3 + frame * 0.07) * 0.24 * glow;
								const estilo = {
									...base,
									rotation: [giro * 0.25, giro, 0] as [number, number, number],
									emissive: cores.neon,
									emissiveIntensity: glow * 0.85,
									color: mixHex(cores.metal, '#E9FFF2', glow),
								};
								if (i === 0) {
									// c) o C cresce e vai para a posicao do C da marca
									const esc = lerp(1, cEscalaFinal, cMove);
									const someC = progress(frame, tempos.cEngole + 16, 14, easings.suave);
									return {
										...estilo,
										rotation: [0, giro * (1 - cMove), 0] as [number, number, number],
										offset: [cAtual[0] - c0[0], cAtual[1] - c0[1], 0] as [number, number, number],
										scale: esc,
										opacity: base.opacity * (1 - someC),
										emissiveIntensity: glow * 0.85 + cMove * 0.6,
									};
								}
								// As demais letras se desmancham em particulas
								const desmancha = progress(frame, tempos.cEngole + i * 2.2, 12, easings.saida);
								return {
									...estilo,
									scale: lerp(1, 0.7, desmancha),
									opacity: base.opacity * (1 - desmancha),
								};
							}}
						/>
					</group>
				);
			})}

			{/* c-d) Particulas sugadas em espiral para dentro do C e condensadas no globo */}
			{frame >= tempos.cEngole ? (
				<SoftPoints
					count={engole.length}
					opacity={1 - progress(frame, 992, 14, easings.suave)}
					update={(b) => {
						const gx = logo.globoCentro[0];
						const gy = logo.globoCentro[1];
						const ca = Math.cos(globoRot);
						const sa = Math.sin(globoRot);
						const ci = Math.cos(0.32);
						const si = Math.sin(0.32);
						engole.forEach((q, i) => {
							const t1 = clamp01((frame - q.ts) / 26);
							const e1 = Math.pow(t1, 1.6);
							const vx = q.p[0] - c0[0];
							const vy = q.p[1] - c0[1];
							const [rx, ry] = rot2(vx, vy, e1 * q.giro);
							const raio = Math.max(Math.pow(1 - e1, 1.4), 0.06);
							let x = cAtual[0] + rx * raio;
							let y = cAtual[1] + ry * raio;
							let z = lerp(q.p[2], 0.1, e1) + Math.sin(Math.PI * t1) * 0.6;
							// Ponto alvo no globo (mesma rotacao do Globo3D)
							const lon = (globo[q.k * 2] * Math.PI) / 180;
							const lat = (globo[q.k * 2 + 1] * Math.PI) / 180;
							let px = logo.globoRaio * Math.cos(lat) * Math.sin(lon);
							let py = logo.globoRaio * Math.sin(lat);
							let pz = logo.globoRaio * Math.cos(lat) * Math.cos(lon);
							[px, pz] = [px * ca + pz * sa, -px * sa + pz * ca];
							[py, pz] = [py * ci - pz * si, py * si + pz * ci];
							const e2 = easings.entrada(clamp01((frame - q.tg) / 24));
							x = lerp(x, gx + px, e2);
							y = lerp(y, gy + py, e2);
							z = lerp(z, pz, e2);
							b.pos[i * 3] = x;
							b.pos[i * 3 + 1] = y;
							b.pos[i * 3 + 2] = z;
							const k = 1.3 + Math.sin(Math.PI * t1) * 0.8;
							b.col[i * 3] = neon.r * k;
							b.col[i * 3 + 1] = neon.g * k;
							b.col[i * 3 + 2] = neon.b * k;
							b.size[i] = lerp(0.03, logo.globoRaio * 0.045, e2);
							b.alpha[i] = smoothstep(q.ts - 3, q.ts + 2, frame) * 0.95;
						});
					}}
				/>
			) : null}

			{/* d) Globo dentro do C */}
			{opGlobo > 0 ? (
				<Globo3D
					centro={logo.globoCentro}
					raio={logo.globoRaio}
					opacidade={opGlobo * fadeFinal}
					rotacao={globoRot}
					pontosAte={progress(frame, 986, 18)}
				/>
			) : null}

			{/* e) "ompensei" se materializa a partir do globo */}
			{frame >= tempos.ompenseiForma - 2 ? (
				<SoftPoints
					count={OMPENSEI}
					opacity={1 - progress(frame, 1016, 14, easings.suave)}
					update={(b) => {
						ompensei.forEach((q, i) => {
							const t = clamp01((frame - q.ts) / 22);
							const e = easings.suave(t);
							const u = 1 - e;
							const mx = (q.de[0] + q.para[0]) / 2;
							const my = (q.de[1] + q.para[1]) / 2 + q.arco;
							b.pos[i * 3] = u * u * q.de[0] + 2 * u * e * mx + e * e * q.para[0];
							b.pos[i * 3 + 1] = u * u * q.de[1] + 2 * u * e * my + e * e * q.para[1];
							b.pos[i * 3 + 2] = lerp(q.de[2], q.para[2], e) + Math.sin(Math.PI * t) * 0.5;
							tmpC.copy(neon).lerp(branco, e);
							const k = 1.2 + Math.sin(Math.PI * t) * 0.6;
							b.col[i * 3] = tmpC.r * k;
							b.col[i * 3 + 1] = tmpC.g * k;
							b.col[i * 3 + 2] = tmpC.b * k;
							b.size[i] = 0.022;
							b.alpha[i] = smoothstep(q.ts - 2, q.ts + 3, frame) * 0.9;
						});
					}}
				/>
			) : null}

			{/* Logo 3D: C, letras e globo plano da marca */}
			{frame >= tempos.cEngole + 10 ? (
				<Logo3D
					opC={progress(frame, tempos.cEngole + 14, 14, easings.suave) * fadeFinal}
					opLetras={progress(frame, 1010, 16, easings.suave) * fadeFinal}
					opGloboDisco={progress(frame, 1018, 16, easings.suave) * fadeFinal}
					brilho={1 + glow * 0.4}
					branco={branco3D}
				/>
			) : null}
			<pointLight
				position={[logo.cCentro[0], logo.cCentro[1], 1.2]}
				intensity={5 * smoothstep(tempos.cEngole, 965, frame) * (1 - branco3D)}
				distance={5}
				color={cores.neon}
			/>
		</group>
	);
};

/** f) Crossfade do 3D para a logo oficial (arquivo SVG em public/). */
export const Scene4Overlay: React.FC = () => {
	const frame = useCurrentFrame() + cenas.apice.from;
	const [a, b] = tempos.crossfadeLogo;
	return <LogoOficial opacity={progress(frame, a, b - a, easings.suave)} />;
};
