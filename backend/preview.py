"""
MANA VIVAHA — SOCIAL PREVIEW / OG IMAGE ENGINE 🖼️
=================================================
WhatsApp / Telegram / Facebook lo link pampinappudu profile/page preview kanipistundi.
External platforms control their own rendering and delivery; no click-through claim is made.

Ee module 3 images generate chestundi (Pillow, DejaVu fonts — English text, because
Telugu font server lo install kaakapote boxes vasthayi; HTML pages lo Telugu perfect ga vastundi):

  1. `og_profile_png(user)`      — profile link preview (1200x630): name, ID, age, caste, job, district
  2. `og_porutham_png(b, g, res)` — individual ten-rule outcomes (no aggregate score or verdict)
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

    tsap = str(u.get("tsap_id") or "").strip()
    if not tsap:
        return None
    name = _fit(d, u.get("full_name") or "Profile", _font(56, True), 900)
    d.text((60, 70), name, font=_font(56, True), fill=WHITE)
    d.text((60, 146), "%s  |  %s yrs  |  %s" % (tsap, u.get("age", "—"), u.get("gender", "")),
           font=_font(26, True), fill=GOLD)

    rows = [
        ("Caste", "%s%s" % (u.get("caste", "—"), (" / " + u["sub_caste"]) if u.get("sub_caste") else "")),
        ("Education", "%s %s" % (u.get("education", "—"), u.get("education_detail", ""))),
        ("Profession", "%s %s" % (u.get("job", "—"), ("@ " + u["company"]) if u.get("company") else "")),
        ("Location", "%s, %s" % (u.get("district") or "—", u.get("state") or "—")),
        ("Star / రాశి", "%s / %s" % (u.get("star", "—"), u.get("rasi", "—"))),
        ("Family", "%s • %s" % (u.get("family_type", "—"), u.get("family_status", "—"))),
    ]
    y = 216
    for label, val in rows:
        d.text((60, y), "%-13s" % (label + ":"), font=_font(24, True), fill=(245, 220, 150))
        d.text((300, y), _fit(d, val, _font(26), 780), font=_font(26), fill=WHITE)
        y += 46

    verification_label = ("GOVT ID REVIEWED" if u.get("id_verified") else
                          "PHOTO REVIEWED" if u.get("selfie_verified") or u.get("photo_status") == "approved" else
                          "PHONE OTP VERIFIED" if u.get("phone_verified") else "")
    if verification_label:
        d.rounded_rectangle([60, y + 10, 420, y + 62], radius=26, fill=(16, 122, 74))
        d.text((84, y + 24), verification_label, font=_font(24, True), fill=WHITE)
    d.rounded_rectangle([W - 520, y + 10, W - 60, y + 62], radius=26, fill=GOLD)
    d.text((W - 500, y + 24), "Details + Interest: manavivaha.in", font=_font(22, True), fill=MAROON)

    _brand_bar(d, W, H, img=img)
    out_path = out_path or os.path.join(PREVIEW_DIR, "profile-%s.png" % tsap)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, "PNG", optimize=True)
    return out_path


def og_porutham_png(bride: Dict, groom: Dict, result: Dict, out_path: Optional[str] = None) -> Optional[str]:
    """Render actual ten-rule outcomes as a limited reference, never as an aggregate score."""
    if not PIL_OK or not (result or {}).get("available"):
        return None
    r = result or {}
    b, g = bride or {}, groom or {}
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), CREAM)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 120], fill=MAROON)
    d.text((50, 24), "TEN-CHECK PORUTHAM REFERENCE", font=_font(40, True), fill=GOLD)
    d.text((50, 76), "Limited rule-based reference • not a complete horoscope", font=_font(22), fill=CREAM)

    items = list(r.get("items") or [])[:10]
    passed = sum(1 for item in items if item.get("pass") is True)
    b_label = "Bride: %s (%s)" % (b.get("tsap_id", "—"), r.get("bride_star_en", "—"))
    g_label = "Groom: %s (%s)" % (g.get("tsap_id", "—"), r.get("groom_star_en", "—"))
    d.text((60, 145), _fit(d, b_label, _font(24, True), 1080), font=_font(24, True), fill=INK)
    d.text((60, 182), _fit(d, g_label, _font(24, True), 1080), font=_font(24, True), fill=INK)
    count_label = f"Checks marked pass: {passed} of {len(items)}"
    d.text((60, 222), count_label, font=_font(27, True), fill=MAROON)

    check_names = {
        1: "Rasi", 2: "Nakshatra / Dina", 3: "Gana", 4: "Yoni", 5: "Rajju",
        6: "Vedha", 7: "Mahendra", 8: "Stree Deergha", 9: "Vashya", 10: "Rasi Adhipathi",
    }
    for index, item in enumerate(items):
        number = item.get("no")
        try:
            number = int(number)
        except (TypeError, ValueError):
            number = 0
        ok = item.get("pass") is True
        mark = "MARKED PASS" if ok else "REVIEW"
        color = (16, 122, 74) if ok else (180, 95, 25)
        column, row = index // 5, index % 5
        x = 60 + column * 555
        y = 274 + row * 43
        d.rounded_rectangle([x, y, x + 118, y + 31], radius=8, fill=color)
        d.text((x + 8, y + 6), mark, font=_font(15, True), fill=WHITE)
        name = check_names.get(number, f"Porutham check {number}")
        d.text((x + 130, y + 3), _fit(d, name, _font(20), 390), font=_font(20), fill=INK)

    d.text((60, 502), "Pass count is a tally only — not a compatibility score or marriage verdict.",
           font=_font(18, True), fill=MAROON)
    d.text((60, 527), "Not a complete horoscope or marriage recommendation. Verify details independently.",
           font=_font(17), fill=INK)
    _brand_bar(d, W, H, "LIMITED RULE-BASED REFERENCE", img=img)
    out_path = out_path or os.path.join(PREVIEW_DIR, "porutham-%s-%s.png" % (b.get("tsap_id", "A"), g.get("tsap_id", "B")))
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
    d.rounded_rectangle([60, 420, 620, 480], radius=26, fill=GOLD)
    d.text((84, 436), "manavivaha.in — FREE గా register చెయ్యండి", font=_font(22, True), fill=MAROON)
    _brand_bar(d, W, H, img=img)
    out_path = out_path or os.path.join(PREVIEW_DIR, "og-%s.png" % name)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    img.save(out_path, "PNG", optimize=True)
    return out_path
