"""
📡 WAVE 15 — CHANNEL MAPPER (admin: links + bulk import + coverage)
====================================================================
Owner-configured Telegram/WhatsApp links are mapped by registry key; URL shape does not prove availability:
  • effective(): CHANNELS + admin overrides (telegram/whatsapp links, active, note)
  • set_link(): per-channel links edit (URL validate)
  • import_bulk(): paste list (`label | tg-link | wa-link`) → fuzzy match → 1-click apply
  • coverage(): tier-wise routing-eligibility counts + critical config gaps (not external health)
Overrides chanmap15.json lo persist (base CHANNELS code ni touch cheyyamu).
"""
from __future__ import annotations

import json
import os
import re
from datetime import datetime
from difflib import SequenceMatcher
from typing import Dict, List

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PERSIST_FILE = os.environ.get("MANA_VIVAHA_CHANMAP_FILE", os.path.join(BASE_DIR, "chanmap15.json"))

OVERRIDES: Dict[str, Dict] = {}


def _now() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")


def _persist() -> None:
    try:
        with open(PERSIST_FILE, "w", encoding="utf-8") as f:
            json.dump(OVERRIDES, f, ensure_ascii=False)
    except Exception:
        pass


def _restore() -> None:
    try:
        if os.path.exists(PERSIST_FILE):
            d = json.load(open(PERSIST_FILE, encoding="utf-8")) or {}
            OVERRIDES.update(d if isinstance(d, dict) else {})
    except Exception:
        pass


_restore()

def _valid_telegram_url(value: str) -> bool:
    try:
        from urllib.parse import urlparse
        url = urlparse(str(value or "").strip())
        if url.scheme.lower() != "https" or url.username or url.password or url.port:
            return False
        host = (url.hostname or "").lower().rstrip(".")
        path = url.path.strip("/")
        if host not in {"t.me", "telegram.me"}:
            return False
        return bool(re.fullmatch(
            r"(?:[A-Za-z0-9_]{5,32}|\+[A-Za-z0-9_-]{6,128}|joinchat/[A-Za-z0-9_-]{6,128}|c/\d+/\d+)",
            path,
        ))
    except (TypeError, ValueError):
        return False


def _valid_whatsapp_url(value: str) -> bool:
    try:
        from channels_config import _valid_whatsapp_url as valid
        return valid(value)
    except Exception:
        return False


def _channels():
    from channels_config import CHANNELS  # lazy (import-time weight thagginchataniki)
    return CHANNELS


def _base_links(key: str) -> Dict:
    from channels_config import channel_links
    return channel_links(key)


def effective() -> List[Dict]:
    """అన్నీ channels + admin links merged (admin table + public links కి)."""
    from channels_config import _routing_is_explicit
    out = []
    for key, c in _channels().items():
        o = OVERRIDES.get(key, {})
        configured = _base_links(key)
        # Only explicitly configured public destinations appear; usernames are not
        # converted into guessed invite URLs. Syntax does not prove availability.
        tg = str(o.get("telegram_link") if "telegram_link" in o else configured.get("telegram", "") or "").strip()
        if tg and not _valid_telegram_url(tg):
            tg = ""
        whatsapp = str(o.get("whatsapp_link") if "whatsapp_link" in o else configured.get("whatsapp", "") or "").strip()
        if whatsapp and not _valid_whatsapp_url(whatsapp):
            whatsapp = ""
        route = c.get("route", {}) or {}
        # Normalised audience metadata keeps the admin UI neat and avoids
        # guessing bride/groom from display names.
        gender = route.get("gender", "") if isinstance(route, dict) else ""
        state = route.get("state", "") if isinstance(route, dict) else ""
        cluster = c.get("cluster", "") or (route.get("cluster", "") if isinstance(route, dict) else "")
        audience = "both" if not gender else ("bride" if str(gender).lower() == "bride" else "groom")
        out.append({"key": key, "tier": c.get("tier", ""), "name": c.get("name", key),
                    "username": c.get("username", ""), "routing_eligible": _routing_is_explicit(c),
                    "external_status_checked": False,
                    "route": route, "gender": gender, "state": state, "cluster": cluster,
                    "category": c.get("category", ""), "members": list(c.get("members", []))[:40],
                    "audience": audience, "split_by_gender": bool(gender),
                    "desc": (c.get("desc", "") or "")[:200],
                    "telegram": tg, "whatsapp": whatsapp,
                    "active": o.get("active", True), "note": o.get("note", ""),
                    "customized": key in OVERRIDES})
    return out


def public_links() -> Dict[str, Dict]:
    """Public directory links from one backend source; URL syntax is checked, uptime is not."""
    result: Dict[str, Dict] = {}
    for entry in effective():
        if not entry["active"]:
            continue
        telegram = entry["telegram"]
        whatsapp = entry["whatsapp"]
        if telegram and not _valid_telegram_url(telegram):
            telegram = ""
        if whatsapp and not _valid_whatsapp_url(whatsapp):
            whatsapp = ""
        if telegram or whatsapp:
            result[entry["key"]] = {"telegram": telegram, "whatsapp": whatsapp}
    return result


def set_link(key: str, telegram_link: str = "", whatsapp_link: str = "",
             active: bool = True, note: str = "") -> Dict:
    key = str(key or "").strip()
    if key not in _channels():
        return {"success": False, "message_telugu": "⚠️ Channel key దొరకలేదు", "message_en": "The channel key was not found."}
    tg, wa = str(telegram_link or "").strip(), str(whatsapp_link or "").strip()
    for url, label, validator in (
        (tg, "Telegram", _valid_telegram_url),
        (wa, "WhatsApp", _valid_whatsapp_url),
    ):
        if url and len(url) > 300:
            return {"success": False, "message_telugu": f"⚠️ {label} link too long", "message_en": f"The {label} link is too long."}
        if url and not validator(url):
            return {"success": False, "message_telugu": f"⚠️ Valid HTTPS {label} channel/invite link ఇవ్వండి", "message_en": f"Enter a valid HTTPS {label} channel or invite link."}
    OVERRIDES[key] = {"telegram_link": tg, "whatsapp_link": wa, "active": bool(active),
                      "note": str(note or "").strip()[:200], "updated_at": _now()}
    _persist()
    return {"success": True, "channel": next(e for e in effective() if e["key"] == key),
            "message_telugu": f"✅ {key} links save అయ్యాయి", "message_en": f"Links saved for {key}. External availability is not verified."}


def _score(label: str, entry: Dict) -> float:
    """Fuzzy match score (0–1): name + username + key tokens."""
    lab = re.sub(r"[^a-z0-9 ]", " ", str(label or "").lower())
    hay = f"{entry.get('name','')} {entry.get('username','')} {entry.get('key','')}".lower()
    hay = re.sub(r"[^a-z0-9 ]", " ", hay)
    lt = [w for w in lab.split() if len(w) > 2]
    if not lt:
        return 0.0
    hit = sum(1 for w in lt if w in hay)
    base = hit / len(lt)
    seq = SequenceMatcher(None, lab, hay).ratio()
    return 0.7 * base + 0.3 * seq


def import_bulk(text: str, auto_apply: bool = False, threshold: float = 0.45) -> Dict:
    """
    Bulk paste parse:
      Label | https://t.me/xxx | https://whatsapp.com/channel/yyy
    (pipe/comma/tab split; 2nd col tg, 3rd col wa — order auto-detect kooda)
    → matched (score>=threshold) / unmatched. auto_apply → links save.
    """
    entries = effective()
    matched, unmatched, applied = [], [], []
    lines = [l.strip() for l in str(text or "").splitlines() if l.strip() and not l.strip().startswith("#")]
    if not lines:
        return {"success": False, "message_telugu": "⚠️ Lines లేవు — `Label | tg-link | wa-link` format లో paste చెయ్యండి",
                "message_en": "Paste at least one line in Label | Telegram link | WhatsApp link format."}
    if len(lines) > 200:
        return {"success": False, "message_telugu": "⚠️ ఒక్క సరి 200 lines max", "message_en": "Import up to 200 lines at a time."}
    for ln in lines[:200]:
        parts = [p.strip() for p in re.split(r"\s*\|\s*|\t", ln) if p.strip()]
        if len(parts) < 2:
            parts = [p.strip() for p in ln.split(",") if p.strip()]
        label, tg, wa = parts[0] if parts else ln, "", ""
        for p in parts[1:]:
            pl = p.lower()
            if "whatsapp" in pl or "wa.me" in pl:
                wa = wa or p
            elif "t.me" in pl or "telegram" in pl:
                tg = tg or p
            elif not tg:
                tg = p
            elif not wa:
                wa = p
        invalid = []
        if tg and not _valid_telegram_url(tg):
            invalid.append("Telegram URL must be a valid HTTPS t.me link")
        if wa and not _valid_whatsapp_url(wa):
            invalid.append("WhatsApp URL must be a valid HTTPS WhatsApp channel/invite link")
        if invalid:
            unmatched.append({"label": label, "telegram": tg, "whatsapp": wa,
                              "hint": "; ".join(invalid)})
            continue
        best, score = None, 0.0
        for e in entries:
            sc = _score(label, e)
            if sc > score:
                best, score = e, sc
        if best and score >= threshold and (tg or wa):
            row = {"label": label, "key": best["key"], "name": best["name"],
                   "score": round(score, 2), "telegram": tg, "whatsapp": wa}
            matched.append(row)
            if auto_apply:
                r = set_link(best["key"], tg or best["telegram"], wa or best["whatsapp"],
                             True, f"bulk import ({label[:60]})")
                if r.get("success"):
                    applied.append(best["key"])
        else:
            unmatched.append({"label": label, "telegram": tg, "whatsapp": wa,
                              "hint": f"best guess: {best['key']} ({round(score,2)})" if best else "no guess"})
    _persist()
    return {"success": True, "matched": matched, "unmatched": unmatched, "applied": applied,
            "message_telugu": f"✅ {len(matched)} match • {len(unmatched)} manual కావాలి" + (f" • {len(applied)} save" if auto_apply else ""),
            "message_en": f"{len(matched)} matched; {len(unmatched)} need manual review" + (f"; {len(applied)} saved" if auto_apply else "") + "."}


CRITICAL_KEYS = ["official", "ts_bride", "ts_groom", "ap_bride", "ap_groom", "nri_global",
                 "hindu", "muslim_bride", "christian_bride"]


def coverage() -> Dict:
    """Admin registry coverage; counts eligibility flags, not external channel health."""
    eff = effective()
    by_tier: Dict[str, Dict] = {}
    for entry in eff:
        tier = by_tier.setdefault(entry["tier"] or "?", {
            "total": 0, "routing_eligible": 0, "with_wa": 0,
            "inactive": 0, "pending_keys": [],
        })
        tier["total"] += 1
        if entry["routing_eligible"]:
            tier["routing_eligible"] += 1
        if entry["whatsapp"]:
            tier["with_wa"] += 1
        if not entry["active"]:
            tier["inactive"] += 1
        elif not entry["routing_eligible"] and len(tier["pending_keys"]) < 30:
            tier["pending_keys"].append(entry["key"])
    by_key = {entry["key"]: entry for entry in eff}
    gaps = [key for key in CRITICAL_KEYS if not (by_key.get(key) or {}).get("routing_eligible")]
    eligible = sum(1 for entry in eff if entry["routing_eligible"])
    return {
        "success": True,
        "total": len(eff),
        "routing_eligible": eligible,
        "with_whatsapp": sum(1 for entry in eff if entry["whatsapp"]),
        "customized": sum(1 for entry in eff if entry["customized"]),
        "by_tier": by_tier,
        "critical_gaps": gaps,
        "external_status_checked": False,
        "message_telugu": f"📡 {len(eff)} listings • {eligible} registry routing flags (external availability/permissions unchecked)"
                         + (f" • gaps: {', '.join(gaps)}" if gaps else ""),
    }
