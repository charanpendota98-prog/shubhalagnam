"""
🌟 WAVE 42 — PROFILES OF THE DAY & PAID SPOTLIGHT ENGINE
=============================================================
Registered users can pay to promote their profile as "Profile of the Day" / "Spotlight":
  • Tier pricing:
      - SPOT_3:  3 Days  — ₹99  (Featured on Home & Matches + Gold Badge)
      - SPOT_7:  7 Days  — ₹199 (approved media card + seven-day placement + basic view/click counts)
      - SPOT_30: 30 Days — ₹499 (VIP Spotlight + Daily Digest Feature + Bureau Priority)
  • Media support:
      - High-resolution Photo (upload or photo URL)
      - Video pitch / Intro (YouTube link, Shorts, MP4)
      - Telugu + English headline and customized alliance pitch
  • Lifecycle & Admin Moderation:
      - User submits promo application + payment ref (UPI/Razorpay)
      - Admin / Worker cross-checks photo/video suitability
      - Admin approves (activates spotlight) or rejects (refund note) or closes early
      - Active spotlights are served publicly on Homepage, Matches, and dedicated section
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SPOTLIGHT_FILE = os.environ.get("MANA_VIVAHA_SPOTLIGHT_FILE", os.path.join(BASE_DIR, "spotlight_promotions.json"))

SPOTLIGHT_TIERS = {
    "SPOT_3": {
        "code": "SPOT_3",
        "days": 3,
        "price": 99,
        "name_en": "3-Day Spotlight Boost",
        "name_te": "⚡ 3 రోజుల స్పాట్‌లైట్ బూస్ట్",
        "perks_te": ["చెల్లింపు, మీడియా సమీక్ష తర్వాత స్పాట్‌లైట్ కార్డ్", "ఆమోదం తర్వాత 3 రోజుల ప్రదర్శన", "గోల్డ్ ప్రమోషన్ బ్యాడ్జ్ (ధృవీకరణకు భిన్నం)"],
        "badge": "⚡ SPONSORED PROFILE"
    },
    "SPOT_7": {
        "code": "SPOT_7",
        "days": 7,
        "price": 199,
        "name_en": "7-Day Prime Spotlight",
        "name_te": "🌟 7 రోజుల ప్రైమ్ స్పాట్‌లైట్",
        "perks_te": ["మీ ఆమోదించిన ఫోటో / వీడియోతో కార్డ్", "ఆమోదం తర్వాత 7 రోజుల ప్రదర్శన", "క్లిక్‌లు, వీక్షణల ప్రాథమిక గణాంకాలు"],
        "badge": "🌟 SPONSORED SPOTLIGHT"
    },
    "SPOT_30": {
        "code": "SPOT_30",
        "days": 30,
        "price": 499,
        "name_en": "30-Day VIP Super Spotlight",
        "name_te": "💎 30 రోజుల విఐపి సూపర్ స్పాట్‌లైట్",
        "perks_te": ["మీడియా ఆమోదం తర్వాత 30 రోజుల ప్రదర్శన", "వీడియో లింక్ ఉంటే వీడియో ప్లేయర్", "ప్రదర్శన గణాంకాలు"],
        "badge": "💎 SPONSORED FEATURE"
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


def _clean_video_url(url: str) -> str:
    if not url:
        return ""
    url = str(url).strip()
    # Normalize YouTube shorts or watch urls to embed format if needed
    yt_match = re.search(r"(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})", url)
    if yt_match:
        vid = yt_match.group(1)
        return f"https://www.youtube.com/embed/{vid}"
    return url


def get_active_spotlights(limit: int = 12) -> List[Dict[str, Any]]:
    """Return only approved, unexpired public fields; never leak payment references or notes."""
    items = _load_spotlights()
    now_iso = datetime.utcnow().isoformat()
    active = []
    expired_changed = False
    public_fields = (
        "promo_id", "tsap_id", "full_name", "gender", "age", "caste", "subcaste",
        "district", "education", "job", "income", "height", "marital_status",
        "plan_code", "badge_text", "headline", "pitch_text", "photo_url", "video_url",
        "media_type", "amount_paid", "views_count", "clicks_count", "interests_count",
        "approved_at", "expires_at",
    )

    for item in items:
        if item.get("status") != "active" or item.get("payment_status") != "verified":
            continue
        exp = str(item.get("expires_at") or "")
        if not exp or exp < now_iso:
            if exp:
                item["status"] = "expired"
                expired_changed = True
            continue
        active.append({key: item.get(key) for key in public_fields if key in item})

    if expired_changed:
        _save_spotlights(items)
    active.sort(key=lambda x: (x.get("amount_paid", 0), x.get("approved_at", "")), reverse=True)
    return active[:max(0, int(limit))]


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

    photo = str(photo_url or user.get("photo_url") or user.get("card_url") or "").strip()
    video = _clean_video_url(video_url)
    for label, media_url in (("Photo", photo), ("Video", video)):
        if media_url and not (media_url.startswith("https://") or media_url.startswith("http://") or media_url.startswith("/")):
            raise ValueError(f"{label} URL must use http(s) or a site-relative path.")

    items = _load_spotlights()
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
        "headline": headline,
        "pitch_text": pitch_text,
        "photo_url": photo,
        "video_url": video,
        "media_type": "video" if video else ("photo" if photo else "none"),
        "contact_opt": str(contact_opt).strip().lower(),
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
        target["moderator_notes"] = notes or f"Media approved by {moderator}"
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
    items = _load_spotlights()
    for it in items:
        if it.get("promo_id") == promo_id:
            if kind == "view":
                it["views_count"] = it.get("views_count", 0) + 1
            elif kind == "click":
                it["clicks_count"] = it.get("clicks_count", 0) + 1
            elif kind == "interest":
                it["interests_count"] = it.get("interests_count", 0) + 1
            _save_spotlights(items)
            return True
    return False
