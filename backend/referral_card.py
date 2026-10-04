"""Legacy compatibility wrapper for referral QR posters.

The old implementation rendered caller-controlled amounts, cash-credit claims,
rank labels, and payout promises as "earnings proof". These arguments are kept
for compatibility but deliberately ignored; the only supported image now is a
referral-information poster generated from the referral kit.
"""
from __future__ import annotations

import os
from typing import Optional

SITE_URL = os.getenv("SITE_URL", "https://manavivaha.in").rstrip("/")


def generate_earnings_status_card(
    name: str,
    code: str,
    amount: int = 0,
    paid_count: int = 0,
    tier_title: str = "",
    format_type: str = "story",
) -> bytes:
    """Return a referral QR poster; never display caller-supplied earnings data."""
    from referral_kit import poster_card

    clean_code = str(code or "MV").strip().upper()
    style = "status" if str(format_type or "story").lower() in ("story", "status") else "square"
    user = {
        "full_name": str(name or "Mana Vivaha member"),
        "referral_code": clean_code,
        "referral_link": f"{SITE_URL}/r/{clean_code}",
    }
    path = poster_card(user, style=style)
    with open(path, "rb") as image_file:
        return image_file.read()
