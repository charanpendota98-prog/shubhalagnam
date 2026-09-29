#!/usr/bin/env python3
"""
🎬 Build a cinematic wedding "film" from the 4 real wedding stills.
Ken-Burns (slow zoom + pan) per scene, smooth crossfades between scenes.
Output = animated WebP (autoplays + loops natively in browsers, like a bg video).
"""
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PROMO = os.path.join(HERE, "..", "public", "promo")

SCENES = ["cine-1.jpg", "cine-2.jpg", "cine-3.jpg", "cine-4.jpg"]

OUT_W, OUT_H = 768, 432          # 16:9 output
FPS = 12
HOLD_S = 2.6                     # seconds of motion per scene
FADE_S = 0.75                    # crossfade duration
HOLD = int(HOLD_S * FPS)
FADE = int(FADE_S * FPS)

def ease(t):                     # easeInOut
    return t * t * (3 - 2 * t)

def kb_frame(img, t, zoom_from, zoom_to, pan):
    """Crop a moving/zooming window from img and resize to OUT."""
    iw, ih = img.size
    z = zoom_from + (zoom_to - zoom_from) * ease(t)
    cw, ch = iw / z, ih / z
    # pan across available slack
    px, py = pan
    max_x, max_y = iw - cw, ih - ch
    cx = max_x * (0.5 + px * (t - 0.5))
    cy = max_y * (0.5 + py * (t - 0.5))
    cx = max(0, min(max_x, cx)); cy = max(0, min(max_y, cy))
    box = (cx, cy, cx + cw, cy + ch)
    return img.crop([int(v) for v in box]).resize((OUT_W, OUT_H), Image.LANCZOS)

# Per-scene motion recipes (zoom_from, zoom_to, (pan_x, pan_y))
MOVES = [
    (1.06, 1.20, ( 0.5,  0.2)),
    (1.20, 1.06, (-0.4,  0.1)),
    (1.05, 1.22, ( 0.3, -0.3)),
    (1.22, 1.08, (-0.3,  0.2)),
]

imgs = [Image.open(os.path.join(PROMO, s)).convert("RGB") for s in SCENES]

# 1) render each scene's Ken-Burns frames
scene_frames = []
for img, mv in zip(imgs, MOVES):
    zf, zt, pan = mv
    frames = [kb_frame(img, i / (HOLD - 1), zf, zt, pan) for i in range(HOLD)]
    scene_frames.append(frames)

# 2) stitch with crossfades (blend tail of scene N into head of scene N+1)
out = []
n = len(scene_frames)
for si in range(n):
    cur = scene_frames[si]
    nxt = scene_frames[(si + 1) % n]
    # hold frames (minus the tail that will be used for the fade)
    out.extend(cur[:HOLD - FADE])
    # crossfade tail(cur) -> head(nxt)
    for f in range(FADE):
        a = ease(f / FADE)
        out.append(Image.blend(cur[HOLD - FADE + f], nxt[f], a))

# tiny gold vignette overlay for a graded, filmic look
vig = Image.new("L", (OUT_W, OUT_H), 0)
from PIL import ImageDraw
d = ImageDraw.Draw(vig)
for i in range(60):
    a = int(90 * (i / 60) ** 2)
    d.rectangle([i, i, OUT_W - i, OUT_H - i], outline=a)
graded = []
for fr in out:
    dark = Image.new("RGB", fr.size, (18, 4, 14))
    fr = Image.composite(dark, fr, vig)
    graded.append(fr)

dur_ms = int(1000 / FPS)
first, rest = graded[0], graded[1:]
out_path = os.path.join(PROMO, "wedding-film.webp")
first.save(out_path, format="WEBP", save_all=True, append_images=rest,
           duration=dur_ms, loop=0, quality=42, method=4)
print("frames:", len(graded), "->", out_path,
      round(os.path.getsize(out_path) / 1024, 1), "KB")
