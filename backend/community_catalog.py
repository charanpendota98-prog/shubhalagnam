"""Community label lookup shared by server-side registration validation and metadata APIs.

The catalog is a convenience list only, not an official or exhaustive classification.
Profiles may use member-provided self-descriptions when a label is missing.
"""
from __future__ import annotations
import json
from pathlib import Path
from typing import List

_DATA_FILE = Path(__file__).with_name("community_catalog.json")
try:
    with _DATA_FILE.open(encoding="utf-8") as _file:
        _DATA = json.load(_file)
except (OSError, ValueError):
    _DATA = {"hindu_subcastes": {}}

HINDU_SUBCASTES = _DATA.get("hindu_subcastes", {}) if isinstance(_DATA, dict) else {}
ALIASES = {
    "Vysya": "Arya Vysya",
    "Viswakarma": "Viswabrahmin",
    "Yadav": "Yadava",
    "Mangali": "Nayee Brahmin",
}


def subcastes_for(religion: str, caste: str) -> List[str]:
    if str(religion or "").strip().casefold() != "hindu":
        return []
    key = str(caste or "").strip()
    key = ALIASES.get(key, key)
    values = HINDU_SUBCASTES.get(key, [])
    if not isinstance(values, list):
        return []
    unique = {str(value).strip() for value in values if str(value).strip()}
    return sorted(unique, key=lambda value: (value.casefold(), value))
