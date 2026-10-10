import {Easing} from 'remotion';

/**
 * Tema central do comercial: formato, paleta, tipografia, easings e timings.
 * Todos os frames abaixo sao absolutos (30 fps).
 */

export const FPS = 30;
export const DURACAO = 1200;
export const LARGURA = 1920;
export const ALTURA = 1080;

export const cores = {
	// Fundo e sombras
	fundo0: '#06140F',
	fundo1: '#0B2A1E',
	// Fundo mais aberto da cena de evidencia
	fundoAberto: '#13402D',
	// Acentos
	folha: '#2E9E5B',
	folhaClara: '#4CC77A',
	neon: '#7DFFB0',
	branco: '#FFFFFF',
	// Uso pontual na transicao dados frios -> organico
	quente: '#FFE8B0',
	// Dados frios (cena 1)
	frio: '#CFE3EC',
	metal: '#D5DED9',
} as const;

export const tipografia = {
	// A familia Inter e carregada em src/fonts.ts (arquivos locais em public/fonts)
	pesoTitulo: 800,
	pesoApoio: 500,
	trackingTitulo: '0.02em',
	trackingApoio: '0.015em',
	// Fontes convertidas para o Text3D (scripts/build-assets.mjs)
	text3dBold: 'fonts/Inter_Bold.typeface.json',
	text3dExtraBold: 'fonts/Inter_ExtraBold.typeface.json',
} as const;

export const easings = {
	// Movimentos de camera lentos e intencionais
	camera: Easing.bezier(0.45, 0, 0.25, 1),
	// Entradas suaves (desacelera no fim)
	entrada: Easing.bezier(0.16, 1, 0.3, 1),
	// Saidas (acelera no fim)
	saida: Easing.bezier(0.7, 0, 0.84, 0),
	// Pan rapido porem suave da cena 2 (ease in-out forte)
	panForte: Easing.bezier(0.83, 0, 0.17, 1),
	// Uso geral
	suave: Easing.bezier(0.42, 0, 0.58, 1),
} as const;

export const springs = {
	selo: {damping: 16, stiffness: 70, mass: 1.1},
	palavra: {damping: 18, stiffness: 90, mass: 1},
	suave: {damping: 200, stiffness: 60, mass: 1},
} as const;

/** Janela de cada cena na timeline. `sobra` estende a cena para sobrepor a seguinte. */
export const cenas = {
	realidade: {from: 0, duration: 240, sobra: 60},
	explicacao: {from: 240, duration: 210, sobra: 40},
	evidencia: {from: 450, duration: 300, sobra: 70},
	apice: {from: 750, duration: 300, sobra: 30},
	acao: {from: 1050, duration: 150, sobra: 0},
} as const;

/** Momentos-chave (frames absolutos) usados pelas cenas. */
export const tempos = {
	// Cena 1
	tituloEntra: 90,
	medirDestaque: 140,
	// Cena 2
	dissolveTitulo: 246,
	pan: [255, 335] as const,
	formaTitulo2: 330,
	morphDados: [250, 390] as const,
	reduzirDestaque: 368,
	// Cena 3
	clareia: [430, 500] as const,
	selos: [480, 530, 580, 630] as const,
	textoJornada: 678,
	// Cena 4
	selosRecuam: 750,
	palavras: [805, 825, 845] as const,
	zoomCompensar: [872, 915] as const,
	brilhoCompensar: 900,
	cEngole: 942,
	globoForma: 966,
	ompenseiForma: 998,
	crossfadeLogo: [1032, 1048] as const,
	// Cena 5
	cta: 1072,
	fadeOut: [1180, 1200] as const,
} as const;

/**
 * Frames de "batida" para sincronizar a trilha sonora.
 * Use como guia ao editar audio/trilha.mp3 (ou para cortes de musica).
 */
export const batidas: {frame: number; descricao: string}[] = [
	{frame: tempos.tituloEntra, descricao: 'Entrada: "Medir emissoes e so o comeco."'},
	{frame: tempos.medirDestaque, descricao: 'Luz volumetrica em "Medir"'},
	{frame: tempos.dissolveTitulo, descricao: 'Titulo se dissolve em particulas'},
	{frame: tempos.formaTitulo2, descricao: 'Entrada: "Entender para reduzir."'},
	{frame: tempos.reduzirDestaque, descricao: 'Neon em "reduzir"'},
	{frame: tempos.selos[0], descricao: 'Selo Empresa Carbono Neutro'},
	{frame: tempos.selos[1], descricao: 'Selo Evento Carbono Neutro'},
	{frame: tempos.selos[2], descricao: 'Selo Turismo Carbono Neutro'},
	{frame: tempos.selos[3], descricao: 'Selo Stand Carbono Neutro'},
	{frame: tempos.palavras[0], descricao: 'MEDIR.'},
	{frame: tempos.palavras[1], descricao: 'REDUZIR.'},
	{frame: tempos.palavras[2], descricao: 'COMPENSAR.'},
	{frame: tempos.cEngole, descricao: 'O "C" engole as letras'},
	{frame: tempos.globoForma, descricao: 'Globo se forma dentro do C'},
	{frame: tempos.crossfadeLogo[1], descricao: 'Logo oficial'},
	{frame: tempos.cta, descricao: 'Call to action'},
];

/** Textos do roteiro, exatamente como aprovados. */
export const textos = {
	cena1: 'Medir emissões é só o começo.',
	cena1Destaque: 'Medir',
	cena2: 'Entender para reduzir.',
	cena2Destaque: 'reduzir',
	selos: [
		'Empresa Carbono Neutro',
		'Evento Carbono Neutro',
		'Turismo Carbono Neutro',
		'Stand Carbono Neutro',
	],
	cena3Apoio: 'Uma jornada para empresas, eventos e destinos.',
	cena4: ['MEDIR.', 'REDUZIR.', 'COMPENSAR.'],
	cta: 'Fale com nossos especialistas.',
} as const;

/** Enquadramento final da logo (px na composicao 1920x1080). */
export const logoFinal = {
	largura: 820,
	centroX: LARGURA / 2,
	centroY: 500,
	// Distancia e fov da camera no plano z = 0 onde a logo 3D e montada
	cameraZ: 10,
	fov: 30,
} as const;

export const arquivos = {
	logoSvg: 'logo-compensei.svg',
	trilha: 'audio/trilha.mp3',
	seloShape: 'selos/selo-shape.svg',
	globo: 'data/globe-land.json',
} as const;
