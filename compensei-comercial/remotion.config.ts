import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
// WebGL: "angle" usa a GPU da maquina. Em servidores sem GPU use --gl=swangle.
Config.setChromiumOpenGlRenderer('angle');
// Cenas com vidro (transmission) e pos-processamento sao pesadas: poucas abas em paralelo.
Config.setConcurrency(2);
