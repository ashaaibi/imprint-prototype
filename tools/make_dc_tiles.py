#!/usr/bin/env python3
"""Generate DC-franchise placeholder tiles for the DC store concept page.

CONCEPT PLACEHOLDERS ONLY — clean wordmark tiles (franchise name on a themed gradient), NOT the
copyrighted character artwork. Swap in real licensed art into assets/stores/dc/<id>.* once rights
are held (and ideally on a private host). Re-run:  python3 tools/make_dc_tiles.py
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "stores", "dc")
os.makedirs(OUT, exist_ok=True)
W = 640
SANS = "'Helvetica Neue',Arial,sans-serif"
COND = "'Arial Narrow',Impact,sans-serif"

def grad(a, b):
    return (f'<linearGradient id="g" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>')

def tile(lines, fill, size, a, b, font=COND, weight=900, tracking=3):
    n=len(lines); lh=size*1.05; y0=W/2-(n-1)*lh/2+size*0.34
    body=''.join(f'<text x="{W/2}" y="{y0+i*lh:.0f}" text-anchor="middle" font-family="{font}" '
                 f'font-size="{size}" font-weight="{weight}" letter-spacing="{tracking}" fill="{fill}">{ln.replace("&","&amp;")}</text>'
                 for i,ln in enumerate(lines))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {W}" width="{W}" height="{W}">'
            f'{grad(a,b)}<rect width="{W}" height="{W}" fill="url(#g)"/>{body}</svg>')

FRANCHISES = {
 'batman':         (['BATMAN'],              '#ffd23f', '#1a1d27', '#05060a'),
 'superman':       (['SUPER','MAN'],         '#ffffff', '#0a56b0', '#b3122b'),
 'wonder-woman':   (['WONDER','WOMAN'],      '#f2c14e', '#9b1b2e', '#5a0f1c'),
 'the-flash':      (['THE','FLASH'],         '#ffffff', '#d11a2a', '#f0a500'),
 'green-lantern':  (['GREEN','LANTERN'],     '#d6ff4a', '#0a7d2c', '#04340f'),
 'justice-league': (['JUSTICE','LEAGUE'],    '#e8c558', '#16243f', '#0a1428'),
 'joker-harley':   (['JOKER','& HARLEY'],    '#c8ff4a', '#3a1c5e', '#1f7a3a'),
 'batwheels':      (['BAT','WHEELS'],        '#ffd23f', '#26262b', '#000000'),
}
for fid,(lines,fill,a,b) in FRANCHISES.items():
    size = 132 if len(lines)==1 else 104
    open(os.path.join(OUT,f'{fid}.svg'),'w',encoding='utf-8').write(tile(lines,fill,size,a,b))
print("wrote", len(FRANCHISES), "DC franchise tiles ->", OUT)
