import React from 'react';
import {random, useCurrentFrame} from 'remotion';
import {Selo3D} from '../components/Selo3D';
import {LuzVolumetrica} from '../components/LuzVolumetrica';
import {SoftPoints} from '../components/SoftPoints';
import {progress, window4} from '../lib/anim';
import {seloPose} from '../lib/selos';
import {palcos} from '../lib/stage';
import {cenas, easings, tempos, textos} from '../theme';

/**
 * CENA 3 | EVIDENCIA (450-750)
 * O ambiente se abre; os quatro selos entram um a um com spring, giram de
 * leve para revelar os reflexos e formam um arco. A camera orbita devagar.
 * O texto de apoio e um overlay 2D (Overlays.tsx).
 */
export const Scene3Evidencia: React.FC = () => {
	const frame = useCurrentFrame() + cenas.evidencia.from;
	const luz = window4(frame, tempos.clareia[0], tempos.clareia[1] + 20, 740, 800);

	return (
		<group position={palcos.B.position} rotation={[0, palcos.B.rotationY, 0]}>
			{textos.selos.map((label, i) => {
				const pose = seloPose(i, frame);
				if (!pose.visivel) return null;
				return (
					<group key={label} position={pose.pos} rotation={pose.rot} scale={pose.escala}>
						<Selo3D label={label} neon={progress(frame, tempos.selos[i] + 15, 30, easings.suave)} />
					</group>
				);
			})}

			{/* Feixes de luz volumetrica vindos de cima */}
			<LuzVolumetrica position={[-3.2, 7.5, -3.5]} rotation={[0, 0, -0.22]} height={11} radiusTop={0.3} radiusBottom={3.2} color="#D9FFE8" intensity={0.075 * luz} />
			<LuzVolumetrica position={[2.4, 8, -4.5]} rotation={[0, 0, 0.18]} height={12} radiusTop={0.25} radiusBottom={2.6} color="#E8FFF0" intensity={0.06 * luz} />
			<LuzVolumetrica position={[6.5, 7.5, -6]} rotation={[0, 0, 0.3]} height={11} radiusTop={0.2} radiusBottom={2.2} color="#C8F5D8" intensity={0.045 * luz} />
			<pointLight position={[0, 3.5, 3.5]} intensity={18 * luz} distance={14} decay={2} color="#F3FFF8" />

			{/* Poeira iluminada nos feixes */}
			<SoftPoints
				count={260}
				opacity={luz}
				update={(b) => {
					for (let i = 0; i < 260; i++) {
						const r = (k: string) => random(`poeira3-${i}-${k}`);
						const h = (((r('h') - frame * (0.0008 + r('v') * 0.001)) % 1) + 1) % 1;
						b.pos[i * 3] = (r('x') - 0.5) * 16 + Math.sin(frame * 0.01 + r('p') * 6) * 0.3;
						b.pos[i * 3 + 1] = 6 - h * 11;
						b.pos[i * 3 + 2] = -7 + r('z') * 9;
						b.col.set([0.92, 1, 0.94], i * 3);
						b.size[i] = 0.015 + r('s') * 0.025;
						b.alpha[i] = Math.sin(Math.PI * h) * 0.7;
					}
				}}
			/>
		</group>
	);
};
