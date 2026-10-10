/**
 * Gera os assets derivados usados pelas cenas 3D.
 *
 *  1. public/fonts/Inter_Bold.typeface.json e Inter_ExtraBold.typeface.json
 *     (formato typeface.json do three.js, para o Text3D do drei)
 *  2. public/logo-compensei.svg  (vetorizacao da logo enviada em PNG)
 *  3. public/selos/selo-shape.svg (silhueta dos selos para extrusao)
 *  4. public/data/globe-land.json (pontos sobre os continentes)
 *
 * Rode antes: python3 scripts/build_images.py
 * Uso: node scripts/build-assets.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import opentype from 'opentype.js';
import potrace from 'potrace';
import {geoContains} from 'd3-geo';
import {feature} from 'topojson-client';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = (...p) => path.join(ROOT, 'public', ...p);

// ---------------------------------------------------------------- fontes
const CHARS =
	'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
	'ÁÂÃÀÉÊÍÓÔÕÚÇáâãàéêíóôõúç.,;:!?-_()/ ';

function fontToTypeface(file, weight) {
	const buf = fs.readFileSync(file);
	const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
	const scale = (1000 * 100) / ((font.unitsPerEm || 2048) * 72);
	const r = (v) => Math.round(v * scale);
	const glyphs = {};
	for (const ch of CHARS) {
		const g = font.charToGlyph(ch);
		if (!g) continue;
		const cmds = g.getPath(0, 0, font.unitsPerEm).commands;
		let o = '';
		for (const c of cmds) {
			// getPath inverte o eixo Y; desfazemos para o espaco da fonte.
			if (c.type === 'M') o += `m ${r(c.x)} ${r(-c.y)} `;
			else if (c.type === 'L') o += `l ${r(c.x)} ${r(-c.y)} `;
			else if (c.type === 'Q') o += `q ${r(c.x)} ${r(-c.y)} ${r(c.x1)} ${r(-c.y1)} `;
			else if (c.type === 'C')
				o += `b ${r(c.x)} ${r(-c.y)} ${r(c.x1)} ${r(-c.y1)} ${r(c.x2)} ${r(-c.y2)} `;
		}
		const bb = g.getBoundingBox();
		glyphs[ch] = {
			ha: r(g.advanceWidth),
			x_min: r(bb.x1),
			x_max: r(bb.x2),
			o: o.trim(),
		};
	}
	const bb = font.tables.head;
	return {
		glyphs,
		familyName: 'Inter',
		ascender: r(font.ascender),
		descender: r(font.descender),
		underlinePosition: r(font.tables.post.underlinePosition),
		underlineThickness: r(font.tables.post.underlineThickness),
		boundingBox: {yMin: r(bb.yMin), xMin: r(bb.xMin), yMax: r(bb.yMax), xMax: r(bb.xMax)},
		resolution: 1000,
		original_font_information: {format: 0, fontFamily: 'Inter', fontSubfamily: weight},
		cssFontWeight: weight === 'ExtraBold' ? '800' : 'bold',
		cssFontStyle: 'normal',
	};
}

const fontDir = path.join(ROOT, 'node_modules/@fontsource/inter/files');
for (const [w, name] of [
	['700', 'Bold'],
	['800', 'ExtraBold'],
]) {
	const json = fontToTypeface(path.join(fontDir, `inter-latin-${w}-normal.woff`), name);
	fs.writeFileSync(pub('fonts', `Inter_${name}.typeface.json`), JSON.stringify(json));
}
console.log('fontes ok');

// ---------------------------------------------------------------- potrace
const trace = (file, opts) =>
	new Promise((res, rej) => potrace.trace(file, opts, (e, svg) => (e ? rej(e) : res(svg))));

const pathD = (svg) => svg.match(/ d="([^"]+)"/)[1];

{
	// A imagem ampliada tem 8x o tamanho do PNG original (512x101).
	const svg = await trace(path.join(ROOT, 'scripts/.logo-big.png'), {
		threshold: 145,
		turdSize: 40,
		optTolerance: 0.4,
	});
	const d = pathD(svg);
	const out =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4096 808" width="4096" height="808">` +
		`<path d="${d}" fill="#FFFFFF" fill-rule="evenodd"/></svg>\n`;
	fs.writeFileSync(pub('logo-compensei.svg'), out);
	console.log('logo ok');
}
{
	const svg = await trace(path.join(ROOT, 'scripts/.selo-mask.png'), {
		threshold: 128,
		turdSize: 200,
		optTolerance: 0.6,
	});
	const out =
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 1024" width="720" height="1024">` +
		`<path d="${pathD(svg)}" fill="#FFFFFF" fill-rule="evenodd"/></svg>\n`;
	fs.writeFileSync(pub('selos', 'selo-shape.svg'), out);
	console.log('selo ok');
}

// ---------------------------------------------------------------- globo
{
	const topo = JSON.parse(
		fs.readFileSync(path.join(ROOT, 'node_modules/world-atlas/land-110m.json'), 'utf8'),
	);
	const land = feature(topo, topo.objects.land);
	const N = 26000;
	const pts = [];
	const golden = Math.PI * (3 - Math.sqrt(5));
	for (let i = 0; i < N; i++) {
		const y = 1 - (i / (N - 1)) * 2;
		const lat = (Math.asin(y) * 180) / Math.PI;
		const lon = ((((i * golden) % (2 * Math.PI)) * 180) / Math.PI) - 180;
		if (lat < -60) continue; // sem Antartida, como no simbolo da marca
		if (geoContains(land, [lon, lat])) pts.push(+lon.toFixed(2), +lat.toFixed(2));
	}
	fs.writeFileSync(pub('data', 'globe-land.json'), JSON.stringify(pts));
	console.log('globo ok', pts.length / 2, 'pontos');
}
