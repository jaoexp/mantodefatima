import React, {createContext, useContext, useEffect, useState} from 'react';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {
	LinearSRGBColorSpace,
	SRGBColorSpace,
	Shape,
	Texture,
	TextureLoader,
} from 'three';
import {Font, FontLoader, SVGLoader} from 'three-stdlib';
import {arquivos, tipografia} from '../theme';
import {Bounds, shapeBounds} from './shapes';

export const SELO_KEYS = ['empresa', 'evento', 'turismo', 'stand'] as const;
export type SeloKey = (typeof SELO_KEYS)[number];

export type LogoShapes = {
	/** Tamanho do viewBox do SVG */
	width: number;
	height: number;
	/** Anel do "C" */
	c: Shape[];
	/** Globo dentro do "C" (disco com os continentes vazados) */
	globo: Shape[];
	globoBounds: Bounds;
	/** Letras "ompensei" */
	letras: Shape[];
};

export type Assets = {
	fontBoldJson: unknown;
	fontXBoldJson: unknown;
	fontBold: Font;
	fontXBold: Font;
	logo: LogoShapes;
	seloShapes: Shape[];
	seloTex: Record<SeloKey, Texture>;
	seloRelevo: Record<SeloKey, Texture>;
	/** Pares lon/lat em graus dos pontos sobre os continentes */
	globo: Float32Array;
};

const AssetsContext = createContext<Assets | null>(null);

export const useAssets = (): Assets => {
	const a = useContext(AssetsContext);
	if (!a) throw new Error('useAssets fora do <AssetsProvider>');
	return a;
};

const shapesFromSvg = (text: string): Shape[] => {
	const data = new SVGLoader().parse(text);
	return data.paths.flatMap((p) => SVGLoader.createShapes(p));
};

const splitLogo = (shapes: Shape[], width: number, height: number): LogoShapes => {
	// O "C" ocupa os primeiros ~16% da largura; o resto sao as letras.
	const withBounds = shapes.map((s) => ({s, b: shapeBounds([s])}));
	const cGroup = withBounds.filter((x) => x.b.maxX < width * 0.16);
	const letras = withBounds.filter((x) => x.b.maxX >= width * 0.16).map((x) => x.s);
	const area = (b: Bounds) => (b.maxX - b.minX) * (b.maxY - b.minY);
	cGroup.sort((a, b) => area(b.b) - area(a.b));
	const c = cGroup.slice(0, 1).map((x) => x.s);
	const globo = cGroup.slice(1).map((x) => x.s);
	return {width, height, c, globo, globoBounds: shapeBounds(globo), letras};
};

let cache: Promise<Assets> | null = null;

const loadAll = async (): Promise<Assets> => {
	const getJson = (f: string) => fetch(staticFile(f)).then((r) => r.json());
	const getText = (f: string) => fetch(staticFile(f)).then((r) => r.text());
	const loader = new TextureLoader();
	const tex = async (f: string, srgb: boolean) => {
		const t = await loader.loadAsync(staticFile(f));
		t.colorSpace = srgb ? SRGBColorSpace : LinearSRGBColorSpace;
		t.anisotropy = 8;
		return t;
	};

	const [fontBoldJson, fontXBoldJson, logoSvg, seloSvg, globo] = await Promise.all([
		getJson(tipografia.text3dBold),
		getJson(tipografia.text3dExtraBold),
		getText(arquivos.logoSvg),
		getText(arquivos.seloShape),
		getJson(arquivos.globo),
	]);
	const seloTex = {} as Record<SeloKey, Texture>;
	const seloRelevo = {} as Record<SeloKey, Texture>;
	await Promise.all(
		SELO_KEYS.map(async (k) => {
			seloTex[k] = await tex(`selos/selo-${k}.png`, true);
			seloRelevo[k] = await tex(`selos/selo-${k}-relevo.png`, false);
		}),
	);

	const fontLoader = new FontLoader();
	const vb = logoSvg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
	const lw = vb ? parseFloat(vb[1]) : 4096;
	const lh = vb ? parseFloat(vb[2]) : 808;

	return {
		fontBoldJson,
		fontXBoldJson,
		fontBold: fontLoader.parse(fontBoldJson),
		fontXBold: fontLoader.parse(fontXBoldJson),
		logo: splitLogo(shapesFromSvg(logoSvg), lw, lh),
		seloShapes: shapesFromSvg(seloSvg),
		seloTex,
		seloRelevo,
		globo: new Float32Array(globo as number[]),
	};
};

/** Carrega todos os assets antes do primeiro frame (delayRender). */
export const AssetsProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
	const [assets, setAssets] = useState<Assets | null>(null);
	const [handle] = useState(() => delayRender('Carregando assets do comercial'));

	useEffect(() => {
		if (!cache) cache = loadAll();
		cache
			.then((a) => {
				setAssets(a);
				continueRender(handle);
			})
			.catch((err) => {
				cache = null;
				cancelRender(err);
			});
	}, [handle]);

	if (!assets) return null;
	return <AssetsContext.Provider value={assets}>{children}</AssetsContext.Provider>;
};
