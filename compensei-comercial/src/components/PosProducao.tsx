import React, {useLayoutEffect, useMemo} from 'react';
import {useFrame, useThree} from '@react-three/fiber';
import {
	BlendFunction,
	BloomEffect,
	ChromaticAberrationEffect,
	DepthOfFieldEffect,
	Effect,
	EffectComposer,
	EffectPass,
	RenderPass,
	ToneMappingEffect,
	ToneMappingMode,
	VignetteEffect,
} from 'postprocessing';
import {HalfFloatType, Uniform, Vector2, Vector3} from 'three';
import type {Vec3} from '../lib/anim';

const grainFrag = /* glsl */ `
uniform float uSeed;
uniform float uAmount;
float hash(vec2 p) {
	vec3 p3 = fract(vec3(p.xyx) * 0.1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
	vec2 px = floor(uv * resolution);
	float n = hash(px + vec2(uSeed * 37.0, uSeed * 17.0)) - 0.5;
	// Grao mais visivel nos meios-tons, quase nulo nos pretos e brancos
	float l = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));
	float w = 4.0 * l * (1.0 - l) + 0.15;
	outputColor = vec4(inputColor.rgb + n * uAmount * w, inputColor.a);
}
`;

/** Grao de filme deterministico: a semente vem do frame, nao do relogio. */
class GrainEffect extends Effect {
	constructor() {
		super('GrainEffect', grainFrag, {
			blendFunction: BlendFunction.NORMAL,
			uniforms: new Map<string, Uniform>([
				['uSeed', new Uniform(0)],
				['uAmount', new Uniform(0.03)],
			]),
		});
	}
}

/**
 * Pos-processamento cinematografico: DOF, bloom (so os neons, threshold alto),
 * tone mapping neutro (preserva as cores da marca), aberracao cromatica
 * minima, vinheta e grao.
 *
 * O composer e montado de forma sincrona (useMemo) para que o primeiro frame
 * renderizado pelo Remotion ja saia com todos os passes.
 */
export const PosProducao: React.FC<{
	frame: number;
	foco: Vec3;
	bokeh: number;
	bloom: number;
}> = ({frame, foco, bokeh, bloom}) => {
	const gl = useThree((s) => s.gl);
	const scene = useThree((s) => s.scene);
	const camera = useThree((s) => s.camera);
	const size = useThree((s) => s.size);

	const fx = useMemo(() => {
		const composer = new EffectComposer(gl, {multisampling: 4, frameBufferType: HalfFloatType});
		const dof = new DepthOfFieldEffect(camera, {worldFocusRange: 2.4, bokehScale: 2});
		dof.target = new Vector3();
		const bloomFx = new BloomEffect({
			mipmapBlur: true,
			intensity: 0.6,
			luminanceThreshold: 0.92,
			luminanceSmoothing: 0.12,
			radius: 0.72,
		});
		const tone = new ToneMappingEffect({mode: ToneMappingMode.NEUTRAL});
		const chroma = new ChromaticAberrationEffect({
			offset: new Vector2(0.00045, 0.0003),
			radialModulation: true,
			modulationOffset: 0.35,
		});
		const vignette = new VignetteEffect({offset: 0.28, darkness: 0.62});
		const grain = new GrainEffect();
		composer.addPass(new RenderPass(scene, camera));
		composer.addPass(new EffectPass(camera, dof));
		composer.addPass(new EffectPass(camera, bloomFx, tone));
		composer.addPass(new EffectPass(camera, chroma, vignette, grain));
		return {composer, dof, bloomFx, grain};
	}, [gl, scene, camera]);

	useLayoutEffect(() => {
		fx.composer.setSize(size.width, size.height);
	}, [fx, size.width, size.height]);

	useLayoutEffect(() => () => fx.composer.dispose(), [fx]);

	// Parametros do frame atual
	fx.dof.target!.set(...foco);
	fx.dof.bokehScale = bokeh;
	fx.bloomFx.intensity = bloom;
	fx.grain.uniforms.get('uSeed')!.value = frame % 997;
	fx.grain.uniforms.get('uAmount')!.value = 0.032;

	// Prioridade 1: assume o render no lugar do R3F
	useFrame(() => {
		fx.composer.render(0);
	}, 1);

	return null;
};
