"""
🌟 WAVE 42 — PROFILES OF THE DAY & PAID SPOTLIGHT ENGINE
=============================================================
Registered users can pay to promote their profile as "Profile of the Day" / "Spotlight":
  • Tier pricing:
      - SPOT_3:  3 Days  — ₹99  (Featured on Home & Matches + Gold Badge)
      - SPOT_7:  7 Days  — ₹199 (Top Carousel + Video Embed + Telegram Pin + 3x Views)
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
SPOTLIGHT_FILE = os.path.join(BASE_DIR, "spotlight_promotions.json")

SPOTLIGHT_TIERS = {
    "SPOT_3": {
        "code": "SPOT_3",
        "days": 3,
        "price": 99,
        "name_en": "3-Day Spotlight Boost",
        "name_te": "⚡ 3 రోజుల స్పాట్‌లైట్ బూస్ట్",
        "perks_te": ["హోమ్‌పేజీ 'Profiles of the Day' లో ప్రదర్శన", "గోల్డ్ వెరిఫైడ్ బ్యాడ్జ్", "2x అధిక ప్రొఫైల్ వీక్షణలు"],
        "badge": "⚡ FEATURED PROFILE"
    },
    "SPOT_7": {
        "code": "SPOT_7",
        "days": 7,
        "price": 199,
        "name_en": "7-Day Prime Spotlight (Popular)",
        "name_te": "🌟 7 రోజుల ప్రైమ్ స్పాట్‌లైట్ (బెస్ట్ సెల్లర్)",
        "perks_te": ["వీడియో / ఫోటో తో ప్రత్యేక కార్డ్", "టాప్ బ్యానర్ & మ్యాచెస్ సైడ్‌బార్", "టెలిగ్రామ్ & వాట్సాప్ ఛానళ్లలో పిన్", "5x అధిక స్పందనలు"],
        "badge": "👑 TOP PROFILE OF THE DAY"
    },
    "SPOT_30": {
        "code": "SPOT_30",
        "days": 30,
        "price": 499,
        "name_en": "30-Day VIP Super Spotlight",
        "name_te": "💎 30 రోజుల విఐపి సూపర్ స్పాట్‌లైట్",
        "perks_te": ["నెల రోజుల పాటు నిరంతర ప్రమోషన్", "వీడియో ఇంట్రో ప్లేయర్", "ఫ్యామిలీ బ్యూరో అసిస్టెన్స్", "అపరిమిత ఇన్-యాప్ ఎక్స్‌పోజర్"],
        "badge": "💎 VIP SPOTLIGHT MATCH"
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
    """Returns currently live and approved spotlight profiles."""
    items = _load_spotlights()
    now_iso = datetime.utcnow().isoformat()
    active = []
    
    for item in items:
        if item.get("status") == "active":
            exp = str(item.get("expires_at") or "")
            if exp and exp < now_iso:
                item["status"] = "expired"
            else:
                active.append(item)
                
    # Sort active: VIP first, then highest price/recent
    active.sort(key=lambda x: (x.get("amount_paid", 0), x.get("approved_at", "")), reverse=True)
    return active[:limit]


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
    """Creates a new spotlight application from a registered user."""
    tier = SPOTLIGHT_TIERS.get(plan_code.upper())
    if not tier:
        raise ValueError(f"Invalid spotlight tier {plan_code}. Choose SPOT_3, SPOT_7, or SPOT_30.")
    
    items = _load_spotlights()
    now = datetime.utcnow()
    promo_id = f"SPOT-{now.strftime('%Y%m%d')}-{len(items)+1:04d}"
    
    photo = photo_url or user.get("photo_url") or user.get("card_url") or ""
    video = _clean_video_url(video_url)
    
    entry = {
        "promo_id": promo_id,
        "tsap_id": user.get("tsap_id"),
        "full_name": user.get("full_name") or "Member",
        "gender": user.get("gender") or "Groom",
        "age": user.get("age") or 27,
        "caste": user.get("caste") or "All",
        "subcaste": user.get("subcaste") or "",
        "district": user.get("district") or "Hyderabad",
        "education": user.get("education") or "",
        "job": user.get("job") or user.get("profession") or "",
        "income": user.get("income") or "",
        "height": user.get("height") or "",
        "marital_status": user.get("marital_status") or "Never Married",
        "plan_code": tier["code"],
        "plan_name_en": tier["name_en"],
        "plan_name_te": tier["name_te"],
        "amount_paid": tier["price"],
        "days": tier["days"],
        "badge_text": tier["badge"],
        "headline": headline or f"{user.get('job', 'Professional')} from {user.get('district', 'AP/TS')}",
        "pitch_text": pitch_text or f"Looking for a suitable match. Respectable family background.",
        "photo_url": photo,
        "video_url": video,
        "media_type": "video" if video else ("photo" if photo else "standard"),
        "contact_opt": contact_opt,
        "payment_mode": payment_mode,
        "payment_ref": payment_ref or f"UPI-{now.strftime('%H%M%S')}",
        "status": "active" if auto_approve else "pending_review",
        "submitted_at": now.isoformat(),
        "approved_at": now.isoformat() if auto_approve else None,
        "expires_at": (now + timedelta(days=tier["days"])).isoformat() if auto_approve else None,
        "closed_at": None,
        "views_count": 0,
        "clicks_count": 0,
        "interests_count": 0,
        "moderator_notes": "Auto-approved" if auto_approve else "Pending admin check"
    }
    
    items.append(entry)
    _save_spotlights(items)
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
    
    if action == "approve":
        days = override_days or target.get("days", 3)
        target["status"] = "active"
        target["approved_at"] = now.isoformat()
        target["expires_at"] = (now + timedelta(days=days)).isoformat()
        target["moderator"] = moderator
        target["moderator_notes"] = notes or f"Approved by {moderator}"
    elif action == "reject":
        target["status"] = "rejected"
        target["closed_at"] = now.isoformat()
        target["moderator"] = moderator
        target["moderator_notes"] = notes or "Declined — refund eligible"
    elif action == "close":
        target["status"] = "closed"
        target["closed_at"] = now.isoformat()
        target["moderator"] = moderator
        target["moderator_notes"] = notes or f"Closed by {moderator}"
    else:
        raise ValueError(f"Unknown action: {action}")
        
    _save_spotlights(items)
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
