"""Compatibility wrapper for the current, limited ten-check Porutham PDF."""
from __future__ import annotations

from typing import Any, Dict

from porutham_pdf import generate_porutham_pdf


def generate_gunamelanam_pdf(bride: Dict[str, Any], groom: Dict[str, Any], result: Dict[str, Any]) -> bytes:
    """Legacy import name; an actual backend result is required (no invented defaults)."""
    return generate_porutham_pdf(bride, groom, result)
