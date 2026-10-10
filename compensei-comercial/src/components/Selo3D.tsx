import React, {useMemo} from 'react';
import {Color, ExtrudeGeometry, Shape, Vector2} from 'three';
import {SELO_KEYS, SeloKey, useAssets} from '../lib/assets';
import {mapShapes} from '../lib/shapes';
import {SELO_VB, seloEscala} from '../lib/selos';
import {cores} from '../theme';

/** "Empresa Carbono Neutro" -> "empresa" */
const chaveDoRotulo = (label: string): SeloKey => {
	const k = label
		.split(' ')[0]
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '') as SeloKey;
	if (!SELO_KEYS.includes(k)) throw new Error(`Selo desconhecido: ${label}`);
	return k;
};

/** Centro e raio do emblema circular (C + globo) no arquivo do selo, em px. */
const EMBLEMA = {x: 359, y: 813, r: 211};

const PROF_VIDRO = 0.14;
const PROF_PLACA = 0.05;

/**
 * Selo 3D da marca, compartilhado pelos quatro selos:
 *  - corpo de vidro fosco (transmission) um pouco maior que a arte
 *  - placa frontal com a arte oficial, tipografia em relevo (bump) e verniz
 *    acrilico (clearcoat); lateral em metal escovado (anisotropia)
 *  - anel neon verde muito sutil em volta do emblema
 */
export const Selo3D: React.FC<{label: string; neon?: number}> = ({label, neon = 1}) => {
	const {seloShapes, seloTex, seloRelevo} = useAssets();
	const chave = chaveDoRotulo(label);

	const {vidro, placa} = useMemo(() => {
		const shapes: Shape[] = mapShapes(seloShapes, (x, y) => [
			(x - SELO_VB.w / 2) * seloEscala,
			(SELO_VB.h / 2 - y) * seloEscala,
		]);
		const largura = SELO_VB.w * seloEscala;
		const altura = SELO_VB.h * seloEscala;
		const vidroGeo = new ExtrudeGeometry(shapes, {
			depth: PROF_VIDRO,
			bevelEnabled: true,
			bevelThickness: 0.05,
			bevelSize: 0.055,
			bevelSegments: 6,
			curveSegments: 4,
		});
		vidroGeo.translate(0, 0, -PROF_VIDRO - 0.07);
		// UV das tampas = posicao no arquivo do selo
		const uv = {
			generateTopUV: (_g: ExtrudeGeometry, v: number[], a: number, b: number, c: number) =>
				[a, b, c].map((k) => new Vector2(v[k * 3] / largura + 0.5, v[k * 3 + 1] / altura + 0.5)),
			// Laterais: mesmo criterio do gerador padrao do three (para o metal escovado)
			generateSideWallUV: (
				_g: ExtrudeGeometry,
				v: number[],
				a: number,
				b: number,
				c: number,
				d: number,
			) => {
				const p = (k: number) => [v[k * 3], v[k * 3 + 1], v[k * 3 + 2]];
				const [A, B, C, D] = [p(a), p(b), p(c), p(d)];
				const eixo = Math.abs(A[1] - B[1]) < Math.abs(A[0] - B[0]) ? 0 : 1;
				return [A, B, C, D].map((q) => new Vector2(q[eixo] * 4, (1 - q[2]) * 4));
			},
		};
		const placaGeo = new ExtrudeGeometry(shapes, {
			depth: PROF_PLACA,
			bevelEnabled: true,
			bevelThickness: 0.012,
			bevelSize: 0.01,
			bevelSegments: 3,
			curveSegments: 4,
			UVGenerator: uv as never,
		});
		return {vidro: vidroGeo, placa: placaGeo};
	}, [seloShapes]);

	const neonCor = useMemo(() => new Color(cores.neon).multiplyScalar(1.8), []);
	const emblemaPos: [number, number, number] = [
		(EMBLEMA.x - SELO_VB.w / 2) * seloEscala,
		(SELO_VB.h / 2 - EMBLEMA.y) * seloEscala,
		PROF_PLACA + 0.03,
	];

	return (
		<group>
			{/* Corpo em vidro fosco */}
			<mesh geometry={vidro}>
				<meshPhysicalMaterial
					color="#BFE9CF"
					transmission={1}
					roughness={0.32}
					thickness={0.55}
					ior={1.45}
					attenuationColor={cores.folha}
					attenuationDistance={1.1}
					clearcoat={1}
					clearcoatRoughness={0.18}
					envMapIntensity={1.3}
					specularIntensity={1}
				/>
			</mesh>
			{/* Placa com a arte oficial; lateral em metal escovado */}
			<mesh geometry={placa}>
				<meshPhysicalMaterial
					attach="material-0"
					map={seloTex[chave]}
					bumpMap={seloRelevo[chave]}
					bumpScale={2.2}
					roughness={0.42}
					metalness={0.04}
					clearcoat={1}
					clearcoatRoughness={0.07}
					envMapIntensity={0.85}
				/>
				<meshPhysicalMaterial
					attach="material-1"
					color={cores.metal}
					metalness={1}
					roughness={0.3}
					anisotropy={0.8}
					envMapIntensity={1.5}
				/>
			</mesh>
			{/* Anel neon muito sutil em volta do emblema */}
			<mesh position={emblemaPos}>
				<torusGeometry args={[EMBLEMA.r * seloEscala * 1.02, 0.0055, 12, 160]} />
				<meshBasicMaterial color={neonCor} transparent opacity={0.55 * neon} toneMapped={false} />
			</mesh>
		</group>
	);
};
