"""
MANA VIVAHA — Dynamic Referral Earnings Certificate & WhatsApp Status Card Generator 🎨
========================================================================================
Generates high-resolution, viral WhatsApp Story / Status images (1080x1920) and
Social Banners (1200x630) with:
  • Partner Name & Code
  • Earned Amount (₹50, ₹500, ₹2,500+)
  • QR Code linking directly to their referral registration page
  • Royal Maroon & Gold luxury wedding aesthetic
  • Telugu & English viral share copy
"""
from __future__ import annotations

import io
import os
import math
from typing import Dict, List, Optional
from PIL import Image, ImageDraw, ImageFont
import qrcode

SITE_URL = os.getenv("SITE_URL", "https://manavivaha.in").rstrip("/")

# Brand Color Palette
MAROON_DARK = (45, 5, 20)
MAROON_RICH = (122, 12, 46)
GOLD_LIGHT = (255, 223, 110)
GOLD_MAIN = (212, 175, 55)
GOLD_DARK = (166, 124, 0)
EMERALD_GREEN = (16, 149, 93)
EMERALD_BG = (235, 252, 243)
WHITE = (255, 255, 255)
OFF_WHITE = (255, 248, 235)
SLATE_LIGHT = (203, 213, 225)
SLATE_DARK = (30, 41, 59)

FONT_PATHS_BOLD = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
]
FONT_PATHS_REG = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
]
FONT_PATHS_SERIF = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf",
]


def _font(paths: List[str], size: int) -> ImageFont.ImageFont:
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def F_BOLD(size: int):
    return _font(FONT_PATHS_BOLD, size)


def F_REG(size: int):
    return _font(FONT_PATHS_REG, size)


def F_SERIF(size: int):
    return _font(FONT_PATHS_SERIF, size)


def draw_gradient_background(img: Image.Image, color_top: tuple, color_bottom: tuple):
    """Draw vertical gradient."""
    w, h = img.size
    draw = ImageDraw.Draw(img)
    for y in range(h):
        r = int(color_top[0] + (color_bottom[0] - color_top[0]) * (y / h))
        g = int(color_top[1] + (color_bottom[1] - color_top[1]) * (y / h))
        b = int(color_top[2] + (color_bottom[2] - color_top[2]) * (y / h))
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))


def generate_qr_image(url: str, size: int = 240) -> Image.Image:
    """Generate high-contrast QR code with gold tint border."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=8,
        border=2,
    )
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#1e293b", back_color="#ffffff").convert("RGBA")
    return img.resize((size, size), Image.Resampling.LANCZOS)


def generate_earnings_status_card(
    name: str,
    code: str,
    amount: int = 50,
    paid_count: int = 1,
    tier_title: str = "BRONZE PARTNER",
    format_type: str = "story",
) -> bytes:
    """
    Generate viral WhatsApp Status (1080x1920) or Social Banner (1200x630)
    earnings proof image card.
    """
    is_story = format_type.lower() == "story"
    w, h = (1080, 1920) if is_story else (1200, 630)
    
    img = Image.new("RGBA", (w, h), (30, 5, 18, 255))
    draw_gradient_background(img, (55, 8, 28), (20, 3, 12))
    draw = ImageDraw.Draw(img)
    
    # 1. Luxury Gold Double Borders
    draw.rectangle([(24, 24), (w - 24, h - 24)], outline=GOLD_MAIN, width=6)
    draw.rectangle([(36, 36), (w - 36, h - 36)], outline=GOLD_LIGHT, width=2)
    
    # Ornate Gold Corner Motifs
    corner_len = 60
    for cx, cy in [(44, 44), (w - 44, 44), (44, h - 44), (w - 44, h - 44)]:
        sign_x = 1 if cx < w // 2 else -1
        sign_y = 1 if cy < h // 2 else -1
        draw.line([(cx, cy), (cx + sign_x * corner_len, cy)], fill=GOLD_LIGHT, width=4)
        draw.line([(cx, cy), (cx, cy + sign_y * corner_len)], fill=GOLD_LIGHT, width=4)
        draw.ellipse([(cx - 4, cy - 4), (cx + 4, cy + 4)], fill=GOLD_MAIN)

    ref_url = f"{SITE_URL}/r/{code.upper()}"
    clean_name = (name or "Mana Vivaha Partner").strip()
    if len(clean_name) > 24:
        clean_name = clean_name[:22] + "…"

    if is_story:
        # ----------------------------------------------------
        # 📱 WHATSAPP STATUS / STORY FORMAT (1080 x 1920)
        # ----------------------------------------------------
        
        # Header Brand Pill
        pill_w, pill_h = 720, 70
        pill_x = (w - pill_w) // 2
        pill_y = 90
        draw.rounded_rectangle([(pill_x, pill_y), (pill_x + pill_w, pill_y + pill_h)], radius=35, fill=(122, 12, 46, 230), outline=GOLD_MAIN, width=3)
        
        brand_txt = "💍 MANA VIVAHA • TS-AP TELUGU MATRIMONY"
        bfnt = F_BOLD(26)
        bw = draw.textlength(brand_txt, font=bfnt)
        draw.text(((w - bw) // 2, pill_y + 18), brand_txt, fill=GOLD_LIGHT, font=bfnt)
        
        # Sub-header
        sub_txt = "OFFICIAL EARNINGS & MATCHMAKING REWARD"
        sfnt = F_REG(20)
        sw = draw.textlength(sub_txt, font=sfnt)
        draw.text(((w - sw) // 2, pill_y + 85), sub_txt, fill=SLATE_LIGHT, font=sfnt)
        
        # Main Title
        title_txt = "CASH CREDITED ✅"
        tfnt = F_BOLD(56)
        tw = draw.textlength(title_txt, font=tfnt)
        draw.text(((w - tw) // 2, 230), title_txt, fill=WHITE, font=tfnt)
        
        # Huge Amount Display Card (Gold Glow Box)
        box_w, box_h = 920, 320
        box_x = (w - box_w) // 2
        box_y = 310
        draw.rounded_rectangle([(box_x, box_y), (box_x + box_w, box_y + box_h)], radius=24, fill=(255, 248, 235, 255), outline=GOLD_MAIN, width=5)
        
        amt_str = f"₹{amount:,}"
        amt_fnt = F_BOLD(110)
        amt_w = draw.textlength(amt_str, font=amt_fnt)
        draw.text(((w - amt_w) // 2, box_y + 40), amt_str, fill=MAROON_RICH, font=amt_fnt)
        
        amt_sub = "Direct Wallet Cash • Instant UPI Withdrawal"
        asub_fnt = F_BOLD(26)
        asub_w = draw.textlength(amt_sub, font=asub_fnt)
        draw.text(((w - asub_w) // 2, box_y + 195), amt_sub, fill=EMERALD_GREEN, font=asub_fnt)
        
        # Partner Profile Card
        pcard_w, pcard_h = 920, 290
        pcard_x = (w - pcard_w) // 2
        pcard_y = 660
        draw.rounded_rectangle([(pcard_x, pcard_y), (pcard_x + pcard_w, pcard_y + pcard_h)], radius=20, fill=(45, 10, 25, 230), outline=GOLD_MAIN, width=2)
        
        draw.text((pcard_x + 50, pcard_y + 40), "PARTNER NAME", fill=GOLD_LIGHT, font=F_BOLD(20))
        draw.text((pcard_x + 50, pcard_y + 70), clean_name, fill=WHITE, font=F_BOLD(36))
        
        draw.text((pcard_x + 50, pcard_y + 140), "REFERRAL CODE", fill=GOLD_LIGHT, font=F_BOLD(20))
        code_box_w = 340
        draw.rounded_rectangle([(pcard_x + 50, pcard_y + 175), (pcard_x + 50 + code_box_w, pcard_y + 245)], radius=12, fill=GOLD_MAIN)
        draw.text((pcard_x + 75, pcard_y + 188), f"🏷️ {code.upper()}", fill=MAROON_DARK, font=F_BOLD(34))
        
        # Tier badge on right side
        draw.text((pcard_x + 520, pcard_y + 140), "TIER & RANK", fill=GOLD_LIGHT, font=F_BOLD(20))
        draw.text((pcard_x + 520, pcard_y + 180), f"⭐ {tier_title}", fill=WHITE, font=F_BOLD(26))
        draw.text((pcard_x + 520, pcard_y + 220), f"🎯 {paid_count} Matches Created", fill=SLATE_LIGHT, font=F_REG(22))
        
        # QR Code Section (Large & Crisp)
        qr_box_w, qr_box_h = 920, 440
        qr_box_x = (w - qr_box_w) // 2
        qr_box_y = 980
        draw.rounded_rectangle([(qr_box_x, qr_box_y), (qr_box_x + qr_box_w, qr_box_y + qr_box_h)], radius=24, fill=(255, 255, 255, 255), outline=GOLD_MAIN, width=4)
        
        qr_img = generate_qr_image(ref_url, size=320)
        img.paste(qr_img, (qr_box_x + 50, qr_box_y + 60))
        
        # QR Info text
        draw.text((qr_box_x + 400, qr_box_y + 65), "JOIN & FIND MATCHES", fill=MAROON_RICH, font=F_BOLD(32))
        draw.text((qr_box_x + 400, qr_box_y + 115), "Scan with any Camera / PhonePe", fill=SLATE_DARK, font=F_REG(22))
        draw.text((qr_box_x + 400, qr_box_y + 155), "✓ Telangana & Andhra Pradesh", fill=EMERALD_GREEN, font=F_BOLD(22))
        draw.text((qr_box_x + 400, qr_box_y + 195), "✓ 43 Castes • First 3 Profiles FREE", fill=EMERALD_GREEN, font=F_BOLD(22))
        draw.text((qr_box_x + 400, qr_box_y + 235), "✓ OTP & Photo Verified", fill=EMERALD_GREEN, font=F_BOLD(22))
        
        url_short = f"manavivaha.in/r/{code.upper()}"
        draw.rounded_rectangle([(qr_box_x + 400, qr_box_y + 285), (qr_box_x + 860, qr_box_y + 355)], radius=10, fill=(240, 243, 246))
        draw.text((qr_box_x + 420, qr_box_y + 302), f"🔗 {url_short}", fill=MAROON_RICH, font=F_BOLD(24))

        # Telugu status invitation quote
        quote_y = 1460
        draw.text((box_x, quote_y), "“నాకు మన వివాహ ద్వారా రెఫరల్ క్యాష్ వచ్చింది! మీరు కూడా", fill=GOLD_LIGHT, font=F_BOLD(28))
        draw.text((box_x, quote_y + 45), "మంచి పెళ్లి సంబంధం కోసం ఉచితంగా జాయిన్ అవ్వండి.”", fill=GOLD_LIGHT, font=F_BOLD(28))
        draw.text((box_x, quote_y + 95), "Register FREE with ₹0 Registration Fee • 100% Verified", fill=WHITE, font=F_REG(24))

        # Footer Trust Badge
        foot_txt = "🔒 100% VERIFIED TS & AP MATRIMONY PLATFORM • GOVT REGISTERED"
        ffnt = F_BOLD(20)
        fw = draw.textlength(foot_txt, font=ffnt)
        draw.text(((w - fw) // 2, h - 120), foot_txt, fill=SLATE_LIGHT, font=ffnt)
        
    else:
        # ----------------------------------------------------
        # 💻 SOCIAL BANNER FORMAT (1200 x 630)
        # ----------------------------------------------------
        # Left side: Amount & Partner Info
        draw.text((70, 70), "💍 MANA VIVAHA • REFERRAL REWARD", fill=GOLD_LIGHT, font=F_BOLD(24))
        draw.text((70, 110), f"₹{amount:,} CREDITED", fill=WHITE, font=F_BOLD(60))
        draw.text((70, 190), f"Partner: {clean_name}  •  Code: {code.upper()}", fill=GOLD_MAIN, font=F_BOLD(28))
        draw.text((70, 240), f"Level: {tier_title}  •  {paid_count} Matches Created", fill=SLATE_LIGHT, font=F_REG(22))
        
        draw.text((70, 310), "Register FREE at: manavivaha.in", fill=WHITE, font=F_BOLD(28))
        draw.text((70, 350), "Telangana & AP 43 Castes • First 3 Profiles FREE", fill=EMERALD_GREEN, font=F_BOLD(22))
        
        # Right side: QR Code
        qr_img = generate_qr_image(ref_url, size=240)
        img.paste(qr_img, (w - 320, 180))
        draw.text((w - 320, 440), "Scan to Register FREE", fill=GOLD_LIGHT, font=F_BOLD(20))
        
        draw.text((70, h - 80), "🔒 100% Verified TS-AP Matrimony • Instant UPI Payouts", fill=SLATE_LIGHT, font=F_REG(20))

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()
