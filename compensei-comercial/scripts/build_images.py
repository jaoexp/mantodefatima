"""
Prepara os assets de imagem a partir dos arquivos em assets-src/.

- Selos: remove o fundo liso (preto ou branco) (flood fill a partir das bordas), recorta pelo
  contorno e normaliza os quatro para o mesmo canvas, para que compartilhem
  a mesma silhueta 3D. Gera tambem uma mascara (uniao das silhuetas) usada
  para extrudar o corpo do selo.
  Gera ainda um mapa de relevo por selo (tipografia em alto-relevo).
- Logo: converte o PNG branco-sobre-preto em branco com alpha.

Uso: python3 scripts/build_images.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src"
OUT = ROOT / "public"

SELOS = ["empresa", "evento", "turismo", "stand"]
SELO_W, SELO_H = 720, 1024


def background_mask(rgb: np.ndarray, thr: int = 40) -> np.ndarray:
    """True onde o pixel pertence ao fundo liso (preto ou branco) conectado as bordas."""
    corner = rgb[0, 0]
    near = (np.abs(rgb - corner).max(axis=2) < thr).astype(np.uint8) * 255
    img = Image.fromarray(near, "L").copy()
    h, w = near.shape
    # Pixels de fundo conectados as bordas viram 128.
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if img.getpixel((x, y)) == 255:
            ImageDraw.floodfill(img, (x, y), 128)
    return np.array(img) == 128


def load_selo(name: str):
    rgb = np.array(Image.open(SRC / f"selo-{name}.png").convert("RGB")).astype(np.int32)
    alpha = np.where(background_mask(rgb), 0, 255).astype(np.uint8)
    a_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.6))
    ys, xs = np.where(np.array(a_img) > 8)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    rgb_img = Image.fromarray(rgb.astype(np.uint8), "RGB").crop(box).resize((SELO_W, SELO_H), Image.LANCZOS)
    a_img = a_img.crop(box).resize((SELO_W, SELO_H), Image.LANCZOS)
    return rgb_img, a_img, rgb[0, 0].max() > 128


def save_relief(name: str, rgb_img: Image.Image) -> None:
    """Mapa de altura: tipografia branca e verde-lima em relevo."""
    rgb = np.array(rgb_img).astype(np.int32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    white = rgb.min(axis=2) > 185
    lime = (g > 170) & (r > 90) & (b < 140)
    height = Image.fromarray(((white | lime) * 255).astype(np.uint8), "L")
    height = height.filter(ImageFilter.GaussianBlur(1.6))
    height.save(OUT / "selos" / f"selo-{name}-relevo.png", optimize=True)


def build_selos() -> None:
    loaded = {name: load_selo(name) for name in SELOS}
    # Silhueta comum: uniao dos selos com fundo escuro. Em selos com fundo
    # branco o filete branco da borda se confunde com o fundo, entao eles
    # herdam a silhueta comum.
    union = None
    for rgb_img, a_img, light_bg in loaded.values():
        if light_bg:
            continue
        a = np.array(a_img) > 127
        union = a if union is None else (union | a)
    mask = Image.fromarray((union * 255).astype(np.uint8), "L").filter(ImageFilter.MedianFilter(5))
    soft = mask.filter(ImageFilter.GaussianBlur(0.8))
    for name, (rgb_img, a_img, light_bg) in loaded.items():
        if light_bg:
            # Mantem o filete branco lateral (que o flood fill removeu junto
            # com o fundo), mas sem criar halo em volta das folhas e do circulo.
            own = np.array(a_img) > 127
            rows = np.zeros_like(own)
            rows[int(SELO_H * 0.12) : int(SELO_H * 0.78), :] = True
            keep = own | ((np.array(mask) > 127) & rows)
            alpha = Image.fromarray((keep * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(0.8))
        else:
            alpha = a_img
        save_relief(name, rgb_img)
        rgb_img.putalpha(alpha)
        rgb_img.save(OUT / "selos" / f"selo-{name}.png", optimize=True)
    # Silhueta em preto sobre branco, como o potrace espera.
    ImageOps.invert(mask).save(ROOT / "scripts" / ".selo-mask.png")


def build_logo() -> None:
    im = Image.open(SRC / "logo-compensei-fonte.png").convert("RGB")
    lum = np.array(im.convert("L")).astype(np.float32)
    alpha = np.clip((lum - 10) / 200 * 255, 0, 255).astype(np.uint8)
    white = np.full(lum.shape + (3,), 255, np.uint8)
    Image.fromarray(np.dstack([white, alpha]), "RGBA").save(OUT / "logo-compensei.png", optimize=True)
    # Versao ampliada (preto sobre branco) para vetorizacao.
    big = im.convert("L").resize((im.width * 8, im.height * 8), Image.BICUBIC)
    big = ImageOps.invert(big.filter(ImageFilter.GaussianBlur(2)))
    big.save(ROOT / "scripts" / ".logo-big.png")


if __name__ == "__main__":
    (OUT / "selos").mkdir(parents=True, exist_ok=True)
    build_selos()
    build_logo()
    print("ok")
