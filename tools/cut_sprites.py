from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage
import os
# Вырезает спрайты героев из листов персонажей. Запуск: python3 tools/cut_sprites.py (нужны pillow, numpy, scipy)
src=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')+'/'
out=src+'assets/heroes/'
jobs={
 'castaneda':('young_carlos_castaneda_model_sheet.jpg',(760,665,1160,1225),(80,110,610,608)),
 'donjuan':('don_juan_model_sheet_1-edited.jpg',(800,640,1120,1225),(30,20,630,580)),
 'genaro':('don_genaro_model_sheet.jpg',(820,655,1100,1215),(80,85,650,598)),
}
def cutout(im):
    a=np.asarray(im.convert('RGB')).astype(int)
    # distance from white
    d=255*3-a.sum(2)
    sat=a.max(2)-a.min(2)
    bgish=(d<40)&(sat<25)
    h=a.shape[0]; low=np.zeros_like(bgish); low[int(h*0.86):]=True
    bgish|=low&(d<200)&(sat<28)
    lab,_=ndimage.label(bgish)
    border=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(border))
    fg=~bg
    # keep largest component + those attached
    lab2,n=ndimage.label(fg)
    if n>1:
        sizes=ndimage.sum(fg,lab2,range(1,n+1))
        keep=[i+1 for i,s in enumerate(sizes) if s>0.01*sizes.max()]
        fg=np.isin(lab2,keep)
    fg=ndimage.binary_erosion(fg,iterations=2)
    alpha=Image.fromarray((fg*255).astype('uint8')).filter(ImageFilter.GaussianBlur(1.2))
    rgba=im.convert('RGBA'); rgba.putalpha(alpha)
    bb=rgba.getbbox(); return rgba.crop(bb)
for k,(f,body,face) in jobs.items():
    im=Image.open(src+f)
    b=cutout(im.crop(body)); b.save(out+k+'_body.png',optimize=True)
    p=im.crop(face).convert('RGB'); p.save(out+k+'_portrait.jpg',quality=88)
    print(k,b.size,p.size)
