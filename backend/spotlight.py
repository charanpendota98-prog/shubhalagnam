"""Paid profile-spotlight submissions with explicit payment and media review.

A spotlight is an on-site sponsored placement for its approved duration; it is
not an identity check and does not promise reach, responses, or a match.
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from urllib.parse import parse_qs, urlparse

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SPOTLIGHT_FILE = os.environ.get("MANA_VIVAHA_SPOTLIGHT_FILE", os.path.join(BASE_DIR, "spotlight_promotions.json"))

SPOTLIGHT_TIERS = {
    "SPOT_3": {
        "code": "SPOT_3",
        "days": 3,
        "price": 99,
        "name_en": "3-Day Sponsored Spotlight",
        "name_te": "⚡ 3 రోజుల స్పాట్‌లైట్ బూస్ట్",
        "perks_en": ["Sponsored card after payment and profile/media review", "On-site display for 3 days after approval", "Promotional badge only; no identity, reach, response, or match guarantee"],
        "perks_te": ["చెల్లింపు, ప్రొఫైల్/మీడియా సమీక్ష తర్వాత స్పాన్సర్డ్ కార్డ్", "ఆమోదం తర్వాత 3 రోజుల పాటు సైట్‌లో ప్రదర్శన", "ప్రమోషన్ బ్యాడ్జ్ మాత్రమే; identity, reach, response లేదా match హామీ లేదు"],
        "badge": "⚡ SPONSORED PROFILE",
        "badge_te": "⚡ స్పాన్సర్డ్ ప్రొఫైల్"
    },
    "SPOT_7": {
        "code": "SPOT_7",
        "days": 7,
        "price": 199,
        "name_en": "7-Day Spotlight",
        "name_te": "🌟 7 రోజుల స్పాట్‌లైట్",
        "perks_en": ["Approved photo or video card", "On-site display for 7 days after approval", "No reach, response, or match guarantee"],
        "perks_te": ["ఆమోదించిన ఫోటో లేదా వీడియోతో కార్డ్", "ఆమోదం తర్వాత 7 రోజుల పాటు సైట్‌లో ప్రదర్శన", "రీచ్, స్పందన లేదా మ్యాచ్ హామీ లేదు"],
        "badge": "🌟 SPONSORED SPOTLIGHT",
        "badge_te": "🌟 స్పాన్సర్డ్ స్పాట్‌లైట్"
    },
    "SPOT_30": {
        "code": "SPOT_30",
        "days": 30,
        "price": 499,
        "name_en": "30-Day Spotlight",
        "name_te": "💎 30 రోజుల స్పాట్‌లైట్",
        "perks_en": ["On-site display for 30 days after approval", "Video player when an approved video is included", "No reach, response, or match guarantee"],
        "perks_te": ["మీడియా ఆమోదం తర్వాత 30 రోజుల పాటు సైట్‌లో ప్రదర్శన", "ఆమోదించిన వీడియో ఉంటే వీడియో ప్లేయర్", "రీచ్, స్పందన లేదా మ్యాచ్ హామీ లేదు"],
        "badge": "💎 SPONSORED FEATURE",
        "badge_te": "💎 స్పాన్సర్డ్ ప్రమోషన్"
    }
}


def _load_spotlights() -> List[Dict[str, Any]]:
    if not os.path.exists(SPOTLIGHT_FILE):
        return []
    try:
        with open(SPOTLIGHT_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


def _save_spotlights(items: List[Dict[str, Any]]) -> bool:
    try:
        with open(SPOTLIGHT_FILE, "w", encoding="utf-8") as f:
            json.dump(items, f, ensure_ascii=False, indent=2, default=str)
        return True
    except Exception as e:
        print("[SPOTLIGHT] save failed:", str(e))
        return False


def _profile_photo_url(value: Any) -> str:
    """Accept only same-site /photos paths; external image URLs are not public media."""
    raw = str(value or "").strip()
    if not raw or len(raw) > 300 or raw.startswith("//"):
        return ""
    try:
        parsed = urlparse(raw)
        if parsed.scheme or parsed.netloc:
            return ""
        if parsed.query or parsed.fragment or "\\" in parsed.path:
            return ""
        if not re.fullmatch(r"/photos/[A-Za-z0-9._-]{1,180}", parsed.path):
            return ""
        if ".." in parsed.path.split("/"):
            return ""
        return parsed.path
    except (TypeError, ValueError):
        return ""


def _clean_video_url(url: str) -> str:
    """Allow YouTube watch/short/embed URLs only; never pass arbitrary media URLs through."""
    raw = str(url or "").strip()
    if not raw:
        return ""
    try:
        parsed = urlparse(raw)
        if parsed.scheme.lower() != "https" or parsed.username or parsed.password or parsed.port:
            return ""
        host = (parsed.hostname or "").lower().rstrip(".")
        if host not in {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "youtube-nocookie.com", "www.youtube-nocookie.com"}:
            return ""
        video_id = ""
        if host == "youtu.be":
            video_id = parsed.path.strip("/").split("/")[0]
        elif parsed.path == "/watch":
            video_id = (parse_qs(parsed.query).get("v") or [""])[0]
        else:
            match = re.fullmatch(r"/(?:shorts|embed)/([A-Za-z0-9_-]{11})/?", parsed.path)
            video_id = match.group(1) if match else ""
        if not re.fullmatch(r"[A-Za-z0-9_-]{11}", video_id):
            return ""
        return f"https://www.youtube-nocookie.com/embed/{video_id}"
    except (TypeError, ValueError):
        return ""


def _parse_utc(value: Any) -> Optional[datetime]:
    """Parse stored timestamps consistently; invalid/ambiguous dates fail closed."""
    try:
        parsed = datetime.fromisoformat(str(value or "").strip().replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def get_active_spotlights(limit: int = 12) -> List[Dict[str, Any]]:
    """Return approved, paid, unexpired public fields; never leak payment data or metrics."""
    items = _load_spotlights()
    now = datetime.utcnow()
    active: List[Dict[str, Any]] = []
    expired_changed = False
    public_fields = (
        "promo_id", "tsap_id", "full_name", "gender", "age", "caste", "subcaste",
        "district", "education", "job", "height", "badge_text", "badge_text_te", "headline",
        "pitch_text", "photo_url", "video_url",
    )

    for item in items:
        if not isinstance(item, dict) or item.get("status") != "active" or item.get("payment_status") != "verified":
            continue
        expires_at = _parse_utc(item.get("expires_at"))
        if expires_at is None or expires_at <= now:
            item["status"] = "expired"
            expired_changed = True
            continue
        active.append(item)

    if expired_changed:
        _save_spotlights(items)

    # Newest approved placement first; order is recency-based, not a popularity or trust ranking.
    active.sort(key=lambda item: (_parse_utc(item.get("approved_at")) or datetime.min,
                                  str(item.get("promo_id") or "")), reverse=True)
    try:
        max_rows = max(0, min(30, int(limit)))
    except (TypeError, ValueError, OverflowError):
        max_rows = 12
    return [{key: item.get(key) for key in public_fields if key in item}
            for item in active[:max_rows]]


def create_spotlight_submission(
    user: Dict[str, Any],
    plan_code: str,
    headline: str,
    pitch_text: str,
    photo_url: str = "",
    video_url: str = "",
    payment_mode: str = "upi",
    payment_ref: str = "",
    contact_opt: str = "send_interest",
    consent_confirmed: bool = False,
    auto_approve: bool = False
) -> Dict[str, Any]:
    """Create a pending spotlight application from an authenticated, registered user."""
    tier = SPOTLIGHT_TIERS.get(str(plan_code or "").upper())
    if not tier:
        raise ValueError("Choose a valid spotlight plan.")
    if auto_approve:
        raise ValueError("Spotlight cannot be auto-approved; payment and media require review.")

    tsap_id = str(user.get("tsap_id") or "").strip().upper()
    if not tsap_id:
        raise ValueError("A registered profile ID is required.")
    status = str(user.get("status") or "").strip().lower()
    approved_flag = user.get("is_approved")
    is_approved = (approved_flag is True or str(approved_flag).strip().lower() in {"1", "true", "yes", "approved"}
                   or status == "approved")
    if (not is_approved or user.get("is_banned") or user.get("is_active") is False
            or status in {"deleted", "married_fixed", "banned", "rejected"}):
        raise ValueError("Only an active, approved profile may apply for a spotlight.")
    if consent_confirmed is not True:
        raise ValueError("Confirm that the profile fields and selected media may appear in a sponsored public placement after approval.")
    headline = str(headline or "").strip()
    pitch_text = str(pitch_text or "").strip()
    if not headline or len(headline) > 140:
        raise ValueError("Headline is required and must be 140 characters or fewer.")
    if not pitch_text or len(pitch_text) > 600:
        raise ValueError("Profile introduction is required and must be 600 characters or fewer.")
    payment_ref = str(payment_ref or "").strip()
    if not re.fullmatch(r"\d{12}", payment_ref):
        raise ValueError("Enter the actual 12-digit UPI transaction reference; do not use a generated or sample reference.")
    if str(payment_mode or "").strip().lower() not in ("upi", "manual_upi"):
        raise ValueError("Only the configured manual UPI payment method is supported for this application.")
    if str(contact_opt or "").strip().lower() not in ("send_interest", "show_phone"):
        raise ValueError("Choose a valid contact preference.")

    private_photo = bool(user.get("photo_private") or user.get("privacy_mode") == "private")
    approved_photo = user.get("photo_status") == "approved" and not private_photo
    profile_photo = _profile_photo_url(user.get("photo_url")) if approved_photo else ""
    requested_photo = str(photo_url or "").strip()
    if requested_photo and requested_photo != profile_photo:
        raise ValueError("Spotlight photos must be the profile owner's existing, approved public /photos image; external URLs are not accepted.")
    photo = profile_photo
    video = _clean_video_url(video_url)
    if video_url and not video:
        raise ValueError("Video link must be a valid HTTPS YouTube watch, Shorts, or embed URL.")

    items = _load_spotlights()
    if any(str(item.get("payment_ref") or "").strip() == payment_ref for item in items if isinstance(item, dict)):
        raise ValueError("This UPI transaction reference has already been submitted.")
    now = datetime.utcnow()
    promo_id = f"SPOT-{now.strftime('%Y%m%d')}-{len(items)+1:04d}"
    age = user.get("age")
    try:
        age = int(age) if age not in (None, "") else None
    except (TypeError, ValueError):
        age = None

    entry = {
        "promo_id": promo_id,
        "tsap_id": tsap_id,
        "full_name": str(user.get("full_name") or "").strip(),
        "gender": str(user.get("gender") or "").strip(),
        "age": age,
        "caste": str(user.get("caste") or "").strip(),
        "subcaste": str(user.get("subcaste") or user.get("sub_caste") or "").strip(),
        "district": str(user.get("district") or "").strip(),
        "education": str(user.get("education") or "").strip(),
        "job": str(user.get("job") or user.get("profession") or "").strip(),
        "income": str(user.get("income") or "").strip(),
        "height": str(user.get("height") or "").strip(),
        "marital_status": str(user.get("marital_status") or "").strip(),
        "plan_code": tier["code"],
        "plan_name_en": tier["name_en"],
        "plan_name_te": tier["name_te"],
        "amount_due": int(tier["price"]),
        "amount_paid": 0,
        "days": int(tier["days"]),
        "badge_text": tier["badge"],
        "badge_text_te": tier["badge_te"],
        "headline": headline,
        "pitch_text": pitch_text,
        "photo_url": photo,
        "video_url": video,
        "media_type": "video" if video else ("photo" if photo else "none"),
        "contact_opt": str(contact_opt).strip().lower(),
        "publication_consent": True,
        "publication_consent_at": now.isoformat(),
        "publication_consent_version": "spotlight-public-placement-v1",
        "payment_mode": "manual_upi",
        "payment_ref": payment_ref,
        "payment_status": "pending_verification",
        "status": "pending_review",
        "submitted_at": now.isoformat(),
        "approved_at": None,
        "expires_at": None,
        "closed_at": None,
        "views_count": 0,
        "clicks_count": 0,
        "interests_count": 0,
        "moderator_notes": "Payment and media require manual review.",
    }

    items.append(entry)
    if not _save_spotlights(items):
        raise RuntimeError("Spotlight application could not be saved. Please retry.")
    return entry


def moderate_spotlight(
    promo_id: str,
    action: str,
    moderator: str = "admin",
    notes: str = "",
    override_days: Optional[int] = None
) -> Dict[str, Any]:
    """Admin / Worker action: approve, reject, or close."""
    items = _load_spotlights()
    target = None
    
    for it in items:
        if it.get("promo_id") == promo_id:
            target = it
            break
            
    if not target:
        raise ValueError(f"Spotlight promotion {promo_id} not found")
        
    now = datetime.utcnow()
    action = action.lower().strip()
    
    if action == "verify_payment":
        if not re.fullmatch(r"\d{12}", str(target.get("payment_ref") or "")):
            raise ValueError("A valid 12-digit UTR is required before payment verification.")
        if len(str(notes or "").strip()) < 8:
            raise ValueError("Add an audit note confirming how the payment was matched to the bank statement.")
        target["payment_status"] = "verified"
        target["payment_verified_at"] = now.isoformat()
        target["amount_paid"] = int(target.get("amount_due", 0) or 0)
        target["payment_verified_by"] = moderator
        target["moderator_notes"] = notes.strip()
        target["moderator"] = moderator
    elif action == "approve":
        if target.get("payment_status") != "verified":
            raise ValueError("Verify the payment against the bank statement before approving the spotlight.")
        if len(str(notes or "").strip()) < 8:
            raise ValueError("Add an audit note describing the profile/media review before approval.")
        try:
            days = int(override_days or target.get("days", 3))
        except (TypeError, ValueError):
            days = int(target.get("days", 3) or 3)
        if days < 1 or days > 365:
            raise ValueError("Spotlight duration must be between 1 and 365 days.")
        target["status"] = "active"
        target["approved_at"] = now.isoformat()
        target["expires_at"] = (now + timedelta(days=days)).isoformat()
        target["moderator"] = moderator
        target["media_review_note"] = notes.strip()
        target["media_reviewed_by"] = moderator
    elif action == "reject":
        target["status"] = "rejected"
        target["closed_at"] = now.isoformat()
        target["refund_status"] = "manual_review_required" if target.get("payment_status") == "verified" else "not_applicable"
        target["moderator"] = moderator
        target["moderator_notes"] = notes or "Rejected; any paid amount requires separate refund review."
    elif action == "close":
        target["status"] = "closed"
        target["closed_at"] = now.isoformat()
        target["moderator"] = moderator
        target["moderator_notes"] = notes or f"Closed by {moderator}"
    else:
        raise ValueError(f"Unknown action: {action}")

    if not _save_spotlights(items):
        raise RuntimeError("Spotlight moderation action could not be saved.")
    return target


def record_spotlight_interaction(promo_id: str, kind: str = "view") -> bool:
    """Record a whitelisted interaction only for an active, paid, unexpired placement."""
    if kind not in {"view", "click", "interest"}:
        return False
    items = _load_spotlights()
    now = datetime.utcnow()
    for item in items:
        if not isinstance(item, dict) or item.get("promo_id") != promo_id:
            continue
        expires_at = _parse_utc(item.get("expires_at"))
        if (item.get("status") != "active" or item.get("payment_status") != "verified"
                or expires_at is None or expires_at <= now):
            if item.get("status") == "active" and (expires_at is None or expires_at <= now):
                item["status"] = "expired"
                _save_spotlights(items)
            return False
        key = {"view": "views_count", "click": "clicks_count", "interest": "interests_count"}[kind]
        try:
            current = max(0, int(item.get(key, 0) or 0))
        except (TypeError, ValueError, OverflowError):
            current = 0
        item[key] = current + 1
        return _save_spotlights(items)
    return False
