"""
మన వివాహ — PRO PROFILE CARD GENERATOR (Pillow)
=================================================
Full-detail, neat, section-wise professional card — Telegram/WhatsApp lo post avvadaniki.

Card contents (anni details tho):
  ┌ Header   : brand + ID + DOB verified + score badge
  │ Photo    : real photo (unavailable ayithe monogram circle) — gold border
  │ Section 1: Personal   (age, height, weight, blood, marital, physical, body, complexion, mother tongue, birth time)
  │ Section 2: Family     (father, mother, occupations, family type/values/status, brothers/sisters, native)
  │ Section 3: Astro      (cast, sub-caste, gothram, star, rasi, dosham, moola)
  │ Section 4: Education  (education, detail, college)
  │ Section 5: Career     (job, company, salary, work location)
  │ Section 6: Location   (district, mandal, current city, state, pincode)
  │ Section 7: About + Expectations
  │ Match    : score + 3 personalized reasons
  │ Footer   : number lock, ID search, bot, hashtags, QR, watermark, safety line
  └

Fonts: DejaVu (linux) → Noto Telugu try → default fallback. Telugu text render avvakapoyina
card crash avvadu (English + transliteration fallback).
"""
from __future__ import annotations

import os
import re
from typing import Dict, List, Optional

from PIL import Image, ImageDraw, ImageFont

try:
    import qrcode
except Exception:  # pragma: no cover
    qrcode = None

# ---- Brand colors ----
MAROON = (122, 12, 46)
MAROON_DARK = (92, 8, 34)
GOLD = (212, 175, 55)
GOLD_LIGHT = (240, 214, 140)
CREAM = (255, 248, 231)
NAVY = (15, 31, 60)
WHITE = (255, 255, 255)
BLACK = (26, 26, 26)
GREY = (110, 110, 110)
LIGHT = (246, 243, 236)
GREEN = (22, 130, 70)
ROSE = (190, 24, 60)

# 🏛️ Full state name (card lo "TS"/"AP" raw code kaakunda "Telangana"/"Andhra Pradesh"
# neatga chupinchadaniki) — WhatsApp/Telegram card + web anni chota consistent.
STATE_FULL = {
    "TS": "Telangana", "TG": "Telangana", "TELANGANA": "Telangana",
    "AP": "Andhra Pradesh", "ANDHRA PRADESH": "Andhra Pradesh",
}


def state_full_name(state: str) -> str:
    key = str(state or "TS").strip().upper()
    return STATE_FULL.get(key, str(state or "Telangana"))


# 💍 "1st marriage" (Pelli Kaledu / Never Married) profiles కి card మీద ఎప్పుడూ
# "2nd Marriage" badge కనిపించకూడదు — genuine Divorced/Widowed/Separated profiles
# కి మాత్రమే, కుడివైపు (right side) neat గా ribbon badge చూపించాలి.
_FIRST_MARRIAGE = {"pelli kaledu", "never married", "unmarried", "single", ""}


def is_second_marriage(marital_status: str) -> bool:
    v = str(marital_status or "").strip().lower()
    return bool(v) and v not in _FIRST_MARRIAGE

W, H = 900, 2400   # H = max canvas; chivarlo content ki crop chestham (footer overlap avvadu)
BRAND = "MANA VIVAHA"
LEGAL = "TSAP MATRIMONY"
SITE = os.getenv("SITE_URL", "https://manavivaha.in")
BOT = "@telugumatrimony1_bot"

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
FONT_PATHS_TELUGU = [
    "/usr/share/fonts/truetype/noto/NotoSansTelugu-Regular.ttf",
    "/usr/share/fonts/truetype/noto/NotoSansTeluguUI-Regular.ttf",
]


def _font(paths: List[str], size: int):
    for p in paths:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def F(size: int, bold: bool = False):
    return _font(FONT_PATHS_BOLD if bold else FONT_PATHS_REG, size)


def has_telugu_font() -> bool:
    return any(os.path.exists(p) for p in FONT_PATHS_TELUGU)


def _s(v, default: str = "") -> str:
    """None-safe string + trim."""
    if v is None:
        return default
    v = str(v).strip()
    return v if v else default


def _fit(draw, text: str, font, max_w: int) -> str:
    """Text ni max width lo fit chey — chivarana '...' pettu."""
    if draw.textlength(text, font=font) <= max_w:
        return text
    while text and draw.textlength(text + "…", font=font) > max_w:
        text = text[:-1]
    return text + "…"


def _wrap(draw, text: str, font, max_w: int, max_lines: int = 3) -> List[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        probe = (cur + " " + w).strip()
        if draw.textlength(probe, font=font) <= max_w:
            cur = probe
        else:
            if cur:
                lines.append(cur)
            cur = w
            if len(lines) == max_lines:
                break
    if cur and len(lines) < max_lines:
        lines.append(cur)
    if not lines:
        return []
    if len(lines) == max_lines and draw.textlength(text, font=font) > max_w * max_lines:
        lines[-1] = _fit(draw, lines[-1], font, max_w)
    return lines


# DejaVu font lo emoji glyphs levu (boxes vasthayi) — card lo clean symbols matrame
EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF"
    "\U00002B00-\U00002BFF\U0000FE0F\U0001F900-\U0001F9FF]+", flags=re.UNICODE)

ICON = {
    "person": "\u25AA",     # small square-ish marker (DejaVu has it)
    "check": "\u2713",
    "star": "\u2605",
    "dot": "\u2022",
    "arrow": "\u2192",
    "lock": "\u25A0",
}


def de_emoji(text: str) -> str:
    """Card render ki emoji teesesi clean text — DejaVu lo anni glyphs unnai."""
    if not text:
        return ""
    t = EMOJI_RE.sub("", str(text))
    t = t.replace("\ufe0f", "").replace("\u200d", "")
    return " ".join(t.split())


def _initials(name: str) -> str:
    parts = [p for p in re.split(r"\s+", _s(name, "Profile")) if p]
    return "".join(p[0].upper() for p in parts[:2]) or "M"


class CardBuilder:
    """Section-wise neat card. Height dynamic (content batti)."""

    def __init__(self, user: Dict):
        self.u = user
        self.is_bride = str(user.get("gender", "Bride")).lower().startswith("b")
        self.accent = MAROON if self.is_bride else NAVY
        self.img = Image.new("RGB", (W, H), CREAM)
        self.d = ImageDraw.Draw(self.img)
        self.y = 0

    # ---------- building blocks ----------
    def header(self):
        d = self.d
        d.rectangle([0, 0, W, 118], fill=self.accent)
        d.rectangle([0, 112, W, 118], fill=GOLD)

        # 💍 R13: brand block — kotha marriage logo (rings+lotus) paste; MV text kaadu
        _logo_path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                  "brand", "logo-square-256.png")
        if os.path.exists(_logo_path):
            try:
                _lg = Image.open(_logo_path).convert("RGBA").resize((58, 58), Image.LANCZOS)
                _m = _lg.split()[3] if _lg.mode == "RGBA" else None
                self.img.paste(_lg, (26, 21), _m)
            except Exception:
                d.rounded_rectangle([24, 20, 84, 80], 14, fill=GOLD)
                d.text((38, 32), "మన", fill=self.accent, font=F(24, True))
        else:
            d.rounded_rectangle([24, 20, 84, 80], 14, fill=GOLD)
            d.text((38, 32), "మన", fill=self.accent, font=F(24, True))
        d.text((100, 22), f"మన వివాహ  •  {BRAND}", fill=WHITE, font=F(22, True))
        d.text((100, 52), "TS-AP Telugu Matrimony  •  \u20b999 సంబంధం",
               fill=GOLD_LIGHT, font=F(14))

        # id + status line
        verified = bool(self.u.get("dob_correct") or self.u.get("is_verified"))
        rid = _s(self.u.get("tsap_id"), "TSAP-F-2025-XXXX")
        d.rounded_rectangle([100, 76, 330, 104], 12, fill=WHITE)
        d.text((112, 82), f"ID  {rid}", fill=self.accent, font=F(16, True))
        status = "DOB Verified" if verified else "Verification Pending"
        d.rounded_rectangle([338, 76, 512, 104], 12,
                            fill=GREEN if verified else (150, 120, 40))
        d.text((350, 83), (f"{ICON['check']} " if verified else "~ ") + status,
               fill=WHITE, font=F(14, True))

        # score badge (right)
        score = int(self.u.get("score", 92) or 92)
        d.rounded_rectangle([700, 20, 876, 104], 16, fill=GOLD)
        d.text((726, 30), f"{score}%", fill=self.accent, font=F(34, True))
        d.text((716, 74), "BEST MATCH", fill=self.accent, font=F(13, True))
        self.y = 132

    def photo_block(self):
        d = self.d
        box = (24, self.y, 300, self.y + 300)
        photo = self.u.get("photo_path") or self.u.get("photo_url") or ""
        drawn = False
        if photo and os.path.exists(str(photo)):
            try:
                p = Image.open(str(photo)).convert("RGB")
                # center-crop to 276x300
                tw, th = 276, 300
                ratio = max(tw / p.width, th / p.height)
                p = p.resize((int(p.width * ratio) + 1, int(p.height * ratio) + 1))
                left = (p.width - tw) // 2
                top = (p.height - th) // 3  # face slightly up
                p = p.crop((left, top, left + tw, top + th))
                self.img.paste(p, (box[0], box[1]))
                drawn = True
            except Exception:
                drawn = False
        if not drawn:
            d.rectangle(box, fill=LIGHT)
            # monogram circle (clean, professional — emoji ledu)
            cx, cy, r = box[0] + 138, box[1] + 125, 62
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=GOLD_LIGHT, outline=GOLD, width=3)
            mono = _initials(self.u.get("full_name"))
            mw = d.textlength(mono, font=F(52, True))
            d.text((cx - mw / 2, cy - 34), mono, fill=self.accent, font=F(52, True))
            d.text((box[0] + 60, box[1] + 210),
                   "Photo " + ("Private" if self.u.get("photo_private") else "Not uploaded"),
                   fill=GREY, font=F(14, True))
        # gold frame + initials chip
        d.rectangle(box, outline=GOLD, width=4)
        d.rounded_rectangle([box[0] + 6, box[1] + 258, box[0] + 58, box[1] + 292], 10, fill=GOLD)
        d.text((box[0] + 16, box[1] + 264), _initials(self.u.get("full_name")), fill=self.accent, font=F(16, True))

        # name + tagline (right of photo)
        x = 320
        is_2nd = is_second_marriage(self.u.get("marital_status"))
        # name ki full width teeskovadaniki — 2nd marriage badge unte konchem thakkuva width
        name_max_w = (W - x - 190) if is_2nd else (W - x - 30)
        d.text((x, self.y + 4), _fit(d, _s(self.u.get("full_name"), "Profile"), F(26, True), name_max_w),
               fill=self.accent, font=F(26, True))

        # 💍 R11 FIX: "1st marriage" profiles కి ఎప్పుడూ ఏ badge కనిపించదు — genuine
        # Divorced/Widowed/Separated profiles కి మాత్రమే, CARD కుడివైపు (top-right of
        # this name row) neatగా "2ND MARRIAGE" ribbon badge.
        if is_2nd:
            badge_txt = "💔 2ND MARRIAGE"
            bw = int(d.textlength(de_emoji(badge_txt), font=F(13, True))) + 24
            bx1 = W - 30 - bw
            d.rounded_rectangle([bx1, self.y, bx1 + bw, self.y + 28], 14, fill=ROSE)
            d.text((bx1 + 12, self.y + 6), de_emoji(badge_txt), fill=WHITE, font=F(13, True))

        line2 = f"{_s(self.u.get('age'),'—')} yrs  •  {_s(self.u.get('height'),'—')}  •  {_s(self.u.get('caste'),'—')}"
        d.text((x, self.y + 42), line2, fill=BLACK, font=F(17))
        line3 = f"{'BRIDE' if self.is_bride else 'GROOM'}  {ICON['dot']}  {_s(self.u.get('marital_status'),'Pelli Kaledu')}  {ICON['dot']}  {_s(self.u.get('physical_status'),'Normal')}"
        d.text((x, self.y + 68), line3, fill=GREY, font=F(15))
        # 🏛️ FIX: raw "TS"/"AP" kaakunda full state name "Telangana"/"Andhra Pradesh" neatga
        line4 = f"Location: {_s(self.u.get('district'),'-')}, {state_full_name(self.u.get('state'))}"
        if _s(self.u.get("mandal")):
            line4 += f"  •  {self.u['mandal']}"
        d.text((x, self.y + 94), line4, fill=BLACK, font=F(15))
        line5 = f"Education: {_s(self.u.get('education'),'-')}  {ICON['dot']}  Work: {_s(self.u.get('job'),'-')}"
        d.text((x, self.y + 120), _fit(d, line5, F(15), W - x - 30), fill=BLACK, font=F(15))

        # quick chips
        chips = [f"Blood: {_s(self.u.get('blood_group'),'-')}",
                 f"Star: {_s(self.u.get('star'),'-')}",
                 f"Gothram: {_s(self.u.get('gothram'),'-')}"]
        cx = x
        for c in chips:
            wpx = int(d.textlength(c, font=F(13, True))) + 20
            d.rounded_rectangle([cx, self.y + 150, cx + wpx, self.y + 178], 12, fill=GOLD_LIGHT)
            d.text((cx + 10, self.y + 156), c, fill=self.accent, font=F(13, True))
            cx += wpx + 8

        # verified tick block
        d.rounded_rectangle([x, self.y + 192, W - 30, self.y + 236], 12, fill=(238, 246, 238))
        d.text((x + 12, self.y + 200),
               f"{ICON['check']} మన వివాహ verified profile  {ICON['dot']}  Photo watermark  {ICON['dot']}  మోసం జాగ్రత్త",
               fill=GREEN, font=F(13, True))
        self.y += 316

    # ---------- section renderer ----------
    def section(self, title: str, rows: List[tuple]):
        """rows: [(label, value)] — 2 columns, neat."""
        rows = [(l, _s(v)) for l, v in rows if _s(v)]
        if not rows:
            return
        d = self.d
        # header bar
        d.rounded_rectangle([24, self.y, W - 24, self.y + 36], 10, fill=self.accent)
        d.text((38, self.y + 8), de_emoji(title), fill=GOLD_LIGHT, font=F(16, True))
        self.y += 42
        # rows in 2 columns
        col_w = (W - 48 - 12) // 2
        for i in range(0, len(rows), 2):
            for j, (label, val) in enumerate(rows[i:i + 2]):
                x = 24 + j * (col_w + 12)
                d.text((x + 4, self.y + 2), de_emoji(label), fill=GREY, font=F(12, True))
                d.text((x + 4, self.y + 18), de_emoji(_fit(d, val, F(15, True), col_w - 10)),
                       fill=BLACK, font=F(15, True))
            self.y += 44
        self.y += 10

    def about_block(self):
        u = self.u
        about = _s(u.get("about_myself"))
        exp = _s(u.get("expectations") or u.get("expectation_match"))
        if not about and not exp:
            return
        d = self.d
        d.rounded_rectangle([24, self.y, W - 24, self.y + 36], 10, fill=GOLD)
        d.text((38, self.y + 8), "About Me & Expectations", fill=self.accent, font=F(16, True))
        self.y += 46
        for label, text in (("About", about), ("Expectations", exp)):
            if not text:
                continue
            d.text((30, self.y), f"{label}:", fill=GREY, font=F(12, True))
            self.y += 18
            for ln in _wrap(d, text, F(14), W - 80, 3):
                d.text((30, self.y), ln, fill=BLACK, font=F(14))
                self.y += 20
            self.y += 6

    def match_block(self):
        u = self.u
        reasons = [_s(r) for r in (u.get("reasons") or [])][:3]
        if not reasons:
            reasons = ["Caste + Gothram + Location perfect", "Education + Job level match", "Age gap ideal"]
        d = self.d
        score = int(u.get("score", 92) or 92)
        d.rounded_rectangle([24, self.y, W - 24, self.y + 36], 10, fill=self.accent)
        d.text((38, self.y + 8), f"{ICON['star']} {score}% BEST MATCH  {ICON['dot']}  ఎందుకు set అవుతారు?",
               fill=GOLD_LIGHT, font=F(16, True))
        self.y += 46
        for r in reasons:
            lines = _wrap(d, de_emoji(r), F(14, True), W - 110, 2)
            d.text((34, self.y), ICON["check"], fill=GREEN, font=F(15, True))
            for i, ln in enumerate(lines):
                d.text((60, self.y + i * 19), ln, fill=BLACK, font=F(14))
            self.y += 20 * max(1, len(lines)) + 4
        self.y += 6

    def footer(self):
        """Footer ni final (crop ayyina) image bottom ki vesham — overlap asalu undadu."""
        u = self.u
        self.d = ImageDraw.Draw(self.img)
        d = self.d
        y0 = self.img.height - 210
        d.rectangle([0, y0, W, H], fill=MAROON_DARK)
        d.rectangle([0, y0, W, y0 + 4], fill=GOLD)
        rid = _s(u.get("tsap_id"), "TSAP-F-2025-XXXX")

        d.text((24, y0 + 16), f"Number: Interest Accept అయ్యాకే  {ICON['dot']}  🔒 Safe  {ICON['dot']}   Telegram: మన వివాహ",
               fill=GOLD_LIGHT, font=F(15, True))
        d.text((24, y0 + 44), f"ID Search: {SITE}/search/{rid}   {ICON['dot']}   Register FREE: {SITE}/register",
               fill=WHITE, font=F(13))
        tags = _s(u.get("hashtags")) or (
            f"#{_s(u.get('caste'),'Telugu').replace(' ', '')} #{_s(u.get('state'),'TS')} "
            f"{'#Bride' if self.is_bride else '#Groom'} #{_s(u.get('district'),'').replace(' ', '')}"
        )
        d.text((24, y0 + 68), _fit(d, tags, F(12, True), W - 170), fill=GOLD, font=F(12, True))
        d.text((24, y0 + 92), f"Credits: {_s(u.get('credits'),3)} FREE  {ICON['dot']}  Referral: {_s(u.get('referral_code'),'-')}",
               fill=GOLD_LIGHT, font=F(12))
        d.text((24, y0 + 114), "! Direct గా money అడిగితే వెంటనే report చెయ్యండి - మోసం జాగ్రత్త!",
               fill=(255, 190, 190), font=F(12, True))
        d.text((24, y0 + 142), f"{rid}  {ICON['dot']}  (c) మన వివాహ {os.getenv('YEAR','2025')}",
               fill=(200, 200, 200), font=F(11))

        # QR → ID search
        if qrcode:
            try:
                qr = qrcode.QRCode(version=1, box_size=4, border=1)
                qr.add_data(f"{SITE}/search/{rid}")
                qr.make(fit=True)
                q = qr.make_image(fill_color="black", back_color="white").convert("RGB").resize((122, 122))
                self.img.paste(q, (W - 150, y0 + 44))
                d.rectangle([W - 152, y0 + 42, W - 26, y0 + 168], outline=GOLD, width=2)
            except Exception:
                pass
        d.text((W - 148, y0 + 174), f"Scan {ICON['arrow']} Profile", fill=GOLD_LIGHT, font=F(11, True))

    def watermark(self):
        h = self.img.height
        wm = Image.new("RGBA", (W, h), (0, 0, 0, 0))
        wd = ImageDraw.Draw(wm)
        wd.text((W // 2 - 190, h // 2 - 20), _s(self.u.get("tsap_id"), "MANA VIVAHA"),
                fill=(120, 12, 46, 26), font=F(46, True))
        out = Image.alpha_composite(self.img.convert("RGBA"), wm).convert("RGB")
        self.img = out

    # ---------- build ----------
    def build(self, output_path: str) -> str:
        u = self.u
        self.header()
        self.photo_block()
        # NOTE: content tarvata auto-crop chesi footer vestham (build() chivarlo)

        self.section("👤 PERSONAL DETAILS", [
            ("Full Name", u.get("full_name")),
            ("Date of Birth", u.get("dob")),
            ("Birth Time", u.get("birth_time")),
            ("Age", f"{_s(u.get('age'),'—')} yrs"),
            ("Height", u.get("height")),
            ("Weight", u.get("weight")),
            ("Blood Group", u.get("blood_group")),
            ("Mother Tongue", u.get("mother_tongue")),
            ("Marital Status", u.get("marital_status")),
            ("Physical Status", u.get("physical_status")),
            ("Body Type", u.get("body_type")),
            ("Complexion", u.get("complexion")),
        ])

        self.section("👨‍👩‍👧 FAMILY DETAILS", [
            ("Father", f"{_s(u.get('father_name'))} {_s(u.get('father_occupation'))}".strip()),
            ("Mother", f"{_s(u.get('mother_name'))} {_s(u.get('mother_occupation'))}".strip()),
            ("Family Type", u.get("family_type")),
            ("Family Values", u.get("family_values")),
            ("Family Status", u.get("family_status")),
            ("Brothers", f"{_s(u.get('brothers'),'0')} ({_s(u.get('brothers_married'),'0')} married)"),
            ("Sisters", f"{_s(u.get('sisters'),'0')} ({_s(u.get('sisters_married'),'0')} married)"),
            ("Native Place", u.get("native_place")),
        ])

        self.section("🕉️ CASTE & ASTRO (Jataka)", [
            ("Caste", u.get("caste")),
            ("Sub-Caste", u.get("sub_caste")),
            ("Gothram", u.get("gothram")),
            ("Star / Nakshatram", u.get("star")),
            ("Rasi", u.get("rasi")),
            ("Dosham", u.get("dosham")),
            ("Moola Nakshatram", u.get("moola_nakshatram")),
            ("Religion", u.get("religion")),
        ])

        self.section("🎓 EDUCATION & CAREER", [
            ("Education", u.get("education_detail") or u.get("education")),
            ("College", u.get("college")),
            ("Job / Profession", u.get("job")),
            ("Company", u.get("company")),
            ("Annual Income", u.get("salary")),
            ("Work Location", u.get("work_location")),
            ("Experience", u.get("experience")),
            ("Work Type", u.get("work_type")),
        ])

        self.section("📍 LOCATION & CONTACT", [
            ("State", state_full_name(u.get("state")) if _s(u.get("state")) else ""),
            ("District", u.get("district")),
            ("Mandal / Town", u.get("mandal")),
            ("Current City", u.get("current_city")),
            ("Pincode", u.get("pincode")),
            ("Phone", f"🔒 {_s(u.get('phone_last4'),'----')} (pay tarvata)" if u.get("phone") else ""),
        ])

        self.about_block()
        self.match_block()

        # ---- AUTO-CROP: content ki saripoyE height (footer overlap/blank space rendu ledu) ----
        content_bottom = min(self.y + 26, H)
        final_h = content_bottom + 210
        self.img = self.img.crop((0, 0, W, final_h))
        self.y = content_bottom

        self.footer()
        self.watermark()

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        self.img.save(output_path, quality=95, optimize=True)
        return output_path


def create_pro_card(user: Dict, output_path: str) -> str:
    """Public API — full detail neat card. Fail ayithe old generator try chestundi (main.py lo)."""
    return CardBuilder(user).build(output_path)


if __name__ == "__main__":
    demo = {
        "tsap_id": "TSAP-F-2025-5775", "full_name": "Lakshmi Reddy", "gender": "Bride",
        "dob": "2000-06-14", "dob_correct": True, "birth_time": "06:20 AM", "age": 25,
        "height": "5'4\"", "weight": "54 kg", "blood_group": "O+", "mother_tongue": "Telugu",
        "marital_status": "Pelli Kaledu", "physical_status": "Normal", "body_type": "Average",
        "complexion": "Fair", "father_name": "Ramesh Reddy", "father_occupation": "(Farmer)",
        "mother_name": "Lakshmamma", "mother_occupation": "(Housewife)", "family_type": "Nuclear",
        "family_values": "Traditional", "family_status": "Middle Class", "brothers": 1,
        "brothers_married": 0, "sisters": 1, "sisters_married": 1, "native_place": "Miryalaguda",
        "caste": "Reddy", "sub_caste": "Pakanati", "gothram": "Bharadwaj", "star": "Rohini",
        "rasi": "Vrishabha", "dosham": "No", "moola_nakshatram": "No", "religion": "Hindu",
        "education": "BTech", "education_detail": "BTech CSE", "college": "JNTU Hyderabad",
        "job": "Software Engineer", "company": "TCS", "salary": "8 LPA", "work_location": "Hyderabad",
        "experience": "3 yrs", "work_type": "Private", "state": "TS", "district": "Nalgonda",
        "mandal": "Miryalaguda", "current_city": "Hyderabad", "pincode": "508207",
        "phone": "9848012345", "phone_last4": "2345", "credits": 3,
        "referral_code": "LAK42", "score": 92,
        "about_myself": "నేను friendly, family oriented, software లో work చేస్తున్న. Cooking, music ఇష్టం.",
        "expectations": "Reddy alliance, Hyderabad / Nalgonda, software or govt job, 26-31 age.",
        "reasons": ["నువ్వు Hyderabad కావాలి అన్నావు → వీళ్లు కూడా Hyderabad లోనే — near!",
                    "Software + Reddy + BTech — ee combination perfect match",
                    "Gothram Bharadwaj + Star Rohini — jatakaalu kooda set avuthunnai"],
        "hashtags": "#TSBride #Reddy #Software #Telangana #Bride #Nalgonda #Age25 #BTech",
    }
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "cards", "sample_pro_card.png")
    create_pro_card(demo, out)
    print("✅ card created:", os.path.abspath(out), "| telugu font:", has_telugu_font())
