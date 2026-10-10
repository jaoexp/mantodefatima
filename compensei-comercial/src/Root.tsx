import React from 'react';
import {Composition} from 'remotion';
import {CompenseiComercial} from './CompenseiComercial';
import {ALTURA, DURACAO, FPS, LARGURA} from './theme';
import './fonts';

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="CompenseiComercial"
				component={CompenseiComercial}
				durationInFrames={DURACAO}
				fps={FPS}
				width={LARGURA}
				height={ALTURA}
			/>
			{/*
			 * CompenseiComercialVertical (1080x1920) entra depois da aprovacao da
			 * versao horizontal, com camera e tipografia reenquadradas.
			 */}
		</>
	);
};
