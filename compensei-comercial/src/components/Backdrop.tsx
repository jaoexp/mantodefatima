import React, {useMemo} from 'react';
import {Color, ShaderMaterial} from 'three';

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
	vUv = uv;
	gl_Position = vec4(position.xy, 0.99999, 1.0);
}
`;

const fragment = /* glsl */ `
uniform vec3 uCenter;
uniform vec3 uEdge;
uniform vec3 uMistColor;
uniform float uMist;
uniform float uTime;
uniform float uAspect;
uniform vec2 uGlowPos;
uniform float uGlow;
varying vec2 vUv;

float hash(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}
float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	for (int i = 0; i < 5; i++) {
		v += a * noise(p);
		p *= 2.03;
		a *= 0.5;
	}
	return v;
}

void main() {
	vec2 p = vUv - 0.5;
	p.x *= uAspect;
	float r = length(p - vec2(0.0, 0.04));
	vec3 col = mix(uCenter, uEdge, smoothstep(0.05, 0.95, r));
	// Brilho difuso por tras do assunto principal
	vec2 g = vUv - uGlowPos;
	g.x *= uAspect;
	col += uCenter * uGlow * exp(-dot(g, g) * 6.0);
	// Nevoa leve, lenta, em camadas
	float m = fbm(vec2(p.x * 1.4 + uTime * 0.0035, p.y * 2.6 - uTime * 0.0015));
	float m2 = fbm(vec2(p.x * 3.1 - uTime * 0.002, p.y * 1.7 + 7.0));
	col += uMistColor * uMist * (m * 0.7 + m2 * 0.3) * smoothstep(0.75, 0.0, r);
	// Dither contra banding no gradiente escuro
	col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
	gl_FragColor = vec4(col, 1.0);
}
`;

/** Fundo em tela cheia: gradiente radial, brilho central e nevoa procedural. */
export const Backdrop: React.FC<{
	center: string;
	edge: string;
	mistColor: string;
	mist: number;
	glow: number;
	glowPos?: [number, number];
	frame: number;
	aspect: number;
}> = ({center, edge, mistColor, mist, glow, glowPos = [0.5, 0.52], frame, aspect}) => {
	const material = useMemo(
		() =>
			new ShaderMaterial({
				vertexShader: vertex,
				fragmentShader: fragment,
				uniforms: {
					uCenter: {value: new Color()},
					uEdge: {value: new Color()},
					uMistColor: {value: new Color()},
					uMist: {value: 0},
					uTime: {value: 0},
					uAspect: {value: 1},
					uGlowPos: {value: [0.5, 0.5]},
					uGlow: {value: 0},
				},
				depthWrite: false,
				depthTest: false,
			}),
		[],
	);
	const u = material.uniforms;
	u.uCenter.value.set(center);
	u.uEdge.value.set(edge);
	u.uMistColor.value.set(mistColor);
	u.uMist.value = mist;
	u.uTime.value = frame;
	u.uAspect.value = aspect;
	u.uGlowPos.value = glowPos;
	u.uGlow.value = glow;

	return (
		<mesh material={material} frustumCulled={false} renderOrder={-1000}>
			<planeGeometry args={[2, 2]} />
		</mesh>
	);
};
