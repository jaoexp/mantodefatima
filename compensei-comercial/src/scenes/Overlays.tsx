import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame} from 'remotion';
import {fontFamily} from '../fonts';
import {lerp, progress, window4} from '../lib/anim';
import {cenas, easings, tempos, textos, tipografia} from '../theme';
import {Scene4Overlay} from './Scene4Apice';
import {Scene5Overlay} from './Scene5Acao';

/** Texto de apoio da cena 3 (2D, para maxima nitidez). */
const Scene3Overlay: React.FC = () => {
	const frame = useCurrentFrame() + cenas.evidencia.from;
	const entra = progress(frame, tempos.textoJornada, 28, easings.entrada);
	const op = window4(frame, tempos.textoJornada, tempos.textoJornada + 24, 738, 756);
	return (
		<div
			style={{
				position: 'absolute',
				left: 0,
				right: 0,
				top: 892,
				textAlign: 'center',
				fontFamily,
				fontWeight: tipografia.pesoApoio,
				fontSize: 40,
				letterSpacing: tipografia.trackingApoio,
				color: '#FFFFFF',
				opacity: op,
				transform: `translateY(${lerp(16, 0, entra)}px)`,
				textShadow: '0 2px 24px rgba(0,0,0,0.35)',
			}}
		>
			{textos.cena3Apoio}
		</div>
	);
};

/** Fade para o preto nos ultimos frames. */
const FadeFinal: React.FC = () => {
	const frame = useCurrentFrame();
	const [a, b] = tempos.fadeOut;
	const op = progress(frame, a, b - a, easings.suave);
	if (op <= 0) return null;
	return <AbsoluteFill style={{backgroundColor: '#000', opacity: op}} />;
};

/** Camada 2D sobre o canvas 3D. */
export const Overlays: React.FC = () => (
	<AbsoluteFill style={{pointerEvents: 'none'}}>
		<Sequence from={cenas.evidencia.from} durationInFrames={cenas.evidencia.duration + 10}>
			<Scene3Overlay />
		</Sequence>
		<Sequence from={cenas.apice.from} durationInFrames={cenas.apice.duration}>
			<Scene4Overlay />
		</Sequence>
		<Sequence from={cenas.acao.from} durationInFrames={cenas.acao.duration}>
			<Scene5Overlay />
		</Sequence>
		<FadeFinal />
	</AbsoluteFill>
);
