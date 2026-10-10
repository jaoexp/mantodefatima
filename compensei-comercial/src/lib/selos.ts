import {spring} from 'remotion';
import {lerp, progress, Vec3} from './anim';
import {easings, FPS, springs, tempos} from '../theme';

/** Altura do selo em unidades do mundo e proporcao do arquivo (720x1024). */
export const SELO_ALTURA = 2.55;
export const SELO_VB = {w: 720, h: 1024};
export const seloEscala = SELO_ALTURA / SELO_VB.h;

/** Arranjo final em arco (coordenadas locais do palco B). */
const ARCO: {pos: Vec3; ry: number}[] = [
	{pos: [-4.2, 0.15, -0.95], ry: 0.2},
	{pos: [-1.4, 0.15, -0.15], ry: 0.07},
	{pos: [1.4, 0.15, -0.15], ry: -0.07},
	{pos: [4.2, 0.15, -0.95], ry: -0.2},
];

export type SeloPose = {pos: Vec3; rot: Vec3; escala: number; visivel: boolean};

/**
 * Pose de cada selo em um frame absoluto: entrada com spring (de baixo e de
 * tras), leve balanco para revelar reflexos, e recuo em profundidade na cena 4.
 */
export const seloPose = (i: number, frame: number): SeloPose => {
	const inicio = tempos.selos[i];
	const s = spring({frame: frame - inicio, fps: FPS, config: springs.selo});
	const alvo = ARCO[i];
	const local = frame - inicio;
	// Balanco continuo e sutil (revela os reflexos do vidro e do metal)
	const balanco = 0.11 * Math.sin(local * 0.035 + i * 1.7) * Math.min(1, s * 1.2);
	// Cena 4: recuam em profundidade e se desfazem
	const recuo = progress(frame, tempos.selosRecuam, 50, easings.saida);
	const pos: Vec3 = [
		lerp(alvo.pos[0] * 1.15, alvo.pos[0], s) * lerp(1, 0.55, recuo),
		lerp(alvo.pos[1] - 4.2, alvo.pos[1], s) + recuo * 0.4,
		lerp(alvo.pos[2] - 2.5, alvo.pos[2], s) - recuo * 7,
	];
	const rot: Vec3 = [lerp(0.35, 0, s), alvo.ry + lerp(-1.25, 0, s) + balanco + recuo * 0.9, 0];
	const escala = lerp(0.9, 1, s) * (1 - progress(frame, tempos.selosRecuam + 18, 30, easings.saida));
	return {pos, rot, escala, visivel: frame >= inicio - 1 && escala > 0.001};
};
