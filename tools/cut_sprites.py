"""Вырезает спрайты героев из листов персонажей.

Запуск: python3 tools/cut_sprites.py
Нужны: pillow, numpy, scipy, ncnn, realesrgan-ncnn-py (из него берутся веса Real-ESRGAN x4plus).

Порядок: кроп → апскейл ×4 (Real-ESRGAN) → удаление белого фона (включая
замкнутые просветы между руками и телом, между пальцами) → очистка светлой
каймы по краю → уменьшение до ×2 от исходника.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'assets', 'heroes')

# имя: (лист, кроп фигуры в полный рост, кроп портрета)
JOBS = {
    'castaneda': ('young_carlos_castaneda_model_sheet.jpg', (760, 665, 1160, 1225), (80, 110, 610, 608)),
    'donjuan': ('don_juan_model_sheet_1-edited.jpg', (800, 640, 1120, 1225), (30, 20, 630, 580)),
    'genaro': ('don_genaro_model_sheet.jpg', (820, 655, 1100, 1215), (80, 85, 650, 598)),
}

_net = None


def upscale4(im, tile=160, pad=10):
    """Real-ESRGAN x4plus через ncnn (CPU), по тайлам."""
    global _net
    import ncnn
    import importlib.util
    if _net is None:
        # сам пакет может не импортироваться (нужен Vulkan), берём только файлы весов
        pkg = importlib.util.find_spec('realesrgan_ncnn_py').submodule_search_locations[0]
        m = os.path.join(pkg, 'models', 'realesrgan-x4plus')
        _net = ncnn.Net()
        _net.opt.num_threads = os.cpu_count() or 4
        _net.load_param(m + '.param')
        _net.load_model(m + '.bin')
    a = np.asarray(im.convert('RGB')).astype(np.float32) / 255.
    H, W, _ = a.shape
    out = np.zeros((H * 4, W * 4, 3), np.float32)
    for y in range(0, H, tile):
        for x in range(0, W, tile):
            y0, x0 = max(0, y - pad), max(0, x - pad)
            y1, x1 = min(H, y + tile + pad), min(W, x + tile + pad)
            t = np.ascontiguousarray(a[y0:y1, x0:x1].transpose(2, 0, 1))
            ex = _net.create_extractor()
            ex.input('data', ncnn.Mat(t))
            _, o = ex.extract('output')
            o = np.array(o).transpose(1, 2, 0)
            ty, tx = (y - y0) * 4, (x - x0) * 4
            h, w = min(tile, H - y) * 4, min(tile, W - x) * 4
            out[y * 4:y * 4 + h, x * 4:x * 4 + w] = o[ty:ty + h, tx:tx + w]
    return Image.fromarray((np.clip(out, 0, 1) * 255 + .5).astype(np.uint8))


def cutout(im, k=4):
    """im — апскейленный кроп на белом фоне; k — во сколько раз он увеличен."""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    s = a.sum(2)
    sat = a.max(2) - a.min(2)
    white = (s > 765 - 45) & (sat < 16)

    # 1) фон, связанный с краем кадра (+ светлая тень под ногами внизу)
    low = np.zeros_like(white)
    low[int(h * 0.86):] = True
    bgish = white | (low & (s > 765 - 300) & (sat < 30))
    lab, _ = ndimage.label(bgish)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))

    # 2) замкнутые белые просветы (между руками и телом, между пальцами).
    #    Голову не трогаем, чтобы не выбить белки глаз и блики.
    lab2, n2 = ndimage.label(white & ~bg)
    if n2:
        sizes = ndimage.sum(np.ones_like(white), lab2, range(1, n2 + 1))
        boxes = ndimage.find_objects(lab2)
        head = h * 0.16
        keep = []
        for i, (sz, sl) in enumerate(zip(sizes, boxes)):
            if sz < 6 * k * k or sl[0].start <= head:
                continue
            # настоящий просвет окружён рукой/телом (темнее), а блик на белой рубашке — светлой тканью
            m = lab2 == i + 1
            ring = ndimage.binary_dilation(m, iterations=3) & ~m
            if s[ring].mean() < 530:
                keep.append(i + 1)
        bg |= np.isin(lab2, keep)

    # 3) оставляем только крупные куски фигуры
    fg = ~bg
    lab3, n3 = ndimage.label(fg)
    if n3 > 1:
        sizes = ndimage.sum(fg, lab3, range(1, n3 + 1))
        fg = np.isin(lab3, [i + 1 for i, sz in enumerate(sizes) if sz > 0.01 * sizes.max()])
    fg = ndimage.binary_opening(fg, iterations=1)

    # 4) мягкий край: в полосе у фона альфа по «белизне», цвет очищается от белого
    r = 2.5 * k / 2
    dist = ndimage.distance_transform_edt(fg)
    band = fg & (dist <= r)
    alpha = fg.astype(np.float32)
    wa = np.clip((765 - s) / 150., 0, 1)            # чем белее пиксель, тем прозрачнее
    alpha[band] = np.minimum(1, np.maximum(wa[band], (dist[band] - 1) / r))
    alpha = ndimage.gaussian_filter(alpha, 0.6) * fg
    al = np.clip(alpha, 1e-3, 1)[..., None]
    rgb = np.where(band[..., None], np.clip((a - (1 - al) * 255) / al, 0, 255), a)

    img = Image.fromarray(np.dstack([rgb, alpha * 255]).astype(np.uint8), 'RGBA')
    return img.crop(img.getbbox())


def downscale(img, factor):
    w, h = img.size
    return img.convert('RGBa').resize((round(w / factor), round(h / factor)), Image.LANCZOS).convert('RGBA')


def main():
    os.makedirs(OUT, exist_ok=True)
    for name, (sheet, body, face) in JOBS.items():
        im = Image.open(os.path.join(ROOT, sheet))
        sprite = downscale(cutout(upscale4(im.crop(body)), 4), 2)   # итог — ×2 от исходника
        sprite.save(os.path.join(OUT, name + '_body.png'), optimize=True)
        portrait = downscale(upscale4(im.crop(face)), 2).convert('RGB')
        portrait.save(os.path.join(OUT, name + '_portrait.jpg'), quality=90)
        print(name, sprite.size, portrait.size)


if __name__ == '__main__':
    main()
