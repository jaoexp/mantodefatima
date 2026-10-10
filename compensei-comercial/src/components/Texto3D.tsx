import React, {useMemo} from 'react';
import {Text3D} from '@react-three/drei';
import type {Font} from 'three-stdlib';
import {GlyphLayout, layoutText} from '../lib/shapes';
import type {Vec3} from '../lib/anim';

export type LetraEstilo = {
	offset?: Vec3;
	rotation?: Vec3;
	scale?: number;
	opacity?: number;
	color?: string;
	emissive?: string;
	emissiveIntensity?: number;
	roughness?: number;
	metalness?: number;
	envMapIntensity?: number;
	visible?: boolean;
};

export type MaterialBase = {
	color: string;
	metalness: number;
	roughness: number;
	clearcoat?: number;
	clearcoatRoughness?: number;
	envMapIntensity?: number;
};

/** Metal fosco padrao dos titulos 3D. */
export const METAL_FOSCO: MaterialBase = {
	color: '#E8EEEB',
	metalness: 0.9,
	roughness: 0.24,
	clearcoat: 0.5,
	clearcoatRoughness: 0.18,
	envMapIntensity: 1.7,
};

/**
 * Texto 3D (Text3D do drei) montado letra a letra, para que cada letra possa
 * ser animada em torno do proprio centro. Centralizado em x; linha de base em
 * y = 0; face frontal em z = depth.
 */
export const Texto3D: React.FC<{
	text: string;
	font: Font;
	fontJson: unknown;
	size: number;
	depth?: number;
	letterSpacing?: number;
	material?: MaterialBase;
	estilo?: (i: number, g: GlyphLayout) => LetraEstilo;
}> = ({text, font, fontJson, size, depth = 0.12 * size, letterSpacing = 0, material = METAL_FOSCO, estilo}) => {
	const {glyphs, width} = useMemo(
		() => layoutText(font, text, size, letterSpacing),
		[font, text, size, letterSpacing],
	);
	return (
		<group>
			{glyphs.map((g, i) => {
				if (g.char === ' ') return null;
				const e = estilo?.(i, g) ?? {};
				if (e.visible === false || e.opacity === 0) return null;
				const o = e.offset ?? [0, 0, 0];
				const opacity = e.opacity ?? 1;
				// Grupo no centro da letra: rotacoes e escala acontecem em torno dela.
				return (
					<group
						key={i}
						position={[g.cx - width / 2 + o[0], g.cy + o[1], depth / 2 + o[2]]}
						rotation={e.rotation ?? [0, 0, 0]}
						scale={e.scale ?? 1}
					>
						<Text3D
							font={fontJson as never}
							size={size}
							height={depth}
							curveSegments={10}
							bevelEnabled
							bevelSize={size * 0.012}
							bevelThickness={size * 0.02}
							bevelSegments={4}
							position={[-(g.cx - g.x), -g.cy, -depth / 2]}
						>
							{g.char}
							<meshPhysicalMaterial
								color={e.color ?? material.color}
								metalness={e.metalness ?? material.metalness}
								roughness={e.roughness ?? material.roughness}
								clearcoat={material.clearcoat ?? 0}
								clearcoatRoughness={material.clearcoatRoughness ?? 0.2}
								envMapIntensity={e.envMapIntensity ?? material.envMapIntensity ?? 1}
								emissive={e.emissive ?? '#000000'}
								emissiveIntensity={e.emissiveIntensity ?? 0}
								transparent
								opacity={opacity}
								depthWrite={opacity > 0.5}
							/>
						</Text3D>
					</group>
				);
			})}
		</group>
	);
};
