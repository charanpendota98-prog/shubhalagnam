#!/usr/bin/env python3
"""Build the homepage hero film from still frames.

The hero plays a decorative, muted background film. This script renders a slow
Ken Burns move over each still, cross-dissolves between them, and closes the
sequence by dissolving the last frame back into the first so the loop point is
invisible. It also writes the poster from the exact first frame, so the
priority <Image> and the video poster match and nothing jumps on load.

Two encodes are produced:
  promo/wedding-film.mp4        (desktop, native still size)
  promo/wedding-film-mobile.mp4 (smaller, for phones and Save-Data)

Run:  python3 scripts/build-hero-film.py
"""
from __future__ import annotations

import os
import sys

from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROMO = os.path.join(ROOT, "public", "promo")
FRAMES = os.path.join(PROMO, "film")

FPS = 30
HOLD = 4.2          # seconds each still is on screen
FADE = 1.1          # cross-dissolve length, seconds
SIZE = (1376, 768)  # native size of the generated stills

# (file, zoom start, zoom end, pan start (x, y), pan end (x, y))
CLIPS = [
    ("f2-mandapam.jpg", 1.00, 1.10, (0.50, 0.52), (0.54, 0.48)),
    ("f1-garlands.jpg", 1.12, 1.00, (0.56, 0.46), (0.46, 0.52)),
    ("f5-jeelakarra.jpg", 1.02, 1.12, (0.50, 0.44), (0.50, 0.56)),
    ("f3-diyas.jpg", 1.10, 1.00, (0.48, 0.58), (0.52, 0.46)),
    ("f4-rangoli.jpg", 1.00, 1.08, (0.54, 0.50), (0.46, 0.50)),
]

W, H = SIZE


def ease(t: float) -> float:
    """Smoothstep, so a dissolve never looks like a hard cut."""
    t = min(1.0, max(0.0, t))
    return t * t * (3 - 2 * t)


def render(image: Image.Image, zoom: float, center: tuple[float, float]) -> Image.Image:
    """Crop a zoomed, panned window out of a still at exactly W x H."""
    crop_w = W / zoom
    crop_h = H / zoom
    cx = center[0] * image.width
    cy = center[1] * image.height
    left = cx - crop_w / 2
    top = cy - crop_h / 2
    left = min(max(left, 0), max(0, image.width - crop_w))
    top = min(max(top, 0), max(0, image.height - crop_h))
    box = (left, top, left + crop_w, top + crop_h)
    return image.resize((W, H), Image.LANCZOS, box=box)


def render_frame(source: Image.Image, zoom_a: float, zoom_b: float,
                 pan_a: tuple[float, float], pan_b: tuple[float, float],
                 index: int, count: int) -> Image.Image:
    t = 0.0 if count <= 1 else index / (count - 1)
    eased = ease(t)
    zoom = zoom_a + (zoom_b - zoom_a) * eased
    center = (pan_a[0] + (pan_b[0] - pan_a[0]) * eased,
              pan_a[1] + (pan_b[1] - pan_a[1]) * eased)
    frame = render(source, zoom, center)
    # A whisper of softness keeps the dissolves from banding on dark gradients.
    if index % 5 == 0:
        frame = frame.filter(ImageFilter.GaussianBlur(0.3))
    return frame


def blend(a: Image.Image, b: Image.Image, alpha: float) -> Image.Image:
    if alpha <= 0:
        return a
    if alpha >= 1:
        return b
    return Image.blend(a, b, alpha)


def iter_frames():
    """Yield the film frame by frame.

    Streamed on purpose: only the frames needed for the current dissolve are
    held in memory, so the render never needs the whole film resident.
    """
    L = int(round(HOLD * FPS))
    F = int(round(FADE * FPS))
    first_frame: Image.Image | None = None
    tail: list[Image.Image] | None = None
    last_frame: Image.Image | None = None

    for name, zoom_a, zoom_b, pan_a, pan_b in CLIPS:
        source = Image.open(os.path.join(FRAMES, name)).convert("RGB")
        if source.size[0] < W or source.size[1] < H:
            source = source.resize((max(W, source.size[0]), max(H, source.size[1])), Image.LANCZOS)
        buf: list[Image.Image] = []
        for index in range(L):
            frame = render_frame(source, zoom_a, zoom_b, pan_a, pan_b, index, L)
            if tail is not None and index < F:
                frame = blend(tail[index], frame, ease((index + 1) / F))
            if first_frame is None:
                first_frame = frame.copy()
                yield first_frame
                continue
            buf.append(frame)
            if len(buf) > F:
                yield buf.pop(0)
        tail = buf
        last_frame = buf[-1] if buf else last_frame

    # Seamless loop: dissolve the very last frame back into the very first one,
    # so the file's last frame is the frame the loop restarts with.
    if first_frame is not None and last_frame is not None:
        for j in range(F):
            yield blend(last_frame, first_frame, (j + 1) / F)


def main() -> int:
    try:
        import imageio_ffmpeg
    except ImportError:
        print("imageio-ffmpeg is required: pip install imageio-ffmpeg", file=sys.stderr)
        return 1

    poster_path = os.path.join(PROMO, "hero-bg-ultra.jpg")
    targets = [
        # Sized for a decorative background: sharp enough full-bleed, small
        # enough that the hero never pays for it on a phone connection.
        (os.path.join(PROMO, "wedding-film.mp4"), "1280:-2", "32", "slow"),
        (os.path.join(PROMO, "wedding-film-mobile.mp4"), "854:-2", "35", "slow"),
    ]

    writers = []
    for path, scale, crf, preset in targets:
        gen = imageio_ffmpeg.write_frames(
            path, SIZE, fps=FPS, quality=None, codec="libx264",
            output_params=["-vf", f"scale={scale}", "-crf", crf, "-preset", preset,
                           "-g", "60", "-movflags", "+faststart", "-profile:v", "main"],
        )
        gen.send(None)  # seed
        writers.append(gen)

    total = 0
    try:
        for frame in iter_frames():
            if total == 0:
                frame.save(poster_path, "JPEG", quality=84, optimize=True, progressive=True)
                print(f"poster  -> {os.path.relpath(poster_path, ROOT)} "
                      f"({os.path.getsize(poster_path) // 1024} KB)")
            data = frame.tobytes()
            for gen in writers:
                gen.send(data)
            total += 1
    finally:
        for gen in writers:
            try:
                gen.close()
            except Exception:  # noqa: BLE001
                pass

    print(f"rendered {total} frames ({total / FPS:.1f}s at {FPS}fps)")
    for path, _scale, crf, _preset in targets:
        print(f"film    -> {os.path.relpath(path, ROOT)} "
              f"({os.path.getsize(path) // 1024} KB, crf {crf})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
