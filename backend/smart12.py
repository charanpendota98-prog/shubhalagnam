"""
🔒 WAVE 12 — SMART REVEAL ENGINE (మన వివాహ)
==============================================
User demand (100% workable, top sites kanna advanced):

  1. Channel post lo NUMBER ❌ FULL-NAME ❌ SURNAME ❌ — masked teaser matrame.
  2. Credits are for interest requests; contact details require the profile owner's acceptance.
  3. ₹500 assisted service: admin panel lo buyer ID → approved profiles and explicit filters →
     select → 📩 Telegram / 💬 WhatsApp personal send; no compatibility score or perfect-match claim.
  4. STRICT consent gate: an accepted interest is required before any contact reveal.
  5. 📋 Copy-list: approved, member-provided profile summaries only; no contact details.

Design (emi break avvakunda):
  • Pure functions + in-memory stores (repo convention: DB_USERS lanti lists).
  • JSON persist (unlocks12.json) — restart ayina consent records/orders potavu.
  • Contact details are never included in assisted shortlist deliveries or copy-lists.
  • Full numbers are revealed only after an accepted interest through POST /api/unlock.
"""
from __future__ import annotations
from atomic_store import atomic_json_dump


import json
import copy
import os
import re
import threading
from collections import defaultdict
from datetime import datetime
from typing import Dict, List, Optional

# NOTE: channels_config import LAZY (cycle avoid) — functions lopala import.

PHONE_RE = re.compile(r"(?<![\d•])[6-9]\d{9}(?!\d)")

ASSISTED_PRICE = 500          # ₹500 assisted match service
ASSISTED_DEFAULT_COUNT = 5    # default ga 5 profiles personal ga

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PERSIST_FILE = os.environ.get("MANA_VIVAHA_SMART12_FILE", os.path.join(BASE_DIR, "unlocks12.json"))

# ---------------------------------------------------------------------------
# STORES (in-memory + JSON persist)
# ---------------------------------------------------------------------------
# viewer_id -> {target_id: consent-backed contact access metadata only.
# Assisted shortlists are orders, not contact entitlements.
UNLOCKS: Dict[str, Dict[str, Dict]] = {}
REVEAL_LOG: List[Dict] = []     # audit: evaru, e number, eppudu, ela
ORDERS: List[Dict] = []         # ₹500 assisted orders
_ORDER_SEQ = 0


def _now_iso() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S")


def _persist() -> bool:
    """Persist assisted-service state and report failure to callers."""
    try:
        atomic_json_dump(PERSIST_FILE, {"unlocks": UNLOCKS, "orders": ORDERS,
                                        "reveal_log": REVEAL_LOG[-500:]}, ensure_ascii=False)
        return True
    except Exception:
        return False


def _restore() -> None:
    global _ORDER_SEQ
    try:
        if not os.path.exists(PERSIST_FILE):
            return
        with open(PERSIST_FILE, encoding="utf-8") as f:
            data = json.load(f) or {}
        # Drop legacy assisted/admin-gift unlock entries: payment or staff action is not consent.
        restored = data.get("unlocks", {}) or {}
        for viewer_id, targets in restored.items():
            if not isinstance(targets, dict):
                continue
            clean_targets = {target_id: meta for target_id, meta in targets.items()
                             if isinstance(meta, dict) and meta.get("via") == "mutual_consent"}
            if clean_targets:
                UNLOCKS[str(viewer_id)] = clean_targets
        ORDERS.extend(data.get("orders", []))
        REVEAL_LOG.extend(data.get("reveal_log", []))
        for o in ORDERS:
            try:
                n = int(str(o.get("id", "ORD-0")).split("-")[-1])
                _ORDER_SEQ = max(_ORDER_SEQ, n)
            except Exception:
                pass
    except Exception:
        pass


_restore()

# ---------------------------------------------------------------------------
# 1. MASKING — name/surname/number public ga eppudu ledu
# ---------------------------------------------------------------------------

def mask_word(word: str) -> str:
    """Lakshmi → L•••••i · Raju → R•••u · T → T (too short, as-is)."""
    w = str(word or "").strip()
    if len(w) <= 2:
        return w
    return w[0] + "•" * (len(w) - 2) + w[-1]


def mask_name(full_name: str) -> str:
    """
    Full name + surname rendu mask:
      'Lakshmi Reddy' → 'L•••••i R•••y'
    Channel post / bot card / public search — anni chotla ide.
    """
    parts = str(full_name or "").strip().split()
    if not parts:
        return "—"
    return " ".join(mask_word(p) for p in parts)


def first_masked(full_name: str) -> str:
    """Copy-list personal DM కోసం: 'Lakshmi R.' — admin/paid mathrame."""
    parts = str(full_name or "").strip().split()
    if not parts:
        return "—"
    if len(parts) == 1:
        return parts[0]
    return f"{parts[0]} {parts[-1][0]}."


def mask_phone(phone: str) -> str:
    """Mask a supplied phone number consistently with interest.py."""
    d = "".join(ch for ch in str(phone or "") if ch.isdigit())
    if len(d) < 4:
        return "🔒 •••••"
    return d[:2] + "•" * max(0, len(d) - 4) + d[-2:]


def assert_no_leak(text: str) -> Dict:
    """Public text లో number leak check (tests + safety net)."""
    found = PHONE_RE.findall(text or "")
    return {"ok": not found, "leaked": found[:3]}


# ---------------------------------------------------------------------------
# 2. MASKED CHANNEL CAPTIONS (number ❌ name ❌ surname ❌)
# ---------------------------------------------------------------------------

def build_masked_caption(profile: Dict, tsap_id: str = "", score: int | None = None) -> str:
    """Public profile teaser. `score` is accepted for legacy callers but never displayed."""
    from channels_config import route_profile, SITE  # lazy: cycle safe
    profile = profile or {}
    routed = route_profile(profile)
    notes = "\n".join(f"• {item['telugu']}" for item in routed["reasons"][:4])
    route_block = f"\n📣 Destination selection (not a compatibility score):\n{notes}\n" if notes else ""
    rid = str(tsap_id or profile.get("tsap_id") or "").strip()
    id_line = f"🆔 {rid}\n" if rid else ""
    profile_link = f"🔍 Full profile: {SITE}/search/{rid}" if rid else f"📝 Register: {SITE}/register"
    gender = str(profile.get("gender") or "").lower()
    icon = "👰" if gender.startswith("b") else ("🤵" if gender.startswith("g") else "💍")
    return (
        f"{id_line}"
        f"{icon} {first_name_of(profile.get('full_name', ''))} • {profile.get('age') or '—'}y • "
        f"{profile.get('height') or '—'} • {profile.get('caste') or '—'}\n"
        f"🎓 {profile.get('education') or '—'} • 💼 {profile.get('job') or '—'} • "
        f"📍 {profile.get('district') or '—'}, {profile.get('state') or '—'}\n"
        f"🌟 {profile.get('gothram') or '—'} గోత్రం • {profile.get('star') or '—'} nakshatram\n"
        f"{route_block}"
        f"{routed['hashtags']}\n"
        f"━━━━━━━━━━━━━━━\n"
        f"🔒 Contact details are not public. They become available in accepted-request account views only after profile-owner acceptance; notification delivery is not guaranteed.\n"
        f"{profile_link}\n"
        f"⚠️ Do not send advance money; report suspicious requests."
    )


def build_masked_whatsapp(profile: Dict, tsap_id: str = "", score: int | None = None) -> str:
    """WhatsApp teaser; never presents a profile as a compatibility result."""
    from channels_config import route_profile, SITE  # lazy
    profile = profile or {}
    routed = route_profile(profile)
    notes = "\n".join(f"• {item['telugu']}" for item in routed["reasons"][:3])
    route_block = f"\n*Destination selection (not a compatibility score):*\n{notes}\n" if notes else ""
    rid = str(tsap_id or profile.get("tsap_id") or "").strip()
    id_line = f"🆔 *{rid}*\n" if rid else ""
    profile_link = f"🔍 Profile: {SITE}/search/{rid}" if rid else f"📝 Register: {SITE}/register"
    return (
        f"💍 *MANA VIVAHA* — Telugu Matrimony\n"
        f"{id_line}"
        f"━━━━━━━━━━━━━━━━\n"
        f"👤 *{first_name_of(profile.get('full_name', ''))}* ({profile.get('age') or '—'} yrs)\n"
        f"📍 {profile.get('district') or '—'}, {profile.get('state') or '—'}\n"
        f"💍 Community: {profile.get('caste') or '—'}  |  Gothram: {profile.get('gothram') or '—'}\n"
        f"🎓 {profile.get('education') or '—'}  |  💼 {profile.get('job') or '—'}\n"
        f"🌟 Star / Rasi (member-entered; not a verified chart): {profile.get('star') or '—'}  |  {profile.get('rasi') or '—'}\n"
        f"{route_block}"
        f"━━━━━━━━━━━━━━━━\n"
        f"{routed['hashtags']}\n"
        f"🔒 Contact details require profile-owner acceptance; accepted-request account views show them. External notification delivery is not guaranteed.\n"
        f"{profile_link}\n"
        f"⚠️ Do not send advance money; report suspicious requests."
    )

# ---------------------------------------------------------------------------
# 3. CONSENT-BACKED CONTACT ACCESS (payment/service grants are not entitlements)
# ---------------------------------------------------------------------------

def is_entitled(viewer_id: str, target_id: str) -> bool:
    return target_id in UNLOCKS.get(viewer_id or "", {})


def grant_unlock(viewer_id: str, target_id: str, via: str = "mutual_consent",
                 order_id: str = "", credits_charged: int = 0,
                 consent_granted: bool = False) -> Dict:
    """Record a consent-backed contact entitlement; payment/admin grants are rejected."""
    if not consent_granted or via != "mutual_consent":
        return {"success": False, "reason": "consent_required", "viewer_id": viewer_id,
                "target_id": target_id, "via": via}
    had_viewer = viewer_id in UNLOCKS
    previous_box = copy.deepcopy(UNLOCKS.get(viewer_id, {}))
    box = UNLOCKS.setdefault(viewer_id, {})
    first = target_id not in box
    box[target_id] = {"via": via, "at": _now_iso(), "order_id": order_id,
                      "credits_charged": credits_charged}
    if not _persist():
        if had_viewer:
            UNLOCKS[viewer_id] = previous_box
        else:
            UNLOCKS.pop(viewer_id, None)
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Contact access could not be saved safely. Please try again."}
    return {"success": True, "viewer_id": viewer_id, "target_id": target_id, "via": via,
            "first_time": first}


_UNLOCK_LOCKS: Dict[str, threading.Lock] = defaultdict(threading.Lock)


def unlock_number(viewer: Dict, target: Dict, *, consent_granted: bool = False) -> Dict:
    """Reveal a contact only after an accepted interest request; never charge credits for a phone number."""
    viewer_id = (viewer or {}).get("tsap_id", "")
    target_id = (target or {}).get("tsap_id", "")
    if not viewer_id or not target_id:
        return {"success": False, "reason": "bad_ids",
                "message_telugu": "⚠️ ID సరి లేదు"}
    if viewer_id == target_id:
        phone = str(target.get("phone", ""))
        return {"success": True, "phone": phone, "phone_masked": mask_phone(phone),
                "charged": 0, "credits_left": viewer.get("credits", 0),
                "via": "self", "message_telugu": "✅ మీ number ye idi 🙂"}
    if not consent_granted:
        return {"success": False, "reason": "consent_required",
                "phone_masked": mask_phone(target.get("phone", "")),
                "credits_left": int(viewer.get("credits", 0) or 0),
                "message_telugu": "🔒 Contact details కోసం ముందుగా interest పంపండి. Profile owner accept చేసిన తర్వాత accepted-request account views లో అందుబాటులోకి వస్తాయి; credits తో consent bypass చేయలేరు."}
    unlocks_before = copy.deepcopy(UNLOCKS)
    reveals_before = list(REVEAL_LOG)
    if not is_entitled(viewer_id, target_id):
        granted = grant_unlock(viewer_id, target_id, via="mutual_consent", credits_charged=0,
                               consent_granted=True)
        if not granted.get("success"):
            return {"success": False, "reason": granted.get("reason", "persistence_failed"),
                    "phone_masked": mask_phone(target.get("phone", "")),
                    "message_telugu": granted.get("message_telugu", "Contact access could not be saved safely.")}
    phone = str(target.get("phone", ""))
    REVEAL_LOG.append({"viewer": viewer_id, "target": target_id, "via": "mutual_consent",
                       "charged": 0, "at": _now_iso()})
    if not _persist():
        UNLOCKS.clear()
        UNLOCKS.update(unlocks_before)
        REVEAL_LOG[:] = reveals_before
        return {"success": False, "reason": "persistence_failed",
                "phone_masked": mask_phone(target.get("phone", "")),
                "message_telugu": "⚠️ Contact access could not be saved safely. Please try again."}
    return {"success": True, "phone": phone, "phone_masked": mask_phone(phone),
            "charged": 0, "credits_left": int(viewer.get("credits", 0) or 0),
            "via": "mutual_consent",
            "message_telugu": "✅ Profile owner accept చేశారు. Accepted-request account view లో contact details అందుబాటులో ఉన్నాయి."}


def my_unlocks(viewer_id: str, users: List[Dict],
               accepted_targets: Optional[set] = None) -> Dict:
    """Return only consent-backed, currently accepted contact pairs (phones remain masked)."""
    box = UNLOCKS.get(viewer_id or "", {})
    by_id = {u.get("tsap_id"): u for u in (users or [])}
    accepted = {str(x).upper() for x in accepted_targets} if accepted_targets is not None else None
    items = []
    for tid, meta in box.items():
        if meta.get("via") != "mutual_consent":
            continue
        if accepted is not None and str(tid).upper() not in accepted:
            continue
        u = by_id.get(tid, {})
        items.append({"tsap_id": tid, "name_masked": first_name_of(u.get("full_name", "")),
                      "age": u.get("age", "—"), "caste": u.get("caste", "—"),
                      "district": u.get("district", "—"),
                      "phone_masked": mask_phone(u.get("phone", "")),
                      "via": meta.get("via"), "unlocked_at": meta.get("at")})
    return {"viewer_id": viewer_id, "count": len(items), "profiles": items}


# ---------------------------------------------------------------------------
# 4. ₹500 ASSISTED ORDERS — pay → attach → personal send
# ---------------------------------------------------------------------------

def create_order(buyer_id: str, amount: int = ASSISTED_PRICE, note: str = "") -> Dict:
    global _ORDER_SEQ
    if int(amount or 0) != ASSISTED_PRICE:
        raise ValueError(f"Assisted shortlist order amount must be ₹{ASSISTED_PRICE}.")
    _ORDER_SEQ += 1
    order = {"id": f"ORD-{_ORDER_SEQ:04d}", "buyer_id": buyer_id, "amount": ASSISTED_PRICE,
             "status": "requested", "utr": "", "profile_ids": [],
             "via": [], "created_at": _now_iso(), "paid_at": "", "delivered_at": "",
             "note": note}
    ORDERS.append(order)
    if not _persist():
        ORDERS.remove(order)
        _ORDER_SEQ -= 1
        raise OSError("assisted order could not be persisted")
    return order


def get_order(order_id: str) -> Optional[Dict]:
    return next((o for o in ORDERS if o.get("id") == order_id), None)


def mark_order_paid(order_id: str, utr: str) -> Dict:
    o = get_order(order_id)
    if not o:
        return {"success": False, "message_telugu": "⚠️ Order దొరకలేదు"}
    if o.get("status") != "requested":
        return {"success": False, "reason": "order_not_payable",
                "message_telugu": f"⚠️ Order status {o.get('status')} — payment state మార్చలేము"}
    if int(o.get("amount", 0) or 0) != ASSISTED_PRICE:
        return {"success": False, "reason": "amount_mismatch",
                "message_telugu": f"⚠️ Assisted service ధర ₹{ASSISTED_PRICE} మాత్రమే"}
    if not (utr or "").strip():
        return {"success": False,
                "message_telugu": "⚠️ UTR/reference lekunda paid cheyyakoodadu (audit కి)"}
    previous = copy.deepcopy(o)
    o["status"] = "paid"
    o["utr"] = utr.strip()
    o["paid_at"] = _now_iso()
    if not _persist():
        o.clear()
        o.update(previous)
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Assisted payment could not be saved safely. Please try again."}
    return {"success": True, "order": o,
            "message_telugu": f"✅ {order_id} paid (₹{o['amount']}) — ఇప్పుడు profiles attach + send చెయ్యొచ్చు"}


def attach_order_profiles(order_id: str, profile_ids: List[str]) -> Dict:
    """Attach a paid shortlist to its order; this does not grant contact access."""
    o = get_order(order_id)
    if not o:
        return {"success": False, "message_telugu": "⚠️ Order దొరకలేదు"}
    if o["status"] not in ("paid", "delivered"):
        return {"success": False,
                "message_telugu": "⚠️ Mundhu payment (UTR) confirm చెయ్యండి — appude shortlist attach"}
    clean = [p for p in dict.fromkeys(profile_ids or []) if p]
    if not clean or len(clean) > ASSISTED_DEFAULT_COUNT:
        return {"success": False, "reason": "shortlist_limit",
                "message_telugu": f"⚠️ ఒక order లో 1 నుంచి {ASSISTED_DEFAULT_COUNT} profiles మాత్రమే shortlist చేయండి"}
    if o["status"] == "delivered" and set(clean) != set(o.get("profile_ids", [])):
        return {"success": False, "reason": "order_already_delivered",
                "message_telugu": "⚠️ Delivered order shortlist మార్చలేము"}
    previous = copy.deepcopy(o)
    o["profile_ids"] = clean
    o["shortlist_attached_at"] = _now_iso()
    if not _persist():
        o.clear()
        o.update(previous)
        return {"success": False, "reason": "persistence_failed",
                "message_telugu": "⚠️ Shortlist could not be saved safely. Please try again."}
    return {"success": True, "order_id": order_id, "buyer_id": o["buyer_id"],
            "attached": len(clean), "contact_access": "owner_acceptance_required",
            "message_telugu": f"✅ {len(clean)} shortlisted profiles attach అయ్యాయి. Contact details కోసం profile-owner acceptance తప్పనిసరి."}


# ---------------------------------------------------------------------------
# 5. PROFILE-SUMMARY PACK + COPY-LIST (contact details always withheld)
# ---------------------------------------------------------------------------

def build_copy_list(buyer: Dict, targets: List[Dict], order_id: str = "") -> str:
    """Shortlist copy text with contact details withheld pending each owner's acceptance."""
    bname = first_masked((buyer or {}).get("full_name", ""))
    service = (f"₹{ASSISTED_PRICE} paid service · {order_id}" if order_id
               else "complimentary admin shortlist")
    lines = [f"💍 మన వివాహ — {bname} గారు, మీ shortlisted profiles ({service}):", ""]
    for i, t in enumerate(targets or [], 1):
        icon = "👰" if t.get("gender") == "Bride" else ("🤵" if t.get("gender") == "Groom" else "💍")
        lines.append(f"{i}. {icon} {first_masked(t.get('full_name', ''))} -- "
                     f"{t.get('tsap_id', '—')} ({t.get('caste', '—')} · {t.get('age', '—')}y · "
                     f"{t.get('district', '—')})")
    lines += ["", "🔒 Phone numbers are not included. Send an interest request in the app; the profile owner must accept before contact details are shared.",
              "⚠️ Respect each member's privacy and do not try to obtain contact details outside the consent flow."]
    text = "\n".join(lines)
    if not assert_no_leak(text)["ok"]:
        raise ValueError("A phone-like number was detected in the assisted shortlist output.")
    return text


def build_personal_card(target: Dict, buyer_name: str = "") -> str:
    """Buyer DM card with profile summary only; phone is withheld until owner acceptance."""
    t = target or {}
    icon = "👰" if t.get("gender") == "Bride" else ("🤵" if t.get("gender") == "Groom" else "💍")
    g = "Ammayi" if t.get("gender") == "Bride" else ("Abbayi" if t.get("gender") == "Groom" else "")
    from channels_config import SITE  # lazy import
    text = (
        f"{icon} {t.get('tsap_id', '—')} — {first_masked(t.get('full_name', ''))} ({g} {t.get('age', '—')}y)\n"
        f"💍 {t.get('caste', '—')} · {t.get('gothram', '—')} గోత్రం · 🌟 {t.get('star', '—')} (member-entered)\n"
        f"🎓 {t.get('education', '—')} · 💼 {t.get('job', '—')} · 💰 {t.get('salary', '—')}\n"
        f"📍 {t.get('district', '—')}, {t.get('state', 'TS')}\n"
        "🔒 Contact details hidden — send an interest request; owner acceptance is required.\n"
        f"🔍 Profile: {SITE}/search/{t.get('tsap_id', '')}"
    )
    if not assert_no_leak(text)["ok"]:
        raise ValueError("A phone-like number was detected in the assisted profile card.")
    return text


def build_personal_pack(buyer: Dict, targets: List[Dict], order_id: str = "") -> List[str]:
    """DM sequence: shortlist intro + profile summaries; never disclose member phone numbers."""
    bname = first_masked((buyer or {}).get("full_name", ""))
    if order_id:
        header = (f"💍 మన వివాహ — {bname} గారు, నమస్తే! 🙏\n"
                  f"₹{ASSISTED_PRICE} service order {order_id} confirm అయ్యింది. మీ shortlist లో {len(targets)} profiles ఉన్నాయి.\n"
                  "Contact details కోసం ప్రతి profile owner acceptance అవసరం.")
    else:
        header = (f"💍 మన వివాహ — {bname} గారు, నమస్తే! 🙏\n"
                  f"మీ admin-curated shortlist లో {len(targets)} profiles ఉన్నాయి.\n"
                  "Contact details కోసం ప్రతి profile owner acceptance అవసరం.")
    return [header] + [build_personal_card(t, bname) for t in (targets or [])]


# ---------------------------------------------------------------------------
# 6. PERSONAL DELIVERY — Telegram DM + WhatsApp (dry-run safe)
# ---------------------------------------------------------------------------

async def deliver_personal(buyer: Dict, targets: List[Dict], via: str = "both",
                           order_id: str = "") -> Dict:
    """
    Buyer personal Telegram DM + WhatsApp ki profiles.
    Tokens/links lekapothe → dry-run preview (crash ledu, admin copy-list tho pampachu).
    Returns delivery status + a contact-safe copy-list (admin fallback).
    """
    import bot_pool  # lazy
    msgs = build_personal_pack(buyer, targets, order_id)
    copy_list = build_copy_list(buyer, targets, order_id)
    if any(not assert_no_leak(message)["ok"] for message in msgs):
        return {"ok": False, "via": via, "messages": 0,
                "telegram": {"wanted": False, "sent": 0, "failed": "privacy_guard"},
                "whatsapp": {"wanted": False, "queued": 0, "failed": "privacy_guard"},
                "copy_list": "", "message_telugu": "🔒 Privacy guard: contact data detected; shortlist was not sent."}
    via = (via or "both").lower()
    want_tg = via in ("telegram", "both")
    want_wa = via in ("whatsapp", "both")

    tg = {"wanted": want_tg, "sent": 0, "failed": "", "chat_id": str((buyer or {}).get("telegram_chat_id", "") or "")}
    if want_tg:
        if tg["chat_id"]:
            try:
                pool = bot_pool.get_pool()
                for m in msgs:
                    r = await pool.post(tg["chat_id"], m)
                    if isinstance(r, dict) and (r.get("ok") or r.get("dry_run")):
                        tg["sent"] += 1
                    else:
                        tg["failed"] = str((r or {}).get("error") or r)[:120]
                        break
                if not tg["sent"] and not tg["failed"]:
                    tg["failed"] = "dry_run_no_token"
            except Exception as e:  # noqa: BLE001
                tg["failed"] = type(e).__name__ + ": " + str(e)[:100]
        else:
            tg["failed"] = "no_telegram_chat_id"

    wa = {"wanted": want_wa, "queued": 0, "failed": "",
          "phone": str((buyer or {}).get("phone", "") or "")}
    if want_wa:
        if wa["phone"]:
            try:
                import publisher  # lazy
                cfg = publisher.config()
                if cfg.get("whatsapp_mode", "off") == "off":
                    wa["failed"] = "dry_run_whatsapp_off"
                else:
                    for m in msgs:
                        publisher.enqueue_whatsapp([wa["phone"]], m, priority=0, kind="saved_search_alert")
                        wa["queued"] += 1
            except Exception as e:  # noqa: BLE001
                wa["failed"] = type(e).__name__ + ": " + str(e)[:100]
        else:
            wa["failed"] = "no_phone"

    ok = (not want_tg or tg["sent"] == len(msgs)) and (not want_wa or wa["queued"] == len(msgs))
    return {"ok": ok, "via": via, "messages": len(msgs), "telegram": tg, "whatsapp": wa,
            "copy_list": copy_list,
            "message_telugu": ("✅ Personal delivery success" if ok else
                               "🧪 Dry-run/preview — tokens/link లేదు, kindi copy-list తో manual గా పంపండి")}


# ---------------------------------------------------------------------------
# 7. FIRST-NAME DISPLAY + optional last-name-token comparison
# ---------------------------------------------------------------------------
# Public display uses the first name. A name's final token is not necessarily a
# surname and must never block interest or determine marriage eligibility.

def first_name_of(full_name: str) -> str:
    """'Lakshmi Reddy' → 'Lakshmi' — public display (surname hidden)."""
    parts = str(full_name or "").strip().split()
    return parts[0] if parts else "—"


def surname_of(full_name: str) -> str:
    """'Lakshmi Reddy' → 'Reddy' · single-word పేరు → '' (surname తెలియదు)."""
    parts = str(full_name or "").strip().split()
    return parts[-1] if len(parts) >= 2 else ""


def norm_surname(s: str) -> str:
    """Case/space/dot proof: ' Reddy.' → 'reddy'."""
    return "".join(ch for ch in str(s or "").lower() if ch.isalnum())


def same_surname_check(a: Dict, b: Dict) -> Dict:
    """Compare final name tokens only; they may not be surnames and never block a pair."""
    first = surname_of((a or {}).get("full_name", ""))
    second = surname_of((b or {}).get("full_name", ""))
    one, two = norm_surname(first), norm_surname(second)
    same = (one == two) if one and two else None
    if same is True:
        note = "రెండు పేర్ల చివరి పదం ఒకేలా ఉంది. ఇది name-token comparison మాత్రమే; వివాహ నిర్ణయం కాదు."
        reason = "same_final_name_token"
    elif same is False:
        note = "పేర్ల చివరి పదాలు వేర్వేరుగా ఉన్నాయి. ఇది name-token comparison మాత్రమే; సంప్రదాయ తీర్పు కాదు."
        reason = "different_final_name_token"
    else:
        note = "పోల్చడానికి రెండు పేర్లలోనూ చివరి పదం అందుబాటులో లేదు."
        reason = "name_token_unavailable"
    return {"same": same, "blocked": False, "a_name_token": first, "b_name_token": second,
            "reason": reason, "note_telugu": note,
            "notice": "A final name token is not necessarily a surname and does not determine eligibility."}


def filter_same_surname(me: Dict, pool: list) -> Dict:
    """Legacy filter name: keep all profiles; name tokens do not determine eligibility."""
    kept = list(pool or [])
    return {"kept": kept, "skipped_ids": [], "skipped_count": 0}
