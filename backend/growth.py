"""
MANA VIVAHA — GROWTH ENGINE
===========================
1) 🙏 NAMASTE WELCOME TEXT — prepared for the registrant; WhatsApp is queued only when explicitly configured:
   • user ki: "నమస్తే <name> గారు! 🙏" + profile card + next steps
   • admin/matcher ki: kotha registration alert (follow-up cheyyadaniki)
2) 📊 VISITOR + LEAD CAPTURE — bounded, process-local analytics
   • visit paths/referrers/device categories use a salted pseudonymous ID; raw IP and user-agent are not stored in each event
   • events expire after 30 days, are capped at 10,000, and are cleared when the process restarts
   • Contact requests enter DB_LEADS; a WhatsApp follow-up is allowed only with recorded opt-in
   • profile views DB_VIEWS lo (already main.py lo) — ikkada who-viewed summary
3) 🎴 SHARE KIT — "ఒక profile చాలా మంది chudalanukune la" — status-ready image + text + hashtags

Chatting ledu — interest request + WhatsApp profile share model ki todu.
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Tuple
import hashlib
import hmac
import os
import random
import re
import threading

SITE = os.getenv("PUBLIC_SITE_URL", "https://manavivaha.in").rstrip("/")
BOT_USERNAME = os.getenv("BOT_USERNAME", "").strip()
SUPPORT_PHONE = os.getenv("SUPPORT_PHONE", "").strip()

DB_VISITORS: List[Dict] = []   # Process-local event records: {vid, at, path, ref, utm, device, channel}
MAX_VISITOR_EVENTS = 10_000
VISITOR_RETENTION_DAYS = 30
VISITOR_PRUNE_INTERVAL_SECONDS = 60
_VISITOR_ID_SALT = os.urandom(32)
_VISITOR_LOCK = threading.Lock()
_LAST_VISITOR_PRUNE_AT = datetime.utcnow()
DB_LEADS: List[Dict] = []      # {id, at, name, phone, gender, age, district, caste, source, status, notes}


# ---------------------------------------------------------------------------
# 1) 🙏 NAMASTE WELCOME + ADMIN ALERT
# ---------------------------------------------------------------------------
def namaste_text(user: Dict, tsap_id: str) -> str:
    """
    Register ayina ventane user ki velle NAMASTE message —
    card + full details + next steps (chatting ledu ani clear ga).
    """
    u = user or {}
    return (
        f"🙏 *నమస్తే {u.get('full_name', 'గారు')} గారు!* 🙏\n"
        f"*మన వివాహ* కుటుంబంలోకి మీకు స్వాగతం 💐\n"
        f"━━━━━━━━━━━━━━━━\n"
        f"✅ మీ profile ready: *{tsap_id}*\n"
        f"━━━━━━━━━━━━━━━━\n"
        f"👤 {u.get('full_name', '—')} ({u.get('age', '—')} yrs)\n"
        f"💍 {u.get('caste', '—')}{(' / ' + u['sub_caste']) if u.get('sub_caste') else ''} | గోత్రం: {u.get('gothram', '—')}\n"
        f"🌟 Star / రాశి (member-entered; verified chart కాదు): {u.get('star', '—')} | {u.get('rasi', '—')}\n"
        f"📏 Height: {u.get('height', '—')} | 🩸 {u.get('blood_group', '—') or '—'}\n"
        f"🎓 {u.get('education', '—')} {u.get('education_detail', '')}\n"
        f"💼 {u.get('job', '—')} {u.get('company', '')} | 💰 {u.get('salary', '—')}\n"
        f"📍 {u.get('district', '—')}, {u.get('state', 'TS')}\n"
        f"👨‍👩‍👧 {u.get('family_type', '—')} • {u.get('family_status', '—')}\n"
        f"━━━━━━━━━━━━━━━━\n"
        f"📢 Profile publication depends on approval, publisher configuration and destination access; delivery and reach are not guaranteed.\n"
        f"━━━━━━━━━━━━━━━━\n"
        f"*ఇప్పుడు ఏం చేయవచ్చు?*\n"
        f"1️⃣ మీ profile వివరాలు మరియు privacy settings పరిశీలించండి.\n"
        f"2️⃣ Matches చూసి 💌 *Interest request* పంపండి — credits/plan మీ account లో కనిపిస్తాయి.\n"
        f"3️⃣ మీ Profile ID share చేయండి: {tsap_id}\n"
        f"━━━━━━━━━━━━━━━━\n"
        f"🔒 Contact sharing follows the interest/consent flow and profile settings; independently verify details before proceeding.\n"
        f"🚫 In-site chat లేదు; external contact తర్వాత spam లేదా unwanted messages జరగవని హామీ లేదు.\n"
        f"{'🤖 Bot: ' + BOT_USERNAME + ' | ' if BOT_USERNAME else ''}🔍 మీ profile: {SITE}/search/{tsap_id}\n"
        + (f"❓ Configured support contact: {SUPPORT_PHONE}" if SUPPORT_PHONE else "")
    )


def admin_new_profile_text(user: Dict, tsap_id: str, source: str = "website") -> str:
    """Admin/matcher alert for review; it does not imply verification or follow-up timing."""
    u = user or {}
    return (
        f"🆕 *NEW REGISTRATION* ({source})\n"
        f"🆔 {tsap_id} — {u.get('gender', '—')}\n"
        f"👤 {u.get('full_name', '—')} • {u.get('age', '—')}y • {u.get('caste', '—')}\n"
        f"📍 {u.get('district', '—')}, {u.get('state', 'TS')} • 🎓 {u.get('education', '—')} • 💼 {u.get('job', '—')}\n"
        f"📞 {u.get('phone', '—')} {'✅ Phone OTP recorded' if u.get('phone_verified') else '⚠️ Phone OTP not recorded'}\n"
        f"📸 photo: {'ఉంది' if u.get('photo_urls') else 'లేదు — అడగండి'}\n"
        f"🎴 Card: {SITE}/cards/{tsap_id}.png\n"
        f"👉 Review registration details, requested contact consent, photo status, and configured destinations before action."
    )


def lead_followup_text(lead: Dict) -> str:
    """One opt-in registration-assistance follow-up; no timing or outcome promise."""
    l = lead or {}
    return (
        f"🙏 నమస్తే {l.get('name', 'గారు')} గారు!\n"
        f"మీరు Mana Vivaha registration assistance కోసం follow-up కోరారు.\n"
        f"మీకు అనుకూలమైనప్పుడు profile ప్రారంభించండి లేదా పూర్తి చేయండి: {SITE}/register\n"
        f"మొదటి 3 interest requests ఉచితం. Profile details సభ్యులు అందించినవి; స్వతంత్రంగా పరిశీలించండి.\n"
        f"🔒 Public profile లో contact details చూపించము. Profile owner accept చేసిన తర్వాత accepted-request account views లో contact access వస్తుంది; notification delivery హామీ లేదు.\n"
        f"🚫 In-site chat లేదు. ఈ సందేశం మీ అభ్యర్థించిన registration సహాయం కోసం మాత్రమే."
    )


# ---------------------------------------------------------------------------
# 2) 📊 VISITOR + LEAD CAPTURE
# ---------------------------------------------------------------------------
def _vid(ip: str, ua: str) -> str:
    """Process-local pseudonym: link visits briefly without storing raw IP or user-agent."""
    material = (str(ip) + "|" + str(ua)[:120]).encode("utf-8", "replace")
    return "V" + hmac.new(_VISITOR_ID_SALT, material, hashlib.sha256).hexdigest()[:14]


def _safe_path(raw: str) -> str:
    path = str(raw or "/").split("?", 1)[0].split("#", 1)[0][:160]
    if (not path.startswith("/") or path.startswith("//") or chr(92) in path
            or "@" in path or re.search(r"\d{8,}", path)):
        return "/"
    return path


def _safe_referrer(raw: str) -> str:
    """Keep only an HTTP(S) origin; discard paths, queries, fragments and credentials."""
    try:
        from urllib.parse import urlsplit
        parsed = urlsplit(str(raw or "")[:512])
        if parsed.scheme.lower() not in {"http", "https"} or not parsed.hostname:
            return ""
        if parsed.username or parsed.password:
            return ""
        host = parsed.hostname.lower()
        port = parsed.port
        if port and not ((parsed.scheme.lower() == "http" and port == 80)
                         or (parsed.scheme.lower() == "https" and port == 443)):
            host = f"{host}:{port}"
        return f"{parsed.scheme.lower()}://{host}"[:160]
    except (TypeError, ValueError):
        return ""


def _safe_utm(raw: str) -> str:
    """Retain only short standard campaign labels; exclude free-form query data."""
    from urllib.parse import parse_qsl, quote_plus

    allowed = {"utm_source", "utm_medium", "utm_campaign", "utm_content"}
    output = []
    try:
        pairs = parse_qsl(str(raw or "")[:1024], keep_blank_values=False, max_num_fields=32)
    except (TypeError, ValueError):
        return ""
    for key, value in pairs:
        key = key.strip().lower()
        if key not in allowed:
            continue
        value = value.strip()
        if "@" in value or re.search(r"\d{8,}", value):
            continue
        value = re.sub(r"[^A-Za-z0-9_. -]", "", value)[:48].strip()
        if value:
            output.append(f"{key}={quote_plus(value)}")
    return "&".join(output)[:160]


def _prune_visitor_events_locked(now: datetime) -> None:
    global _LAST_VISITOR_PRUNE_AT
    if (len(DB_VISITORS) <= MAX_VISITOR_EVENTS
            and (now - _LAST_VISITOR_PRUNE_AT).total_seconds() < VISITOR_PRUNE_INTERVAL_SECONDS):
        return
    cutoff = now - timedelta(days=VISITOR_RETENTION_DAYS)
    retained = []
    for event in DB_VISITORS:
        try:
            recorded_at = datetime.fromisoformat(str(event.get("at", "")))
            if recorded_at.tzinfo is not None:
                recorded_at = recorded_at.astimezone(timezone.utc).replace(tzinfo=None)
            if recorded_at >= cutoff:
                retained.append(event)
        except (TypeError, ValueError):
            continue
    DB_VISITORS[:] = retained[-MAX_VISITOR_EVENTS:]
    _LAST_VISITOR_PRUNE_AT = now


def track_visit(ip: str, ua: str, path: str, ref: str = "", utm: str = "",
                device: str = "", extra: Optional[Dict] = None) -> Dict:
    """Record bounded, short-lived aggregate analytics without storing raw IP or user-agent."""
    now = datetime.utcnow()
    safe_ref = _safe_referrer(ref)
    safe_path = _safe_path(path)
    safe_utm = _safe_utm(utm)
    d = "mobile" if device == "mobile" else ("desktop" if device == "desktop" else ("mobile" if _is_mobile(ua) else "desktop"))
    rec = {
        "vid": _vid(ip, ua), "at": now.isoformat(), "path": safe_path,
        "ref": safe_ref, "utm": safe_utm, "device": d,
        "channel": _channel_of(safe_ref, safe_utm),
    }
    if isinstance(extra, dict):
        screen = str(extra.get("screen", ""))[:16]
        language = str(extra.get("lang", "")).strip().lower()
        if re.fullmatch(r"\d{2,4}x\d{2,4}", screen):
            rec["screen"] = screen
        if language in {"te", "te-in", "en", "en-in"}:
            rec["lang"] = language
        try:
            seconds = int(extra.get("seconds", ""))
            if 0 <= seconds <= 86_400:
                rec["seconds"] = seconds
        except (TypeError, ValueError):
            pass
    with _VISITOR_LOCK:
        DB_VISITORS.append(rec)
        _prune_visitor_events_locked(now)
    return rec


def _is_mobile(ua: str) -> bool:
    ua = (ua or "").lower()
    return any(k in ua for k in ("android", "iphone", "ipad", "mobile", "oppo", "vivo", "redmi", "samsung"))


def _channel_of(ref: str, utm: str) -> str:
    s = (str(ref) + " " + str(utm)).lower()
    if "whatsapp" in s or "wa.me" in s:
        return "whatsapp"
    if "t.me" in s or "telegram" in s:
        return "telegram"
    if "google" in s:
        return "google"
    if "facebook" in s or "fb." in s:
        return "facebook"
    if "instagram" in s:
        return "instagram"
    if "youtube" in s:
        return "youtube"
    if "share" in s:
        return "share_link"
    return "direct"


def save_lead(name: str, phone: str, gender: str = "", district: str = "", caste: str = "",
              age: str = "", source: str = "website", notes: str = "",
              contact_consent: bool = False) -> Tuple[bool, str, Dict]:
    """Save a submitted lead; contact is allowed only when explicit consent is recorded."""
    phone = "".join(ch for ch in str(phone) if ch.isdigit())[-10:]
    if len(phone) != 10:
        return False, "10 digit mobile number ఇవ్వండి", {}
    existing = next((l for l in DB_LEADS if l["phone"] == phone), None)
    if existing:
        existing.update({"name": name or existing.get("name", ""), "gender": gender or existing.get("gender", ""),
                         "district": district or existing.get("district", ""), "caste": caste or existing.get("caste", ""),
                         "age": str(age) if age else existing.get("age", ""),
                         "source": source or existing.get("source", ""),
                         "notes": notes or existing.get("notes", ""),
                         "updated_at": datetime.utcnow().isoformat(), "touches": int(existing.get("touches", 1)) + 1})
        if contact_consent:
            existing["contact_consent"] = True
            existing["contact_consent_at"] = datetime.utcnow().isoformat()
            existing["contact_consent_scope"] = "registration_assistance_only"
        return True, "already_lead", existing
    lead = {
        "id": "LEAD-" + datetime.utcnow().strftime("%y%m%d") + "-" + str(len(DB_LEADS) + 1).zfill(4),
        "at": datetime.utcnow().isoformat(), "name": name, "phone": phone, "gender": gender,
        "district": district, "caste": caste, "age": str(age), "source": source, "notes": notes,
        "status": "new", "touches": 1,
        "contact_consent": bool(contact_consent),
        "contact_consent_at": datetime.utcnow().isoformat() if contact_consent else "",
        "contact_consent_scope": "registration_assistance_only" if contact_consent else "",
        "followup": "not_queued",
    }
    DB_LEADS.append(lead)
    return True, "new_lead", lead


def lead_stats() -> Dict:
    by_source: Dict[str, int] = {}
    by_day: Dict[str, int] = {}
    by_channel: Dict[str, int] = {}
    by_path: Dict[str, int] = {}
    for v in DB_VISITORS:
        by_source[v.get("source", "website") if v.get("source") else "website"] = by_source.get(
            v.get("source", "website") if v.get("source") else "website", 0) + 1
        by_day[v["at"][:10]] = by_day.get(v["at"][:10], 0) + 1
        by_channel[v.get("channel", "direct")] = by_channel.get(v.get("channel", "direct"), 0) + 1
        by_path[v.get("path", "/")] = by_path.get(v.get("path", "/"), 0) + 1
    top_paths = sorted(by_path.items(), key=lambda x: -x[1])[:10]
    new_leads = [l for l in DB_LEADS if l.get("status") == "new"]
    return {
        "visits_total": len(DB_VISITORS),
        "visitors_unique": len({v["vid"] for v in DB_VISITORS}),
        "visits_today": len([v for v in DB_VISITORS if v["at"][:10] == datetime.utcnow().strftime("%Y-%m-%d")]),
        "by_channel": by_channel, "by_day": by_day,
        "top_paths": [{"path": p, "visits": n} for p, n in top_paths],
        "leads_total": len(DB_LEADS), "leads_new": len(new_leads),
        "leads_by_source": _count_by(DB_LEADS, "source"), "leads_by_district": _count_by(DB_LEADS, "district"),
        "conversion": (round(len(DB_LEADS) / max(1, len({v['vid'] for v in DB_VISITORS})) * 100, 1)),
        "message_telugu": "%d visits (%d unique) • %d leads • %s" % (
            len(DB_VISITORS), len({v["vid"] for v in DB_VISITORS}), len(DB_LEADS),
            "ee రోజు కొత్త leads: %d" % len([l for l in DB_LEADS if l["at"][:10] == datetime.utcnow().strftime("%Y-%m-%d")])),
    }


def _count_by(rows: List[Dict], key: str) -> Dict[str, int]:
    out: Dict[str, int] = {}
    for r in rows:
        k = r.get(key) or "—"
        out[k] = out.get(k, 0) + 1
    return dict(sorted(out.items(), key=lambda x: -x[1])[:12])


def leads_list(status: str = "", limit: int = 100) -> Dict:
    rows = DB_LEADS if not status else [l for l in DB_LEADS if l.get("status") == status]
    hot = sorted(rows, key=lambda x: (-int(x.get("touches", 1)), x["at"]), reverse=False)[:limit]
    return {"total": len(rows), "items": hot,
            "message_telugu": "కొత్త leads కు వీలైనప్పుడు త్వరగా follow-up చేయండి; response సమయం వ్యక్తిని బట్టి మారుతుంది, హామీ లేదు."}


# ---------------------------------------------------------------------------
# 3) 🎴 SHARE KIT (member-directed sharing; no reach claim)
# ---------------------------------------------------------------------------
def share_kit(user: Dict, tsap_id: str, hashtags: Optional[List[str]] = None) -> Dict:
    """
    Member-directed share text and platform share URLs; no audience or delivery is claimed.
    """
    u = user or {}
    name = u.get("full_name", "Profile")
    tags = hashtags or ["#ManaVivaha", "#TeluguMatrimony", "#" + str(u.get("caste", "Telugu")).replace(" ", ""),
                        "#" + str(u.get("district", "TS")).replace(" ", ""), "#PelliChoopulu"]
    caption = (
        f"💍 *{name}* — {u.get('age', '—')} yrs | {u.get('caste', '—')} | {u.get('district', '—')}, {u.get('state', 'TS')}\n"
        f"🎓 {u.get('education', '—')} {u.get('job', '')} | 💰 {u.get('salary', '—')}\n"
        f"🌟 {u.get('star', '—')} / {u.get('rasi', '—')} (member-entered; not a verified chart) | 🕉️ {u.get('gothram', '—')}\n"
        f"🆔 *{tsap_id}*\n"
        f"🔍 Details: {SITE}/search/{tsap_id}\n"
        f"📝 Mee profile FREE ga pettu: {SITE}/register\n"
        f"{' '.join(tags)}"
    )
    return {
        "tsap_id": tsap_id,
        "card_image": f"{SITE}/cards/{tsap_id}.png",
        "caption": caption,
        "caption_short": f"💍 {name} | {u.get('age', '—')}y | {u.get('caste', '—')} | {u.get('district', '—')}\n🆔 {tsap_id} | {SITE}/search/{tsap_id}",
        "hashtags": tags,
        "whatsapp_share": "https://wa.me/?text=" + _url(caption),
        "telegram_share": "https://t.me/share/url?url=" + _url(f"{SITE}/search/{tsap_id}") + "&text=" + _url(caption),
        "tips_telugu": [
            "Card image ను మీకు అనుకూలమైన WhatsApp status లేదా group లో share చేయండి; reach/views audience పై ఆధారపడి ఉంటాయి.",
            "Family WhatsApp groups లో caption + link పంపండి; share చేసే ముందు profile owner consent ఉందని నిర్ధారించండి.",
            "Caste + district group admin అనుమతి తీసుకుని మాత్రమే link పంపండి.",
        ],
    }


def _url(s: str) -> str:
    from urllib.parse import quote
    return quote(s, safe="")


# ---------------------------------------------------------------------------
# Member inventory aggregate — factual count only; no synthetic launch target.
# ---------------------------------------------------------------------------
def inventory_status(total_users: int) -> Dict:
    try:
        count = max(0, int(total_users or 0))
    except (TypeError, ValueError):
        count = 0
    return {"total_profiles": count}


def expire_old_requests(requests: List[Dict], days: int = 7) -> int:
    """7 days లో reply lekapothe request expire (credits user కే migilipothayi అని notify)."""
    now = datetime.utcnow()
    n = 0
    for r in requests:
        if r.get("status") != "pending":
            continue
        try:
            created = datetime.fromisoformat(r.get("at") or r.get("created_at"))
        except Exception:
            continue
        if now - created > timedelta(days=days):
            r["status"] = "expired"
            r["expired_at"] = now.isoformat()
            n += 1
    return n
