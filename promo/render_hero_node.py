#!/usr/bin/env python3
"""
Browser-free renderer for the landing hero loop (assets/promo/hero.mp4).

The live-3D-spin version needs WebGL captured in a real browser (configurator → "Record clip").
This script renders the *montage* concept of Remotion's HeroLoop — a loop-safe dissolve through
the real product renders with Ken-Burns motion, a rotating "Customise …" caption and the wordmark
— entirely with Pillow + ffmpeg, so it can run in CI / the headless sandbox.

Run:  python3 promo/render_hero_node.py        (needs: pillow imageio imageio-ffmpeg numpy)
Out:  assets/promo/hero.mp4  (1920x1080, ~8s, H.264, yuv420p, faststart)
"""
import os, math
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB  = os.path.join(ROOT, "promo", "public")
OUT  = os.path.join(ROOT, "assets", "promo", "hero.mp4")
FONT = os.path.join(ROOT, "text", "Essentials", "Inter.ttf")

# Square (1:1) to drop cleanly into the landing hero's collage slot with no cropping.
# (Remotion's HeroLoop stays 16:9 for standalone / social use.)
W, H, FPS, SECS = 1080, 1080, 30, 8
N = FPS * SECS                      # 240 frames
INK = (20, 16, 14)
GOLD = (199, 154, 99)
GOLDB = (210, 155, 53)
WHITE = (255, 255, 255)
FG = (190, 184, 176)

IMAGES = ["honeyloom.jpg", "coffee-cup.jpg", "honeyloom-2.jpg", "honeyloom-3.jpg"]
WORDS  = ["colour.", "the finish.", "your logo.", "in 3D."]


def font(px, bold=False):
    f = ImageFont.truetype(FONT, px)
    return f


def cover(img, zoom):
    """Scale `img` to cover WxH at `zoom`, centre-crop to WxH."""
    iw, ih = img.size
    s = max(W / iw, H / ih) * zoom
    nw, nh = max(W, int(iw * s)), max(H, int(ih * s))
    im = img.resize((nw, nh), Image.BILINEAR)
    x, y = (nw - W) // 2, (nh - H) // 2
    return im.crop((x, y, x + W, y + H))


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def clamp01(x):
    return 0.0 if x < 0 else (1.0 if x > 1 else x)


# Preload images (RGB)
imgs = [Image.open(os.path.join(PUB, n)).convert("RGB") for n in IMAGES]
seg = N / len(imgs)

# Bottom scrim (dark → transparent), built once
scrim = Image.new("RGBA", (W, H), (0, 0, 0, 0))
sd = scrim.load()
for y in range(H):
    t = clamp01((y - H * 0.46) / (H * 0.54))   # 0 at 46% height → 1 at bottom
    a = int(190 * (t ** 1.6))
    if a:
        for x in range(0, W, 1):
            sd[x, y] = (10, 8, 6, a)

f_mark = font(40)
f_cust = font(27)
f_word = font(68)
f_sub  = font(21)


def frame(i):
    base = Image.new("RGB", (W, H), INK)
    # dissolve through images (loop-safe via modular distance)
    for k, im in enumerate(imgs):
        center = k * seg + seg / 2
        d = abs(((i - center + N / 2) % N) - N / 2)
        op = clamp01((seg / 2 + 16 - d) / 32.0)     # 1 near center → 0 at ±(seg/2+16)
        if op <= 0.001:
            continue
        local = ((i - k * seg) % N) / N
        zoom = 1.06 + local * 0.12                  # slow Ken-Burns
        layer = cover(im, zoom)
        if op >= 0.999:
            base = layer
        else:
            base = Image.blend(base, layer, op)
    base = base.convert("RGBA")
    base.alpha_composite(scrim)
    d = ImageDraw.Draw(base)
    # wordmark
    d.text((52, 46), "IMPRINT", font=f_mark, fill=WHITE, stroke_width=1, stroke_fill=WHITE)
    wlen = d.textlength("IMPRINT", font=f_mark)
    d.text((52 + wlen + 2, 46), "®", font=f_mark, fill=GOLD)
    # caption
    cy = H - 225
    d.text((52, cy), "Customise", font=f_cust, fill=FG)
    widx = int(i // seg) % len(WORDS)
    local = i % seg
    wop = clamp01(min((local) / 9.0, (seg - local) / 9.0))   # fade in/out within the segment
    if wop > 0:
        col = lerp(INK, GOLDB, wop)
        d.text((52, cy + 36), WORDS[widx], font=f_word, fill=col, stroke_width=1, stroke_fill=col)
    d.text((52, cy + 128), "Real-time 3D · auto-routed to vetted makers", font=f_sub, fill=FG)
    return base.convert("RGB").tobytes()


os.makedirs(os.path.dirname(OUT), exist_ok=True)
# CRF-controlled H.264 so the hero stays small/fast (~2-3 MB), web-friendly (yuv420p + faststart).
writer = imageio_ffmpeg.write_frames(
    OUT, (W, H), fps=FPS, codec="libx264", pix_fmt_in="rgb24", pix_fmt_out="yuv420p",
    macro_block_size=1,
    output_params=["-crf", "27", "-preset", "slow", "-movflags", "+faststart", "-an"],
)
writer.send(None)
for i in range(N):
    writer.send(frame(i))
writer.close()
print("wrote", OUT, os.path.getsize(OUT), "bytes")
