import React, {useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import {
	AdditiveBlending,
	BufferAttribute,
	BufferGeometry,
	DynamicDrawUsage,
	NormalBlending,
	PerspectiveCamera,
	ShaderMaterial,
} from 'three';

export type PointBuffers = {
	count: number;
	pos: Float32Array;
	col: Float32Array;
	size: Float32Array;
	alpha: Float32Array;
};

const vertex = /* glsl */ `
attribute vec3 color;
attribute float aSize;
attribute float aAlpha;
uniform float uScale;
uniform float uOpacity;
uniform float uFog;
varying vec3 vColor;
varying float vAlpha;
void main() {
	vec4 mv = modelViewMatrix * vec4(position, 1.0);
	gl_Position = projectionMatrix * mv;
	float dist = -mv.z;
	float px = aSize * uScale / max(dist, 0.001);
	// Pontos menores que ~1.5px viram pontos de 1.5px mais transparentes (sem cintilar).
	float a = aAlpha * uOpacity * clamp(px / 1.5, 0.0, 1.0);
	gl_PointSize = max(px, 1.5);
	a *= smoothstep(0.4, 2.0, dist);
	a *= exp(-dist * uFog);
	vColor = color;
	vAlpha = a;
}
`;

const fragment = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
	float d = length(gl_PointCoord - 0.5) * 2.0;
	if (d > 1.0) discard;
	// Nucleo definido com halo suave
	float core = smoothstep(0.55, 0.0, d);
	float halo = (1.0 - d) * (1.0 - d) * 0.45;
	float a = (core + halo) * vAlpha;
	gl_FragColor = vec4(vColor * a, a);
}
`;

/**
 * Nuvem de pontos com sprite suave. As posicoes sao preenchidas a cada frame
 * por `update`, sempre como funcao pura do frame (deterministico).
 */
export const SoftPoints: React.FC<{
	count: number;
	update: (b: PointBuffers) => void;
	opacity?: number;
	additive?: boolean;
	fog?: number;
	renderOrder?: number;
}> = ({count, update, opacity = 1, additive = true, fog = 0.012, renderOrder = 2}) => {
	const camera = useThree((s) => s.camera) as PerspectiveCamera;
	const height = useThree((s) => s.size.height);

	const {geometry, material, buffers} = useMemo(() => {
		const b: PointBuffers = {
			count,
			pos: new Float32Array(count * 3),
			col: new Float32Array(count * 3),
			size: new Float32Array(count),
			alpha: new Float32Array(count),
		};
		const g = new BufferGeometry();
		const attr = (arr: Float32Array, n: number) => {
			const a = new BufferAttribute(arr, n);
			a.setUsage(DynamicDrawUsage);
			return a;
		};
		g.setAttribute('position', attr(b.pos, 3));
		g.setAttribute('color', attr(b.col, 3));
		g.setAttribute('aSize', attr(b.size, 1));
		g.setAttribute('aAlpha', attr(b.alpha, 1));
		const m = new ShaderMaterial({
			vertexShader: vertex,
			fragmentShader: fragment,
			uniforms: {uScale: {value: 1}, uOpacity: {value: 1}, uFog: {value: fog}},
			transparent: true,
			depthWrite: false,
			// Cor ja premultiplicada no shader
			blending: additive ? AdditiveBlending : NormalBlending,
			premultipliedAlpha: true,
		});
		return {geometry: g, material: m, buffers: b};
	}, [count, additive, fog]);

	// Preenche os buffers para o frame atual (chamado a cada render).
	update(buffers);
	for (const k of ['position', 'color', 'aSize', 'aAlpha']) {
		(geometry.getAttribute(k) as BufferAttribute).needsUpdate = true;
	}
	material.uniforms.uScale.value = height / (2 * Math.tan((camera.fov * Math.PI) / 360));
	material.uniforms.uOpacity.value = opacity;

	return (
		<points
			geometry={geometry}
			material={material}
			frustumCulled={false}
			renderOrder={renderOrder}
		/>
	);
};
