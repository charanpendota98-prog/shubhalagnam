#!/usr/bin/env python3
"""
🎬 Build a ~10-second CINEMATIC Telugu wedding "film" for the
"A short wedding story" section (WeddingStoryHero).

Story arc from 4 real ceremony stills:
  story-1  mandapam + homam (the ceremony begins)
  story-2  THALI / mangalsutra tying (the sacred moment)
  story-3  talambralu (joyful shower of rice + pearls)
  story-4  garland exchange at sunset (together forever)

Each scene gets slow Ken-Burns motion (zoom + pan) and scenes are joined with
smooth crossfades. Output = animated WebP (autoplays + loops natively in the
browser like a background video, no <video> element needed).

Regen:  cd frontend && python3 scripts/make_story_film.py
"""
from PIL import Image
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PROMO = os.path.join(HERE, "..", "public", "promo")

SCENES = ["story-1.jpg", "story-2.jpg", "story-3.jpg", "story-4.jpg"]

OUT_W, OUT_H = 768, 432          # 16:9, light hero
FPS = 13
HOLD_S = 2.9                     # seconds of motion per scene  (~4 * 2.9 ≈ 10s incl. fades)
FADE_S = 0.7                     # crossfade duration
HOLD = int(HOLD_S * FPS)
FADE = int(FADE_S * FPS)


def ease(t):                     # easeInOut (smooth cinematic motion)
    return t * t * (3 - 2 * t)


def kb_frame(img, t, zoom_from, zoom_to, pan):
    """Crop a moving/zooming window from img and resize to OUT."""
    iw, ih = img.size
    z = zoom_from + (zoom_to - zoom_from) * ease(t)
    cw, ch = iw / z, ih / z
    px, py = pan
    max_x, max_y = iw - cw, ih - ch
    cx = max_x * (0.5 + px * (t - 0.5))
    cy = max_y * (0.5 + py * (t - 0.5))
    cx = max(0, min(max_x, cx)); cy = max(0, min(max_y, cy))
    box = (cx, cy, cx + cw, cy + ch)
    return img.crop([int(v) for v in box]).resize((OUT_W, OUT_H), Image.LANCZOS)


# Per-scene motion recipes (zoom_from, zoom_to, (pan_x, pan_y))
MOVES = [
    (1.05, 1.18, ( 0.35,  0.15)),   # ease into the mandapam
    (1.16, 1.05, (-0.25,  0.10)),   # pull back a touch on the thali moment
    (1.06, 1.20, ( 0.30, -0.20)),   # rise with the talambralu shower
    (1.18, 1.06, (-0.30,  0.15)),   # settle on the couple together
]


def cover(img):
    """Center-crop the source to 16:9 so Ken-Burns never reveals edges."""
    iw, ih = img.size
    target = OUT_W / OUT_H
    if iw / ih > target:
        nw = int(ih * target); x = (iw - nw) // 2
        return img.crop((x, 0, x + nw, ih))
    nh = int(iw / target); y = (ih - nh) // 2
    return img.crop((0, y, iw, y + nh))


imgs = [cover(Image.open(os.path.join(PROMO, s)).convert("RGB")) for s in SCENES]

# 1) render each scene's Ken-Burns frames
scene_frames = []
for img, mv in zip(imgs, MOVES):
    zf, zt, pan = mv
    scene_frames.append([kb_frame(img, i / (HOLD - 1), zf, zt, pan) for i in range(HOLD)])

# 2) stitch with crossfades (blend tail of scene N into head of scene N+1)
out = []
n = len(scene_frames)
for si in range(n):
    cur = scene_frames[si]
    nxt = scene_frames[(si + 1) % n]
    # hold frames (minus the tail that will crossfade)
    out.extend(cur[: HOLD - FADE])
    # crossfade tail(cur) -> head(nxt)
    for k in range(FADE):
        a = cur[HOLD - FADE + k]
        b = nxt[k]
        out.append(Image.blend(a, b, ease((k + 1) / FADE)))

duration_ms = int(1000 / FPS)
out_path = os.path.join(PROMO, "wedding-story-film.webp")
out[0].save(
    out_path,
    save_all=True,
    append_images=out[1:],
    duration=duration_ms,
    loop=0,
    format="WEBP",
    quality=55,
    method=6,
)
total_s = len(out) / FPS
print(f"✅ wrote {out_path}  ({len(out)} frames, ~{total_s:.1f}s, {OUT_W}x{OUT_H})")
