"""
📬 PERSONALIZED DAILY DIGEST ENGINE — Mana Vivaha
=================================================
The existing ``/api/digest`` is a GLOBAL broadcast (total brides/grooms, top
castes — one-size-fits-all marketing). This engine adds the thing a top
matrimony platform actually retains users with: a **per-user personalized
daily digest**, built by combining two systems that already exist:

  • ``matchbot.daily_briefing``  — top NEW/mutual matches (explainable why)
  • ``quality.new_matches_for``  — saved-search hits since the last alert

and producing a **reviewable send queue**.

🛡️ SAFETY FIRST (this runs against a LIVE production site):
  • Generation NEVER sends. It builds a queue + a summary; sending is a
    separate, explicit, injectable step.
  • Real WhatsApp send is GATED behind ``DIGEST_PERSONAL_SEND=1`` (default OFF)
    AND ``WHATSAPP_MODE`` (the existing queue no-ops when wa_mode == "off").
  • Respects opt-out: per-user ``digest_opt_out`` / notification prefs, the
    saved-search ``alert`` flag, and the consent ledger.
  • Dedup: a stable ``dedup_key`` (hash of the match ids) means the same
    digest is never re-sent on consecutive days.
  • Only ENGAGED users (recent activity) by default — protects sender
    reputation (anti-ban) and avoids messaging dormant numbers.

The module is deliberately side-effect-free and takes all data as arguments so
it is unit-testable and cannot touch the live DB unless the caller wires it.
"""
from __future__ import annotations

import os
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable, Iterable

import matchbot

# --------------------------------------------------------------------------- #
# Tunables (env-overridable so ops can adjust without a code change)
# --------------------------------------------------------------------------- #
ENGAGED_WITHIN_DAYS = int(os.getenv("DIGEST_ENGAGED_DAYS", "21") or 21)
MAX_QUEUE_PER_RUN = int(os.getenv("DIGEST_MAX_QUEUE", "500") or 500)
DEFAULT_LANG = "te"


# --------------------------------------------------------------------------- #
# Defensive helpers
# --------------------------------------------------------------------------- #
def _parse_dt(s: Any) -> Optional[datetime]:
    if isinstance(s, datetime):
        return s
    if not s or not isinstance(s, str):
        return None
    txt = s.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(txt)
        return dt.replace(tzinfo=None) if dt.tzinfo else dt
    except Exception:
        return None


def _now(now: Optional[datetime]) -> datetime:
    return now or datetime.utcnow()


def _days_since(dt: Optional[datetime], now: datetime) -> Optional[float]:
    if not dt:
        return None
    try:
        return (now - dt).total_seconds() / 86400.0
    except Exception:
        return None


def _my_id(user: Dict) -> str:
    return str((user or {}).get("tsap_id", "")).upper()


def _has_phone(user: Dict) -> bool:
    """A digest is only deliverable if the user has a phone on file."""
    p = str((user or {}).get("phone", "") or "").strip()
    return len(p) >= 10


# --------------------------------------------------------------------------- #
# 1. OPT-OUT — never message someone who asked us not to
# --------------------------------------------------------------------------- #
def is_opted_out(user: Dict, consent_rows: Optional[Iterable[Dict]] = None) -> bool:
    """True if the user must NOT receive a personalized digest.

    Honors (any one is enough):
      • user["digest_opt_out"] truthy
      • user["notifications"]["digest"] / ["whatsapp"] explicitly False
      • a consent-ledger row recording a whatsapp/digest opt-out
    """
    user = user if isinstance(user, dict) else {}
    if user.get("digest_opt_out") in (True, 1, "1", "true", "yes", "on"):
        return True
    notif = user.get("notifications")
    if isinstance(notif, dict):
        if notif.get("digest") in (False, 0, "0", "false", "no", "off"):
            return True
        if notif.get("whatsapp") in (False, 0, "0", "false", "no", "off"):
            return True
    for c in consent_rows or []:
        if not isinstance(c, dict):
            continue
        action = str(c.get("action", "")).lower()
        if action in ("wa_opt_out", "digest_opt_out", "opt_out", "unsubscribe") \
                and str(c.get("actor_id", "")).upper() == _my_id(user):
            return True
    return False


# --------------------------------------------------------------------------- #
# 2. ENGAGEMENT — only message recently-active users (anti-ban + relevance)
# --------------------------------------------------------------------------- #
def is_engaged(user: Dict, interests: Optional[List[Dict]] = None,
               views: Optional[List[Dict]] = None, now: Optional[datetime] = None,
               within_days: int = ENGAGED_WITHIN_DAYS) -> bool:
    """A user is 'engaged' if they joined OR acted within the window.

    Signals (any one qualifies):
      • last_login / last_active / created_at within ``within_days``
      • sent an interest within the window
      • viewed a profile within the window
    """
    user = user if isinstance(user, dict) else {}
    now = _now(now)
    mid = _my_id(user)
    for field in ("last_login", "last_active", "last_seen", "created_at"):
        d = _days_since(_parse_dt(user.get(field)), now)
        if d is not None and d <= within_days:
            return True
    for it in interests or []:
        if not isinstance(it, dict):
            continue
        if str(it.get("from_id", "")).upper() == mid:
            d = _days_since(_parse_dt(it.get("created_at") or it.get("at")), now)
            if d is not None and d <= within_days:
                return True
    for v in views or []:
        if not isinstance(v, dict):
            continue
        if str(v.get("viewer_id", "")).upper() == mid:
            d = _days_since(_parse_dt(v.get("at") or v.get("created_at")), now)
            if d is not None and d <= within_days:
                return True
    return False


# --------------------------------------------------------------------------- #
# 3. DEDUP — never send the same digest twice
# --------------------------------------------------------------------------- #
def dedup_key(tsap_id: str, match_ids: Iterable[str], saved_ids: Iterable[str]) -> str:
    """Stable hash of (user, the exact set of matches + saved hits) so an
    identical digest on a later day is recognized and skipped."""
    payload = "|".join([
        str(tsap_id).upper(),
        ",".join(sorted({str(m).upper() for m in match_ids if m})),
        ",".join(sorted({str(s).upper() for s in saved_ids if s})),
    ])
    return hashlib.sha1(payload.encode("utf-8")).hexdigest()[:16]


# --------------------------------------------------------------------------- #
# 4. BUILD ONE USER'S DIGEST
# --------------------------------------------------------------------------- #
def build_personal_digest(user: Dict, profiles: List[Dict],
                          interests: Optional[List[Dict]] = None,
                          views: Optional[List[Dict]] = None,
                          saves: Optional[List[Dict]] = None,
                          saved_searches: Optional[List[Dict]] = None,
                          new_matches_fn: Optional[Callable] = None,
                          consent_rows: Optional[Iterable[Dict]] = None,
                          recent_keys: Optional[Iterable[str]] = None,
                          now: Optional[datetime] = None, lang: str = DEFAULT_LANG,
                          engaged_only: bool = True) -> Dict[str, Any]:
    """Build (never send) one user's personalized digest record.

    Returns a dict with ``should_send`` plus the reason, the deliverable text,
    counts, and the ``dedup_key``. Privacy-safe: text comes from
    ``matchbot.delivery_text`` (safe_user, no raw phone in the body).
    """
    user = user if isinstance(user, dict) else {}
    profiles = [p for p in (profiles or []) if isinstance(p, dict)]
    now = _now(now)
    mid = _my_id(user)
    recent = set(recent_keys or [])

    rec: Dict[str, Any] = {
        "tsap_id": mid, "should_send": False, "reason": "", "lang": lang,
        "text": "", "matches_count": 0, "mutual_count": 0, "new_count": 0,
        "saved_hits": 0, "saved_ids": [], "saved_searches": [], "dedup_key": "",
        "interests_received": 0, "at": now.isoformat(),
    }
    if not mid:
        rec["reason"] = "no_id"
        return rec

    # --- gate 1: opt-out --------------------------------------------------- #
    if is_opted_out(user, consent_rows):
        rec["reason"] = "opted_out"
        return rec
    # --- gate 2: deliverable (has phone) ----------------------------------- #
    if not _has_phone(user):
        rec["reason"] = "no_phone"
        return rec
    # --- gate 3: engagement ------------------------------------------------ #
    if engaged_only and not is_engaged(user, interests, views, now):
        rec["reason"] = "not_engaged"
        return rec

    # --- content: personalized briefing ------------------------------------ #
    briefing = matchbot.daily_briefing(user, profiles, interests, views, saves, limit=3, now=now)
    matches = briefing.get("matches", []) or []
    match_ids = [m.get("tsap_id") for m in matches]
    mutual = briefing.get("mutual", {}) or {}
    rec["matches_count"] = len(matches)
    rec["mutual_count"] = sum(1 for m in matches if m.get("is_mutual"))
    rec["new_count"] = sum(1 for m in matches if m.get("is_new"))
    rec["interests_received"] = int(mutual.get("interests_received", 0) or 0)

    # --- content: saved-search hits ---------------------------------------- #
    saved_ids: List[str] = []
    saved_lines: List[str] = []
    if new_matches_fn and saved_searches:
        for sr in saved_searches:
            if not isinstance(sr, dict):
                continue
            if str(sr.get("tsap_id", "")).upper() != mid:
                continue
            if sr.get("alert") in (False, 0, "0", "false", "no", "off"):
                continue  # per-search opt-out
            try:
                fresh = new_matches_fn(sr, profiles, [mid], 5) or []
            except Exception:
                fresh = []
            fresh = [f for f in fresh if isinstance(f, dict)]
            if not fresh:
                continue
            ids = [str(f.get("tsap_id", "")).upper() for f in fresh]
            saved_ids.extend(ids)
            saved_lines.append({"search_id": sr.get("search_id", ""),
                                "name": sr.get("name", "My search"), "count": len(fresh),
                                "ids": ids})
    rec["saved_hits"] = len(saved_ids)
    rec["saved_ids"] = saved_ids
    rec["saved_searches"] = saved_lines

    # --- gate 4: must have NEW content ------------------------------------- #
    has_content = rec["matches_count"] > 0 or rec["saved_hits"] > 0 or rec["interests_received"] > 0
    if not has_content:
        rec["reason"] = "no_new_content"
        return rec

    # --- gate 5: dedup (skip if this exact digest was sent recently) ------- #
    key = dedup_key(mid, match_ids, saved_ids)
    rec["dedup_key"] = key
    if key in recent:
        rec["reason"] = "duplicate"
        return rec

    # --- assemble deliverable text (privacy-safe) -------------------------- #
    text = matchbot.delivery_text(briefing, user, lang)
    if saved_lines and lang != "en":
        text += "\n\n🔔 మీ saved search‌లకు కూడా కొత్త సంబంధాలు:\n" + \
                "\n".join(f"• {s['name']} — {s['count']} కొత్తవి" for s in saved_lines)
    elif saved_lines:
        text += "\n\n🔔 New matches in your saved searches:\n" + \
                "\n".join(f"• {s['name']} — {s['count']} new" for s in saved_lines)
    rec["text"] = text
    rec["should_send"] = True
    rec["reason"] = "ok"
    return rec


# --------------------------------------------------------------------------- #
# 5. RUN A BATCH (generate the queue — NEVER sends)
# --------------------------------------------------------------------------- #
def run_personal_digests(users: List[Dict], profiles: List[Dict],
                         interests: Optional[List[Dict]] = None,
                         views: Optional[List[Dict]] = None,
                         saves: Optional[List[Dict]] = None,
                         saved_searches: Optional[List[Dict]] = None,
                         new_matches_fn: Optional[Callable] = None,
                         consent_fn: Optional[Callable] = None,
                         recent_keys: Optional[Iterable[str]] = None,
                         now: Optional[datetime] = None, lang: str = DEFAULT_LANG,
                         engaged_only: bool = True,
                         max_queue: int = MAX_QUEUE_PER_RUN) -> Dict[str, Any]:
    """Generate today's personalized-digest queue for all eligible users.

    Pure generation: returns a summary + the ``queue`` of sendable records.
    Sending is the caller's explicit, separate decision (see send_digest_queue).
    """
    users = [u for u in (users or []) if isinstance(u, dict)]
    profiles = profiles if isinstance(profiles, list) else []
    now = _now(now)
    recent = set(recent_keys or [])

    queue: List[Dict[str, Any]] = []
    counts = {"total": len(users), "sendable": 0, "opted_out": 0, "no_phone": 0,
              "not_engaged": 0, "no_new_content": 0, "duplicate": 0, "no_id": 0}
    samples: List[Dict[str, str]] = []

    for u in users:
        consent_rows = None
        if consent_fn:
            try:
                consent_rows = consent_fn(_my_id(u))
            except Exception:
                consent_rows = None
        rec = build_personal_digest(
            u, profiles, interests, views, saves, saved_searches,
            new_matches_fn=new_matches_fn, consent_rows=consent_rows,
            recent_keys=recent, now=now, lang=lang, engaged_only=engaged_only)
        reason = rec.get("reason", "")
        if reason in counts:
            counts[reason] += 1
        if rec.get("should_send"):
            counts["sendable"] += 1
            # once queued, treat its key as seen so we don't queue it twice
            if rec.get("dedup_key"):
                recent.add(rec["dedup_key"])
            if len(queue) < max_queue:
                queue.append(rec)
            if len(samples) < 3:
                samples.append({"tsap_id": rec["tsap_id"], "text": rec["text"][:280]})

    return {
        "success": True, "at": now.isoformat(), "lang": lang,
        "counts": counts, "queued": len(queue), "queue": queue, "samples": samples,
        "note": ("Generation only — nothing was sent. Send is gated behind "
                 "DIGEST_PERSONAL_SEND=1 + WHATSAPP_MODE."),
    }


# --------------------------------------------------------------------------- #
# 6. SEND (explicit, injectable, gated) — separated from generation on purpose
# --------------------------------------------------------------------------- #
def send_digest_queue(queue: List[Dict], send_fn: Callable[[Dict], Any]) -> Dict[str, Any]:
    """Send a previously-generated queue via the injected ``send_fn``.

    ``send_fn(record) -> result``. Kept injectable so the live site can wire the
    real WhatsApp bridge while tests use a stub. Never called by generation.
    """
    sent = 0
    failed = 0
    results: List[Any] = []
    for rec in queue or []:
        if not isinstance(rec, dict) or not rec.get("should_send"):
            continue
        try:
            r = send_fn(rec)
            results.append(r)
            sent += 1
        except Exception as e:  # pragma: no cover - defensive
            results.append({"tsap_id": rec.get("tsap_id"), "error": str(e)[:120]})
            failed += 1
    return {"success": True, "sent": sent, "failed": failed, "results": results[-50:]}
