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

import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PERSIST_FILE = os.path.join(BASE_DIR, "ads13.json")

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

CAMPAIGNS: List[Dict] = []
_AD_SEQ = 0


def _now() -> datetime:
    return datetime.utcnow()


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


def _persist() -> None:
    try:
        with open(PERSIST_FILE, "w", encoding="utf-8") as f:
            json.dump({"campaigns": CAMPAIGNS[-1000:]}, f, ensure_ascii=False)
    except Exception:
        pass


def _restore() -> None:
    global _AD_SEQ
    try:
        if os.path.exists(PERSIST_FILE):
            for c in (json.load(open(PERSIST_FILE, encoding="utf-8")) or {}).get("campaigns", []):
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
        return {"ok": False, "message_telugu": "⚠️ level: district / state / all మాత్రమే"}
    days = int(days or 0)
    if days < RATES["min_days"] or days > RATES["max_days"]:
        return {"ok": False, "message_telugu": f"⚠️ days {RATES['min_days']}–{RATES['max_days']} మాత్రమే"}
    ds = [d for d in (districts or []) if d]
    sl = [s for s in (slots or []) if s in SLOTS] or ["matches_sidebar"]
    if level == "district" and not ds:
        return {"ok": False, "message_telugu": "⚠️ district level కి districts list కావాలి"}
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
            "message_telugu": f"💰 {days} days × ₹{per_day}/day = ₹{total} ({level})"}


def create_campaign(vendor_id: str, title: str, level: str, days: int,
                    districts: Optional[List[str]] = None, state: str = "",
                    slots: Optional[List[str]] = None, image_url: str = "",
                    banner_url: str = "", video_url: str = "", offer: str = "",
                    link: str = "") -> Dict:
    """Vendor campaign request → status pending (payment + admin approve తర్వాత live)."""
    global _AD_SEQ
    q = quote(level, days, districts, slots, bool(video_url))
    if not q.get("ok"):
        return {"success": False, "message_telugu": q.get("message_telugu")}
    if not (title or "").strip():
        return {"success": False, "message_telugu": "⚠️ Ad title కావాలి"}
    _AD_SEQ += 1
    c = {"id": f"AD-{_AD_SEQ:04d}", "vendor_id": vendor_id, "title": title.strip(),
         "offer": offer or "", "level": q["level"], "districts": q["districts"],
         "state": (state or "").upper() or "", "slots": q["slots"],
         "image_url": image_url or "", "banner_url": banner_url or "",
         "video_url": video_url or "", "link": link or "",
         "days": days, "per_day": q["per_day"], "amount": q["total"],
         "status": "pending", "utr": "", "start": "", "end": "",
         "impressions": 0, "clicks": 0, "leads": 0,
         "created_at": _iso(_now())}
    CAMPAIGNS.append(c)
    _persist()
    return {"success": True, "campaign": c,
            "message_telugu": f"✅ Campaign {c['id']} — ₹{c['total'] if 'total' in c else c['amount']} pay చేసి UTR పంపండి, admin approve చేస్తాడు 🙏"}


def get_campaign(cid: str) -> Optional[Dict]:
    return next((c for c in CAMPAIGNS if c.get("id") == cid), None)


def approve_campaign(cid: str, utr: str, days_override: int = 0) -> Dict:
    """Admin: UTR + approve → active (start/end set)."""
    c = get_campaign(cid)
    if not c:
        return {"success": False, "message_telugu": "⚠️ Campaign దొరకలేదు"}
    if not (utr or "").strip():
        return {"success": False, "message_telugu": "⚠️ UTR lekunda approve cheyyakoodadu (audit)"}
    days = int(days_override or c.get("days") or RATES["min_days"])
    start = _now()
    c.update({"status": "active", "utr": utr.strip(), "days": days,
              "start": _iso(start), "end": _iso(start + timedelta(days=days))})
    _persist()
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
    for k in ("title", "offer", "state", "image_url", "banner_url", "video_url", "link"):
        if d.get(k) is not None and str(d.get(k)).strip() != "":
            c[k] = str(d[k]).strip()[:300]
    if isinstance(d.get("districts"), list):
        c["districts"] = [str(x).strip() for x in d["districts"] if str(x).strip()][:20]
    if isinstance(d.get("slots"), list):
        c["slots"] = [str(x).strip() for x in d["slots"] if str(x).strip()][:10]
    if d.get("start"):
        try:
            datetime.fromisoformat(str(d["start"])[:19]); c["start"] = str(d["start"])[:19]
        except ValueError:
            return {"success": False, "message_telugu": "⚠️ start date format tappu (YYYY-MM-DD)"}
    ndays = d.get("days")
    if ndays:
        try:
            c["days"] = max(1, int(ndays))
        except (ValueError, TypeError):
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
            return {"success": False, "message_telugu": "⚠️ end date format tappu (YYYY-MM-DD)"}
    _persist()
    return {"success": True, "campaign": c,
            "message_telugu": f"✅ {cid} update అయ్యింది ({(c.get('start') or '?')[:10]} → {(c.get('end') or '?')[:10]} • {c.get('days')} days)"}


def campaign_action(cid: str, action: str, reason: str = "") -> Dict:
    c = get_campaign(cid)
    if not c:
        return {"success": False, "message_telugu": "⚠️ Campaign దొరకలేదు"}
    if action == "reject":
        c["status"] = "rejected"
    elif action == "pause":
        c["status"] = "paused"
    elif action == "resume":
        c["status"] = "active"
    elif action == "expire":
        c["status"] = "expired"
    else:
        return {"success": False, "message_telugu": "⚠️ action: reject/pause/resume/expire"}
    c["admin_note"] = reason
    _persist()
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
        _persist()
        return False
    return True


def _scope_priority(c: Dict, district: str, state: str) -> int:
    lvl = str(c.get("level", "all")).lower()
    dist_clean = str(district or "").lower().strip()
    state_clean = str(state or "").upper().strip()
    
    if lvl == "district" and dist_clean:
        ds = [str(d).lower().strip() for d in (c.get("districts") or [])]
        if any(dist_clean in d or d in dist_clean for d in ds):
            return 3
    if lvl == "state" and state_clean:
        cs = (c.get("state") or "").upper().strip()
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
        cs = (c.get("state") or "").upper().strip()
        return (not cs) or (not state) or cs == (state or "").upper().strip()
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
    ad["impressions"] = int(ad.get("impressions", 0)) + 1
    _persist()
    return {"ok": True, "ad": {k: ad.get(k) for k in
            ("id", "vendor_id", "title", "offer", "image_url", "banner_url", "video_url", "link",
             "phone", "whatsapp", "category", "level", "districts", "state")}}


def serve_list(slot: str = "matches_sidebar", district: str = "", state: str = "", limit: int = 3) -> Dict:
    """Returns multiple targeted ads matching district and state."""
    cands = [c for c in CAMPAIGNS if (not slot or slot in (c.get("slots") or [])) and _is_live(c)
             and _scope_ok(c, district or "", state or "")]
    if not cands:
        return {"ok": False, "ads": [], "count": 0}
    cands.sort(key=lambda x: (-_scope_priority(x, district, state), x.get("impressions", 0), x.get("id", "")))
    chosen = cands[:limit]
    for ad in chosen:
        ad["impressions"] = int(ad.get("impressions", 0)) + 1
    _persist()
    return {
        "ok": True,
        "count": len(chosen),
        "ads": [{k: a.get(k) for k in ("id", "vendor_id", "title", "offer", "image_url", "banner_url",
                                      "video_url", "link", "phone", "whatsapp", "category", "level",
                                      "districts", "state")} for a in chosen]
    }


def track_click(cid: str) -> Dict:
    c = get_campaign(cid)
    if not c:
        return {"ok": False}
    c["clicks"] = int(c.get("clicks", 0)) + 1
    _persist()
    return {"ok": True, "clicks": c["clicks"]}


def track_lead(cid: str) -> Dict:
    c = get_campaign(cid)
    if not c:
        return {"ok": False}
    c["leads"] = int(c.get("leads", 0)) + 1
    _persist()
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
