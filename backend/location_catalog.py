"""Canonical district choices and backwards-compatible location aliases.

The district lists are convenience catalogues for Telangana and Andhra Pradesh,
not a substitute for member-entered city/location details outside those states.
"""
from __future__ import annotations

from typing import Dict, List

TS_DISTRICTS: List[str] = [
    "Adilabad",
    "Bhadradri Kothagudem",
    "Hanamkonda",
    "Hyderabad",
    "Jagtial",
    "Jangaon",
    "Jayashankar Bhupalpally",
    "Jogulamba Gadwal",
    "Kamareddy",
    "Karimnagar",
    "Khammam",
    "Kumuram Bheem Asifabad",
    "Mahabubabad",
    "Mahabubnagar",
    "Mancherial",
    "Medak",
    "Medchal-Malkajgiri",
    "Mulugu",
    "Nagarkurnool",
    "Nalgonda",
    "Narayanpet",
    "Nirmal",
    "Nizamabad",
    "Peddapalli",
    "Rajanna Sircilla",
    "Rangareddy",
    "Sangareddy",
    "Siddipet",
    "Suryapet",
    "Vikarabad",
    "Wanaparthy",
    "Warangal",
    "Yadadri Bhuvanagiri",
]

# AP names/count (28) checked against the Government of India's Integrated Government
# Online Directory on 2026-10-01; the Markapuram entry is also established by its
# official district Gazette order (G.O.Ms.No.524, 2025-12-30).
# Sources: https://igod.gov.in/sg/AP/E042/organizations
# https://cdn.s3waas.gov.in/s38f7d807e1f53eff5f9efbe5cb81090fb/uploads/2026/01/17678549325255.pdf
AP_DISTRICTS: List[str] = [
    "Alluri Sitharama Raju",
    "Anakapalli",
    "Ananthapuramu",
    "Annamayya",
    "Bapatla",
    "Chittoor",
    "Dr. B.R. Ambedkar Konaseema",
    "East Godavari",
    "Eluru",
    "Guntur",
    "Kakinada",
    "Krishna",
    "Kurnool",
    "Markapuram",
    "Nandyal",
    "NTR",
    "Palnadu",
    "Parvathipuram Manyam",
    "Polavaram",
    "Prakasam",
    "Sri Potti Sriramulu Nellore",
    "Sri Sathya Sai",
    "Srikakulam",
    "Tirupati",
    "Visakhapatnam",
    "Vizianagaram",
    "West Godavari",
    "YSR Kadapa",
]

# Preserve labels used by older clients and stored registration fixtures while
# writing one canonical name for new and edited TS/AP profiles.
_DISTRICT_ALIASES: Dict[str, Dict[str, str]] = {
    "TS": {
        "mahbubnagar": "Mahabubnagar",
    },
    "AP": {
        "ntr (vijayawada)": "NTR",
        "vijayawada (ntr)": "NTR",
    },
}

_CANONICAL_BY_STATE = {
    "TS": {district.casefold(): district for district in TS_DISTRICTS},
    "AP": {district.casefold(): district for district in AP_DISTRICTS},
}


def canonicalize_district(state: str, district: str) -> str:
    """Normalize case and known legacy spellings while preserving custom areas."""
    value = " ".join(str(district or "").split())
    code = str(state or "").strip().upper()
    key = value.casefold()
    aliases = _DISTRICT_ALIASES.get(code, {})
    if key in aliases:
        return aliases[key]
    return _CANONICAL_BY_STATE.get(code, {}).get(key, value)


def valid_district_for_state(state: str, district: str) -> bool:
    """Whether the canonicalized district is in the selected TS/AP catalogue."""
    code = str(state or "").strip().upper()
    normalized = canonicalize_district(code, district)
    catalog = {"TS": TS_DISTRICTS, "AP": AP_DISTRICTS}.get(code, [])
    return normalized in catalog
