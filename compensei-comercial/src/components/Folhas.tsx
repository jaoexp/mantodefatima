import React, {useMemo} from 'react';
import {random, useCurrentFrame} from 'remotion';
import {CanvasTexture, DoubleSide, PlaneGeometry, SRGBColorSpace} from 'three';
import {
	curvaturaLamina,
	FOLHAS,
	folhaMatrix,
	meiaLargura,
	nervuraCentral,
	nervuras2D,
} from '../lib/folhas';
import {progress} from '../lib/anim';
import {easings} from '../theme';

const TEX_W = 512;
const TEX_H = 1024;
const LARG = 0.8; // largura do plano em unidades de L (x de -0.4 a 0.4)

/** Textura da lamina desenhada em canvas (deterministica). */
const criaTextura = () => {
	const c = document.createElement('canvas');
	c.width = TEX_W;
	c.height = TEX_H;
	const ctx = c.getContext('2d')!;
	const px = (x: number) => ((x + LARG / 2) / LARG) * TEX_W;
	const py = (t: number) => (1 - t) * TEX_H;

	// Silhueta
	ctx.beginPath();
	const n = 120;
	for (let i = 0; i <= n; i++) {
		const t = i / n;
		const x = nervuraCentral(t) + meiaLargura(t);
		if (i === 0) ctx.moveTo(px(x), py(t));
		else ctx.lineTo(px(x), py(t));
	}
	for (let i = n; i >= 0; i--) {
		const t = i / n;
		ctx.lineTo(px(nervuraCentral(t) - meiaLargura(t)), py(t));
	}
	ctx.closePath();
	ctx.save();
	ctx.clip();
	// Gradiente da base (escura) para a ponta (clara)
	const g = ctx.createLinearGradient(0, TEX_H, 0, 0);
	g.addColorStop(0, '#0B2E1C');
	g.addColorStop(0.5, '#1C6B3D');
	g.addColorStop(1, '#2E9E5B');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, TEX_W, TEX_H);
	// Dobra da folha: metade direita mais escura
	const dobra = ctx.createLinearGradient(0, 0, TEX_W, 0);
	dobra.addColorStop(0, 'rgba(160,255,190,0.10)');
	dobra.addColorStop(0.5, 'rgba(160,255,190,0.0)');
	dobra.addColorStop(0.52, 'rgba(0,20,10,0.18)');
	dobra.addColorStop(1, 'rgba(0,20,10,0.32)');
	ctx.fillStyle = dobra;
	ctx.fillRect(0, 0, TEX_W, TEX_H);
	// Luz atravessando a lamina (translucidez): miolo mais claro e levemente quente
	const r = ctx.createRadialGradient(TEX_W * 0.45, TEX_H * 0.5, 10, TEX_W * 0.45, TEX_H * 0.5, TEX_W * 0.75);
	r.addColorStop(0, 'rgba(200,255,170,0.30)');
	r.addColorStop(1, 'rgba(200,255,170,0)');
	ctx.fillStyle = r;
	ctx.fillRect(0, 0, TEX_W, TEX_H);
	// Celulas da lamina: textura fina e organica (deterministica)
	for (let i = 0; i < 9000; i++) {
		const x = random(`cel-x-${i}`) * TEX_W;
		const y = random(`cel-y-${i}`) * TEX_H;
		const claro = random(`cel-c-${i}`) < 0.5;
		ctx.fillStyle = claro ? 'rgba(170,255,190,0.05)' : 'rgba(0,25,12,0.07)';
		ctx.beginPath();
		ctx.arc(x, y, 1.5 + random(`cel-r-${i}`) * 3.5, 0, Math.PI * 2);
		ctx.fill();
	}
	// Nervuras tenues na textura (as nervuras 3D brilham por cima)
	ctx.strokeStyle = 'rgba(200,255,210,0.22)';
	nervuras2D().forEach((linha, k) => {
		ctx.lineWidth = k === 0 ? 5 : 2;
		ctx.beginPath();
		linha.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(px(x), py(y)) : ctx.lineTo(px(x), py(y))));
		ctx.stroke();
	});
	// Nervuras terciarias, bem finas
	ctx.strokeStyle = 'rgba(200,255,210,0.08)';
	ctx.lineWidth = 1;
	for (let i = 0; i < 140; i++) {
		const t = 0.08 + random(`ter-t-${i}`) * 0.85;
		const lado = random(`ter-l-${i}`) < 0.5 ? -1 : 1;
		const x0 = nervuraCentral(t) + lado * meiaLargura(t) * random(`ter-a-${i}`) * 0.8;
		ctx.beginPath();
		ctx.moveTo(px(x0), py(t));
		ctx.lineTo(px(x0 + lado * 0.05), py(t + 0.02 + random(`ter-b-${i}`) * 0.03));
		ctx.stroke();
	}
	// Borda levemente escurecida
	ctx.globalCompositeOperation = 'source-atop';
	ctx.lineWidth = 18;
	ctx.strokeStyle = 'rgba(5,30,18,0.45)';
	ctx.beginPath();
	for (let i = 0; i <= n; i++) {
		const t = i / n;
		const x = nervuraCentral(t) + meiaLargura(t);
		if (i === 0) ctx.moveTo(px(x), py(t));
		else ctx.lineTo(px(x), py(t));
	}
	for (let i = n; i >= 0; i--) {
		const t = i / n;
		ctx.lineTo(px(nervuraCentral(t) - meiaLargura(t)), py(t));
	}
	ctx.stroke();
	ctx.restore();
	const tex = new CanvasTexture(c);
	tex.colorSpace = SRGBColorSpace;
	tex.anisotropy = 8;
	return tex;
};

/** Plano curvo da lamina, com a mesma curvatura usada pelas nervuras. */
const criaGeometria = () => {
	const g = new PlaneGeometry(LARG, 1, 24, 48);
	g.translate(0, 0.5, 0);
	const p = g.attributes.position;
	for (let i = 0; i < p.count; i++) {
		p.setZ(i, curvaturaLamina(p.getX(i), p.getY(i)));
	}
	g.computeVertexNormals();
	return g;
};

/**
 * Laminas das folhas (cena 2 em diante). As nervuras vem do DataHologram.
 * Iluminacao por tras simulada com emissive a partir da propria textura.
 */
export const Folhas: React.FC = () => {
	const frame = useCurrentFrame();
	const textura = useMemo(criaTextura, []);
	const geometria = useMemo(criaGeometria, []);
	const matrizes = useMemo(() => FOLHAS.map(folhaMatrix), []);

	return (
		<group>
			{matrizes.map((m, i) => {
				const sai = 1 - progress(frame, FOLHAS[i].sai, 60, easings.suave);
				// Na cena 3 as folhas recuam em brilho para nao competir com os selos
				const recua = 1 - 0.5 * progress(frame, 450, 50, easings.suave);
				const op = progress(frame, 330 + i * 8, 60, easings.suave) * sai * recua;
				if (op <= 0.001) return null;
				return (
					<mesh key={i} matrixAutoUpdate={false} matrix={m} geometry={geometria} renderOrder={1}>
						<meshStandardMaterial
							map={textura}
							emissiveMap={textura}
							emissive="#ffffff"
							emissiveIntensity={0.3}
							roughness={0.5}
							metalness={0}
							side={DoubleSide}
							transparent
							opacity={op * 0.92}
							depthWrite={false}
							alphaTest={0.01}
						/>
					</mesh>
				);
			})}
		</group>
	);
};
