import {Euler, Matrix4, Quaternion, Vector3} from 'three';
import type {Vec3} from './anim';

/**
 * O mundo tem dois "palcos":
 *  - A: cena 1 (origem do mundo), onde ficam os dados frios
 *  - B: cenas 2 a 5, deslocado e girado para que o pan da cena 2 viaje pelo espaco
 * Tudo que pertence a um palco e posicionado em coordenadas locais dele.
 */
export const palcos = {
	A: {position: [0, 0, 0] as Vec3, rotationY: 0},
	B: {position: [9, 0.4, -6] as Vec3, rotationY: -0.35},
} as const;

export type Palco = keyof typeof palcos;

export const palcoMatrix = (p: Palco) =>
	new Matrix4().compose(
		new Vector3(...palcos[p].position),
		new Quaternion().setFromEuler(new Euler(0, palcos[p].rotationY, 0)),
		new Vector3(1, 1, 1),
	);

const matrices = {A: palcoMatrix('A'), B: palcoMatrix('B')};
const tmp = new Vector3();

export const toWorld = (p: Palco, local: Vec3): Vec3 => {
	tmp.set(...local).applyMatrix4(matrices[p]);
	return [tmp.x, tmp.y, tmp.z];
};
