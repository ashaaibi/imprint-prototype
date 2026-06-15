#!/usr/bin/env python3
"""Generate concept brand-tile SVGs for the "Officially Licensed Stores" row.

These are placeholder wordmark tiles (Zazzle blocks hot-linking, so we can't pull the
real art) — clean, recognisable, cohesive. Swap in real licensed art later by dropping
<id>.svg|png into assets/stores/ and pointing the catalog at it. Re-run:  python3 tools/make_store_tiles.py
"""
import os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "stores")
os.makedirs(OUT, exist_ok=True)

W = 640
def grad(id_, a, b, angle="0,0,0,1"):
    x1,y1,x2,y2 = angle.split(",")
    return (f'<linearGradient id="{id_}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}">'
            f'<stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>')

def text(lines, fill, size, font, weight=800, tracking=0, italic=False, cy=None):
    n = len(lines); lh = size*1.04
    cy = cy if cy is not None else W/2
    y0 = cy - (n-1)*lh/2 + size*0.34
    st = 'italic' if italic else 'normal'
    out = ''
    for i,ln in enumerate(lines):
        out += (f'<text x="{W/2}" y="{y0+i*lh:.0f}" text-anchor="middle" '
                f'font-family="{font}" font-size="{size}" font-weight="{weight}" '
                f'font-style="{st}" letter-spacing="{tracking}" fill="{fill}">{ln}</text>')
    return out

SANS = "'Helvetica Neue',Arial,sans-serif"
SERIF = "Georgia,'Times New Roman',serif"
SCRIPT = "'Segoe Script','Brush Script MT','Comic Sans MS',cursive"
COND = "'Arial Narrow',Impact,sans-serif"

# id, accent (for the catalog card/hero), builder -> inner SVG
def disney():
    return (grad('g','#2a52c4','#0b1f63','0,0,1,1') +
            f'<rect width="{W}" height="{W}" fill="url(#g)"/>' +
            ''.join(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#fff" opacity="{op}"/>'
                    for cx,cy,r,op in [(110,120,3,.9),(150,90,2,.7),(520,140,3,.8),(560,100,2,.6),(90,520,2,.6),(540,520,3,.7)]) +
            f'<path d="M320 96 l10 22 24 3 -17 17 4 24 -21-11 -21 11 4-24 -17-17 24-3z" fill="#ffd54a" opacity=".95"/>' +
            text(["Disney"], '#ffffff', 116, SCRIPT, 700, 0, italic=True, cy=360))

def marvel():
    return (f'<rect width="{W}" height="{W}" fill="#ed1d24"/>' +
            f'<rect x="40" y="232" width="560" height="176" rx="10" fill="#ed1d24" stroke="#fff" stroke-width="6"/>' +
            text(["MARVEL"], '#ffffff', 96, SANS, 900, 4, cy=320))

def starwars():
    return (f'<rect width="{W}" height="{W}" fill="#06060a"/>' +
            ''.join(f'<circle cx="{(i*73)%620+10}" cy="{(i*131)%600+12}" r="{1+(i%3)*0.7}" fill="#fff" opacity="{.4+(i%4)*.12}"/>' for i in range(46)) +
            text(["STAR","WARS"], '#ffe81f', 118, COND, 900, 6, cy=320))

def dc():
    return (grad('g','#0a86ff','#023a8f','0,0,1,1') +
            f'<rect width="{W}" height="{W}" fill="url(#g)"/>' +
            f'<circle cx="{W/2}" cy="{W/2}" r="150" fill="none" stroke="#fff" stroke-width="12"/>' +
            text(["DC"], '#ffffff', 150, SANS, 900, 2))

def drseuss():
    return (grad('g','#e23b4e','#f6a83a','0,0,1,1') +
            f'<rect width="{W}" height="{W}" fill="url(#g)"/>' +
            ''.join(f'<rect x="430" y="{60+i*34}" width="150" height="17" fill="{c}" transform="rotate(8 505 {68+i*34})"/>'
                    for i,c in enumerate(['#fff','#d8324a','#fff','#d8324a'])) +
            text(["Dr.","Seuss"], '#ffffff', 118, SCRIPT, 700, 0, italic=True, cy=360))

def sesame():
    return (grad('g','#27b24a','#0f8a39','0,0,1,1') +
            f'<rect width="{W}" height="{W}" fill="url(#g)"/>' +
            f'<circle cx="540" cy="110" r="56" fill="#ffd23f"/>' +
            ''.join(f'<rect x="{536-2}" y="{38+a}" width="8" height="20" rx="4" fill="#ffd23f" transform="rotate({ang} 540 110)"/>' for a,ang in [(0,0)] for ang in range(0,360,45)) +
            text(["Sesame","Street"], '#ffffff', 92, SANS, 800, 0, cy=360))

def monsterjam():
    return (grad('g','#26262b','#0c0c0f','0,0,1,1') +
            f'<rect width="{W}" height="{W}" fill="url(#g)"/>' +
            f'<path d="M320 120 l150 90 -300 0z" fill="none" stroke="#ffd23f" stroke-width="10"/>' +
            text(["MONSTER","JAM"], '#ffffff', 96, COND, 900, 3, italic=True, cy=370))

def wizarding():
    return (grad('g','#241433','#0a0712','0,0,1,1') +
            f'<rect width="{W}" height="{W}" fill="url(#g)"/>' +
            ''.join(f'<path d="M{cx} {cy-r}l{r*.28:.0f} {r*.9:.0f}-{r*.95:.0f}-{r*.55:.0f}h{r*1.18:.0f}l-{r*.95:.0f} {r*.55:.0f}z" fill="#c9a24a" opacity="{op}"/>'
                    for cx,cy,r,op in [(120,140,16,.9),(530,120,12,.7),(560,500,14,.8),(100,500,11,.6)]) +
            text(["Wizarding","World"], '#c9a24a', 92, SERIF, 800, 1, cy=360))

BRANDS = {
 'disney': disney, 'marvel': marvel, 'star-wars': starwars, 'dc': dc,
 'dr-seuss': drseuss, 'sesame-street': sesame, 'monster-jam': monsterjam, 'wizarding-world': wizarding,
}

for sid, fn in BRANDS.items():
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {W}" width="{W}" height="{W}">'
           + fn() + '</svg>')
    with open(os.path.join(OUT, f"{sid}.svg"), "w", encoding="utf-8") as f:
        f.write(svg)
print("wrote", len(BRANDS), "store tiles ->", OUT)
