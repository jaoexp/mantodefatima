import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {SoftPoints} from '../components/SoftPoints';
import {LogoOficial} from '../components/LogoCompensei';
import {fontFamily} from '../fonts';
import {lerp, progress, window4} from '../lib/anim';
import {palcos} from '../lib/stage';
import {cenas, cores, easings, logoFinal, tempos, textos, tipografia} from '../theme';

/** Respiracao da logo: escala entre 1.00 e 1.015 (ciclo de 2,4 s). */
const respiro = (frame: number) => 0.5 - 0.5 * Math.cos(((frame - cenas.acao.from) / 72) * Math.PI * 2);

/**
 * CENA 5 | ACAO (1050-1200) - parte 3D: particulas finas subindo
 * devagar atras da logo, mantendo o fundo vivo.
 */
export const Scene5Acao: React.FC = () => {
	const frame = useCurrentFrame() + cenas.acao.from;
	const entra = progress(frame, cenas.acao.from - 20, 40, easings.suave);
	return (
		<group position={palcos.B.position} rotation={[0, palcos.B.rotationY, 0]}>
			<SoftPoints
				count={160}
				opacity={entra}
				update={(b) => {
					for (let i = 0; i < 160; i++) {
						const r = (k: string) => random(`cta-${i}-${k}`);
						const h = (((r('h') + frame * (0.0012 + r('v') * 0.0015)) % 1) + 1) % 1;
						b.pos[i * 3] = (r('x') - 0.5) * 9;
						b.pos[i * 3 + 1] = -3 + h * 6;
						b.pos[i * 3 + 2] = -1.5 - r('z') * 4;
						b.col.set([0.55, 1.0, 0.72], i * 3);
						b.size[i] = 0.012 + r('s') * 0.02;
						b.alpha[i] = Math.sin(Math.PI * h) * 0.6;
					}
				}}
			/>
		</group>
	);
};

/** CENA 5 - parte 2D: logo oficial respirando, halo verde e call to action. */
export const Scene5Overlay: React.FC = () => {
	const frame = useCurrentFrame() + cenas.acao.from;
	const r = respiro(frame);
	const cta = progress(frame, tempos.cta, 26, easings.entrada);
	const [f0, f1] = tempos.fadeOut;
	const halo = window4(frame, cenas.acao.from - 10, cenas.acao.from + 25, f0, f1);
	return (
		<AbsoluteFill>
			{/* Halo de luz verde pulsando atras da logo */}
			<div
				style={{
					position: 'absolute',
					left: logoFinal.centroX - 700,
					top: logoFinal.centroY - 300,
					width: 1400,
					height: 600,
					borderRadius: '50%',
					background: `radial-gradient(closest-side, ${cores.folhaClara}55, ${cores.folha}22 45%, transparent 100%)`,
					opacity: halo * lerp(0.55, 0.9, r),
					filter: 'blur(30px)',
				}}
			/>
			<LogoOficial opacity={1} escala={1 + 0.015 * r} />
			<div
				style={{
					position: 'absolute',
					left: 0,
					right: 0,
					top: 655,
					textAlign: 'center',
					fontFamily,
					fontWeight: tipografia.pesoApoio,
					fontSize: 38,
					letterSpacing: tipografia.trackingApoio,
					color: 'rgba(255,255,255,0.92)',
					opacity: cta,
					transform: `translateY(${lerp(18, 0, cta)}px)`,
				}}
			>
				{textos.cta}
			</div>
		</AbsoluteFill>
	);
};
