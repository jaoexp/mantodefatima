import React from 'react';
import {useThree} from '@react-three/fiber';
import {Environment, Lightformer} from '@react-three/drei';
import {Color, FogExp2} from 'three';
import {Backdrop} from './Backdrop';
import {lerp, mixHex, progress, window4} from '../lib/anim';
import {cores, easings, tempos} from '../theme';

const fog = new FogExp2(cores.fundo0, 0.018);
const fogColor = new Color();

/**
 * Fundo, nevoa, luzes e o ambiente de estudio (reflexos). Tudo derivado do
 * frame absoluto. A cena 3 abre o ambiente; as cenas 4 e 5 voltam ao escuro.
 */
export const Ambiente: React.FC<{frame: number}> = ({frame}) => {
	const scene = useThree((s) => s.scene);
	const {width, height} = useThree((s) => s.size);

	// 0 = escuro (cenas 1, 2, 4, 5) | 1 = aberto (cena 3)
	const abertura =
		progress(frame, tempos.clareia[0], tempos.clareia[1] - tempos.clareia[0], easings.suave) *
		(1 - progress(frame, 740, 70, easings.suave));
	// Calor organico da cena 2 em diante
	const calor = progress(frame, 255, 120, easings.suave);
	// Halo central da revelacao da marca
	const haloMarca = window4(frame, 930, 1000, 1180, 1200);

	const centro = mixHex(mixHex('#0E2A20', '#123326', calor), cores.fundoAberto, abertura);
	const borda = mixHex(cores.fundo0, '#0A2419', abertura);
	const nevoa = mixHex(mixHex('#6C8F8A', '#4CC77A', calor), '#7DD9A5', abertura);

	fog.color.copy(fogColor.set(borda));
	fog.density = lerp(0.02, 0.012, abertura);
	if (scene.fog !== fog) scene.fog = fog;

	return (
		<>
			<Backdrop
				frame={frame}
				aspect={width / height}
				center={centro}
				edge={borda}
				mistColor={nevoa}
				mist={lerp(0.07, 0.12, abertura)}
				glow={lerp(0.35, 0.9, abertura) + haloMarca * 0.6}
			/>

			{/* Estudio virtual: softboxes que geram os reflexos nos metais e vidros */}
			<Environment resolution={256} frames={1} environmentIntensity={1}>
				<color attach="background" args={['#020604']} />
				<Lightformer form="rect" intensity={2.4} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
				<Lightformer form="rect" intensity={1.6} position={[-6, 1, 3]} rotation-y={Math.PI / 2} scale={[6, 2.2, 1]} />
				<Lightformer form="rect" intensity={1.2} position={[6, 0.5, 2]} rotation-y={-Math.PI / 2} scale={[6, 1.4, 1]} />
				<Lightformer form="rect" intensity={1.4} color={cores.folhaClara} position={[0, 0.5, -6]} scale={[12, 1.2, 1]} />
				<Lightformer form="ring" intensity={0.8} color={cores.neon} position={[4, 3, -4]} scale={2} />
				{/* Luz frontal (atras da camera): faixas que desenham o metal das letras */}
				<Lightformer form="rect" intensity={0.85} position={[0, 0.5, 9]} rotation-y={Math.PI} scale={[22, 7, 1]} />
				<Lightformer form="rect" intensity={2.6} position={[0, 2.6, 8.9]} rotation-y={Math.PI} scale={[22, 0.9, 1]} />
				<Lightformer form="rect" intensity={0.6} position={[0, -5, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} color="#1c3a2c" />
			</Environment>

			<ambientLight intensity={0.12 + abertura * 0.15} color="#cfe9dc" />
			{/* Luz principal de cima, levemente fria */}
			<directionalLight position={[3, 8, 6]} intensity={1.1 + abertura * 0.6} color="#f3fbf7" />
			{/* Rim lights verdes por tras, separando os objetos do fundo */}
			<directionalLight position={[-6, 2, -8]} intensity={1.6} color={cores.folhaClara} />
			<directionalLight position={[7, 3, -6]} intensity={1.2} color={cores.neon} />
		</>
	);
};
