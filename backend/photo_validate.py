"""
📸 PROFILE PHOTO VALIDATION — deterministic image checks plus a separate human review queue.
===========================================================================================
This module checks decoded format, size, dimensions, brightness, texture, sharpness,
glare, and a narrow dark-frame heuristic. It cannot determine who is pictured,
count faces, establish consent, or verify legal identity. Staff review suitability
before approval; that review is not an identity-verification result.

Checks (order):
  FORMAT → SIZE → DIMENSIONS → BRIGHTNESS → FLAT/LOW_TEXTURE → BLUR → GLARE → FRAME_HEURISTIC
Returns {ok, reason, en, te, checks}; reason codes are used by the upload UI.
"""
from __future__ import annotations

import io

from PIL import Image, ImageFilter, ImageStat

MIN_SIDE = 350          # min(w,h) — kindaki ante LOW_RES (screenshot 5 standard)
MIN_BYTES = 4 * 1024
MAX_BYTES = 5 * 1024 * 1024
MAX_SIDE = 12_000
MAX_PIXELS = 50_000_000
DARK_MEAN = 42          # kinda = TOO_DARK
BRIGHT_MEAN = 228       # paina = TOO_BRIGHT (white/overexposed)
FLAT_STD = 11           # kinda = FLAT (single-color / blank / fake)
BLUR_VAR = 250.0        # Laplacian variance (480px) kinda = BLURRY (sharp≈460+, blur≈230)
JPEG_DENSITY = 45.0     # JPEG bytes-per-kilo-pixel kinda = mush/heavy-blur (sharp≈150+, heavy-blur<35)
GLARE_PCT = 12.0        # % pixels >= 250 paina = GLARE (flash / screen reflection)
FRAME_BAND = 0.045      # top+bottom dark band >= 4.5% height each = PHOTO_OF_PHOTO frame
FRAME_DARK = 28         # band mean kinda + center paina → frame undi

REASONS = {
    "OK": ("Photo looks clear ✅", "ఫోటో క్లియర్‌గా ఉంది ✅ — admin approval కి వెళ్లింది"),
    "BAD_FORMAT": ("Not a valid photo file", "ఇది సరైన ఫోటో ఫైల్ కాదు — JPG/PNG/WebP పెట్టండి"),
    "TOO_BIG": ("Photo larger than 5 MB", "ఫోటో 5MB కన్నా పెద్దది — చిన్న ఫోటో పంపండి"),
    "TOO_SMALL_FILE": ("Photo file is empty/corrupt", "ఫోటో ఖాళీ/పాడైంది — మళ్లీ upload చెయ్యండి"),
    "LOW_RES": ("Image resolution too low", "ఫోటో resolution చాలా తక్కువ — high-quality original photo పెట్టండి (min 350px)"),
    "IMAGE_DIMENSIONS": ("Image dimensions are too large", "ఫోటో dimensions చాలా ఎక్కువగా ఉన్నాయి — చిన్న resolution ఉన్న copy పంపండి"),
    "ANIMATED": ("Animated images are not supported", "Animated చిత్రం వద్దు — ఒకే ఫ్రేమ్ ఉన్న అసలు ఫోటో పంపండి"),
    "TOO_DARK": ("Photo is too dark", "ఫోటో చాలా చీకటిగా ఉంది — వెలుతురులో తీసిన ఫోటో పంపండి"),
    "TOO_BRIGHT": ("Photo is overexposed/blank", "ఫోటో తెల్లగా/మసకga ఉంది — సరైన ఫోటో పంపండి"),
    "FLAT": ("Image appears blank or nearly uniform", "ఫోటో ఖాళీగా లేదా ఒకే రంగులో ఉంది — స్పష్టమైన అసలు ఫోటోను పంపండి"),
    "BLURRY": ("Photo is blurry", "ఫోటో blur గా ఉంది — clear/sharp ఫోటో పంపండి"),
    "GLARE": ("Flash/glare detected — photo of a photo?", "ఫోటోపై flash/glare ఉంది — screen/photo ని తీసినది కాకుండా ORIGINAL ఫోటో పంపండి"),
    "PHOTO_OF_PHOTO": ("Possible photo-of-photo frame detected", "వేరే ఫోటో చుట్టూ frame ఉన్నట్లుంది — మీ original image‌ను upload చేయండి"),
}


def _fail(reason, checks):
    en, te = REASONS[reason]
    return {"ok": False, "reason": reason, "en": en, "te": te, "checks": checks}


def _pass(checks):
    en, te = REASONS["OK"]
    return {"ok": True, "reason": "OK", "en": en, "te": te, "checks": checks}


def _laplacian_var(gray: Image.Image) -> float:
    """Blur score — Laplacian variance @480px (ఎక్కువ = sharp). ImageStat = C-speed (~5ms)."""
    g = gray.copy()
    g.thumbnail((480, 480), Image.BILINEAR)
    lap = g.filter(ImageFilter.Kernel((3, 3), (0, 1, 0, 1, -4, 1, 0, 1, 0), scale=1))
    return ImageStat.Stat(lap).var[0]


def sanitize_photo(data: bytes, image_format: str) -> bytes:
    """Re-encode an accepted image without EXIF/XMP or other user metadata.

    Member photos may become public after moderation.  Saving the upload bytes
    verbatim can disclose GPS coordinates, device identifiers, or editing
    history through EXIF even when the profile API is privacy-safe.
    """
    try:
        source = Image.open(io.BytesIO(data))
        source.load()
        if image_format == "JPEG":
            clean = source.convert("RGB")
            save_kwargs = {"format": "JPEG", "quality": 90, "optimize": True, "progressive": True}
        elif image_format == "PNG":
            # A fresh image object drops ``info``/text chunks and preserves alpha.
            mode = "RGBA" if "A" in source.getbands() else "RGB"
            clean = source.convert(mode)
            save_kwargs = {"format": "PNG", "optimize": True}
        elif image_format == "WEBP":
            clean = source.convert("RGBA" if "A" in source.getbands() else "RGB")
            save_kwargs = {"format": "WEBP", "quality": 90, "method": 6}
        else:
            raise ValueError("unsupported decoded format")
        output = io.BytesIO()
        clean.save(output, **save_kwargs)
        sanitized = output.getvalue()
        if not sanitized or len(sanitized) > MAX_BYTES:
            raise ValueError("sanitized image exceeds size limit")
        return sanitized
    except Exception as exc:
        raise ValueError("image could not be sanitized") from exc


def validate_photo(data: bytes, filename: str = "", *, selfie: bool = False) -> dict:
    checks: dict = {"bytes": len(data or b"")}
    if not data or len(data) < MIN_BYTES:
        return _fail("TOO_SMALL_FILE", checks)
    if len(data) > MAX_BYTES:
        return _fail("TOO_BIG", checks)
    try:
        img = Image.open(io.BytesIO(data))
        image_format = img.format
        if image_format not in ("JPEG", "PNG", "WEBP"):
            return _fail("BAD_FORMAT", checks)
        w, h = img.size
        checks.update({"format": image_format, "w": w, "h": h,
                       "kb": round(len(data) / 1024, 1)})
        # Reject oversized decode work before loading pixel data; uploads are untrusted.
        if w <= 0 or h <= 0 or max(w, h) > MAX_SIDE or w * h > MAX_PIXELS:
            return _fail("IMAGE_DIMENSIONS", checks)
        if int(getattr(img, "n_frames", 1) or 1) > 1:
            return _fail("ANIMATED", checks)
        img.load()
    except Exception:
        return _fail("BAD_FORMAT", checks)
    if min(w, h) < (300 if selfie else MIN_SIDE):
        return _fail("LOW_RES", checks)
    gray = img.convert("L") if img.mode != "L" else img
    stat = ImageStat.Stat(gray)
    mean, std = stat.mean[0], stat.stddev[0]
    checks.update({"brightness": round(mean, 1), "contrast_std": round(std, 1)})
    if mean < DARK_MEAN:
        return _fail("TOO_DARK", checks)
    if mean > BRIGHT_MEAN:
        return _fail("TOO_BRIGHT", checks)
    if std < FLAT_STD:
        return _fail("FLAT", checks)
    # NOTE: brightness-structural checks (glare/frame) BEFORE texture (blur) —
    # photo-of-photo re-captures are often soft; report the TRUE reason first.
    # Glare: overexposed pixel share (flash / screen moiré-hotspots)
    small = gray.copy()
    small.thumbnail((200, 200), Image.BILINEAR)
    histogram = small.histogram()
    pixel_count = sum(histogram)
    hot = sum(histogram[250:])
    glare_pct = hot * 100.0 / (pixel_count or 1)
    checks["glare_pct"] = round(glare_pct, 1)
    if glare_pct > GLARE_PCT:
        return _fail("GLARE", checks)
    # Frame: dark uniform bands top+bottom (photo-of-photo / screenshot frame)
    band_h = max(1, int(h * FRAME_BAND))
    top = ImageStat.Stat(gray.crop((0, 0, w, band_h)))
    bot = ImageStat.Stat(gray.crop((0, h - band_h, w, h)))
    center = ImageStat.Stat(gray.crop((int(w * 0.25), int(h * 0.35), int(w * 0.75), int(h * 0.65))))
    checks.update({"frame_top": round(top.mean[0], 1), "frame_bottom": round(bot.mean[0], 1),
                   "center": round(center.mean[0], 1)})
    if top.mean[0] < FRAME_DARK and bot.mean[0] < FRAME_DARK and center.mean[0] > 70:
        return _fail("PHOTO_OF_PHOTO", checks)
    blur = _laplacian_var(gray)
    checks["blur_score"] = round(blur, 1)
    if blur < BLUR_VAR:
        return _fail("BLURRY", checks)
    if img.format in ("JPEG", "MPO"):
        density = len(data) / ((w * h) / 1000.0)
        checks["jpeg_density"] = round(density, 1)
        if density < JPEG_DENSITY:
            return _fail("BLURRY", checks)
    return _pass(checks)
