import React, {useMemo} from 'react';
import {random, useCurrentFrame} from 'remotion';
import {Texto3D} from '../components/Texto3D';
import {LuzVolumetrica} from '../components/LuzVolumetrica';
import {SoftPoints} from '../components/SoftPoints';
import {useAssets} from '../lib/assets';
import {lerp, mixHex, progress} from '../lib/anim';
import {layoutText} from '../lib/shapes';
import {cores, easings, tempos, textos} from '../theme';

export const TITULO1 = {size: 0.42, spacing: 0.02, y: -0.12};

/**
 * CENA 1 | REALIDADE (0-240)
 * Os dados e fluxos atravessam o espaco (camadas continuas em Mundo). Aqui:
 * o titulo em metal fosco e a luz volumetrica que destaca "Medir".
 */
export const Scene1Realidade: React.FC = () => {
	const frame = useCurrentFrame();
	const {fontBold, fontBoldJson} = useAssets();

	const {glyphs, width} = useMemo(
		() => layoutText(fontBold, textos.cena1, TITULO1.size, TITULO1.spacing),
		[fontBold],
	);
	const nDestaque = textos.cena1Destaque.length;
	const medirCentro =
		(glyphs[0].x + glyphs[nDestaque - 1].x + glyphs[nDestaque - 1].width) / 2 - width / 2;

	const destaque = progress(frame, tempos.medirDestaque, 40, easings.suave);
	// O titulo cede lugar as particulas na cena 2
	const saida = 1 - progress(frame, tempos.dissolveTitulo, 16, easings.suave);
	if (saida <= 0) return null;

	return (
		<group position={[0, TITULO1.y, 0]}>
			<Texto3D
				text={textos.cena1}
				font={fontBold}
				fontJson={fontBoldJson}
				size={TITULO1.size}
				letterSpacing={TITULO1.spacing}
				estilo={(i) => {
					const t = progress(frame, tempos.tituloEntra + i * 0.9, 34, easings.entrada);
					const ehMedir = i < nDestaque;
					const cor = ehMedir
						? mixHex(cores.metal, '#F6FBF8', destaque)
						: mixHex(cores.metal, '#A9B8B1', destaque * 0.8);
					return {
						offset: [0, lerp(-0.28, 0, t), lerp(-0.7, 0, t)],
						rotation: [lerp(0.7, 0, t), 0, 0],
						opacity: t * saida * (ehMedir ? 1 : lerp(1, 0.72, destaque)),
						color: cor,
						roughness: ehMedir ? lerp(0.24, 0.18, destaque) : 0.24,
						envMapIntensity: ehMedir ? lerp(1.7, 2.3, destaque) : lerp(1.7, 0.9, destaque),
						emissive: '#FFFFFF',
						emissiveIntensity: ehMedir ? destaque * 0.05 : 0,
					};
				}}
			/>

			{/* Luz volumetrica que atinge "Medir" de cima */}
			<LuzVolumetrica
				position={[medirCentro, 5.4, 0.15]}
				height={6}
				radiusTop={0.08}
				radiusBottom={0.95}
				color="#EAFBF1"
				intensity={0.16 * destaque * saida}
			/>
			<pointLight
				position={[medirCentro, 1.6, 0.9]}
				intensity={6 * destaque * saida}
				distance={4.5}
				decay={2}
				color="#F2FFF8"
			/>
			<PoeiraNoFeixe frame={frame} x={medirCentro} intensidade={destaque * saida} />
		</group>
	);
};

/** Poeira fina flutuando dentro do feixe de luz. */
const PoeiraNoFeixe: React.FC<{frame: number; x: number; intensidade: number}> = ({
	frame,
	x,
	intensidade,
}) => (
	<SoftPoints
		count={70}
		opacity={intensidade}
		update={(b) => {
			for (let i = 0; i < 70; i++) {
				const r = (k: string) => random(`poeira-${i}-${k}`);
				const h = (((r('h') - frame * (0.0015 + r('v') * 0.002)) % 1) + 1) % 1;
				const y = 5.4 - h * 5.6;
				const raio = (0.12 + h * 1.0) * Math.sqrt(r('r'));
				const a = r('a') * Math.PI * 2 + frame * 0.004;
				b.pos[i * 3] = x + Math.cos(a) * raio;
				b.pos[i * 3 + 1] = y;
				b.pos[i * 3 + 2] = 0.15 + Math.sin(a) * raio;
				b.col.set([0.95, 1.0, 0.96], i * 3);
				b.size[i] = 0.012 + r('s') * 0.016;
				b.alpha[i] = Math.sin(Math.PI * h) * 0.8;
			}
		}}
	/>
);
