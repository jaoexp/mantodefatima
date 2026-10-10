# Compensei | Comercial institucional (Remotion + React Three Fiber)

Comercial de 40 s (1920x1080, 30 fps, 1200 frames) com o roteiro
Realidade -> Explicação -> Caminho -> Evidência -> Ação.

## Como rodar

```bash
cd compensei-comercial
npm install
npm run studio          # abre o Remotion Studio (composição "CompenseiComercial")
```

Renderizar em MP4 (H.264, alta qualidade):

```bash
npx remotion render CompenseiComercial out/compensei-comercial.mp4 --codec=h264 --crf=16 --gl=angle
# ou: npm run render
```

- `--crf=16` é próximo do visualmente sem perdas. Para a entrega final dá para usar `--crf=12`.
- `--gl=angle` usa a GPU. Em servidor sem GPU use `--gl=swangle` (mais lento, mesmo resultado).
- Um frame isolado: `npx remotion still CompenseiComercial out/frame.png --frame=700 --gl=angle`.
- A concorrência padrão é 2 (`remotion.config.ts`). Com uma GPU boa, suba com `--concurrency=4`.

## Estrutura

```
src/
  theme.ts              paleta, tipografia, easings, springs, timings e frames de "batida"
  camera.ts             roteiro de câmera do filme inteiro (posição, alvo, foco do DOF, bokeh)
  CompenseiComercial.tsx  composição: canvas 3D, camadas contínuas, cenas, overlays e trilha
  scenes/
    Scene1Realidade.tsx   título em metal fosco + luz volumétrica em "Medir"
    Scene2Explicacao.tsx  título vira partículas e se reorganiza em "Entender para reduzir."
    Scene3Evidencia.tsx   os quatro selos 3D em arco, feixes de luz e poeira
    Scene4Apice.tsx       MEDIR. REDUZIR. COMPENSAR. -> C engole as letras -> globo -> logo
    Scene5Acao.tsx        logo respirando, halo e CTA
    Overlays.tsx          textos 2D, logo oficial (crossfade) e fade para o preto
  components/
    Selo3D.tsx            selo da marca (vidro + arte oficial em relevo + metal + neon)
    Texto3D.tsx           Text3D do drei montado letra a letra
    LogoCompensei.tsx     logo 3D, globo 3D e logo oficial (DOM), alinhadas pixel a pixel
    DataHologram.tsx      hologramas de dados que viram nervuras de folhas
    Folhas.tsx            lâminas das folhas (textura procedural, retroiluminadas)
    ParticleField.tsx     ar/pólen em suspensão e fluxos de partículas
    SoftPoints.tsx        nuvem de pontos com shader (base de todas as partículas)
    Backdrop.tsx, Ambiente.tsx, LuzVolumetrica.tsx, CameraRig.tsx, PosProducao.tsx
  lib/                    animação, layout de texto, amostragem de formas, palcos, assets
scripts/
  build_images.py         recorta os selos e prepara a logo a partir de assets-src/
  build-assets.mjs        fonte Text3D, vetorização da logo, silhueta dos selos, pontos do globo
```

## Como cada efeito foi feito

- **Determinismo**: tudo deriva de `useCurrentFrame()` (`interpolate`, `spring`). Aleatoriedade só
  com `random(seed)`. Nada de `useFrame` para animar, `Math.random`, `Date` ou timers. As partículas
  são `Points` com buffers recalculados como função pura do frame.
- **Assets**: carregados uma vez com `delayRender/continueRender` (`src/lib/assets.tsx` e `src/fonts.ts`).
- **Materiais**: vidro fosco com `transmission`, verniz acrílico com `clearcoat`, metal escovado com
  `anisotropy`, neon com cor acima de 1.0 que só o Bloom (threshold alto) faz brilhar.
- **Iluminação**: estúdio virtual com `Environment` + `Lightformer` do drei (softboxes, sem HDRI externo),
  rim lights verdes, feixes volumétricos simulados por cones aditivos com gradiente.
- **Pós-processamento** (`postprocessing`): profundidade de campo com foco roteirizado, Bloom,
  tone mapping Neutral (preserva as cores da marca), aberração cromática mínima, vinheta e grão
  determinístico (semente = frame).
- **Morph dados -> folhas**: as 65 séries dos gráficos interpolam ponto a ponto até as 65 nervuras das
  5 folhas, com cor fria -> quente (pontual) -> verde-folha.
- **Texto -> partículas -> texto**: pontos amostrados na área das letras dos dois títulos, ligados por
  curvas Bézier que viajam junto com o pan da câmera.
- **Selos**: silhueta vetorizada dos PNGs oficiais e extrudada; a arte oficial vai na face frontal, a
  tipografia ganha relevo (bump) a partir de um mapa de altura gerado da própria arte.
- **Revelação da marca**: o "C" de COMPENSAR cresce até o lugar exato do C da logo; as outras letras viram
  partículas que espiralam para dentro dele e se condensam nos continentes de um globo; "ompensei"
  se materializa a partir do globo. A logo 3D é extrudada do mesmo SVG da logo oficial e a câmera
  termina num enquadramento calculado para que o 3D e o arquivo coincidam pixel a pixel no crossfade.

## Assets para substituir

| Asset | Onde | Situação |
|---|---|---|
| Logo oficial | `public/logo-compensei.svg` | **Provisória**: vetorizada a partir do PNG enviado (512 px). Substitua pelo SVG oficial (branco, fundo transparente). A logo 3D é gerada do mesmo arquivo, então o crossfade continua alinhado. O arquivo precisa ter `viewBox`, e o "C" deve ocupar os primeiros ~16% da largura. Se o C mudar de posição, ajuste `C_LOGO` em `src/camera.ts`. |
| Selos | `assets-src/selo-*.png` | Recortados dos PNGs enviados (cerca de 350x512). Versões em alta resolução melhoram a nitidez de perto. Depois de trocar, rode `python3 scripts/build_images.py && node scripts/build-assets.mjs`. |
| Fonte | `public/fonts/` | Inter (OFL), já incluída. Para outra fonte, troque os `.woff2` e gere os `.typeface.json` em `scripts/build-assets.mjs`. |
| Trilha | `public/audio/trilha.mp3` | Ainda não existe. Ao adicionar o arquivo, ela toca automaticamente. Os frames de batida estão em `batidas` (`src/theme.ts`). |

## Frames de batida (para a trilha)

Veja `batidas` em `src/theme.ts`: entrada de cada título e palavra, cada selo (480, 530, 580, 630),
MEDIR./REDUZIR./COMPENSAR. (805, 825, 845), o C engolindo as letras (942), o globo (966),
a logo oficial (1048) e o CTA (1072).

## Próximo passo

A composição vertical `CompenseiComercialVertical` (1080x1920) entra depois da aprovação desta
versão horizontal, com câmera e tipografia reenquadradas.
