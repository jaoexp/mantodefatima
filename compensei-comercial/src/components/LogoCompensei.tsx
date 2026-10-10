import React, {useMemo} from 'react';
import {Img, staticFile} from 'remotion';
import {Color, ExtrudeGeometry, Shape} from 'three';
import {SoftPoints} from './SoftPoints';
import {useAssets} from '../lib/assets';
import {lerp} from '../lib/anim';
import {logoMundo, logoRetanguloPx} from '../lib/logoLayout';
import {mapShapes, shapeBounds} from '../lib/shapes';
import {arquivos, cores} from '../theme';

const PROF = 0.07;

/** Geometria e medidas da logo 3D, alinhada pixel a pixel com a logo oficial. */
export const useLogoGeo = () => {
	const {logo} = useAssets();
	return useMemo(() => {
		const L = logoMundo(logo.width, logo.height);
		const toWorld = (shapes: Shape[]) => mapShapes(shapes, L.svgParaMundo, 16);
		const extrude = (shapes: Shape[]) => {
			const g = new ExtrudeGeometry(toWorld(shapes), {
				depth: PROF,
				bevelEnabled: true,
				bevelThickness: 0.012,
				bevelSize: 0.006,
				bevelSegments: 3,
				curveSegments: 6,
			});
			// Face frontal no plano z = 0 (onde a logo oficial e projetada)
			g.translate(0, 0, -PROF - 0.012);
			return g;
		};
		const cShapes = toWorld(logo.c);
		const cB = shapeBounds(cShapes);
		const gB = logo.globoBounds;
		const [gx0, gy0] = L.svgParaMundo(gB.minX, gB.minY);
		const [gx1, gy1] = L.svgParaMundo(gB.maxX, gB.maxY);
		return {
			L,
			c: extrude(logo.c),
			letras: extrude(logo.letras),
			globoDisco: extrude(logo.globo),
			letrasShapes: toWorld(logo.letras),
			cCentro: [(cB.minX + cB.maxX) / 2, (cB.minY + cB.maxY) / 2] as [number, number],
			cAltura: cB.maxY - cB.minY,
			globoCentro: [(gx0 + gx1) / 2, (gy0 + gy1) / 2] as [number, number],
			globoRaio: Math.abs(gx1 - gx0) / 2,
		};
	}, [logo]);
};

/**
 * Logo 3D: anel do C, letras "ompensei" e o globo plano da marca.
 * `branco` leva os materiais a um branco chapado, identico ao arquivo oficial,
 * para o crossfade final ser imperceptivel.
 */
export const Logo3D: React.FC<{
	opC: number;
	opLetras: number;
	opGloboDisco: number;
	brilho: number;
	branco: number;
}> = ({opC, opLetras, opGloboDisco, brilho, branco}) => {
	const geo = useLogoGeo();
	const emissivo = useMemo(() => new Color(), []);
	// Brilho neon (b) -> branco chapado (f)
	emissivo.set(cores.neon).lerp(new Color('#FFFFFF'), branco);
	const intensidade = lerp(brilho * 0.38, 0.86, branco);
	const mat = (op: number) => (
		<meshPhysicalMaterial
			color="#F4F8F6"
			metalness={lerp(0.55, 0, branco)}
			roughness={lerp(0.28, 1, branco)}
			clearcoat={lerp(1, 0, branco)}
			envMapIntensity={lerp(1.4, 0, branco)}
			emissive={emissivo}
			emissiveIntensity={intensidade}
			transparent
			opacity={op}
			depthWrite={op > 0.5}
		/>
	);
	return (
		<group>
			{opC > 0 ? <mesh geometry={geo.c}>{mat(opC)}</mesh> : null}
			{opLetras > 0 ? <mesh geometry={geo.letras}>{mat(opLetras)}</mesh> : null}
			{opGloboDisco > 0 ? <mesh geometry={geo.globoDisco}>{mat(opGloboDisco)}</mesh> : null}
		</group>
	);
};

const corTerra = new Color();

/**
 * Globo 3D dentro do C: esfera de vidro escuro com os continentes em pontos
 * verdes emissivos, girando devagar.
 */
export const Globo3D: React.FC<{
	centro: [number, number];
	raio: number;
	opacidade: number;
	rotacao: number;
	pontosAte?: number;
}> = ({centro, raio, opacidade, rotacao, pontosAte = 1}) => {
	const {globo} = useAssets();
	const n = globo.length / 2;
	const inclinacao = 0.32;
	corTerra.set(cores.neon);
	return (
		<group position={[centro[0], centro[1], 0]}>
			<group rotation={[inclinacao, rotacao, 0]}>
				<mesh>
					<sphereGeometry args={[raio * 0.985, 64, 48]} />
					<meshPhysicalMaterial
						color={cores.fundo1}
						metalness={0.1}
						roughness={0.22}
						clearcoat={1}
						clearcoatRoughness={0.1}
						envMapIntensity={1.4}
						emissive={cores.folha}
						emissiveIntensity={0.2}
						transparent
						opacity={opacidade}
					/>
				</mesh>
				<SoftPoints
					count={n}
					opacity={opacidade}
					fog={0}
					renderOrder={6}
					update={(b) => {
						for (let i = 0; i < n; i++) {
							const lon = (globo[i * 2] * Math.PI) / 180;
							const lat = (globo[i * 2 + 1] * Math.PI) / 180;
							b.pos[i * 3] = raio * Math.cos(lat) * Math.sin(lon);
							b.pos[i * 3 + 1] = raio * Math.sin(lat);
							b.pos[i * 3 + 2] = raio * Math.cos(lat) * Math.cos(lon);
							b.col[i * 3] = corTerra.r * 1.7;
							b.col[i * 3 + 1] = corTerra.g * 1.7;
							b.col[i * 3 + 2] = corTerra.b * 1.7;
							b.size[i] = raio * 0.045;
							// Revelacao dos pontos (condensacao das particulas)
							b.alpha[i] = i / n <= pontosAte ? 0.95 : 0;
						}
					}}
				/>
			</group>
		</group>
	);
};

/** Logo oficial (arquivo em public/) no mesmo retangulo da logo 3D. */
export const LogoOficial: React.FC<{opacity: number; escala?: number}> = ({opacity, escala = 1}) => {
	const {logo} = useAssets();
	const r = logoRetanguloPx(logo.width, logo.height);
	if (opacity <= 0) return null;
	return (
		<Img
			src={staticFile(arquivos.logoSvg)}
			style={{
				position: 'absolute',
				left: r.left,
				top: r.top,
				width: r.width,
				height: r.height,
				opacity,
				transform: `scale(${escala})`,
				transformOrigin: '50% 50%',
			}}
		/>
	);
};
