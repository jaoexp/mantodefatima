import React from 'react';
import {AbsoluteFill, Audio, getStaticFiles, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {NoToneMapping} from 'three';
import {AssetsProvider} from './lib/assets';
import {Ambiente} from './components/Ambiente';
import {CameraRig} from './components/CameraRig';
import {PosProducao} from './components/PosProducao';
import {DataHologram} from './components/DataHologram';
import {Folhas} from './components/Folhas';
import {FluxoParticulas, ParticleField} from './components/ParticleField';
import {Scene1Realidade} from './scenes/Scene1Realidade';
import {Scene2Explicacao} from './scenes/Scene2Explicacao';
import {Scene3Evidencia} from './scenes/Scene3Evidencia';
import {Scene4Apice} from './scenes/Scene4Apice';
import {Scene5Acao} from './scenes/Scene5Acao';
import {Overlays} from './scenes/Overlays';
import {cameraNoFrame} from './camera';
import {progress, window4} from './lib/anim';
import {arquivos, cenas, cores, easings} from './theme';

const cena = (c: {from: number; duration: number; sobra: number}) => ({
	from: c.from,
	durationInFrames: c.duration + c.sobra,
});

/** Tudo que vive dentro do canvas WebGL. */
const Mundo: React.FC = () => {
	const frame = useCurrentFrame();
	const cam = cameraNoFrame(frame);
	// Bloom um pouco mais presente na revelacao da marca
	const bloom = 0.55 + window4(frame, 900, 950, 1000, 1040) * 0.5;
	return (
		<>
			<CameraRig frame={frame} />
			<Ambiente frame={frame} />

			{/* Camadas continuas que atravessam varias cenas */}
			<ParticleField
				frame={frame}
				count={1500}
				seed="ar"
				min={[-17, -8, -32]}
				max={[23, 8, 34]}
				deriva={[0.004, 0.0025, 0.003]}
				tamanho={[0.018, 0.075]}
				corFria={cores.frio}
				corQuente={cores.quente}
				corVerde={cores.neon}
				calor={progress(frame, 250, 140, easings.suave)}
				opacity={0.85}
			/>
			<Sequence layout="none" from={0} durationInFrames={400}>
				<FluxoParticulas
					frame={frame}
					seed="fluxo"
					fluxos={7}
					porFluxo={260}
					opacity={progress(frame, 0, 40) * (1 - progress(frame, 250, 90, easings.suave))}
					cor={cores.frio}
					corDestaque={cores.neon}
				/>
			</Sequence>
			<Sequence layout="none" from={0} durationInFrames={780}>
				<DataHologram />
			</Sequence>
			<Sequence layout="none" from={0} durationInFrames={780}>
				<Folhas />
			</Sequence>
			<Sequence layout="none" {...cena(cenas.realidade)}>
				<Scene1Realidade />
			</Sequence>
			<Sequence layout="none" {...cena(cenas.explicacao)}>
				<Scene2Explicacao />
			</Sequence>
			<Sequence layout="none" {...cena(cenas.evidencia)}>
				<Scene3Evidencia />
			</Sequence>
			<Sequence layout="none" {...cena(cenas.apice)}>
				<Scene4Apice />
			</Sequence>
			<Sequence layout="none" {...cena(cenas.acao)}>
				<Scene5Acao />
			</Sequence>
			<PosProducao frame={frame} foco={cam.foco} bokeh={cam.bokeh} bloom={bloom} />
		</>
	);
};

/** Trilha opcional: so toca se public/audio/trilha.mp3 existir. */
const Trilha: React.FC = () => {
	const existe = getStaticFiles().some((f) => f.name === arquivos.trilha);
	if (!existe) return null;
	return <Audio src={staticFile(arquivos.trilha)} />;
};

export const CompenseiComercial: React.FC = () => {
	const {width, height} = useVideoConfig();
	return (
		<AbsoluteFill style={{backgroundColor: cores.fundo0}}>
			<AssetsProvider>
				<ThreeCanvas
					width={width}
					height={height}
					dpr={1}
					gl={{antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance', toneMapping: NoToneMapping}}
					camera={{fov: 30, near: 0.1, far: 260, position: [0, 0, 30]}}
				>
					<Mundo />
				</ThreeCanvas>
				<Overlays />
			</AssetsProvider>
			<Trilha />
		</AbsoluteFill>
	);
};
