"""
🎁 WELCOME PACK — "register avvagane 3 profiles + caste channel links WhatsApp కి"
===============================================================================
User adigindi (Telugu):
  "registration avvagane elaga vadi whatsapp ki 3 profiles vellai, mana channel links
   vadi caste channels — telegram and whatsapp channels — vadi caste related"

Ee module lo:
  • up to 3 approved profiles for independent review (numbers 🔒 — links only)
  • caste / region / religion / official channel links (Telegram + WhatsApp) build cheyyadam
  • okate function: build_welcome_pack(user, tsap_id, matches) → dict (API + queue rendu vaadutayi)

RULES (user privacy policy — marchakoodadu):
  🔒 Phone numbers eppudu message lo pettamu (98••••••45 mask matrame)
  🔗 Profile link (manavivaha.in/search/TSAP-...) + channel links matrame
  🚫 Max 3 profiles (FREE policy), 5 channel links (spam taggadaniki)
"""
from __future__ import annotations

import os
import re
from typing import Any, Dict, List, Optional

from channels_config import SITE, caste_channel_links, channel_links, CHANNELS, is_public_channel
from interest import EXPIRY_DAYS, PLANS, REFUND_ON_DECLINE


# --------------------------------------------------------------------------- #
# 1. PROFILE LINE (safe — phone/email lekunda)
# --------------------------------------------------------------------------- #
def safe_profile_summary(p: Dict[str, Any]) -> Dict[str, Any]:
    """Match profile నుంచి WhatsApp/website కి pani చేసే safe fields మాత్రమే."""
    p = p or {}
    tsap_id = str(p.get("tsap_id", ""))
    verification = (
        "Government ID reviewed" if p.get("id_verified") else
        "Photo reviewed" if p.get("selfie_verified") or p.get("photo_status") == "approved" else
        "Phone OTP checked" if p.get("phone_verified") else ""
    )
    first_name = str(p.get("full_name") or "").strip().split()
    return {
        "tsap_id": tsap_id,
        "name": first_name[0] if first_name else "—",
        "age": p.get("age", ""),
        "gender": p.get("gender", ""),
        "height": p.get("height", ""),
        "caste": p.get("caste", ""),
        "sub_caste": p.get("sub_caste", ""),
        "education": p.get("education", ""),
        "job": str(p.get("job", "") or ""),
        "company": str(p.get("company", "") or ""),
        "salary": str(p.get("salary", "") or ""),
        "district": p.get("district", ""),
        "state": p.get("state", ""),
        "star": p.get("star", ""),
        "rasi": p.get("rasi", ""),
        "astrology_note": "Member-entered reference only; not a verified horoscope.",
        "verification": verification,
        "photo_private": bool(p.get("photo_private") or p.get("privacy_mode") == "private"),
        "phone_masked": str(p.get("phone_masked", "") or ""),
        "link": f"{SITE}/search/{tsap_id}" if tsap_id else SITE,
    }


def profile_line(idx: int, prof: Dict[str, Any]) -> str:
    """One member-provided profile summary for independent review; no score/reason is shown."""
    emoji = ["1️⃣", "2️⃣", "3️⃣"][idx] if idx < 3 else "•"
    name = str(prof.get("name") or "Profile")
    age = prof.get("age")
    title = f"{emoji} *{name}*" + (f" — {age} yrs" if age not in (None, "", "—") else "")
    details = [str(value) for value in (prof.get("caste"), prof.get("district"),
                                         prof.get("education"), prof.get("job")) if value]
    line = title + ("\n     " + " • ".join(details) if details else "")
    extra = []
    if prof.get("verification"):
        extra.append(str(prof["verification"]))
    if prof.get("star"):
        extra.append(f"Star (optional): {prof['star']}")
    if extra:
        line += f"\n     {' • '.join(extra)}"
    line += f"\n     🔗 {prof.get('link', SITE)}  (ID: {prof.get('tsap_id', '—')})"
    return line


# --------------------------------------------------------------------------- #
# 2. CHANNEL LINKS BLOCK (caste channels — telegram + whatsapp)
# --------------------------------------------------------------------------- #
def channel_line(link: Dict[str, Any], why: str = "") -> str:
    name = link.get("name", link.get("key", ""))
    tg = link.get("telegram", "")
    wa = link.get("whatsapp", "")
    out = f"• *{name}*"
    if why:
        out += f" — {why}"
    row = []
    if tg:
        row.append(f"✈️ Telegram: {tg}")
    if wa:
        row.append(f"🟢 WhatsApp: {wa}")
    if row:
        out += "\n     " + " | ".join(row)
    else:
        out += "\n     No destination is configured for this channel."
    return out


def channels_text(links: List[Dict[str, Any]], why_map: Optional[Dict[str, str]] = None) -> str:
    why_map = why_map or {}
    if not links:
        return ""
    lines = [channel_line(l, why_map.get(l.get("key", ""), "")) for l in links]
    return ("📢 *మీకు సంబంధించిన channel directory links* 👇\n"
            "లింకుల external availability ఆటోమేటిక్‌గా తనిఖీ చేయబడదు; delivery లేదా daily posts హామీ కాదు.\n" +
            "\n".join(lines))


def support_note() -> str:
    """Use a normalized support number only; invalid/missing values do not create a broken URL."""
    raw = os.getenv("SUPPORT_WHATSAPP", "") or os.getenv("SUPPORT_WHATSAPP_NUMBER", "")
    digits = re.sub(r"\D", "", str(raw or ""))
    if len(digits) == 10:
        digits = "91" + digits
    if re.fullmatch(r"[1-9]\d{7,14}", digits):
        return f"📱 WhatsApp channel link కావాలంటే support కి 'CHANNEL' అని ping చెయ్యండి: https://wa.me/{digits}"
    return f"📱 WhatsApp support number is not configured; use {SITE}/safety for current contact options."


# --------------------------------------------------------------------------- #
# 3. MASTER BUILDER
# --------------------------------------------------------------------------- #
def build_welcome_pack(user: Dict[str, Any], tsap_id: str, matches: List[Dict[str, Any]],
                       max_profiles: int = 3, max_channels: int = 5,
                       directory_links: Dict[str, Dict[str, Any]] | None = None) -> Dict[str, Any]:
    """
    🎁 Full welcome pack:
      profiles  : up to 3 available member profiles (safe summary — no contact fields)
      channels  : caste → region → (religion) → official (telegram + whatsapp links)
      message   : WhatsApp lo velle Telugu message (numbers ledu)
    """
    user = user or {}
    profs: List[Dict[str, Any]] = []
    for m in (matches or [])[:max_profiles]:
        row = dict(m or {})
        cand = row.get("profile") or row.get("user") or row
        s = safe_profile_summary(cand)
        profs.append(s)

    chans = caste_channel_links(user, limit=max_channels, directory_links=directory_links)
    why = {}
    try:
        from channels_config import route_profile
        why = {r.get("key"): r.get("telugu", "") for r in (route_profile(user, max_posts=6).get("reasons") or [])}
    except Exception:
        why = {}

    _n = len(profs)
    count_label = f"{_n} profile{'s' if _n != 1 else ''} to review" if _n else "No profiles available yet"
    member_name = str(user.get("full_name") or "").strip().split()
    greeting = f" {member_name[0]} గారు" if member_name else ""
    community = str(user.get("caste") or "").strip()
    sub_community = str(user.get("sub_caste") or "").strip()
    district = str(user.get("district") or "").strip()
    state = str(user.get("state") or "").strip()
    location = ", ".join(part for part in (district, state) if part)
    free_requests = int(PLANS.get("FREE", {}).get("profiles", 0) or 0)
    entry_plan = PLANS.get("S_99", {})
    expiry_policy = (
        f"On decline or {EXPIRY_DAYS}-day expiry, one request credit is returned once (not a cash refund)."
        if REFUND_ON_DECLINE else
        f"Declined requests do not return a credit; on {EXPIRY_DAYS}-day expiry, one request credit is returned once (not a cash refund)."
    )
    profile_identity = f"💍 {community}" if community else ""
    if sub_community:
        profile_identity += f" / {sub_community}"
    if location:
        profile_identity += f" | 📍 {location}"
    head = (
        f"🎉 *Mana Vivaha —{greeting} {count_label}* 🎉\n"
        f"🆔 *{tsap_id}*" + (f" | {profile_identity}" if profile_identity else "") + "\n"
        f"━━━━━━━━━━━━━━━━"
    )
    body_parts = [head]
    if profs:
        body_parts.append(
            f"🔎 *{_n} profile{'s' if _n != 1 else ''} to review* (details are member-provided; contact access appears in accepted-request account views after owner acceptance):\n" +
            "\n".join(profile_line(i, p) for i, p in enumerate(profs))
        )
    else:
        body_parts.append(f"🔎 No approved candidate profiles are available right now. Open {SITE}/matches to search with filters.")
    body_parts.append(f"✅ Interest request: 1 credit each. The first {free_requests} requests are free. {expiry_policy}")
    body_parts.append(f"💳 Paid request packs start at ₹{entry_plan.get('price', 99)} for {entry_plan.get('profiles', 5)} interest requests. Check /requests for current features and terms.")
    if chans:
        body_parts.append(channels_text(chans, why))
    body_parts.append(support_note())
    message = "\n\n".join([p for p in body_parts if p])

    return {
        "tsap_id": tsap_id,
        "profiles": profs,
        "channels": chans,
        "message_text": message,
        "message_preview": message[:2600],   # channels block kooda preview lo kanipinchali
        "rules_telugu": [
            "🔒 Public profile లో contact details చూపించము; owner accept చేసిన తర్వాత accepted-request account views లో వస్తాయి. Paid credits consent‌ను దాటవేయవు.",
            f"🆓 మొదటి {free_requests} interest requests free. {expiry_policy}",
            f"💰 Paid request packs ₹{entry_plan.get('price', 99)} నుంచి ప్రారంభమవుతాయి; features/terms కోసం /requests చూడండి.",
            "📢 Channel directory links మాత్రమే; external link availability లేదా delivery హామీ లేదు.",
        ],
        "has_numbers": False,
    }


def pack_public(pack: Dict[str, Any]) -> Dict[str, Any]:
    """API response కి — message text + profiles + channels (sensitive లేదు, number masked)."""
    if not pack:
        return {}
    return {k: v for k, v in pack.items() if k != "has_numbers"}


def channels_count(directory_links: Dict[str, Dict[str, Any]] | None = None) -> Dict[str, Any]:
    """Count visible directory URLs only; this does not check external availability."""
    tg = wa = 0
    public_keys = [key for key in CHANNELS if is_public_channel(key)]
    for key in public_keys:
        links = channel_links(key) if directory_links is None else directory_links.get(key, {})
        tg += 1 if links.get("telegram") else 0
        wa += 1 if links.get("whatsapp") else 0
    return {
        "channels": len(public_keys),
        "telegram_links_configured": tg,
        "whatsapp_links_configured": wa,
        "external_status_checked": False,
    }
