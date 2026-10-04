"""Deprecated compatibility shim for retired synthetic matchmaking scores.

New code should use :mod:`topmatch`, which compares member-entered profile
facts and explicit saved preferences without manufacturing a compatibility
percentage, grade, score, or ranking reason.
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import topmatch


def calculate_age_score(*_args: Any, **_kwargs: Any) -> None:
    """Retired: age is a member-provided fact, not a compatibility score."""
    return None


def calculate_caste_score(*_args: Any, **_kwargs: Any) -> None:
    """Retired: community labels do not produce compatibility points."""
    return None


def calculate_location_score(*_args: Any, **_kwargs: Any) -> None:
    """Retired: location labels do not produce compatibility points."""
    return None


def calculate_education_score(*_args: Any, **_kwargs: Any) -> None:
    """Retired: education labels do not produce compatibility points."""
    return None


def calculate_job_score(*_args: Any, **_kwargs: Any) -> None:
    """Retired: profession labels do not produce compatibility points."""
    return None


def calculate_height_score(*_args: Any, **_kwargs: Any) -> None:
    """Retired: height labels do not produce compatibility points."""
    return None


def calculate_horoscope_score(*_args: Any, **_kwargs: Any) -> None:
    """Retired: use the separate, clearly labelled Porutham tool if requested."""
    return None


def calculate_marital_score(*_args: Any, **_kwargs: Any) -> None:
    """Retired: marital status is a profile fact, not a compatibility score."""
    return None


def calculate_match_score(*_args: Any, **_kwargs: Any) -> None:
    """Legacy import shim; no synthetic compatibility score is calculated."""
    return None


def generate_personalized_reasons(user: Dict, match: Dict, _score: Any = None) -> List[str]:
    """Legacy name returning factual observations only (never suitability claims)."""
    return list(topmatch.score_match_v2(user or {}, match or {}).get("observations", []))


def find_top_matches(
    user: Dict, all_profiles: List[Dict], limit: int = 10,
    min_score: Optional[int] = None, wants_same_caste: bool = True,
) -> List[Dict]:
    """Legacy list adapter; ``min_score``/``wants_same_caste`` are ignored."""
    rows = topmatch.find_top_matches_v2(user or {}, all_profiles or [], limit=limit, min_score=min_score)
    output: List[Dict] = []
    for row in rows:
        profile = dict(row.get("profile") or {})
        profile["observations"] = list(row.get("observations") or [])
        profile["differences"] = list(row.get("differences") or [])
        profile["preferences"] = list(row.get("preferences") or [])
        output.append(profile)
    return output


def generate_profile_highlights(profile: Dict, limit: int = 4) -> List[str]:
    """Return concise member-entered facts and evidence-backed verification notes."""
    profile = profile or {}
    details: List[str] = []
    for key, label in (("caste", "Community"), ("education", "Education"), ("job", "Profession"),
                       ("district", "District"), ("gothram", "Gothram"), ("star", "Star")):
        value = str(profile.get(key) or "").strip()
        if value:
            details.append(f"{label} listed by the member: {value}")
    if profile.get("phone_verified"):
        details.append("Phone-number OTP check completed; this does not verify identity.")
    if profile.get("id_verified"):
        details.append("Government ID manually reviewed; other profile details are not verified by this check.")
    if profile.get("selfie_verified") or profile.get("photo_status") == "approved":
        details.append("Photo/selfie review status is approved; this is not an identity or liveness guarantee.")
    return details[:max(0, int(limit))]
