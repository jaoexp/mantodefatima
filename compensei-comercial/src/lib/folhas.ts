import {Euler, Matrix4, Quaternion, Vector3} from 'three';
import type {Vec3} from './anim';
import {palcoMatrix} from './stage';

/**
 * Modelo procedural de folha (base na origem, ponta em (0, L)).
 * As mesmas curvas geram as nervuras 3D (destino do morph dos dados) e a
 * textura da lamina, para que nervuras e lamina coincidam.
 */
export const NERVURAS_POR_FOLHA = 13;
export const PONTOS_POR_LINHA = 48;

export const meiaLargura = (t: number) =>
	0.36 * Math.pow(Math.max(0, Math.sin(Math.PI * t)), 0.85) * (1 - 0.3 * t);

/** Curvatura da lamina (z), compartilhada por nervuras e lamina. */
export const curvaturaLamina = (x: number, y: number) =>
	0.06 * Math.sin(Math.PI * y) - 0.25 * x * x;

export const nervuraCentral = (t: number) => 0.035 * Math.sin(Math.PI * t);

/** Pontos 2D (em unidades de L) de cada nervura da folha. */
export const nervuras2D = (): [number, number][][] => {
	const out: [number, number][][] = [];
	const n = PONTOS_POR_LINHA;
	// Nervura central
	out.push(
		Array.from({length: n}, (_, i) => {
			const t = 0.02 + (i / (n - 1)) * 0.95;
			return [nervuraCentral(t), t] as [number, number];
		}),
	);
	// Nervuras laterais: 6 de cada lado, curvas em direcao a ponta
	for (let k = 0; k < 6; k++) {
		for (const s of [-1, 1]) {
			const t0 = 0.12 + k * 0.12;
			const t1 = Math.min(0.97, t0 + 0.15);
			const p0: [number, number] = [nervuraCentral(t0), t0];
			const p2: [number, number] = [nervuraCentral(t1) + s * meiaLargura(t1) * 0.86, t1];
			const c: [number, number] = [nervuraCentral(t0) + s * meiaLargura(t0) * 0.55, t0 + 0.035];
			out.push(
				Array.from({length: n}, (_, i) => {
					const u = i / (n - 1);
					const a = (1 - u) * (1 - u);
					const b = 2 * (1 - u) * u;
					const d = u * u;
					return [a * p0[0] + b * c[0] + d * p2[0], a * p0[1] + b * c[1] + d * p2[1]] as [
						number,
						number,
					];
				}),
			);
		}
	}
	return out;
};

export type FolhaDef = {base: Vec3; rot: Vec3; L: number; sai: number};

/**
 * Folhas que emolduram o titulo da cena 2 (coordenadas locais do palco B).
 * Composicao assimetrica em profundidade: uma folha grande em primeiro plano
 * (desfocada), as demais ao fundo. `sai` = frame em que a folha comeca a sumir.
 */
export const FOLHAS: FolhaDef[] = [
	{base: [-5.4, -3.6, 3.6], rot: [-0.5, 0.55, -0.8], L: 4.6, sai: 455},
	{base: [7.6, 5.4, -6.5], rot: [0.3, -0.4, 2.55], L: 4.6, sai: 700},
	{base: [10.5, -4.8, -15], rot: [-0.25, -0.5, 0.62], L: 7.5, sai: 700},
	{base: [-9.4, 1.6, -12], rot: [0.1, 0.4, -1.1], L: 5.5, sai: 700},
	{base: [1.5, -9.5, -24], rot: [-0.4, 0.1, 0.22], L: 9.5, sai: 700},
];

/** Matriz de mundo de uma folha (palco B x transformacao da folha). */
export const folhaMatrix = (f: FolhaDef) =>
	palcoMatrix('B').multiply(
		new Matrix4().compose(
			new Vector3(...f.base),
			new Quaternion().setFromEuler(new Euler(...f.rot)),
			new Vector3(f.L, f.L, f.L),
		),
	);

/** Todas as nervuras de todas as folhas, ja em coordenadas de mundo. */
export const nervurasMundo = (): Float32Array[] => {
	const base = nervuras2D();
	const v = new Vector3();
	const out: Float32Array[] = [];
	for (const f of FOLHAS) {
		const m = folhaMatrix(f);
		for (const linha of base) {
			const arr = new Float32Array(linha.length * 3);
			linha.forEach(([x, y], i) => {
				// Nervuras levemente a frente da lamina
				v.set(x, y, curvaturaLamina(x, y) + 0.006).applyMatrix4(m);
				arr[i * 3] = v.x;
				arr[i * 3 + 1] = v.y;
				arr[i * 3 + 2] = v.z;
			});
			out.push(arr);
		}
	}
	return out;
};
