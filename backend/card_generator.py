"""
TSAP Matrimony — Profile Card Generator (Pillow + QR + Watermark + Hashtags)
Pin-to-Pin Perfect Advanced
"""
from typing import Dict

# Colors
MAROON = (122, 12, 46)
GOLD = (212, 175, 55)
CREAM = (255, 248, 231)
NAVY = (15, 31, 60)
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

def generate_id(gender: str, year: int, seq: int) -> str:
    """Generate a legacy-format ID from explicitly supplied values."""
    g = "F" if str(gender or "").strip().lower().startswith("b") else "M"
    return f"TSAP-{g}-{int(year)}-{int(seq):04d}"


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


def generate_profile_id(caste: str, seq: int) -> str:
    """Generate an internal Mana Vivaha profile ID from the allocated sequence."""
    num = 1000 + int(seq) if int(seq) < 1000 else int(seq)
    return f"MV{num:04d}"


def create_profile_card(user: Dict, output_path: str) -> str:
    """Compatibility wrapper for the current truthful, member-data-only card renderer."""
    if not isinstance(user, dict):
        raise TypeError("user must be a profile dictionary")
    from card_pro import create_pro_card
    return create_pro_card(user, output_path)
