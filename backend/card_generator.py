"""
TSAP Matrimony — Profile Card Generator (Pillow + QR + Watermark + Hashtags)
Pin-to-Pin Perfect Advanced
"""
from PIL import Image, ImageDraw, ImageFont
import qrcode
import os
from typing import Dict
import os

CARD_SITE = os.getenv("SITE_URL", "https://manavivaha.in")

# Colors
MAROON = (122, 12, 46)
GOLD = (212, 175, 55)
CREAM = (255, 248, 231)
NAVY = (15, 31, 60)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

def generate_id(gender: str, year: int = 2025, seq: int = 1042) -> str:
    """TSAP-F-2025-1042 (legacy format — old profiles ki)"""
    g = "F" if gender=="Bride" else "M"
    return f"TSAP-{g}-{year}-{seq:04d}"


# ---------------------------------------------------------------------------
# ⭐ CASTE-WISE PROFILE ID — RED001, KAM001, VIS001 (neat, short, caste-based)
# ---------------------------------------------------------------------------
CASTE_ID_CODES = {
    "reddy": "RED", "kamma": "KAM", "kapu": "KAP", "velama": "VEL", "brahmin": "BRM",
    "vysya": "VYS", "arya_vysya": "VYS", "yadava": "YAD", "goud": "GOU", "yadava_goud": "YAD",
    "mala": "MAL", "madiga": "MAD", "viswabrahmana": "VIS", "viswakarma": "VIS",
    "munnuru_kapu": "MNK", "raju_kshatriya": "RAJ", "kshatriya": "RAJ", "raju": "RAJ",
    "padmashali_weavers": "PAD", "padmashali": "PAD", "mudiraj": "MUD",
    "lambada_banjara": "LAM", "lambada": "LAM", "banjara": "LAM",
    "balija": "BAL", "settibalija": "SET", "turpu_kapu": "TKP", "vaddera": "VAD",
    "boya": "BOY", "kuruba": "KUR", "are_katika": "KAT", "kummara": "KUM",
    "rajaka": "RJK", "nayee_brahmin": "NAY", "perika": "PER", "devanga": "DEV",
    "muslim": "MUS", "christian": "CHR", "others_bc": "OBC", "others_sc": "OSC", "others_st": "OST",
}


def caste_code(caste: str) -> str:
    """'Reddy' → 'RED', 'Goud' → 'GOU', 'Kamma' → 'KAM'; fallback → first 3 letters."""
    raw = str(caste or "").strip()
    _norm = raw.lower().replace(" ", "_").replace("-", "_")
    if _norm in CASTE_ID_CODES:
        return CASTE_ID_CODES[_norm]
    # grouped community names — explicit codes (OTH kakunda OSC/OBC/OST)
    _low = raw.lower().replace("_", " ")
    if "goud" in _low:
        return "GOU"
    if "yadava" in _low:
        return "YAD"
    if "sc" in _low and ("other" in _low or "ఇతర" in raw):
        return "OSC"
    if "bc" in _low and ("other" in _low or "ఇతర" in raw):
        return "OBC"
    if "st" in _low and ("other" in _low or "ఇతర" in raw):
        return "OST"
    if raw:
        try:
            from channels_config import resolve_caste_key
            key = resolve_caste_key(raw)
            if key and key in CASTE_ID_CODES:
                return CASTE_ID_CODES[key]
        except Exception:
            pass
        letters = "".join(c for c in raw.upper() if c.isalpha())
        if letters:
            return letters[:3]
    return "TEL"


def generate_profile_id(caste: str, seq: int = 1) -> str:
    """'Reddy' + 1 → RED1001 · 'Viswabrahmin' + 1 → VIS1001 · 1042 → RED1042."""
    code = caste_code(caste)
    num = 1000 + seq if seq < 1000 else seq
    return f"{code}{num:04d}"

def create_profile_card(user: Dict, output_path: str) -> str:
    """
    user: dict with tsap_id, gender, age, height, caste, education, job, salary, district, state, mandal, gothram, star, score, reasons
    output_path: e.g. /tmp/TSAP-F-1042.png
    """
    W, H = 800, 1200
    is_bride = user.get("gender")=="Bride"
    bg_color = MAROON if is_bride else NAVY

    # Create base image
    img = Image.new("RGB", (W, H), CREAM)
    draw = ImageDraw.Draw(img)

    # Try to load font, fallback to default
    try:
        font_bold = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
        font_reg = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
        font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
        font_tiny = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
    except:
        font_bold = ImageFont.load_default()
        font_reg = ImageFont.load_default()
        font_small = ImageFont.load_default()
        font_tiny = ImageFont.load_default()

    # Top strip — brand
    draw.rectangle([0, 0, W, 70], fill=bg_color)
    draw.text((20, 15), f"TSAP MATRIMONY • {user.get('tsap_id','TSAP-F-1042')} • {'👰 Bride' if is_bride else '🤵 Groom'}", fill=GOLD, font=font_bold)
    draw.text((20, 45), f"✅ Verified • ⭐ {user.get('score',92)}% Match • {user.get('district','Nalgonda')} ({user.get('state','TS')})", fill=WHITE, font=font_small)

    # Photo area (left)
    photo_box = [20, 90, 300, 370]
    draw.rectangle(photo_box, fill=(230,230,230), outline=GOLD, width=3)
    # Placeholder icon
    draw.text((photo_box[0]+80, photo_box[1]+100), "👰" if is_bride else "🤵", fill=BLACK, font=font_bold)
    draw.text((photo_box[0]+20, photo_box[1]+200), f"Photo: {'🔒 Private' if user.get('photo_private') else '1/3'}", fill=BLACK, font=font_small)

    # Details (right)
    x = 320
    y = 90
    sub_caste_str = f"({user.get('sub_caste')})" if user.get('sub_caste') else ""
    mandal_str = f"• {user.get('mandal')}" if user.get('mandal') else ""
    height_val = user.get('height','5-4')
    details = [
        f"Age: {user.get('age','24')}y • Height: {height_val}",
        f"Caste: {user.get('caste','Reddy')} {sub_caste_str}",
        f"Gothram: {user.get('gothram','Bharadwaj')} • Star: {user.get('star','Rohini')}",
        f"Education: {user.get('education','BTech')}",
        f"Job: {user.get('job','Software')} @ {user.get('district','Nalgonda')}",
        f"Salary: {user.get('salary','60k')}/mo",
        f"Location: {user.get('district','Nalgonda')} {mandal_str} ({user.get('state','TS')})",
        f"Status: {user.get('marital_status','Pelli Kaledu')}",
    ]
    for line in details:
        draw.text((x, y), line, fill=BLACK, font=font_reg)
        y += 30

    # Expectation
    y += 10
    draw.rectangle([20, y, W-20, y+60], fill=WHITE, outline=GOLD)
    draw.text((30, y+5), f"Expectation: {user.get('expectations','Same caste, Hyd near, Govt/Software, 23-26 age')}", fill=BLACK, font=font_small)
    y += 70

    # Reasons — personalized
    draw.rectangle([20, y, W-20, y+140], fill=(255,255,255), outline=MAROON)
    draw.text((30, y+5), f"⭐ {user.get('score',92)}% BEST MATCH — Why?", fill=MAROON, font=font_bold)
    ry = y+35
    for reason in user.get("reasons", ["నువ్వు Hyd కావాలి అన్నావు → అమ్మాయి కూడా Hyd లోనే", "Software + Reddy + Age gap perfect"] )[:3]:
        draw.text((30, ry), f"✅ {reason}", fill=BLACK, font=font_small)
        ry += 25
    y += 150

    # Footer — number lock + hashtags + QR
    draw.rectangle([0, H-180, W, H], fill=bg_color)
    draw.text((20, H-170), f"📞 Number: Interest Accept అయ్యాకే 🔒 • Telegram: manavivaha.in", fill=GOLD, font=font_small)
    draw.text((20, H-145), f"🔍 ID Search: {CARD_SITE}/search/{user.get('tsap_id','TSAP-1042')}", fill=WHITE, font=font_small)
    hashtags = f"#{user.get('caste','Reddy')} #{user.get('state','TS')} #{user.get('gender','Bride')} #Age{user.get('age','24')} #{user.get('education','BTech')} #{user.get('district','Nalgonda')}"
    draw.text((20, H-120), hashtags, fill=GOLD, font=font_tiny)
    draw.text((20, H-100), f"⚠️ Direct money అడిగితే fraud! • {user.get('tsap_id','TSAP-1042')}", fill=WHITE, font=font_tiny)
    draw.text((20, H-70), f"Referral: {user.get('referral_code','—')} • manavivaha.in", fill=WHITE, font=font_tiny)

    # QR code (ID search)
    qr = qrcode.QRCode(version=1, box_size=4, border=1)
    qr.add_data(f"{CARD_SITE}/search/{user.get('tsap_id','TSAP-1042')}")
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_img = qr_img.resize((100,100))
    img.paste(qr_img, (W-120, H-170))

    # Watermark middle light
    watermark = Image.new("RGBA", (W, H), (0,0,0,0))
    w_draw = ImageDraw.Draw(watermark)
    w_draw.text((W//2-100, H//2), f"{user.get('tsap_id','TSAP-1042')}", fill=(0,0,0,30), font=font_bold)
    img = Image.alpha_composite(img.convert("RGBA"), watermark).convert("RGB")

    # Save
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    img.save(output_path, quality=95)
    return output_path

if __name__=="__main__":
    user = {
        "tsap_id": "TSAP-F-2025-1042",
        "gender": "Bride",
        "age": 24,
        "height": "5'4\"",
        "caste": "Reddy",
        "sub_caste": "Pakanati",
        "gothram": "Bharadwaj",
        "star": "Rohini",
        "education": "BTech",
        "job": "Software",
        "salary": "60k",
        "district": "Nalgonda",
        "state": "TS",
        "mandal": "Gachibowli",
        "marital_status": "Pelli Kaledu",
        "expectations": "Same caste, Hyd near, Govt/Software, 23-26 age",
        "score": 92,
        "reasons": ["నువ్వు Hyd కావాలి అన్నావు → అమ్మాయి కూడా Hyd లోనే", "Software + Reddy + Age gap 3y perfect", "Education BTech same"],
        "referral_code": "BROKER-RAJU-01",
        "credits": 3,
        "photo_private": False,
    }
    path = "/tmp/TSAP-F-1042.png"
    create_profile_card(user, path)
    print(f"Card saved to {path}")
