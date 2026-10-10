import {ALTURA, LARGURA, logoFinal} from '../theme';

/**
 * Converte o enquadramento final da logo (em px) para unidades do mundo 3D no
 * plano z = 0 do palco B, com a camera em (0, 0, cameraZ) olhando para a origem.
 * Assim a logo 3D e a logo oficial (DOM) ficam pixel a pixel no mesmo lugar.
 */
export const pxPorUnidade =
	ALTURA / (2 * logoFinal.cameraZ * Math.tan((logoFinal.fov * Math.PI) / 360));

export const logoMundo = (viewBoxW: number, viewBoxH: number) => {
	const largura = logoFinal.largura / pxPorUnidade;
	const escala = largura / viewBoxW; // unidades do mundo por unidade do SVG
	const altura = viewBoxH * escala;
	const centroX = (logoFinal.centroX - LARGURA / 2) / pxPorUnidade;
	const centroY = (ALTURA / 2 - logoFinal.centroY) / pxPorUnidade;
	/** Converte um ponto do SVG (y para baixo) para o mundo (y para cima). */
	const svgParaMundo = (x: number, y: number): [number, number] => [
		centroX - largura / 2 + x * escala,
		centroY + altura / 2 - y * escala,
	];
	return {largura, altura, escala, centroX, centroY, svgParaMundo};
};

/** Retangulo da logo oficial em px, para o overlay DOM. */
export const logoRetanguloPx = (viewBoxW: number, viewBoxH: number) => {
	const w = logoFinal.largura;
	const h = (w * viewBoxH) / viewBoxW;
	return {left: logoFinal.centroX - w / 2, top: logoFinal.centroY - h / 2, width: w, height: h};
};
