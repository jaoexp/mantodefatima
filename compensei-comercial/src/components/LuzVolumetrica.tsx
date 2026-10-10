import React, {useMemo} from 'react';
import {AdditiveBlending, Color, DoubleSide, ShaderMaterial} from 'three';
import type {Vec3} from '../lib/anim';

const vertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewDir;
void main() {
	vUv = uv;
	vec4 mv = modelViewMatrix * vec4(position, 1.0);
	vNormalV = normalize(normalMatrix * normal);
	vViewDir = normalize(-mv.xyz);
	gl_Position = projectionMatrix * mv;
}
`;

const fragment = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vViewDir;
void main() {
	// 0 no topo (fonte de luz) e 1 na base do cone
	float h = 1.0 - vUv.y;
	float facing = abs(dot(normalize(vNormalV), vViewDir));
	// Bordas do cone somem suavemente: aparencia de feixe volumetrico
	float edge = pow(facing, 2.2);
	float fall = smoothstep(0.0, 0.12, h) * pow(1.0 - h, 1.6);
	float a = uIntensity * edge * fall;
	gl_FragColor = vec4(uColor * a, a);
}
`;

/** Feixe de luz volumetrica simulado (cone aditivo com gradiente). */
export const LuzVolumetrica: React.FC<{
	position: Vec3;
	rotation?: Vec3;
	height: number;
	radiusTop: number;
	radiusBottom: number;
	color: string;
	intensity: number;
}> = ({position, rotation = [0, 0, 0], height, radiusTop, radiusBottom, color, intensity}) => {
	const material = useMemo(
		() =>
			new ShaderMaterial({
				vertexShader: vertex,
				fragmentShader: fragment,
				uniforms: {uColor: {value: new Color()}, uIntensity: {value: 0}},
				transparent: true,
				depthWrite: false,
				blending: AdditiveBlending,
				premultipliedAlpha: true,
				side: DoubleSide,
			}),
		[],
	);
	material.uniforms.uColor.value.set(color);
	material.uniforms.uIntensity.value = intensity;
	if (intensity <= 0.0001) return null;
	return (
		<group position={position} rotation={rotation}>
			{/* O apice do cone fica na origem do grupo */}
			<mesh
				position={[0, -height / 2, 0]}
				material={material}
				renderOrder={5}
				frustumCulled={false}
			>
				<cylinderGeometry args={[radiusTop, radiusBottom, height, 64, 1, true]} />
			</mesh>
		</group>
	);
};
