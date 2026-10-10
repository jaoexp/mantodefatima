import React, {useMemo} from 'react';
import {random, useCurrentFrame} from 'remotion';
import {Color} from 'three';
import {Texto3D} from '../components/Texto3D';
import {SoftPoints} from '../components/SoftPoints';
import {useAssets} from '../lib/assets';
import {clamp01, lerp, mixHex, progress, smoothstep} from '../lib/anim';
import {sampleText} from '../lib/shapes';
import {toWorld} from '../lib/stage';
import {cenas, cores, easings, tempos, textos} from '../theme';
import {TITULO1} from './Scene1Realidade';

export const TITULO2 = {size: 0.5, spacing: 0.02, y: -0.14};
const PARTICULAS = 4200;

const cFria = new Color();
const cQuente = new Color();
const cVerde = new Color();
const cTmp = new Color();

/**
 * CENA 2 | EXPLICACAO E CAMINHO (240-450)
 * O titulo da cena 1 se dissolve em particulas que viajam (junto com o pan da
 * camera) e se reorganizam em "Entender para reduzir.". Os dados viram
 * nervuras de folhas nas camadas continuas (DataHologram + Folhas).
 */
export const Scene2Explicacao: React.FC = () => {
	// Frames absolutos facilitam o encadeamento com a cena 1
	const frame = useCurrentFrame() + cenas.explicacao.from;
	const {fontBold, fontBoldJson} = useAssets();

	const morph = useMemo(() => {
		const a = sampleText(fontBold, textos.cena1, TITULO1.size, PARTICULAS, 'titulo1', TITULO1.spacing);
		const b = sampleText(fontBold, textos.cena2, TITULO2.size, PARTICULAS, 'titulo2', TITULO2.spacing);
		const dA = TITULO1.size * 0.12;
		const dB = TITULO2.size * 0.12;
		return Array.from({length: PARTICULAS}, (_, i) => {
			const p0 = toWorld('A', [a.xy[i * 2], a.xy[i * 2 + 1] + TITULO1.y, dA * (0.4 + random(`pz${i}`) * 0.7)]);
			const p3 = toWorld('B', [b.xy[i * 2], b.xy[i * 2 + 1] + TITULO2.y, dB * (0.4 + random(`qz${i}`) * 0.7)]);
			const r = (k: string) => random(`m2-${i}-${k}`);
			const p1: [number, number, number] = [
				p0[0] + (r('a') - 0.5) * 2.5,
				p0[1] + (r('b') - 0.3) * 2.2,
				p0[2] + 0.5 + r('c') * 4,
			];
			const p2: [number, number, number] = [
				p3[0] + (r('d') - 0.5) * 3,
				p3[1] + (r('e') - 0.5) * 2.4,
				p3[2] + 0.5 + r('f') * 4,
			];
			// Letras da esquerda partem primeiro
			const ordem = (a.xy[i * 2] / a.width + 0.5) * 16 + r('o') * 6;
			return {p0, p1, p2, p3, ordem, dur: 74 + r('t') * 14, tam: 0.016 + r('s') * 0.02, fase: r('p') * 6.28};
		});
	}, [fontBold]);

	const iReduzir = textos.cena2.indexOf(textos.cena2Destaque);
	const destaque = progress(frame, tempos.reduzirDestaque, 30, easings.suave);
	const saida = progress(frame, 428, 24, easings.saida);

	cFria.set(cores.frio);
	cQuente.set(cores.quente);
	cVerde.set(cores.neon);

	return (
		<>
			<SoftPoints
				count={PARTICULAS}
				opacity={1 - progress(frame, 342, 26, easings.suave)}
				update={(b) => {
					morph.forEach((q, i) => {
						const inicio = tempos.dissolveTitulo + q.ordem;
						const tl = clamp01((frame - inicio) / q.dur);
						const t = easings.suave(tl);
						const u = 1 - t;
						// Bezier cubica p0 -> p3
						for (let k = 0; k < 3; k++) {
							b.pos[i * 3 + k] =
								u * u * u * q.p0[k] +
								3 * u * u * t * q.p1[k] +
								3 * u * t * t * q.p2[k] +
								t * t * t * q.p3[k];
						}
						// Turbulencia suave so durante a viagem
						const voo = Math.sin(Math.PI * tl);
						b.pos[i * 3] += Math.sin(frame * 0.09 + q.fase) * 0.18 * voo;
						b.pos[i * 3 + 1] += Math.cos(frame * 0.07 + q.fase * 1.3) * 0.18 * voo;
						// Cor: fria -> calor pontual -> verde-folha
						const quente = 0.3 * smoothstep(0.15, 0.45, tl) * (1 - smoothstep(0.5, 0.85, tl));
						cTmp.copy(cFria).lerp(cQuente, quente).lerp(cVerde, smoothstep(0.55, 1, tl));
						const k = 1 + voo * 0.3;
						b.col[i * 3] = cTmp.r * k;
						b.col[i * 3 + 1] = cTmp.g * k;
						b.col[i * 3 + 2] = cTmp.b * k;
						b.size[i] = q.tam * (1 - voo * 0.25);
						b.alpha[i] = smoothstep(inicio - 4, inicio + 6, frame) * (0.9 - voo * 0.35);
					});
				}}
			/>

			{saida < 1 ? (
				<group
					position={toWorld('B', [0, TITULO2.y, 0])}
					rotation={[0, -0.35, 0]}
				>
					<Texto3D
						text={textos.cena2}
						font={fontBold}
						fontJson={fontBoldJson}
						size={TITULO2.size}
						letterSpacing={TITULO2.spacing}
						estilo={(i, g) => {
							const ordem = (g.cx / 9) * 14;
							const t = progress(frame, tempos.formaTitulo2 + ordem, 22, easings.entrada);
							const ehReduzir = i >= iReduzir && i < iReduzir + textos.cena2Destaque.length;
							const sai = progress(frame, 428 + ordem * 0.6, 20, easings.saida);
							return {
								offset: [0, lerp(0, 0.35, sai), lerp(0.25, 0, t)],
								scale: lerp(0.94, 1, t),
								opacity: t * (1 - sai),
								color: ehReduzir ? mixHex(cores.metal, cores.folhaClara, destaque) : cores.metal,
								metalness: ehReduzir ? lerp(0.9, 0.45, destaque) : undefined,
								roughness: ehReduzir ? lerp(0.24, 0.28, destaque) : undefined,
								emissive: ehReduzir ? cores.neon : '#000000',
								emissiveIntensity: ehReduzir ? destaque * 0.62 : 0,
							};
						}}
					/>
				</group>
			) : null}
		</>
	);
};
