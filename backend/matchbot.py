"""
🧠 SMART MATCH ASSISTANT — personalized daily matchmaking concierge
====================================================================
TOP matrimony sites (Shaadi / Jeevansathi / BharatMatrimony) ki ఉండే core
retention+conversion feature: *"ఈ రోజు మీ కోసం N కొత్త సంబంధాలు"* — per-user,
explainable, proactive. ఇక్కడ అది లేదు (daily_matches = admin-curated మాత్రమే,
per-user smart కాదు; retention.run = 3-year data cleanup).

ఈ module existing engines ni reuse చేస్తుంది (duplicate logic లేదు):
  • topmatch.find_top_matches_v2  → factual comparisons and recency-only ordering
  • quality.profile_completeness   → profile nudge
  • interest.safe_user / mask_phone → privacy (raw phone ఎప్పుడూ బయటకి రాదు)

Self-contained + defensive: ప్రతి function missing/junk data తో కూడా crash
అవ్వదు, and data ni args గా తీసుకుంటుంది (main.py globals అవసరం లేదు → easy
to unit-test). Output lo ఎప్పుడూ raw phone ఉండదు (safe_user only).

Public API:
  daily_briefing(user, profiles, interests, views, saves, ...) -> dict
  assistant_tips(user, briefing) -> list[dict]
  delivery_text(briefing, user, lang="te") -> str   # WhatsApp/Telegram push
"""
from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import topmatch
from interest import safe_user, mask_phone
from quality import profile_completeness

# ఎన్ని రోజుల్లో join అయితే "కొత్త సంబంధం" అని లెక్క
NEW_WITHIN_DAYS = int(os.getenv("MATCHBOT_NEW_DAYS", "14") or 14)
# briefing లో గరిష్ట మ్యాచ్‌లు
MAX_MATCHES = 6


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _naive_utc(value: datetime) -> datetime:
    """Normalize aware timestamps to naive UTC for consistent stored-time comparisons."""
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _now(now: Optional[datetime] = None) -> datetime:
    return _naive_utc(now) if now is not None else datetime.utcnow()


def _parse_dt(v: Any) -> Optional[datetime]:
    """created_at/at (ISO string or datetime) → naive UTC; junk → None."""
    if isinstance(v, datetime):
        return _naive_utc(v)
    s = str(v or "").strip()
    if not s:
        return None
    try:
        parsed = datetime.fromisoformat(s.replace("Z", "+00:00"))
        return _naive_utc(parsed)
    except Exception:
        return None


def _is_new(profile: Dict, now: datetime) -> bool:
    dt = _parse_dt(profile.get("created_at"))
    if not dt:
        return False
    return (now - dt) <= timedelta(days=NEW_WITHIN_DAYS)


def _contacted_ids(interests: List[Dict], me_id: str) -> set:
    """IDs I already sent a live interest to (pending/accepted) — digest లో repeat వద్దు."""
    out = set()
    mid = str(me_id).upper()
    for i in interests or []:
        if not isinstance(i, dict):
            continue
        if str(i.get("from_id", "")).upper() == mid \
                and i.get("status") in ("pending", "accepted"):
            out.add(str(i.get("to_id", "")).upper())
    out.discard("")
    return out


def _viewed_ids(views: List[Dict], me_id: str) -> set:
    """IDs I already opened — "new" tag కి use అవుతుంది."""
    out = set()
    mid = str(me_id).upper()
    for v in views or []:
        if not isinstance(v, dict):
            continue
        if str(v.get("viewer_id", "")).upper() == mid:
            out.add(str(v.get("tsap_id", "")).upper())
    out.discard("")
    return out


def _blocked_ids(blocks: List[Dict], me_id: str) -> set:
    """IDs I blocked OR who blocked me — digest లో ఎప్పటికీ చూపవద్దు (defense-in-depth;
    endpoint కూడా safety.is_blocked తో pre-filter చేస్తుంది)."""
    mid = str(me_id).upper()
    out = set()
    for b in blocks or []:
        if not isinstance(b, dict):
            continue
        blocker = str(b.get("blocker_id") or b.get("blocker") or "").upper()
        blocked = str(b.get("blocked_id") or b.get("blocked") or "").upper()
        if blocker == mid and blocked:
            out.add(blocked)
        if blocked == mid and blocker:
            out.add(blocker)
    return out


def _my_id(user: Dict) -> str:
    return str((user or {}).get("tsap_id", "")).upper()


# --------------------------------------------------------------------------- #
# 1. DAILY BRIEFING — the core personalized digest
# --------------------------------------------------------------------------- #
def daily_briefing(user: Dict, profiles: List[Dict], interests: Optional[List[Dict]] = None,
                   views: Optional[List[Dict]] = None, saves: Optional[List[Dict]] = None,
                   blocks: Optional[List[Dict]] = None, limit: int = 3,
                   now: Optional[datetime] = None) -> Dict[str, Any]:
    """🧠 Per-user "ఈ రోజు మీ కోసం" smart digest.

    Returns privacy-safe briefing:
      • matches[]      — candidate profiles ordered by saved preferences and recency
      • mutual{}       — actual interests received + profile views (not predicted interest)
      • nudge{}        — profile-completeness guidance without response guarantees
      • summary_telugu / summary_en — one-line digest header
    """
    user = user if isinstance(user, dict) else {}
    # sanitize once → all downstream iteration is crash-proof against junk rows
    profiles = [p for p in (profiles or []) if isinstance(p, dict)]
    interests = [i for i in (interests or []) if isinstance(i, dict)]
    views = [v for v in (views or []) if isinstance(v, dict)]
    saves = [s for s in (saves or []) if isinstance(s, dict)]
    blocks = [b for b in (blocks or []) if isinstance(b, dict)]
    now = _now(now)
    me = _my_id(user)
    limit = max(1, min(int(limit or 3), MAX_MATCHES))

    contacted = _contacted_ids(interests, me)
    viewed = _viewed_ids(views, me)
    blocked = _blocked_ids(blocks, me)

    # ---- candidate pool: opposite gender, approved, not banned, not self,
    #      not blocked (either direction), not already contacted by me ----
    opp = "Bride" if str(user.get("gender", "")).lower() in ("groom", "male", "m") else "Groom"
    pool = []
    for p in profiles or []:
        if not isinstance(p, dict):
            continue
        pid = str(p.get("tsap_id", "")).upper()
        if not pid or pid == me:
            continue
        if str(p.get("gender", "")) != opp:
            continue
        if p.get("is_approved") is False or p.get("is_banned"):
            continue
        if pid in contacted or pid in blocked:
            continue
        pool.append(p)

    # Order by profile creation time only; no preference tally or score is generated.
    try:
        ranked = topmatch.find_top_matches_v2(user, pool, limit=limit * 3)
    except Exception:
        ranked = []

    matches: List[Dict[str, Any]] = []
    for r in ranked:
        prof = r.get("profile") or {}
        pid = str(prof.get("tsap_id", "")).upper()
        is_new = _is_new(prof, now) and pid not in viewed
        matches.append({
            "profile": safe_user(prof),
            "tsap_id": pid,
            "observations": (r.get("observations") or [])[:3],
            "preferences": r.get("preferences", []),
            "is_new": is_new,
            "action": "✨ Recently added profile — review the member-provided details." if is_new
                      else "Review the member-provided details and decide for yourself.",
        })
    matches = matches[:max(0, int(limit or 0))]

    # ---- mutual alerts: who noticed YOU (received interests + profile views) ----
    received = [i for i in interests
                if str(i.get("to_id", "")).upper() == me and i.get("status") == "pending"]
    my_views = [v for v in views if str(v.get("tsap_id", "")).upper() == me]
    # masked peek at who viewed (privacy — no names/phones unless they sent interest)
    viewer_peeks: List[Dict[str, str]] = []
    seen_v = set()
    for v in my_views[-10:][::-1]:
        vid = str(v.get("viewer_id", "")).upper()
        if not vid or vid in seen_v or vid == me:
            continue
        seen_v.add(vid)
        vu = next((p for p in profiles if str(p.get("tsap_id", "")).upper() == vid), None)
        if vu:
            viewer_peeks.append({"tsap_id": vid, "caste": str(vu.get("caste", "—")),
                                 "district": str(vu.get("district", "—")),
                                 "age": str(vu.get("age", "—"))})
        if len(viewer_peeks) >= 3:
            break

    mutual_block = {
        "interests_received": len(received),
        "profile_views": len(my_views),
        "received_from": [
            {"tsap_id": str(i.get("from_id", "")).upper(),
             "name": safe_user(next((p for p in profiles
                                     if str(p.get("tsap_id", "")).upper() == str(i.get("from_id", "")).upper()),
                                    {})).get("full_name", "—")}
            for i in received[-5:]
        ],
        "viewer_peeks": viewer_peeks,
        "note_telugu": (f"ఇప్పటివరకు {len(received)} pending interest requests, {len(my_views)} profile views నమోదయ్యాయి."
                        if (received or my_views) else
                        "ఇంకా interest request లేదా profile view నమోదు కాలేదు."),
    }

    # ---- profile nudge (completeness) ----
    try:
        comp = profile_completeness(user)
    except Exception:
        comp = {"percent": 0, "level": "low", "important_telugu": [], "verdict_telugu": ""}
    nudge = {
        "percent": comp.get("percent", 0),
        "level": comp.get("level", "low"),
        "verdict_telugu": comp.get("verdict_telugu", ""),
        "important_telugu": (comp.get("important_telugu") or [])[:3],
    }

    n_new = sum(1 for m in matches if m["is_new"])
    summary_telugu = (
        f"🧠 పరిశీలించడానికి {len(matches)} profiles"
        + (f", {n_new} ఇటీవల జోడించినవి ✨" if n_new else "")
        + (f" • {mutual_block['interests_received']} మంది interest పంపారు"
           if mutual_block["interests_received"] else "")
    )
    summary_en = (
        f"🧠 {len(matches)} profiles to review"
        + (f", {n_new} recently added" if n_new else "")
        + (f" • {mutual_block['interests_received']} sent you an interest"
           if mutual_block["interests_received"] else "")
    )

    return {
        "success": True,
        "tsap_id": me,
        "generated_at": now.isoformat(timespec="seconds"),
        "matches": matches,
        "mutual": mutual_block,
        "nudge": nudge,
        "summary_telugu": summary_telugu,
        "summary_en": summary_en,
        "new_within_days": NEW_WITHIN_DAYS,
        "message_telugu": summary_telugu,
    }


# --------------------------------------------------------------------------- #
# 2. ACTIONABLE TIPS — prioritized next steps
# --------------------------------------------------------------------------- #
def assistant_tips(user: Dict, briefing: Dict) -> List[Dict[str, Any]]:
    """బ్రీఫింగ్ ఆధారంగా ప్రాధాన్యత చిట్కాలు (conversion + retention).

    Each tip: {priority, kind, telugu, en, cta} — frontend renders as a checklist.
    """
    user = user or {}
    briefing = briefing or {}
    tips: List[Dict[str, Any]] = []
    nudge = briefing.get("nudge", {}) or {}
    mutual = briefing.get("mutual", {}) or {}
    matches = briefing.get("matches", []) or []

    # P1 — profile incomplete → biggest lever
    if int(nudge.get("percent", 0)) < 70:
        tips.append({"priority": 1, "kind": "complete_profile",
                     "telugu": nudge.get("verdict_telugu") or "ప్రొఫైల్‌లో చూపించిన ఖాళీ fields‌ను పరిశీలించండి.",
                     "en": "Review the missing fields in your profile. Filling them does not guarantee matches or replies.",
                     "cta": "/me", "detail": (nudge.get("important_telugu") or [])[:3]})
    # P2 — no photo
    if not user.get("photo_url") and not user.get("has_photo"):
        tips.append({"priority": 1, "kind": "add_photo",
                     "telugu": "📸 ఫోటో జోడించడం ఐచ్ఛికం; visibility మీ privacy settings ప్రకారం ఉంటుంది.",
                     "en": "Adding a photo is optional; visibility follows your privacy settings.", "cta": "/me"})
    # P4 — interests received → respond
    if int(mutual.get("interests_received", 0)) > 0:
        tips.append({"priority": 2, "kind": "respond_interests",
                     "telugu": f"🔥 {mutual['interests_received']} మంది మీకు interest పంపారు — స్పందించండి",
                     "en": f"{mutual['interests_received']} sent you interest — respond",
                     "cta": "/requests"})
    # P5 — recently added profiles to review
    new_matches = [m for m in matches if m.get("is_new")]
    if new_matches:
        tips.append({"priority": 3, "kind": "explore_new",
                     "telugu": f"✨ {len(new_matches)} profiles ఇటీవల జోడించబడ్డాయి — పరిశీలించండి",
                     "en": f"{len(new_matches)} profiles were recently added — review them",
                     "cta": "/matches", "ids": [m.get("tsap_id") for m in new_matches[:3]]})
    # P6 — show the recorded phone-verification state separately (not a trust judgment)
    if not user.get("phone_verified"):
        tips.append({"priority": 3, "kind": "verify",
                     "telugu": "🛡️ OTP తో phone ధృవీకరించండి; ఇది identity verification కాదు",
                     "en": "Verify your phone with OTP; this does not verify identity", "cta": "/login"})
    # fallback — everything good
    if not tips:
        tips.append({"priority": 4, "kind": "all_good",
                     "telugu": "🌟 అన్నీ సిద్ధం — కొత్త మ్యాచ్‌ల కోసం రోజూ చూడండి",
                     "en": "All set — check back daily for new matches", "cta": "/matches"})

    tips.sort(key=lambda t: t["priority"])
    return tips[:5]


# --------------------------------------------------------------------------- #
# 3. DELIVERY TEXT — proactive WhatsApp/Telegram push (anti-ban friendly)
# --------------------------------------------------------------------------- #
def delivery_text(briefing: Dict, user: Dict, lang: str = "te") -> str:
    """Proactive digest message (WhatsApp/Telegram ki). Anti-ban: no ALL-CAPS spam,
    personal tone, opt-out line, links only (no phone numbers in the message)."""
    briefing = briefing or {}
    user = user or {}
    name = str(user.get("full_name") or user.get("name") or "").split(" ")[0].strip()
    matches = briefing.get("matches", []) or []
    if not matches:
        return ""
    top = matches[0]
    tp = top.get("profile", {})
    site = os.getenv("PUBLIC_SITE_URL") or os.getenv("SITE_URL") or "https://manavivaha.in"
    profile_name = str(tp.get("full_name") or "").strip().split()
    profile_label = profile_name[0] if profile_name else "Profile"
    user_name = str(user.get("full_name") or user.get("name") or "").strip().split()
    greeting = user_name[0] if user_name else ""
    details = [str(value) for value in (tp.get("age"), tp.get("caste")) if value not in (None, "", "—")]
    observations = top.get("observations") or []
    if lang == "en":
        head = f"Hello {greeting}, {len(matches)} profiles are available to review on Mana Vivaha."
        line = f"Profile: {profile_label}" + (f" ({', '.join(details)})" if details else "")
        if observations:
            line += "\nDetails listed in the profiles: " + "; ".join(str(item) for item in observations[:2])
        cta = f"👉 Review profiles: {site}/matches"
    else:
        head = f"నమస్తే {greeting} గారూ, పరిశీలించడానికి {len(matches)} profiles ఉన్నాయి."
        line = f"ప్రొఫైల్: {profile_label}" + (f" ({', '.join(details)})" if details else "")
        if observations:
            line += "\nప్రొఫైళ్లలో ఉన్న వివరాలు: " + "; ".join(str(item) for item in observations[:2])
        cta = f"👉 వివరాలు పరిశీలించండి: {site}/matches"
    mutual = briefing.get("mutual", {}) or {}
    extra = ""
    if int(mutual.get("interests_received", 0)) > 0:
        extra = ("\n🔥 %d మంది మీకు interest పంపారు — స్పందించండి" % mutual["interests_received"]
                 if lang != "en" else
                 "\n🔥 %d sent you interest — respond" % mutual["interests_received"])
    opt_out = (f"(To stop these messages: {site}/me → notifications, or reply STOP)"
               if lang == "en" else
               f"(ఈ మెసేజ్ ఆపాలంటే: {site}/me → notifications, లేదా STOP రిప్లై ఇవ్వండి)")
    return f"{head}\n\n{line}{extra}\n\n{cta}\n{opt_out}"
