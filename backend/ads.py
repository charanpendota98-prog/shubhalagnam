"""
📢 WAVE 13 — VENDOR ADS ENGINE (మన వివాహ revenue)
=====================================================
Photographers / decoration / catering / halls / shopping-malls / jewelry... —
vallu campaign create chesthe, scope prakaram audience ki matrame ads:

  • DISTRICT level: aa district(s) users ke kanipisthundi
  • STATE level: TS leda AP motham
  • ALL (TS+AP): andarki

Money: days × rate (per-day + per-district). Manual UTR approve (vendor flow lanti).
Slots: home_hero · matches_sidebar · profile_banner · search_top
Serve: active + date-valid + scope-match → rotation (least impressions first).
Track: impressions + clicks + leads (vendor dashboard + admin revenue).
Media: photo/banner upload (image_url) + video link (YouTube) + offer text.
"""
from __future__ import annotations
from atomic_store import atomic_json_dump


import json
import copy
import os
import re
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from urllib.parse import urlsplit

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PERSIST_FILE = os.environ.get("MANA_VIVAHA_ADS_FILE", os.path.join(BASE_DIR, "ads13.json"))

# ---------------------------------------------------------------------------
# PRICING (₹) — public rates (GET /api/ads/rates)
# ---------------------------------------------------------------------------
RATES = {
    "currency": "₹",
    "base_per_day": 49,          # prathi campaign ki base
    "per_district_per_day": 19,  # district add ayithe extra
    "state_per_day": 299,        # STATE level flat (districts tho సంబంధం ledu)
    "all_per_day": 499,          # TS+AP motham flat
    "video_plus_per_day": 30,    # video ad ayithe extra
    "hero_plus_per_day": 99,     # home_hero slot premium
    "min_days": 3,
    "max_days": 90,
    "note_telugu": "💰 Uda: 7 days × 2 districts = 7×(49+19×2) = ₹609 · STATE 7d = ₹2,093 · payment UPI + admin approve",
}

SLOTS = ["home_hero", "matches_sidebar", "profile_banner", "search_top"]
SLOT_TE = {"home_hero": "🏠 Home hero banner", "matches_sidebar": "💞 Matches sidebar",
           "profile_banner": "👤 Profile page banner", "search_top": "🔎 Search top strip"}
LEVELS = ["district", "state", "all"]
_STATE_ALIASES = {
    "TS": "TS", "TG": "TS", "TELANGANA": "TS", "TELANGANA STATE": "TS",
    "AP": "AP", "ANDHRA PRADESH": "AP", "ANDHRAPRADESH": "AP",
}


def _state_key(value: str) -> str:
    raw = str(value or "").strip().upper()
    return _STATE_ALIASES.get(raw, raw)


def _safe_click_url(value: object) -> tuple[bool, str]:
    """Allow only HTTPS advertiser URLs or same-site absolute paths."""
    raw = str(value or "").strip()
    if not raw:
        return True, ""
    if len(raw) > 500 or any(ord(char) < 32 or ord(char) == 127 for char in raw):
        return False, "⚠️ Ad link is too long or contains invalid characters"
    if raw.startswith("/"):
        if raw.startswith("//") or raw.startswith("/\\"):
            return False, "⚠️ Ad link must stay on this site or use HTTPS"
        return True, raw
    try:
        parsed = urlsplit(raw)
        if (parsed.scheme.lower() != "https" or not parsed.hostname
                or parsed.username is not None or parsed.password is not None):
            return False, "⚠️ Use a same-site path or a complete HTTPS advertiser link"
        return True, raw
    except (TypeError, ValueError):
        return False, "⚠️ Ad link is invalid"


CAMPAIGNS: List[Dict] = []
_AD_SEQ = 0


def _now() -> datetime:
    return datetime.utcnow()


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def _persist() -> bool:
    """Persist campaign state and report failure so callers can roll back."""
    try:
        atomic_json_dump(PERSIST_FILE, {"campaigns": CAMPAIGNS[-1000:]}, ensure_ascii=False)
        return True
    except Exception:
        return False


def _restore() -> None:
    global _AD_SEQ
    try:
        if os.path.exists(PERSIST_FILE):
            for c in (json.load(open(PERSIST_FILE, encoding="utf-8")) or {}).get("campaigns", []):
                valid_link, clean_link = _safe_click_url(c.get("link", ""))
                c["link"] = clean_link if valid_link else ""
                CAMPAIGNS.append(c)
                try:
                    _AD_SEQ = max(_AD_SEQ, int(str(c.get("id", "AD-0")).split("-")[-1]))
                except Exception:
                    pass
    except Exception:
        pass


_restore()

# ---------------------------------------------------------------------------
# QUOTE + CREATE
# ---------------------------------------------------------------------------

def quote(level: str, days: int, districts: Optional[List[str]] = None,
          slots: Optional[List[str]] = None, video: bool = False) -> Dict:
    """Honest price math — vendor ki mundhe telustundi."""
    level = (level or "").lower()
    if level not in LEVELS:
        return {"ok": False, "message_telugu": "⚠️ level: district / state / all మాత్రమే", "message_en": "Choose district, state, or all-region targeting."}
    days = int(days or 0)
    if days < RATES["min_days"] or days > RATES["max_days"]:
        return {"ok": False, "message_telugu": f"⚠️ days {RATES['min_days']}–{RATES['max_days']} మాత్రమే",
                "message_en": f"Campaign duration must be {RATES['min_days']}–{RATES['max_days']} days."}
    ds = list(dict.fromkeys(str(d).strip() for d in (districts or []) if str(d).strip()))
    requested_slots = list(dict.fromkeys(str(s).strip() for s in (slots or []) if str(s).strip()))
    if requested_slots and any(slot not in SLOTS for slot in requested_slots):
        return {"ok": False, "message_telugu": "⚠️ Invalid ad placement selected", "message_en": "One or more selected placements are invalid."}
    sl = requested_slots or ["matches_sidebar"]
    if level == "district" and not ds:
        return {"ok": False, "message_telugu": "⚠️ district level కి districts list కావాలి", "message_en": "Select at least one district for district-level targeting."}
    if level == "district":
        per_day = RATES["base_per_day"] + RATES["per_district_per_day"] * len(ds)
    elif level == "state":
        per_day = RATES["state_per_day"]
    else:
        per_day = RATES["all_per_day"]
    if video:
        per_day += RATES["video_plus_per_day"]
    if "home_hero" in sl:
        per_day += RATES["hero_plus_per_day"]
    total = per_day * days
    return {"ok": True, "level": level, "days": days, "districts": ds, "slots": sl,
            "per_day": per_day, "total": total,
            "message_telugu": f"💰 {days} days × ₹{per_day}/day = ₹{total} ({level})",
            "message_en": f"💰 {days} days × ₹{per_day}/day = ₹{total} ({level})"}


def create_campaign(vendor_id: str, title: str, level: str, days: int,
                    districts: Optional[List[str]] = None, state: str = "",
                    slots: Optional[List[str]] = None, image_url: str = "",
                    banner_url: str = "", video_url: str = "", offer: str = "",
                    link: str = "") -> Dict:
    """Vendor campaign request → status pending (payment + admin approve తర్వాత live)."""
    global _AD_SEQ
    vendor_id = str(vendor_id or "").strip()
    state = str(state or "").strip()
    if not vendor_id:
        return {"success": False, "message_telugu": "⚠️ Registered vendor ID కావాలి", "message_en": "A registered vendor ID is required."}
    if str(level or "").strip().lower() == "state" and not state:
        return {"success": False, "message_telugu": "⚠️ State-level campaign కి రాష్ట్రం ఎంచుకోండి", "message_en": "Choose a state for a state-level campaign."}
    valid_link, clean_link = _safe_click_url(link)
    if not valid_link:
        return {"success": False, "message_telugu": clean_link,
                "message_en": clean_link if not any("\u0c00" <= ch <= "\u0c7f" for ch in clean_link) else "Enter a valid HTTPS link."}
    q = quote(level, days, districts, slots, bool(video_url))
    if not q.get("ok"):
        return {"success": False, "message_telugu": q.get("message_telugu"), "message_en": q.get("message_en")}
    if not (title or "").strip():
        return {"success": False, "message_telugu": "⚠️ Ad title కావాలి", "message_en": "Enter a title for the campaign."}
    _AD_SEQ += 1
    c = {"id": f"AD-{_AD_SEQ:04d}", "vendor_id": vendor_id, "title": title.strip(),
         "offer": offer or "", "level": q["level"], "districts": q["districts"],
         "state": _state_key(state), "slots": q["slots"],
         "image_url": image_url or "", "banner_url": banner_url or "",
         "video_url": video_url or "", "link": clean_link,
         "days": days, "per_day": q["per_day"], "amount": q["total"],
         "status": "pending", "utr": "", "start": "", "end": "",
         "impressions": 0, "clicks": 0, "leads": 0,
         "created_at": _iso(_now())}
    CAMPAIGNS.append(c)
    if not _persist():
        CAMPAIGNS.remove(c)
        _AD_SEQ -= 1
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Campaign could not be saved safely. Please try again.",
                "message_en": "The campaign could not be saved safely. Please try again."}
    return {"success": True, "campaign": c,
            "message_telugu": f"✅ Campaign {c['id']} — ₹{c['total'] if 'total' in c else c['amount']} pay చేసి UTR పంపండి, admin approve చేస్తాడు 🙏",
            "message_en": f"Campaign {c['id']} is recorded for ₹{c['total'] if 'total' in c else c['amount']}. Submit the payment reference for admin review; approval is not automatic."}


def get_campaign(cid: str) -> Optional[Dict]:
    return next((c for c in CAMPAIGNS if c.get("id") == cid), None)


def approve_campaign(cid: str, utr: str, days_override: int = 0) -> Dict:
    """Admin: UTR + approve → active (start/end set)."""
    c = get_campaign(cid)
    if not c:
        return {"success": False, "message_telugu": "⚠️ Campaign దొరకలేదు"}
    if c.get("status") != "pending":
        return {"success": False, "message_telugu": "⚠️ Pending campaign మాత్రమే approve చేయవచ్చు"}
    utr_value = str(utr or "").strip()
    if (not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9 ./_:-]{5,63}", utr_value)
            or not any(char.isdigit() for char in utr_value)):
        return {"success": False, "message_telugu": "⚠️ Actual payment reference with a traceable number (6–64 characters) అవసరం"}
    if any(str(existing.get("utr", "")).strip().upper() == utr_value.upper()
           and str(existing.get("status", "")).lower() not in {"refunded", "reversed"}
           for existing in CAMPAIGNS if existing is not c):
        return {"success": False, "reason": "duplicate_payment_reference",
                "message_telugu": "⚠️ ఈ payment reference ఇప్పటికే campaign కి వాడబడింది"}
    try:
        days = int(days_override or c.get("days") or RATES["min_days"])
    except (TypeError, ValueError):
        return {"success": False, "message_telugu": "⚠️ Campaign days చెల్లుబాటు కావాలి"}
    if days < RATES["min_days"] or days > RATES["max_days"]:
        return {"success": False, "message_telugu": f"⚠️ Campaign days {RATES['min_days']}–{RATES['max_days']} మధ్య ఉండాలి"}
    previous = copy.deepcopy(c)
    start = _now()
    c.update({"status": "active", "utr": utr.strip(), "days": days,
              "start": _iso(start), "end": _iso(start + timedelta(days=days))})
    if not _persist():
        c.clear()
        c.update(previous)
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Campaign approval could not be saved safely. Please try again."}
    return {"success": True, "campaign": c,
            "message_telugu": f"✅ {cid} LIVE — {days} days ({c['start'][:10]} → {c['end'][:10]})"}


def update_campaign(cid: str, patch: Dict) -> Dict:
    """🌊 WAVE 14 — ADMIN edit: title/offer/dates/districts/state/days/media/link.
    Active campaign days extend cheste end date auto-recompute. Re-quote ivvadu
    (money matter kabatti amount manual ga admin approve lo fix)."""
    c = get_campaign(cid)
    if not c:
        return {"success": False, "message_telugu": "⚠️ Campaign దొరకలేదు"}
    d = patch or {}
    previous = copy.deepcopy(c)
    clean_link = None
    if "link" in d and d.get("link") is not None:
        valid_link, clean_link = _safe_click_url(d.get("link"))
        if not valid_link:
            return {"success": False, "message_telugu": clean_link}
    for k in ("title", "offer", "state", "image_url", "banner_url", "video_url"):
        if d.get(k) is not None and str(d.get(k)).strip() != "":
            c[k] = str(d[k]).strip()[:300]
    if clean_link is not None:
        c["link"] = clean_link
    if d.get("state"):
        c["state"] = _state_key(d["state"])
    if isinstance(d.get("districts"), list):
        c["districts"] = [str(x).strip() for x in d["districts"] if str(x).strip()][:20]
    if isinstance(d.get("slots"), list):
        c["slots"] = [str(x).strip() for x in d["slots"] if str(x).strip()][:10]
    if d.get("start"):
        try:
            datetime.fromisoformat(str(d["start"])[:19]); c["start"] = str(d["start"])[:19]
        except ValueError:
            c.clear(); c.update(previous)
            return {"success": False, "message_telugu": "⚠️ start date format tappu (YYYY-MM-DD)"}
    ndays = d.get("days")
    if ndays:
        try:
            c["days"] = max(1, int(ndays))
        except (ValueError, TypeError):
            c.clear(); c.update(previous)
            return {"success": False, "message_telugu": "⚠️ days number ఇవ్వండి"}
        if c.get("status") == "active" and c.get("start"):
            try:
                st = datetime.fromisoformat(c["start"][:19])
                c["end"] = _iso(st + timedelta(days=c["days"]))
            except ValueError:
                pass
    if d.get("end"):
        try:
            datetime.fromisoformat(str(d["end"])[:19]); c["end"] = str(d["end"])[:19]
        except ValueError:
            c.clear(); c.update(previous)
            return {"success": False, "message_telugu": "⚠️ end date format tappu (YYYY-MM-DD)"}
    if not _persist():
        c.clear()
        c.update(previous)
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Campaign update could not be saved safely. Please try again."}
    return {"success": True, "campaign": c,
            "message_telugu": f"✅ {cid} update అయ్యింది ({(c.get('start') or '?')[:10]} → {(c.get('end') or '?')[:10]} • {c.get('days')} days)"}


def campaign_action(cid: str, action: str, reason: str = "") -> Dict:
    c = get_campaign(cid)
    if not c:
        return {"success": False, "message_telugu": "⚠️ Campaign దొరకలేదు"}
    allowed_from = {
        "reject": {"pending"},
        "pause": {"active"},
        "resume": {"paused"},
        "expire": {"active", "paused"},
    }
    if action not in allowed_from:
        return {"success": False, "message_telugu": "⚠️ action: reject/pause/resume/expire"}
    if c.get("status") not in allowed_from[action]:
        return {"success": False, "message_telugu": f"⚠️ {action} చర్యకు campaign ప్రస్తుతం సరైన status లో లేదు"}
    if action == "resume" and not str(c.get("utr", "")).strip():
        return {"success": False, "message_telugu": "⚠️ చెల్లింపు reference లేని campaign ను resume చేయలేము"}
    if action == "reject" and len(str(reason or "").strip()) < 5:
        return {"success": False, "message_telugu": "⚠️ Reject చేయడానికి కారణం నమోదు చేయండి"}
    previous = copy.deepcopy(c)
    c["status"] = {"reject": "rejected", "pause": "paused", "resume": "active", "expire": "expired"}[action]
    c["admin_note"] = str(reason or "").strip()[:500]
    if not _persist():
        c.clear()
        c.update(previous)
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Campaign action could not be saved safely. Please try again."}
    return {"success": True, "campaign": c, "message_telugu": f"✅ {cid} → {c['status']}"}


def _is_live(c: Dict) -> bool:
    if c.get("status") != "active":
        return False
    try:
        end = datetime.strptime(c.get("end", ""), "%Y-%m-%dT%H:%M:%S")
    except Exception:
        return False
    if _now() > end:
        c["status"] = "expired"   # auto-expiry
        if not _persist():
            c["status"] = "active"
        return False
    return True


def _scope_priority(c: Dict, district: str, state: str) -> int:
    lvl = str(c.get("level", "all")).lower()
    dist_clean = str(district or "").lower().strip()
    state_clean = _state_key(state)
    
    if lvl == "district" and dist_clean:
        ds = [str(d).lower().strip() for d in (c.get("districts") or [])]
        if any(dist_clean in d or d in dist_clean for d in ds):
            return 3
    if lvl == "state" and state_clean:
        cs = _state_key(c.get("state", ""))
        if cs and cs == state_clean:
            return 2
    if lvl == "all":
        return 1
    return 0


def _scope_ok(c: Dict, district: str, state: str) -> bool:
    lvl = str(c.get("level", "all")).lower()
    if lvl == "all":
        return True
    if lvl == "state":
        cs = _state_key(c.get("state", ""))
        target = _state_key(state)
        return (not cs) or (not target) or cs == target
    # district
    ds = [str(d).lower().strip() for d in (c.get("districts") or [])]
    dist_clean = (district or "").lower().strip()
    if not dist_clean:
        return True
    return any(dist_clean in d or d in dist_clean for d in ds)


# ---------------------------------------------------------------------------
# SERVE + TRACK
# ---------------------------------------------------------------------------
def serve(slot: str, district: str = "", state: str = "") -> Dict:
    """
    Okka slot ki best ad — scope match + live + rotation.
    Targeting priority: Specific District (3) > State TS/AP (2) > All (1).
    """
    if slot not in SLOTS:
        return {"ok": False, "reason": "bad_slot"}
    cands = [c for c in CAMPAIGNS if slot in (c.get("slots") or []) and _is_live(c)
             and _scope_ok(c, district or "", state or "")]
    if not cands:
        return {"ok": False, "reason": "no_ads"}
    # Sort by priority score DESC, then least impressions ASC
    cands.sort(key=lambda x: (-_scope_priority(x, district, state), x.get("impressions", 0), x.get("id", "")))
    ad = cands[0]
    previous_impressions = int(ad.get("impressions", 0) or 0)
    ad["impressions"] = previous_impressions + 1
    if not _persist():
        ad["impressions"] = previous_impressions
        return {"ok": False, "reason": "persistence_failed"}
    payload = {k: ad.get(k) for k in
               ("id", "vendor_id", "title", "offer", "image_url", "banner_url", "video_url",
                "phone", "whatsapp", "category", "level", "districts", "state")}
    valid_link, clean_link = _safe_click_url(ad.get("link", ""))
    payload["link"] = clean_link if valid_link else ""
    return {"ok": True, "ad": payload}


def serve_list(slot: str = "matches_sidebar", district: str = "", state: str = "", limit: int = 3) -> Dict:
    """Returns multiple targeted ads matching district and state."""
    cands = [c for c in CAMPAIGNS if (not slot or slot in (c.get("slots") or [])) and _is_live(c)
             and _scope_ok(c, district or "", state or "")]
    if not cands:
        return {"ok": False, "ads": [], "count": 0}
    cands.sort(key=lambda x: (-_scope_priority(x, district, state), x.get("impressions", 0), x.get("id", "")))
    chosen = cands[:limit]
    previous_impressions = {ad["id"]: int(ad.get("impressions", 0) or 0) for ad in chosen}
    for ad in chosen:
        ad["impressions"] = previous_impressions[ad["id"]] + 1
    if not _persist():
        for ad in chosen:
            ad["impressions"] = previous_impressions[ad["id"]]
        return {"ok": False, "ads": [], "count": 0, "reason": "persistence_failed"}
    return {
        "ok": True,
        "count": len(chosen),
        "ads": [{**{k: a.get(k) for k in ("id", "vendor_id", "title", "offer", "image_url", "banner_url",
                                             "video_url", "phone", "whatsapp", "category", "level",
                                             "districts", "state")},
                 "link": (_safe_click_url(a.get("link", ""))[1] if _safe_click_url(a.get("link", ""))[0] else "")}
                for a in chosen]
    }


def track_click(cid: str) -> Dict:
    c = get_campaign(cid)
    if not c or not _is_live(c):
        return {"ok": False, "reason": "not_active"}
    previous = int(c.get("clicks", 0) or 0)
    c["clicks"] = previous + 1
    if not _persist():
        c["clicks"] = previous
        return {"ok": False, "reason": "persistence_failed"}
    return {"ok": True, "clicks": c["clicks"]}


def track_lead(cid: str) -> Dict:
    c = get_campaign(cid)
    if not c or not _is_live(c):
        return {"ok": False, "reason": "not_active"}
    previous = int(c.get("leads", 0) or 0)
    c["leads"] = previous + 1
    if not _persist():
        c["leads"] = previous
        return {"ok": False, "reason": "persistence_failed"}
    return {"ok": True, "leads": c["leads"]}


def vendor_campaigns(vendor_id: str) -> List[Dict]:
    return [c for c in CAMPAIGNS if c.get("vendor_id") == vendor_id]


def ads_stats() -> Dict:
    live = [c for c in CAMPAIGNS if _is_live(c)]
    pend = [c for c in CAMPAIGNS if c.get("status") == "pending"]
    collected = sum(int(c.get("amount", 0) or 0) for c in CAMPAIGNS
                    if c.get("status") in ("active", "expired") and c.get("utr"))
    return {"total": len(CAMPAIGNS), "live": len(live), "pending": len(pend),
            "collected": collected,
            "impressions": sum(int(c.get("impressions", 0) or 0) for c in CAMPAIGNS),
            "clicks": sum(int(c.get("clicks", 0) or 0) for c in CAMPAIGNS),
            "by_level": {l: len([c for c in CAMPAIGNS if c.get("level") == l]) for l in LEVELS}}
