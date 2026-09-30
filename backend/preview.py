"""
MANA VIVAHA — SOCIAL PREVIEW / OG IMAGE ENGINE 🖼️
=================================================
WhatsApp / Telegram / Facebook lo link pampinappudu **photo preview** kanipisthundi —
adi click rate ni 2–3x penchutundi (matrimony lo bhayankaramaina reach booster).

Ee module 3 images generate chestundi (Pillow, DejaVu fonts — English text, because
Telugu font server lo install kaakapote boxes vasthayi; HTML pages lo Telugu perfect ga vastundi):

  1. `og_profile_png(user)`      — profile link preview (1200x630): name, ID, age, caste, job, district
  2. `og_porutham_png(b, g, res)` — 10-porutham report preview (score + verdict, English)
  3. `og_generic_png(title, sub)` — site/caste/SEO page preview

Files `PREVIEW_DIR` (default /tmp/previews) lo save avutayi → main.py static mount chestundi.
"""
from __future__ import annotations

import os
from typing import Dict, Optional

try:
    from PIL import Image, ImageDraw, ImageFilter
    PIL_OK = True
except Exception:
    PIL_OK = False

PREVIEW_DIR = os.getenv("PREVIEW_DIR", "/tmp/previews")
MAROON = (122, 12, 46)
MAROON_DARK = (92, 8, 34)
GOLD = (212, 175, 55)
CREAM = (255, 248, 231)
WHITE = (255, 255, 255)
INK = (43, 43, 43)


def _font(size: int, bold: bool = False):
    if not PIL_OK:
        return None
    try:
        from card_pro import F
        return F(size, bold=bold)
    except Exception:
        from PIL import ImageFont
        path = "/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf" % ("-Bold" if bold else "")
        try:
            return ImageFont.truetype(path, size)
        except Exception:
            return ImageFont.load_default()


def _fit(draw, text: str, font, max_w: int) -> str:
    text = str(text or "")
    if not font or draw.textlength(text, font=font) <= max_w:
        return text
    while text and draw.textlength(text + "…", font=font) > max_w:
        text = text[:-1]
    return text + "…"


def _brand_bar(draw, W: int, H: int, label: str = "MANA VIVAHA • TELUGU MATRIMONY",
               img: "Image.Image" = None) -> None:
    """💍 R13 — brand bar: kotha marriage logo + మన వివాహ (Telugu peru neat ga)."""
    draw.rectangle([0, H - 74, W, H], fill=MAROON_DARK)
    x = 50
    if img is not None:
        try:
            _lp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "brand", "logo-square-256.png")
            if os.path.exists(_lp):
                _lg = Image.open(_lp).convert("RGBA").resize((46, 46), Image.LANCZOS)
                img.paste(_lg, (50, H - 60), _lg.split()[3])
                x = 112
        except Exception:
            x = 50
    draw.text((x, H - 52), "మన వివాహ", font=_font(26, True), fill=GOLD)
    draw.text((x + 170, H - 48), label, font=_font(16), fill=(240, 224, 190))
    draw.text((W - 340, H - 52), "manavivaha.in", font=_font(22), fill=CREAM)


def og_profile_png(user: Dict, out_path: Optional[str] = None) -> Optional[str]:
    """Profile link preview — WhatsApp/Telegram/FB లో ee image కనిపిస్తుంది."""
    if not PIL_OK:
        return None
    u = user or {}
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), MAROON)
    d = ImageDraw.Draw(img)
    # subtle gradient blocks
    for i in range(0, H, 6):
        shade = int(122 - (i / H) * 34)
        d.rectangle([0, i, W, i + 6], fill=(shade, 12, 46))
    d.rectangle([0, 0, 14, H], fill=GOLD)

    tsap = u.get("tsap_id", "TSAP-XXXX")
    name = _fit(d, u.get("full_name", "Telugu Profile"), _font(56, True), 900)
    d.text((60, 70), name, font=_font(56, True), fill=WHITE)
    d.text((60, 146), "%s  |  %s yrs  |  %s" % (tsap, u.get("age", "—"), u.get("gender", "")),
           font=_font(26, True), fill=GOLD)

    rows = [
        ("Caste", "%s%s" % (u.get("caste", "—"), (" / " + u["sub_caste"]) if u.get("sub_caste") else "")),
        ("Education", "%s %s" % (u.get("education", "—"), u.get("education_detail", ""))),
        ("Profession", "%s %s" % (u.get("job", "—"), ("@ " + u["company"]) if u.get("company") else "")),
        ("Location", "%s, %s" % (u.get("district", "—"), u.get("state", "TS"))),
        ("Star / రాశి", "%s / %s" % (u.get("star", "—"), u.get("rasi", "—"))),
        ("Family", "%s • %s" % (u.get("family_type", "—"), u.get("family_status", "—"))),
    ]
    y = 216
    for label, val in rows:
        d.text((60, y), "%-13s" % (label + ":"), font=_font(24, True), fill=(245, 220, 150))
        d.text((300, y), _fit(d, val, _font(26), 780), font=_font(26), fill=WHITE)
        y += 46

    verified = bool(u.get("is_verified") or u.get("phone_verified"))
    if verified:
        d.rounded_rectangle([60, y + 10, 320, y + 62], radius=26, fill=(16, 122, 74))
        d.text((84, y + 24), "VERIFIED PROFILE", font=_font(24, True), fill=WHITE)
    d.rounded_rectangle([W - 520, y + 10, W - 60, y + 62], radius=26, fill=GOLD)
    d.text((W - 500, y + 24), "Details + Interest: manavivaha.in", font=_font(22, True), fill=MAROON)

    _brand_bar(d, W, H, img=img)
    out_path = out_path or os.path.join(PREVIEW_DIR, "profile-%s.png" % tsap)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, "PNG", optimize=True)
    return out_path


def og_porutham_png(bride: Dict, groom: Dict, result: Dict, out_path: Optional[str] = None) -> Optional[str]:
    """10-Vedic Gunamelanam report preview — score + pass/fail count."""
    if not PIL_OK:
        return None
    r = result or {}
    b, g = bride or {}, groom or {}
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 120], fill=MAROON)
    d.text((50, 24), "VEDIC GUNAMELANAM KUNDLI MATCH", font=_font(40, True), fill=GOLD)
    d.text((50, 76), "మన వివాహ • Telugu Vedic Horoscope Match Report", font=_font(24), fill=CREAM)

    score = r.get("score", "—")
    d.ellipse([60, 170, 340, 450], fill=MAROON)
    d.text((132, 250), str(score), font=_font(96, True), fill=GOLD)
    d.text((190, 356), "/ 10", font=_font(34, True), fill=CREAM)
    d.text((150, 470), "Score", font=_font(28, True), fill=MAROON)

    d.text((400, 170), "Bride: %s (%s / %s)" % (b.get("full_name", "—"), b.get("star", "—"), b.get("rasi", "—")),
           font=_font(28, True), fill=INK)
    d.text((400, 212), "Groom: %s (%s / %s)" % (g.get("full_name", "—"), g.get("star", "—"), g.get("rasi", "—")),
           font=_font(28, True), fill=INK)

    items = list(r.get("items") or [])[:10]
    y = 252
    for i, it in enumerate(items):
        col = 400 + (i // 5) * 380
        row = y + (i % 5) * 48
        ok = bool(it.get("pass") or it.get("ok"))
        mark = "OK" if ok else "X"
        color = (16, 122, 74) if ok else (200, 40, 60)
        d.rounded_rectangle([col, row, col + 50, row + 34], radius=10, fill=color)
        fmark = _font(20, True)
        d.text((col + (50 - d.textlength(mark, font=fmark)) / 2, row + 5), mark, font=fmark, fill=WHITE)
        nm = it.get("porutham") or it.get("name") or "—"
        d.text((col + 62, row + 4), _fit(d, str(nm), _font(24), 300), font=_font(24), fill=INK)

    try:
        sc_num = int(score)
    except Exception:
        sc_num = 0
    eng = ("Excellent Gunamelanam — go ahead" if sc_num >= 8 else
           "Good Match — most points align" if sc_num >= 6 else
           "Average — some points differ" if sc_num >= 4 else "Weak — consult elders")
    dosha = ", ".join([str(x) for x in (r.get("doshas") or [])])
    line = "%s / 10  —  %s" % (score, eng) + (("   |  Dosha: " + dosha) if dosha else "")
    d.rounded_rectangle([400, 496, 1140, 546], radius=16, fill=GOLD)
    d.text((420, 508), _fit(d, line, _font(22, True), 700), font=_font(22, True), fill=MAROON)

    _brand_bar(d, W, H, "వేద గుణమేళనం GUNAMELANAM REPORT", img=img)
    out_path = out_path or os.path.join(PREVIEW_DIR, "gunamelanam-%s-%s.png" % (b.get("tsap_id", "A"), g.get("tsap_id", "B")))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, "PNG", optimize=True)
    return out_path


def og_generic_png(title: str, subtitle: str, out_path: Optional[str] = None, name: str = "site") -> Optional[str]:
    """Site / caste / SEO page preview (WhatsApp group లో link pampinappudu)."""
    if not PIL_OK:
        return None
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), MAROON)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, 14, H], fill=GOLD)
    d.text((60, 120), _fit(d, title, _font(52, True), 1040), font=_font(52, True), fill=WHITE)
    d.text((60, 230), _fit(d, subtitle, _font(28), 1040), font=_font(28), fill=GOLD)
    d.text((60, 330), "52 channels • 43 castes • TS + AP • 3 FREE requests", font=_font(26), fill=CREAM)
    d.rounded_rectangle([60, 420, 620, 480], radius=26, fill=GOLD)
    d.text((84, 436), "manavivaha.in — FREE గా register చెయ్యండి", font=_font(22, True), fill=MAROON)
    _brand_bar(d, W, H, img=img)
    out_path = out_path or os.path.join(PREVIEW_DIR, "og-%s.png" % name)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, "PNG", optimize=True)
    return out_path
