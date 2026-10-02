"""
🧠 SMART MATCH ASSISTANT — personalized daily matchmaking concierge
====================================================================
TOP matrimony sites (Shaadi / Jeevansathi / BharatMatrimony) ki ఉండే core
retention+conversion feature: *"ఈ రోజు మీ కోసం N కొత్త సంబంధాలు"* — per-user,
explainable, proactive. ఇక్కడ అది లేదు (daily_matches = admin-curated మాత్రమే,
per-user smart కాదు; retention.run = 3-year data cleanup).

ఈ module existing engines ni reuse చేస్తుంది (duplicate logic లేదు):
  • topmatch.find_top_matches_v2  → 11-factor explainable score
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
from datetime import datetime, timedelta
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
def _now(now: Optional[datetime] = None) -> datetime:
    return now or datetime.utcnow()


def _parse_dt(v: Any) -> Optional[datetime]:
    """created_at/at (ISO string or datetime) → datetime; junk → None."""
    if isinstance(v, datetime):
        return v
    s = str(v or "").strip()
    if not s:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", ""))
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

    Returns privacy-safe, explainable, actionable briefing:
      • matches[]      — top NEW/mutual matches (safe_user, no phone), each with
                         score, why (strengths), is_new, is_mutual, action
      • mutual{}       — interests received + profile views (who noticed you)
      • nudge{}        — profile-completeness push (add photo → more matches)
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

    # ---- score + rank via existing 11-factor engine ----
    try:
        ranked = topmatch.find_top_matches_v2(user, pool, limit=limit * 3, min_score=55)
    except Exception:
        ranked = []

    matches: List[Dict[str, Any]] = []
    for r in ranked:
        prof = r.get("profile") or {}
        pid = str(prof.get("tsap_id", "")).upper()
        mutual = r.get("mutual") or {}
        is_mutual = bool(mutual.get("both_like"))
        is_new = _is_new(prof, now) and pid not in viewed
        # rank: mutual first, then new, then score
        matches.append({
            "profile": safe_user(prof),               # 🔒 privacy-safe (phone_masked only)
            "tsap_id": pid,
            "score": r.get("score", 0),
            "grade": r.get("grade", ""),
            "verdict_telugu": r.get("verdict_telugu", ""),
            "why": (r.get("strengths") or [])[:3],     # explainable reasons
            "is_new": is_new,
            "is_mutual": is_mutual,
            "mutual_note": mutual.get("note", ""),
            "action": ("💞 Mutual — వెంటనే interest పంపండి" if is_mutual
                       else "✨ కొత్త సంబంధం — profile చూడండి" if is_new
                       else "👀 మీ కోసం సిఫార్సు — interest పంపండి"),
            "_sort": (2 if is_mutual else 0) + (1 if is_new else 0),
        })
    matches.sort(key=lambda m: (-m["_sort"], -m["score"]))
    for m in matches:
        m.pop("_sort", None)
    matches = matches[:limit]

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
        "note_telugu": (f"🔥 {len(received)} కొత్త interestలు + {len(my_views)} ప్రొఫైల్ వ్యూస్ — "
                        f"మీ ప్రొఫైల్ కి మంచి స్పందన ఉంది!"
                        if (received or my_views) else
                        "ఇంకా ఎవరూ చూడలేదు — కింద ఉన్న చిట్కాలు పాటించండి 👇"),
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
    n_mutual = sum(1 for m in matches if m["is_mutual"])
    summary_telugu = (
        f"🧠 ఈ రోజు మీ కోసం {len(matches)} సంబంధాలు"
        + (f" — {n_mutual} మ్యూచువల్ 💞" if n_mutual else "")
        + (f", {n_new} కొత్తవి ✨" if n_new else "")
        + (f" • {mutual_block['interests_received']} మంది మీకు interest పంపారు"
           if mutual_block["interests_received"] else "")
    )
    summary_en = (
        f"🧠 {len(matches)} matches for you today"
        + (f" — {n_mutual} mutual" if n_mutual else "")
        + (f", {n_new} new" if n_new else "")
        + (f" • {mutual_block['interests_received']} sent you interest"
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
                     "telugu": nudge.get("verdict_telugu") or "🔴 ప్రొఫైల్ పూర్తి చేయండి — 3x ఎక్కువ మ్యాచ్‌లు",
                     "en": "Complete your profile — 3x more matches",
                     "cta": "/me", "detail": (nudge.get("important_telugu") or [])[:3]})
    # P2 — no photo
    if not user.get("photo_url") and not user.get("has_photo"):
        tips.append({"priority": 1, "kind": "add_photo",
                     "telugu": "📸 ఫోటో జోడించండి — ఫోటో ఉన్న ప్రొఫైల్‌కి 5x వ్యూస్",
                     "en": "Add a photo — 5x more views", "cta": "/me"})
    # P3 — mutual matches waiting → act now (highest conversion)
    mutual_matches = [m for m in matches if m.get("is_mutual")]
    if mutual_matches:
        tips.append({"priority": 2, "kind": "send_interest_mutual",
                     "telugu": f"💞 {len(mutual_matches)} మ్యూచువల్ మ్యాచ్‌లు — వెంటనే interest పంపండి (rare!)",
                     "en": f"{len(mutual_matches)} mutual matches — send interest now",
                     "cta": "/matches", "ids": [m.get("tsap_id") for m in mutual_matches[:3]]})
    # P4 — interests received → respond
    if int(mutual.get("interests_received", 0)) > 0:
        tips.append({"priority": 2, "kind": "respond_interests",
                     "telugu": f"🔥 {mutual['interests_received']} మంది మీకు interest పంపారు — స్పందించండి",
                     "en": f"{mutual['interests_received']} sent you interest — respond",
                     "cta": "/requests"})
    # P5 — new matches to explore
    new_matches = [m for m in matches if m.get("is_new")]
    if new_matches:
        tips.append({"priority": 3, "kind": "explore_new",
                     "telugu": f"✨ {len(new_matches)} కొత్త సంబంధాలు ఈ రోజు — చూడండి",
                     "en": f"{len(new_matches)} new matches today — explore",
                     "cta": "/matches", "ids": [m.get("tsap_id") for m in new_matches[:3]]})
    # P6 — not verified → trust badge
    if not (user.get("phone_verified") or user.get("is_verified")):
        tips.append({"priority": 3, "kind": "verify",
                     "telugu": "🛡️ నంబర్ వెరిఫై చేయండి — trust badge తో ఎక్కువ స్పందన",
                     "en": "Verify your number — trust badge, more responses", "cta": "/verify"})
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
    if lang == "en":
        head = f"🧠 Hi {name}, {len(matches)} new matches for you today on Mana Vivaha"
        line = (f"Top pick: {tp.get('full_name','a profile')} ({tp.get('age','')}, "
                f"{tp.get('caste','')}) — {top.get('score',0)}% compatible. "
                f"{top.get('verdict_telugu','')}")
        cta = f"👉 See all: {site}/matches"
    else:
        head = f"🧠 నమస్తే {name} గారూ, ఈ రోజు మీ కోసం {len(matches)} కొత్త సంబంధాలు"
        line = (f"టాప్ పిక్: {tp.get('full_name','ఒక ప్రొఫైల్')} ({tp.get('age','')}, "
                f"{tp.get('caste','')}) — {top.get('score',0)}% సరిపోతుంది. "
                f"{top.get('verdict_telugu','')}")
        cta = f"👉 అన్నీ చూడండి: {site}/matches"
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
