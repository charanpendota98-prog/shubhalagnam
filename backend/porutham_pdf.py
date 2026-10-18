"""Retired Porutham report boundary.

There is no authorised chart interpreter in the product yet.  Keeping this
legacy import name but failing closed prevents a star/rasi-only payload from
becoming a downloadable PDF through an old helper or an accidental future
call-site.
"""
from __future__ import annotations

from typing import Any, Dict


def generate_porutham_pdf(bride: Dict[str, Any], groom: Dict[str, Any], result: Dict[str, Any]) -> bytes:
    """Never fabricate a horoscope report from incomplete or unverified data."""
    raise ValueError(
        "Porutham reports are unavailable until an authorised reviewed Jathakam interpretation exists"
    )
