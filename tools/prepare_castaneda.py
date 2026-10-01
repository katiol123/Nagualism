"""Готовит спрайты Кастанеды из исходных фото с прозрачным фоном.

Запуск: python3 tools/prepare_castaneda.py   (нужны pillow, numpy, scipy)
Исходники: assets/heroes/source/castaneda_front.png, castaneda_side.png, castaneda_guard.png, castaneda_attack.png
Результат: assets/heroes/castaneda_body.png (анфас), castaneda_side.png (профиль),\n           castaneda_guard.png (защитная стойка), castaneda_attack.png (выпад)

Фото вырезаны с пурпурного фона, и по краю остаётся розовый отлив.
Убираем его в полосе у края: если и красный, и синий каналы выше зелёного
(признак пурпурного), опускаем их к зелёному. Кожа, рубашка и брюки не страдают —
у них синий канал ниже зелёного.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'assets', 'heroes', 'source')
OUT = os.path.join(ROOT, 'assets', 'heroes')
HEIGHT = 1600   # хватает с запасом для экранов высокой чёткости

def despill(im, band=6):
    a = np.asarray(im).astype(np.float32)
    rgb, al = a[..., :3], a[..., 3]
    solid = al >= 250
    near_edge = ~ndimage.binary_erosion(solid, iterations=band) & (al > 0)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    spill = np.clip(np.minimum(r, b) - g, 0, None) * near_edge
    rgb[..., 0] -= spill
    rgb[..., 2] -= spill
    # почти прозрачная «пыль» по краю — убираем совсем
    al[al < 12] = 0
    return Image.fromarray(np.dstack([np.clip(rgb, 0, 255), al]).astype(np.uint8), 'RGBA')

# Масштаб единый для всех поз: рост в профиль = HEIGHT, остальные позы — в том же масштабе,
# чтобы при смене стойки Карлос не «прыгал» в размерах.
def load(name):
    im = despill(Image.open(os.path.join(SRC, name + '.png')).convert('RGBA'))
    return im.crop(im.getchannel('A').getbbox())

side = load('castaneda_side')
k = HEIGHT / side.height
for src, dst, scale in [('castaneda_front', 'castaneda_body', None), ('castaneda_side', 'castaneda_side', k),
                        ('castaneda_guard', 'castaneda_guard', k), ('castaneda_attack', 'castaneda_attack', k)]:
    im = load(src)
    f = scale if scale else HEIGHT / im.height
    im = im.convert('RGBa').resize((round(im.width * f), round(im.height * f)), Image.LANCZOS).convert('RGBA')
    im.save(os.path.join(OUT, dst + '.png'), optimize=True)
    print(dst, im.size)
