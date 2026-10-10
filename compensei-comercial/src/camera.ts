import {Easing} from 'remotion';
import {Key, Vec3, track} from './lib/anim';
import {Palco, toWorld} from './lib/stage';
import {easings, logoFinal} from './theme';
import {logoMundo} from './lib/logoLayout';

/**
 * Roteiro de camera do comercial inteiro. Cada chave define posicao, alvo e
 * ponto de foco (profundidade de campo) em coordenadas locais de um palco.
 * O easing de cada chave vale para o trecho que termina nela.
 */
type CamKey = {
	frame: number;
	palco: Palco;
	pos: Vec3;
	alvo: Vec3;
	foco: Vec3;
	easing?: (t: number) => number;
};

const orbita = (angulo: number, raio: number, y: number, centro: Vec3): Vec3 => [
	centro[0] + Math.sin(angulo) * raio,
	centro[1] + y,
	centro[2] + Math.cos(angulo) * raio,
];

const CENTRO_SELOS: Vec3 = [0, 0.15, -0.4];

// Centro do "C" da logo (medido no arquivo da logo, viewBox 4096x808)
const C_LOGO = logoMundo(4096, 808).svgParaMundo(336, 396);
const C_CENTRO: Vec3 = [C_LOGO[0], C_LOGO[1], 0];
const linear = (t: number) => t;

const chaves: CamKey[] = [
	// Cena 1: dolly lento atravessando os dados
	{frame: 0, palco: 'A', pos: [1.8, 1.0, 32], alvo: [0.5, 0.35, -6], foco: [0, 0, 16]},
	{
		frame: 120,
		palco: 'A',
		pos: [0.75, 0.5, 19.5],
		alvo: [0.15, 0.12, -2],
		foco: [0, 0, 0],
		easing: Easing.bezier(0.35, 0, 0.6, 1),
	},
	{
		frame: 250,
		palco: 'A',
		pos: [-0.1, 0.18, 12.1],
		alvo: [0, 0.05, 0],
		foco: [0, 0, 0],
		easing: Easing.bezier(0.3, 0, 0.3, 1),
	},
	// Cena 2: pan rapido porem suave ate o palco B
	{
		frame: 335,
		palco: 'B',
		pos: [0.1, 0.32, 12.6],
		alvo: [0, 0.02, 0],
		foco: [0, 0, 0],
		easing: easings.panForte,
	},
	{frame: 432, palco: 'B', pos: [0.3, 0.36, 11.7], alvo: [0, 0.04, 0], foco: [0, 0, 0], easing: linear},
	// Cena 3: recua e orbita devagar; o alvo acompanha a chegada dos selos
	{
		frame: 492,
		palco: 'B',
		pos: orbita(-0.3, 13.2, 0.9, [-2.2, 0.15, -0.4]),
		alvo: [-2.2, 0.15, -0.4],
		foco: [-2.6, 0, 0],
		easing: easings.camera,
	},
	{frame: 560, palco: 'B', pos: orbita(-0.18, 13.1, 0.8, [-1.2, 0.15, -0.4]), alvo: [-1.2, 0.15, -0.4], foco: [-1.4, 0, 0], easing: linear},
	{frame: 650, palco: 'B', pos: orbita(-0.02, 13.2, 0.7, CENTRO_SELOS), alvo: CENTRO_SELOS, foco: [0, 0, 0], easing: easings.suave},
	{frame: 720, palco: 'B', pos: orbita(0.12, 13.4, 0.6, CENTRO_SELOS), alvo: CENTRO_SELOS, foco: [0, 0, 0], easing: linear},
	// Cena 4: enquadra as tres palavras
	{
		frame: 800,
		palco: 'B',
		pos: [0, 0.1, 14.5],
		alvo: [0, 0, 0],
		foco: [0, 0, 0],
		easing: Easing.bezier(0.4, 0, 0.2, 1),
	},
	{frame: 872, palco: 'B', pos: [0, -0.15, 13.6], alvo: [0, -0.1, 0], foco: [0, 0, 0], easing: linear},
	// a) zoom dramatico em COMPENSAR
	{
		frame: 915,
		palco: 'B',
		pos: [0, -1.3, 8.9],
		alvo: [0, -1.3, 0],
		foco: [0, -1.3, 0],
		easing: Easing.bezier(0.7, 0, 0.2, 1),
	},
	{frame: 942, palco: 'B', pos: [-0.9, -1.05, 8.3], alvo: [-1.05, -1.0, 0], foco: [-1.2, -1.0, 0], easing: linear},
	// c-d) acompanha o C de perto enquanto ele engole as letras e forma o globo
	{
		frame: 976,
		palco: 'B',
		pos: [C_CENTRO[0] + 0.25, C_CENTRO[1] + 0.05, 4.1],
		alvo: C_CENTRO,
		foco: C_CENTRO,
		easing: Easing.bezier(0.45, 0, 0.2, 1),
	},
	{frame: 1000, palco: 'B', pos: [C_CENTRO[0] + 0.1, C_CENTRO[1], 3.8], alvo: C_CENTRO, foco: C_CENTRO, easing: linear},
	// e) recua para o enquadramento exato da logo enquanto "ompensei" se forma
	{
		frame: 1032,
		palco: 'B',
		pos: [0, 0, logoFinal.cameraZ],
		alvo: [0, 0, 0],
		foco: [0, 0, 0],
		easing: Easing.bezier(0.6, 0, 0.25, 1),
	},
	{frame: 1200, palco: 'B', pos: [0, 0, logoFinal.cameraZ], alvo: [0, 0, 0], foco: [0, 0, 0]},
];

const toKeys = (sel: (k: CamKey) => Vec3): Key<Vec3>[] =>
	chaves.map((k) => ({frame: k.frame, value: toWorld(k.palco, sel(k)), easing: k.easing}));

const posKeys = toKeys((k) => k.pos);
const alvoKeys = toKeys((k) => k.alvo);
const focoKeys = toKeys((k) => k.foco);

/** Intensidade do bokeh ao longo do filme. */
const bokehKeys: Key<number>[] = [
	{frame: 0, value: 3.2},
	{frame: 240, value: 2.6},
	{frame: 295, value: 4.5},
	{frame: 340, value: 4},
	{frame: 440, value: 3.6},
	{frame: 470, value: 2.2},
	{frame: 760, value: 2.4},
	{frame: 872, value: 2.0},
	{frame: 915, value: 5.5},
	{frame: 976, value: 3},
	{frame: 1000, value: 2.2},
	{frame: 1030, value: 0},
];

export const cameraNoFrame = (frame: number) => ({
	pos: track(frame, posKeys),
	alvo: track(frame, alvoKeys),
	foco: track(frame, focoKeys),
	bokeh: track(frame, bokehKeys),
	fov: logoFinal.fov,
});
