"""
MANA VIVAHA — Referral QR poster and accurate sharing materials
================================================================
Square and WhatsApp-status posters contain a genuine referral link and QR code,
free registration/request-credit information, the one-time qualifying ₹50 rule,
its exclusions, and a manual-review payout notice. No projected earnings,
unsupported testimonials, channels, or payout-time claims are shown.

Fonts: server Telugu font is optional; a DejaVu fallback is used.
"""
from __future__ import annotations

import os
from typing import Dict, Optional

BRAND_MAROON = (122, 12, 46)
BRAND_GOLD = (212, 175, 55)
BRAND_CREAM = (255, 248, 231)
NAVY = (15, 31, 60)

ASSET_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "channel_assets")
# 🖼️ Referral posters: runtime lo generate avutayi — repo lo pettakoodadu (gitignored folder + /tmp fallback)
POSTER_DIR = os.getenv("REFERRAL_POSTER_DIR", "/tmp/referral_posters")
FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
]


def _font(size: int, bold: bool = True):
    from PIL import ImageFont
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                continue
    return ImageFont.load_default()


def _qr_image(data: str, size: int):
    """QR generate (qrcode lib ఉంటే). Lekapote None — card లో link text వస్తుంది."""
    try:
        import qrcode
        qr = qrcode.QRCode(box_size=10, border=2, error_correction=qrcode.constants.ERROR_CORRECT_M)
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
        return img.resize((size, size))
    except Exception:
        return None


def _safe(text: str) -> str:
    """Filename safe (code లో weird chars వస్తే bhi path break అవ్వదు)."""
    return "".join(ch for ch in str(text) if ch.isalnum() or ch in "-_")[:24] or "ref"


def poster_card(user: Dict, code: str = "", link: str = "", out_path: Optional[str] = None,
                style: str = "square", site: str = "manavivaha.in") -> str:
    """Render a truthful referral poster (1080 square or 1080x1920 status)."""
    from PIL import Image, ImageDraw

    code = (code or user.get("referral_code") or "MV").upper()
    link = link or user.get("referral_link") or ("https://%s/r/%s" % (site, code))
    name = (user.get("full_name") or user.get("name") or "Mana Vivaha member").strip()[:36]
    status = style == "status"
    W, H = (1080, 1920) if status else (1080, 1080)
    out_path = out_path or os.path.join(POSTER_DIR, "%s_%s.png" % (_safe(code.lower()), "status" if status else "square"))
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    img = Image.new("RGB", (W, H), BRAND_CREAM)
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, W, 150], fill=BRAND_MAROON)
    tx = 48
    try:
        from PIL import Image as _PILImage
        logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "brand", "logo-square-256.png")
        if os.path.exists(logo_path):
            logo = _PILImage.open(logo_path).convert("RGBA").resize((104, 104), _PILImage.LANCZOS)
            img.paste(logo, (36, 23), logo.split()[3])
            tx = 164
    except Exception:
        pass
    d.text((tx, 30), "MANA VIVAHA", font=_font(48), fill=BRAND_GOLD)
    d.text((tx, 91), "మన వివాహ  |  TELUGU MATRIMONY", font=_font(28, False), fill=BRAND_CREAM)

    def wrapped(text: str, x: int, y: int, max_width: int, font, fill, line_height: int):
        words = str(text).split()
        line = ""
        for word in words:
            test = (line + " " + word).strip()
            if line and d.textlength(test, font=font) > max_width:
                d.text((x, y), line, font=font, fill=fill)
                y += line_height
                line = word
            else:
                line = test
        if line:
            d.text((x, y), line, font=font, fill=fill)
            y += line_height
        return y

    side_pad = 48
    d.text((side_pad, 178), "SHARE A REFERRAL LINK", font=_font(46), fill=BRAND_MAROON)
    d.text((side_pad, 236), "Free registration  •  3 interest requests", font=_font(27, False), fill=NAVY)

    if status:
        name_y = 300
        code_y = 485
        qr_y = 700
        qr_size = 390
        reward_x = 500
        reward_y = 710
        max_right = 530
        reward_line = 35
    else:
        name_y = 292
        code_y = 410
        qr_y = 560
        qr_size = 270
        reward_x = 390
        reward_y = 570
        max_right = 630
        reward_line = 30

    d.rounded_rectangle([side_pad, name_y, W - side_pad, name_y + 104], radius=20,
                        fill=(255, 255, 255), outline=BRAND_GOLD, width=3)
    d.text((side_pad + 24, name_y + 13), "REFERRED BY", font=_font(20, False), fill=(105, 105, 105))
    d.text((side_pad + 24, name_y + 43), name, font=_font(34), fill=BRAND_MAROON)

    d.rounded_rectangle([side_pad, code_y, W - side_pad, code_y + 150], radius=22,
                        fill=BRAND_MAROON)
    d.text((side_pad + 24, code_y + 17), "USE THIS CODE", font=_font(21, False), fill=BRAND_GOLD)
    d.text((side_pad + 24, code_y + 54), code, font=_font(56), fill=BRAND_CREAM)
    d.text((W - 405, code_y + 52), "+1 request credit", font=_font(25), fill=BRAND_GOLD)
    d.text((W - 405, code_y + 88), "for new user on valid attachment", font=_font(17, False), fill=BRAND_CREAM)

    qr = _qr_image(link, qr_size)
    if qr:
        img.paste(qr, (side_pad + 8, qr_y))
        d.rectangle([side_pad + 4, qr_y - 4, side_pad + qr_size + 12, qr_y + qr_size + 4], outline=NAVY, width=3)
    else:
        d.rounded_rectangle([side_pad, qr_y, side_pad + qr_size, qr_y + qr_size], radius=12,
                            fill=(255, 255, 255), outline=NAVY, width=3)
        d.text((side_pad + 24, qr_y + qr_size // 2 - 20), "QR unavailable", font=_font(26), fill=NAVY)

    d.text((reward_x, reward_y), "SCAN TO REGISTER", font=_font(31 if status else 29), fill=BRAND_MAROON)
    reward_y += 48
    reward_y = wrapped(link.replace("https://", ""), reward_x, reward_y, max_right, _font(21, False), NAVY, 29)
    reward_y += 12
    d.text((reward_x, reward_y), "POSSIBLE REWARD: ₹50 ONCE", font=_font(21 if status else 20), fill=BRAND_MAROON)
    reward_y += reward_line
    reward_y = wrapped("Only on the first qualifying paid S_99/S_199/S_299/S_499 consumer plan (payment at least ₹99).",
                        reward_x, reward_y, max_right, _font(18, False), NAVY, reward_line)
    reward_y += 4
    reward_y = wrapped("Add-ons, assisted services, boosts, gifts, renewals, complimentary grants and B2B/non-consumer payments are excluded.",
                        reward_x, reward_y, max_right, _font(17, False), NAVY, 27)
    reward_y += 4
    reward_y = wrapped("Payout requests receive manual admin review; processing time is not guaranteed.",
                        reward_x, reward_y, max_right, _font(17, False), NAVY, 27)

    if status:
        detail_y = 1145
        detail_y = wrapped("Valid referral attachment: +2 interest-request credits to the referrer and +1 to the new user. Request credits are not cash.",
                            side_pad, detail_y, W - 2 * side_pad, _font(25, False), NAVY, 40)
        detail_y += 12
        detail_y = wrapped("Contact details are shared only after the profile owner accepts an interest request.",
                            side_pad, detail_y, W - 2 * side_pad, _font(25, False), NAVY, 40)
        detail_y += 16
        detail_y = wrapped("Read the complete referral terms at %s/referral" % site,
                            side_pad, detail_y, W - 2 * side_pad, _font(24), BRAND_MAROON, 38)

    footer_y = H - 112
    d.rectangle([0, footer_y, W, H], fill=NAVY)
    d.text((side_pad, footer_y + 19), "Referral link: %s" % link.replace("https://", ""),
           font=_font(23), fill=BRAND_GOLD)
    d.text((side_pad, footer_y + 60), "Terms: %s/referral" % site,
           font=_font(20, False), fill=BRAND_CREAM)

    img.save(out_path, "PNG")
    return out_path


def referral_kit(user: Dict, share_kit: Dict) -> Dict:
    """Share kit + poster cards (square + status) → download links."""
    code = share_kit.get("code") or user.get("referral_code", "")
    link = share_kit.get("link") or user.get("referral_link", "")
    out = {"square": "", "status": "", "errors": []}
    for style in ("square", "status"):
        try:
            path = poster_card(user, code=code, link=link, style=style)
            out[style] = "/api/referral/%s/poster.png?style=%s" % (user.get("tsap_id") or code, style)
            out[style + "_path"] = path
        except Exception as e:
            out["errors"].append("%s: %s" % (style, str(e)[:80]))
    out["message_telugu"] = ("🖼️ Poster ready (square = WhatsApp post, status = story). "
                             "Download చేసి share చెయ్యండి — QR scan చేస్తే direct register!")
    return out
