"""
మన వివాహ — AUTO-PUBLISHER (Telegram + WhatsApp)
===================================================
Profile register avvagane / admin approve avvagane → related channels anni
chotaki automatic ga vellali. Idi aa engine.

Features:
  • Telegram: Bot API tho LIVE channels ki post (photo card unte sendPhoto)
  • WhatsApp: 2 modes —
        cloud_api → Meta WhatsApp Business Cloud API (official, opt-in numbers/broadcast)
        bridge    → local WhatsApp bridge (Baileys) — groups/newsletter ki post
  • Queue + retry (3 attempts, backoff) + per-channel rate limit (spam/429 safe)
  • Dry-run (tokens lekapothe message generate chesi log lo pettadam — crash ledu)
  • Duplicate protection (same tsap_id + channel malli post avvadu)
  • Publish log → backend/publish_log.jsonl (audit)

ENV:
  BOT_TOKEN                 — telegram bot token
  AUTO_POST_ON_REGISTER     — explicit opt-in before automatic publishing (default false)
  PUBLISH_DRY_RUN           — "true" prevents real posts (default true; live sends require explicit opt-in)
  WHATSAPP_MODE             — off | cloud_api | bridge   (default off)
  WHATSAPP_TOKEN            — Meta Cloud API token
  WHATSAPP_PHONE_ID         — Meta Cloud API phone number id
  WHATSAPP_TO               — comma separated: 9198480xxxxx (opt-in users)
  WHATSAPP_BRIDGE_URL       — e.g. http://whatsapp-bridge:3000/send
  WHATSAPP_BRIDGE_TARGETS   — comma separated group/newsletter ids (bridge mode)
  PUBLIC_BASE_URL           — card image URL base (bridge ki image fetch cheyyadaniki)

ANTI-BAN (chudandi: wa_antiban.py):
  WhatsApp messages fixed timing lo vellavu — 120–170 sec RANDOM gap, typing simulation,
  long breaks, day caps, per-target caps, quiet hours, warmup ramp, cooldown, kill switch.
  Order: TELEGRAM mundu → tarvata WHATSAPP (oka profile ki rendu chotla post).
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import os
import random
import time
from atomic_store import atomic_append_line
from datetime import datetime
from typing import Dict, List, Optional

try:
    import httpx
except Exception:  # pragma: no cover
    httpx = None

import bot_pool
import wa_pool
from channels_config import (
    CHANNELS, post_targets, build_caption, route_profile, channel_stats, SITE, BOT_USERNAME,
)
from wa_antiban import ENGINE as WA_ENGINE, variantize as wa_variantize

LOG_FILE = os.environ.get("MANA_VIVAHA_PUBLISH_LOG_FILE", os.path.join(os.path.dirname(os.path.abspath(__file__)), "publish_log.jsonl"))

# In-memory state (real lo Redis/DB)
PUBLISH_QUEUE: List[Dict] = []
PUBLISH_LOG: List[Dict] = []
_SEEN = set()          # (tsap_id, channel) duplicates block
_WORKER_TASK: Optional[asyncio.Task] = None

# ---- WhatsApp anti-ban queue (priority 0 = interest/request, 1 = channel post) ----
WA_QUEUE: List[Dict] = []
_WA_TASK: Optional[asyncio.Task] = None
_WA_HEARTBEAT_AT: Optional[str] = None
WA_STATS = {"sent": 0, "failed": 0, "skipped": 0, "dead": 0, "last": []}
WA_DEAD: List[Dict] = []            # 3 tries ayyaka kooda fail ayina messages (dead-letter)
WA_MAX_ATTEMPTS = int(os.getenv("WA_MAX_ATTEMPTS", "3"))
_WA_COMPLETED_KEYS: Dict[str, float] = {}
_WA_DEDUPE_TTL_SECONDS = 24 * 60 * 60


def _wa_item_key(item: Dict) -> str:
    """Opaque in-process idempotency key; raw targets/bodies never enter telemetry."""
    parts = (item.get("kind", ""), item.get("target", ""), item.get("text", ""),
             item.get("image_id", ""), item.get("image_path", ""), item.get("image_url", ""))
    return hashlib.sha256("\x1f".join(str(value) for value in parts).encode("utf-8")).hexdigest()


def _prune_wa_completed(now: Optional[float] = None) -> None:
    now = now or time.time()
    for key, completed_at in list(_WA_COMPLETED_KEYS.items()):
        if now - completed_at > _WA_DEDUPE_TTL_SECONDS:
            _WA_COMPLETED_KEYS.pop(key, None)
    # A bounded set is safer than allowing an operational burst to grow memory.
    if len(_WA_COMPLETED_KEYS) > 10000:
        for key, _ in sorted(_WA_COMPLETED_KEYS.items(), key=lambda pair: pair[1])[:len(_WA_COMPLETED_KEYS) - 10000]:
            _WA_COMPLETED_KEYS.pop(key, None)



def _safe_antiban_stats() -> Dict:
    """Keep anti-ban telemetry operational without recipient keys or state paths."""
    raw = WA_ENGINE.stats()
    allowed = {
        "enabled", "paused", "gap_seconds", "gap_interest_seconds", "random_gap",
        "break_every", "break_minutes", "active_hours_ist", "warmup_cap_today",
        "daily_cap", "target_daily_cap", "sent_today", "sent_total",
        "sent_since_break", "next_allowed_in_seconds", "locked_next_gap_seconds",
        "gap_is_randomized_per_post", "cooldown_until", "consecutive_failures",
        "last_sent_at",
    }
    return {key: raw.get(key) for key in allowed if key in raw}


def wa_queue_stats() -> Dict:
    safe_results = []
    for item in WA_STATS["last"][-5:]:
        safe_results.append({"at": item.get("at"), "ok": bool(item.get("ok")),
                             "kind": item.get("kind"),
                             "error": str(item.get("error") or "")[:80]})
    return {
        "queued": len(WA_QUEUE),
        "queued_interest": len([x for x in WA_QUEUE if x.get("priority") == 0]),
        "queued_channel": len([x for x in WA_QUEUE if x.get("priority", 1) == 1]),
        "sent_total": WA_STATS["sent"],
        "failed_total": WA_STATS["failed"],
        # Results intentionally exclude targets, message bodies, provider payloads,
        # and raw bridge errors. This object is used by operational dashboards.
        "last_results": safe_results,
        "antiban": _safe_antiban_stats(),
        "worker_running": wa_worker_running(),
    }


# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
def _env_bool(name: str, default: bool) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return str(v).strip().lower() in ("1", "true", "yes", "on")


def config() -> Dict:
    token = os.getenv("BOT_TOKEN", "").strip()
    wa_mode = os.getenv("WHATSAPP_MODE", "off").strip().lower()
    # Fail closed even if a valid bot token is present. Operators must explicitly
    # disable dry-run and enable publishing after checking the exact destinations.
    dry_default = True
    auto_publish_after_approval = _env_bool(
        "AUTO_POST_ON_APPROVAL", _env_bool("AUTO_POST_ON_REGISTER", False)
    )
    return {
        "bot_token": token,
        # Keep the legacy key for clients, but new registrations are held until approval.
        "auto_post_on_approval": auto_publish_after_approval,
        "auto_post_on_register": auto_publish_after_approval,
        "dry_run": _env_bool("PUBLISH_DRY_RUN", dry_default),
        "wa_mode": wa_mode if wa_mode in ("off", "cloud_api", "bridge") else "off",
        "wa_token": os.getenv("WHATSAPP_TOKEN", "").strip(),
        "wa_phone_id": os.getenv("WHATSAPP_PHONE_ID", "").strip(),
        "wa_to": [x.strip() for x in os.getenv("WHATSAPP_TO", "").split(",") if x.strip()],
        "wa_bridge_url": os.getenv("WHATSAPP_BRIDGE_URL", "").strip(),
        "wa_bridge_token": os.getenv("WHATSAPP_BRIDGE_TOKEN", "").strip(),
        "wa_bridge_targets": [x.strip() for x in os.getenv("WHATSAPP_BRIDGE_TARGETS", "").split(",") if x.strip()],
        "retries": int(os.getenv("PUBLISH_RETRIES", "3")),
        "rate_limit_seconds": float(os.getenv("PUBLISH_RATE_LIMIT", "1.2")),
    }


def publish_status() -> Dict:
    c = config()
    st = channel_stats()
    return {
        "telegram": {"configured": bool(c["bot_token"]),
                     "routing_eligible_count": st["routing_eligible"],
                     "external_status_checked": False},
        "whatsapp": {
            "mode": c["wa_mode"],
            "cloud_api_ready": bool(c["wa_token"] and c["wa_phone_id"] and c["wa_to"]),
            "bridge_ready": bool(c["wa_bridge_url"] and c["wa_bridge_targets"] and c["wa_bridge_token"]),
            "targets": len(c["wa_to"]) + len(c["wa_bridge_targets"]),
        },
        "dry_run": c["dry_run"],
        # 🔁 Failover line: primary fail aite next bot / next WA instance try avthundi.
        "order": "telegram → whatsapp (failover: primary fail → backup bot, then next WhatsApp instance)",
        "order_note": ("Telegram is attempted before WhatsApp is queued. On failure the bot pool moves to the "
                       "next bot and the WhatsApp pool to the next available instance; a queued notification "
                       "does not confirm external delivery."),
        "auto_post_on_approval": c["auto_post_on_approval"],
        "auto_post_on_register": c["auto_post_on_register"],  # legacy alias
        "whatsapp_queue": wa_queue_stats(),
        "bots": bot_pool.bot_health(),
        "whatsapp_instances": wa_pool.wa_health(),
        "dead_letters": len(WA_DEAD),
        "note": "Publishing defaults to dry-run/off. Verify each owner-controlled destination and required permissions before explicitly enabling live delivery.",
        "queued": len(PUBLISH_QUEUE),
        "published_total": len([x for x in PUBLISH_LOG if x.get("ok")]),
        "registry": {"total": st["total"], "routing_eligible": st["routing_eligible"],
                     "not_routing_eligible": st["not_routing_eligible"],
                     "external_status_checked": False},
    }


# ---------------------------------------------------------------------------
# MESSAGE BUILDERS
# ---------------------------------------------------------------------------
def build_whatsapp_text(profile: Dict, tsap_id: str, score: int | None = None) -> str:
    """WhatsApp formatting (*bold* — Telegram ** కాదు). 🔒 WAVE 12 MASKED (name/number లేదు)."""
    from smart12 import build_masked_whatsapp  # lazy: cycle-safe
    return build_masked_whatsapp(profile or {}, tsap_id, score)


def build_share_text(profile: Dict, tsap_id: str) -> str:
    """Profile owner WhatsApp/status లో share చెయ్యడానికి short text."""
    return (
        f"💍 మన వివాహ — {profile.get('full_name','—')} ({profile.get('age','—')}y, "
        f"{profile.get('caste','—')}, {profile.get('district','—')})\n"
        f"🆔 {tsap_id} | {profile.get('education','')} {profile.get('job','')}\n"
        f"🔍 Chudandi: {SITE}/search/{tsap_id}\n"
        f"📝 Mee profile FREE: {SITE}/register"
    )


# ---------------------------------------------------------------------------
# LOW-LEVEL SENDERS
# ---------------------------------------------------------------------------
async def _send_telegram(chat: str, caption: str, photo_path: Optional[str], cfg: Dict) -> Dict:
    """
    Bot API sendPhoto/sendMessage — **bot pool failover** tho.
    Primary fail/rate-limit aithe backup bot (same channels lo admin) ventane post chestundi.
    """
    if cfg["dry_run"]:
        return {"ok": True, "dry_run": True, "detail": f"would post to {chat}"}
    return await bot_pool.get_pool().post(chat, caption, photo_path=photo_path,
                                          role="post", parse_mode="HTML")


async def _send_whatsapp_cloud(text: str, cfg: Dict) -> List[Dict]:
    """Meta WhatsApp Business Cloud API — opt-in numbers కి (broadcast)."""
    results = []
    if cfg["dry_run"] or not (cfg["wa_token"] and cfg["wa_phone_id"]) or httpx is None:
        return [{"ok": True, "dry_run": True} for _ in cfg["wa_to"]] or \
               [{"ok": True, "dry_run": True}]
    url = f"https://graph.facebook.com/v20.0/{cfg['wa_phone_id']}/messages"
    headers = {"Authorization": f"Bearer {cfg['wa_token']}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=30) as client:
        for to in cfg["wa_to"]:
            payload = {"messaging_product": "whatsapp", "to": to,
                       "type": "text", "text": {"preview_url": True, "body": text[:4096]}}
            try:
                resp = await client.post(url, headers=headers, json=payload)
                results.append({"ok": resp.status_code < 300, "status": resp.status_code})
            except Exception:
                results.append({"ok": False, "error": "cloud provider unavailable"})
            await asyncio.sleep(cfg["rate_limit_seconds"] / 2)
    return results


async def _send_whatsapp_bridge(text: str, cfg: Dict) -> List[Dict]:
    """Local bridge (Baileys) — WhatsApp groups/newsletter కి post."""
    results = []
    if cfg["dry_run"] or not cfg["wa_bridge_url"] or httpx is None:
        return [{"ok": True, "dry_run": True} for _ in cfg["wa_bridge_targets"]] or \
               [{"ok": True, "dry_run": True}]
    headers = {"X-Bridge-Token": cfg["wa_bridge_token"]} if cfg["wa_bridge_token"] else {}
    async with httpx.AsyncClient(timeout=45) as client:
        for target in cfg["wa_bridge_targets"]:
            try:
                resp = await client.post(cfg["wa_bridge_url"], headers=headers,
                                         json={"target": target, "text": text})
                results.append({"ok": resp.status_code < 300, "status": resp.status_code})
            except Exception:
                results.append({"ok": False, "error": "bridge service unavailable"})
            await asyncio.sleep(cfg["rate_limit_seconds"])
    return results



# ---------------------------------------------------------------------------
# WHATSAPP ANTI-BAN SENDER (random gap + typing + caps) — wa_antiban.py engine
# ---------------------------------------------------------------------------
def _bridge_base(cfg: Dict) -> str:
    """Bridge base URL — '/send' suffix ఉన్న teesesi base ఇస్తాం."""
    url = (cfg.get("wa_bridge_url") or "").strip().rstrip("/")
    for suffix in ("/send-image", "/send", "/status"):
        if url.endswith(suffix):
            url = url[: -len(suffix)]
    return url


def _public_base() -> str:
    return os.getenv("PUBLIC_BASE_URL", SITE).rstrip("/")


def whatsapp_link(phone: str, text: str) -> str:
    """Click-to-chat fallback — WhatsApp configure kakapoyina user ని notify cheyyochu."""
    import urllib.parse
    digits = "".join(ch for ch in str(phone or "") if ch.isdigit())
    if not digits:
        return ""
    if len(digits) == 10:
        digits = "91" + digits
    return f"https://wa.me/{digits}?text=" + urllib.parse.quote(text[:1500])


async def _wa_send_via_instance(inst, item: Dict, cfg: Dict) -> Dict:
    """ఒక WhatsApp instance (bridge number) కి message pampu — image + text fallback తో."""
    target = item["target"]
    text = wa_variantize(item["text"], SITE, BOT_USERNAME)
    base = (inst.url or "").rstrip("/")
    for suffix in ("/send-image", "/send", "/status"):
        if base.endswith(suffix):
            base = base[: -len(suffix)]
    if not base:
        return {"ok": False, "error": "instance url లేదు (%s)" % getattr(inst, "name", "?")}
    if cfg["dry_run"] or httpx is None:
        return {"ok": True, "dry_run": True, "kind": item.get("kind", "post"),
                "instance": getattr(inst, "name", "?")}
    headers = {"X-Bridge-Token": inst.token} if getattr(inst, "token", "") else {}
    typing_ms = WA_ENGINE.typing_ms()
    async with httpx.AsyncClient(timeout=60) as client:
        img_url = item.get("image_url") or (_public_base() + "/cards/" + item["image_id"] + ".png"
                                            if item.get("image_id") else "")
        img_path = item.get("image_path")
        has_img = bool(img_url or (img_path and os.path.exists(img_path)))
        err = ""
        try:
            if has_img:
                payload = {"target": target, "caption": text[:1000], "typingMs": typing_ms}
                if img_path and os.path.exists(img_path):
                    payload["imagePath"] = img_path
                else:
                    payload["imageUrl"] = img_url
                resp = await client.post(f"{base}/send-image", json=payload, headers=headers)
                if resp.status_code < 300:
                    return {"ok": True, "status": resp.status_code,
                            "kind": item.get("kind", "post"), "with_image": True,
                            "instance": getattr(inst, "name", "?")}
                err = "bridge image send failed"
            resp = await client.post(f"{base}/send", json={"target": target, "text": text,
                                                          "typingMs": typing_ms}, headers=headers)
            return {"ok": resp.status_code < 300, "status": resp.status_code,
                    "kind": item.get("kind", "post"), "with_image": False,
                    "instance": getattr(inst, "name", "?"),
                    "error": "" if resp.status_code < 300 else ("bridge authentication failed" if resp.status_code in (401, 403) else ("bridge rate limited" if resp.status_code == 429 else ("bridge service unavailable" if resp.status_code >= 500 else (err or "bridge request failed"))))}
        except Exception as e:
            return {"ok": False, "network_error": True, "instance": getattr(inst, "name", "?"),
                    "error": "bridge network unavailable"}


# 🌊 WAVE 19 — purpose → number lane (3 separate numbers + both-backup)
OTP_KINDS = {"otp"}
CHANNEL_KINDS = {"post", "channel_post", "promo", "ad", "offer", "status_poster"}
PERSONAL_KINDS = {"saved_search_alert", "personal_digest", "interest_to_owner", "interest_confirm",
                  "interest_accepted", "interest_accepted_owner", "interest_declined",
                  "referral_join", "referral_commission", "namaste_welcome",
                  "welcome_pack_resend", "lead_followup", "vendor_request", "vendor_lead"}


def _wa_lane(item: Dict) -> str:
    kind = str(item.get("kind", "")).lower()
    if kind in OTP_KINDS:
        return "otp"
    if kind in PERSONAL_KINDS:  # 🌊 WAVE 21 — personal DM eppudu personal lane (priority tho samandham ledu)
        return "personal"
    if kind in CHANNEL_KINDS or int(item.get("priority", 1)) >= 1:
        return "channels"
    return "personal"


def _wa_pick_instance(item: Dict):
    """Per-number anti-ban: ee kshanam లో e instance పంపొచ్చు (gap/cap ok) — adi ముందు ఇస్తాం."""
    lane = _wa_lane(item)
    for inst in wa_pool.get_pool().order(lane):
        try:
            ok, _reason, _wait = wa_pool.engine_for(inst.name).check(item.get("target"), item.get("priority", 1))
        except Exception:
            ok = True
        if ok:
            return inst
    return None


async def _wa_deliver(item: Dict, cfg: Dict) -> Dict:
    """
    Oka WhatsApp message ni deliver chey — **multi-number failover** tho.
    Instance 1 fail aithe ventane 2 → 3. Antha fail aithe `ok: False` (worker retry + dead-letter).
    """
    if cfg["wa_mode"] == "cloud_api":
        text = wa_variantize(item["text"], SITE, BOT_USERNAME)
        if cfg["dry_run"] or httpx is None:
            return {"ok": True, "dry_run": True}
        res = await _send_whatsapp_cloud(text, dict(cfg, wa_to=[item["target"]]))
        return (res[0] if res else {"ok": False, "error": "cloud_api empty"})
    lane = _wa_lane(item)
    pool = wa_pool.get_pool()
    preferred = _wa_pick_instance(item)
    res = await pool.deliver(item, lane=lane, deliverer=lambda inst, it: _wa_send_via_instance(inst, it, cfg),
                             preferred=getattr(preferred, "name", None))
    if res.get("instance"):
        try:
            wa_pool.engine_for(res["instance"]).record_send(item.get("target"), ok=True,
                                                            detail=res.get("kind", ""),
                                                            priority=item.get("priority", 1),
                                                            kind=str(item.get("kind", "")))
        except Exception:
            pass
    return res


def dead_letters(limit: int = 50) -> Dict:
    """Safe dead-letter metadata; payloads remain process-private for requeue only."""
    safe = []
    for rec in WA_DEAD[-max(1, min(int(limit), 100)):]:
        attempts = []
        for attempt in (rec.get("attempts") or []):
            attempts.append({key: attempt.get(key) for key in ("instance", "kind", "cooldown_s") if key in attempt})
        safe.append({"at": rec.get("at"), "kind": rec.get("kind"),
                     "attempt_count": len(attempts), "attempts": attempts})
    return {"count": len(WA_DEAD), "items": safe,
            "message_telugu": "Ivi 3 tries అయ్యాక కూడా vellaledu — bridge/number problem. "
                              "QR మళ్లీ scan చేసి /api/wa/dead/requeue తో పంపండి.",
            "privacy": "Recipient numbers and message bodies are withheld from this operational view."}


def requeue_dead(limit: int = 20) -> Dict:
    """Dead-letters ని queue లో మళ్లీ vey (bridge fix అయ్యాక)."""
    moved = 0
    while WA_DEAD and moved < limit:
        rec = WA_DEAD.pop(0)
        item = {"target": rec.get("target"), "text": rec.get("text", ""),
                "image_id": rec.get("image_id", ""), "image_path": rec.get("image_path"),
                "priority": rec.get("priority", 1), "kind": rec.get("kind", "post"),
                "queued_at": datetime.utcnow().isoformat(), "attempts": 0,
                "requeued_from_dead": True}
        item["dedupe_key"] = rec.get("dedupe_key") or _wa_item_key(item)
        WA_QUEUE.append(item)
        moved += 1
    return {"requeued": moved, "queue": len(WA_QUEUE), "dead_left": len(WA_DEAD)}


def enqueue_whatsapp(targets: List[str], text: str, image_id: str = "", image_path: Optional[str] = None,
                     priority: int = 1, kind: str = "post") -> Dict:
    """
    WhatsApp queue ki add chey. Worker tarvata random gap (120–170s) tho pampisthundi.
    priority 0 = interest/request (fast lane 60–120s), 1 = channel post.
    """
    cfg = config()
    if cfg["wa_mode"] == "off":
        return {"queued": False, "reason": "whatsapp_mode_off",
                "note": "WHATSAPP_MODE=bridge|cloud_api చేసి bridge connect చెయ్యండి"}
    _prune_wa_completed()
    added = 0
    deduplicated = 0
    pending_keys = {str(item.get("dedupe_key") or _wa_item_key(item)) for item in WA_QUEUE}
    for t in [x for x in targets if x]:
        item = {"target": t, "text": text, "image_id": image_id, "image_path": image_path,
                "priority": priority, "kind": kind, "queued_at": datetime.utcnow().isoformat(),
                "attempts": 0}
        key = _wa_item_key(item)
        if key in pending_keys or key in _WA_COMPLETED_KEYS:
            deduplicated += 1
            continue
        item["dedupe_key"] = key
        WA_QUEUE.append(item)
        pending_keys.add(key)
        added += 1
    return {"queued": bool(added), "added": added, "deduplicated": deduplicated,
            "queued_total": len(WA_QUEUE), "target_count": added, "priority": priority, "kind": kind,
            "gap_plan": WA_ENGINE.cfg()["min_gap"] if priority >= 1 else WA_ENGINE.cfg()["min_gap_interest"]}


async def _sleep_checking(seconds: float) -> None:
    """Chunked sleep — pause/kill-switch వెంటనే pani చెయ్యాలి."""
    remaining = max(0.0, seconds)
    while remaining > 0:
        chunk = min(10.0, remaining)
        await asyncio.sleep(chunk)
        remaining -= chunk
        if WA_ENGINE.state.get("paused"):
            return


async def _wa_worker_loop():
    """WhatsApp queue worker — anti-ban rules తో ne pampisthundi (ఒక samayam లో okati)."""
    global _WA_HEARTBEAT_AT
    while True:
        try:
            _WA_HEARTBEAT_AT = datetime.utcnow().isoformat()
            cfg = config()
            if not WA_QUEUE or cfg["wa_mode"] == "off":
                await asyncio.sleep(3)
                continue
            WA_QUEUE.sort(key=lambda x: (x.get("priority", 1), x.get("queued_at", "")))
            # item[0] cap/quiet lo block aithe → next ready item try chey (stall avvakudadu)
            item, reason, wait = None, "empty", 5.0
            waits = []
            for cand in list(WA_QUEUE):
                ok_c, r_c, w_c = WA_ENGINE.check(cand["target"], cand.get("priority", 1))
                if ok_c:
                    item = cand
                    break
                waits.append((r_c, w_c))
            if item is None:
                worst = [w for r, w in waits if r == "gap_wait"]
                if worst:
                    await asyncio.sleep(min(15.0, max(2.0, min(worst) / 6)))
                elif any(r == "quiet_hours" for r, _ in waits):
                    await asyncio.sleep(300)
                else:
                    await asyncio.sleep(30)
                continue
            WA_QUEUE.remove(item)
            res = await _wa_deliver(item, cfg)
            ok = bool(res.get("ok"))
            WA_ENGINE.record_send(item["target"], ok=ok, detail=res.get("error", "") or "",
                                  priority=item.get("priority", 1),
                                  kind=item.get("kind", ""))  # WAVE 24: OTP sends ki OTP gaps (25-60s)
            if ok:
                WA_STATS["sent"] += 1
                _WA_COMPLETED_KEYS[item.get("dedupe_key") or _wa_item_key(item)] = time.time()
                _prune_wa_completed()
            else:
                WA_STATS["failed"] += 1
            if not ok:
                attempts = int(item.get("attempts", 0)) + 1
                item["attempts"] = attempts
                item["last_error"] = res.get("error", "")
                if attempts < WA_MAX_ATTEMPTS:
                    # ♻️ retry — 3 attempts varaku (instances failover tho paatu)
                    item["queued_at"] = datetime.utcnow().isoformat()
                    WA_QUEUE.append(item)
                else:
                    # 💀 dead-letter — anni numbers fail + 3 tries అయ్యాయి → admin alert (manual retry)
                    dead = wa_pool.get_pool().dead_letter(item, res.get("attempts", []))
                    WA_DEAD.append(dead)
                    WA_STATS["dead"] += 1
                    try:
                        await bot_pool.get_pool().send_alert(
                            "🚨 *WhatsApp delivery fail*\nKind: %s\nAttempts: %s\nReason: %s\n\n"
                            "Bridge QR check చెయ్యండి → /api/wa/dead/requeue తో మళ్లీ పంపొచ్చు."
                            % (item.get("kind"), attempts,
                               str(res.get("error") or "bridge request failed")[:80]), parse_mode="Markdown")
                    except Exception:
                        pass
            WA_STATS["last"].append({"at": datetime.utcnow().isoformat(),
                                     "ok": ok, "kind": item.get("kind"),
                                     "error": "" if ok else str(res.get("error") or "bridge request failed")[:80]})
            WA_STATS["last"] = WA_STATS["last"][-20:]
            safe_detail = {key: res.get(key) for key in ("ok", "status", "instance", "kind", "with_image", "dry_run", "fallback_used") if key in res}
            if not ok:
                safe_detail["error"] = str(res.get("error") or "bridge request failed")[:80]
            _append_log_file({"tsap_id": item.get("kind", "wa"),
                              "channel": "whatsapp", "at": datetime.utcnow().isoformat(),
                              "ok": ok, "detail": safe_detail, "antiban_gap_s": WA_ENGINE.wait_seconds(1)})
        except Exception as e:
            _append_log_file({"tsap_id": "wa-worker", "ok": False, "error": "worker iteration failed",
                              "at": datetime.utcnow().isoformat()})
            await asyncio.sleep(10)


def start_wa_worker() -> bool:
    global _WA_TASK
    try:
        loop = asyncio.get_event_loop()
        if _WA_TASK is None or _WA_TASK.done():
            _WA_TASK = loop.create_task(_wa_worker_loop())
            return True
    except Exception:
        pass
    return False


def wa_worker_running() -> bool:
    return _WA_TASK is not None and not _WA_TASK.done()


def worker_ops_status() -> Dict:
    """Least-privilege worker snapshot: no targets, phone numbers, bodies, or tokens."""
    q = wa_queue_stats()
    pool = wa_pool.wa_health()
    safe_instances = []
    for item in pool.get("instances", []):
        safe_instances.append({key: item.get(key) for key in (
            "name", "lane", "status", "auth_state", "paused", "daily_cap",
            "sent_today", "capacity_left", "cooldown_s", "available", "failures",
        ) if key in item})
    safe_errors = []
    for item in (q.get("last_results") or [])[-5:]:
        safe_errors.append({"at": item.get("at"), "ok": bool(item.get("ok")),
                            "kind": item.get("kind"), "error": str(item.get("error") or "")[:80]})
    return {
        "success": True,
        "worker": {"running": wa_worker_running(), "heartbeat_at": _WA_HEARTBEAT_AT},
        "queue": {"depth": int(q.get("queued", 0)),
                  "otp": len([x for x in WA_QUEUE if str(x.get("kind", "")).lower() == "otp"]),
                  "channels": len([x for x in WA_QUEUE if str(x.get("kind", "")).lower() in CHANNEL_KINDS]),
                  "personal": len([x for x in WA_QUEUE if str(x.get("kind", "")).lower() in PERSONAL_KINDS]),
                  "retrying": len([x for x in WA_QUEUE if int(x.get("attempts", 0) or 0) > 0])},
        "sent_total": int(q.get("sent_total", 0)),
        "failed_total": int(q.get("failed_total", 0)),
        "dead_letters": len(WA_DEAD),
        "paused": bool(WA_ENGINE.state.get("paused", False)),
        "instances": safe_instances,
        "recent_errors": safe_errors,
        "privacy": "Operational counts only; recipient numbers, message bodies, QR data, pairing codes, and bridge tokens are withheld.",
    }


# ---------------------------------------------------------------------------
# MAIN PUBLISH
# ---------------------------------------------------------------------------
async def publish_profile(profile: Dict, tsap_id: str, score: int | None = None,
                          photo_path: Optional[str] = None) -> Dict:
    """
    One profile → Telegram LIVE channels + WhatsApp (mode batti).
    Returns detailed per-channel result.
    """
    cfg = config()
    targets = post_targets(profile)
    # ``score`` is a deprecated legacy argument and intentionally ignored.
    caption = build_caption(profile, tsap_id)
    wa_text = build_whatsapp_text(profile, tsap_id)

    tg_results = []
    for chat in targets["routing_candidates"]:
        key = (tsap_id, chat)
        if key in _SEEN:
            tg_results.append({"channel": chat, "ok": True, "skipped": "duplicate"})
            continue
        res = await _send_telegram(chat, caption, photo_path, cfg)
        res["channel"] = chat
        tg_results.append(res)
        if res.get("ok") and not res.get("dry_run"):
            _SEEN.add(key)
        await asyncio.sleep(cfg["rate_limit_seconds"])

    # ── WHATSAPP: Telegram ayyaka → anti-ban queue (random 120–170s gap) ──
    wa_plan = {"mode": cfg["wa_mode"], "queued": False}
    if cfg["wa_mode"] != "off":
        wa_targets = cfg["wa_to"] if cfg["wa_mode"] == "cloud_api" else cfg["wa_bridge_targets"]
        if wa_targets:
            random.shuffle(wa_targets)   # order kuda random (spam pattern kanipinchadu)
        wa_plan = enqueue_whatsapp(wa_targets, wa_text, image_id=tsap_id,
                                   image_path=photo_path, priority=1, kind="channel_post")
    wa_results = [wa_plan]

    entry = {
        "tsap_id": tsap_id,
        "name": profile.get("full_name", ""),
        "at": datetime.utcnow().isoformat(),
        "telegram": tg_results,
        "whatsapp": {"mode": cfg["wa_mode"], "results": wa_results,
                     "antiban": {"gap": f"{int(WA_ENGINE.cfg()['min_gap'])}–{int(WA_ENGINE.cfg()['max_gap'])}s random",
                                 "sent_today": WA_ENGINE.daily_count(),
                                 "warmup_cap": WA_ENGINE.warmup_cap()}},
        "not_routing_eligible": targets["not_routing_eligible"],
        "external_status_checked": False,
        "hashtags": targets["hashtags"],
        "ok": all(x.get("ok") for x in tg_results) if tg_results else False,
        "dry_run": cfg["dry_run"],
    }
    PUBLISH_LOG.append(entry)
    _append_log_file(entry)
    return entry


_PRIVATE_LOG_KEYS = {
    "target", "targets", "phone", "phones", "recipient", "recipients", "to", "wa_to",
    "text", "text_preview", "message", "message_body", "body", "caption", "whatsapp_text",
    "share_text", "pairing_code", "token", "qr", "qr_data",
}


def _safe_log_value(value: object, key: str = "") -> object:
    key_l = key.lower()
    if key_l in _PRIVATE_LOG_KEYS or any(marker in key_l for marker in ("phone", "recipient", "pairing", "token")):
        return "[withheld]"
    if key_l in {"error", "last_error", "description"}:
        return "operation failed" if value else ""
    if isinstance(value, dict):
        return {str(child_key): _safe_log_value(child_value, str(child_key))
                for child_key, child_value in value.items()}
    if isinstance(value, list):
        return [_safe_log_value(child, key) for child in value]
    return value


def _safe_log_entry(entry: Dict) -> Dict:
    return _safe_log_value(entry) if isinstance(entry, dict) else {"event": "redacted"}


def _append_log_file(entry: Dict):
    try:
        atomic_append_line(LOG_FILE, json.dumps(_safe_log_entry(entry), ensure_ascii=False) + "\n")
    except Exception:
        pass


def read_log(limit: int = 50) -> List[Dict]:
    try:
        safe_limit = max(1, min(int(limit), 200))
    except (TypeError, ValueError):
        safe_limit = 50
    if not os.path.exists(LOG_FILE):
        return [_safe_log_entry(item) for item in PUBLISH_LOG[-safe_limit:]]
    try:
        lines = open(LOG_FILE, encoding="utf-8").read().strip().split("\n")
        return [_safe_log_entry(json.loads(x)) for x in lines[-safe_limit:] if x.strip()]
    except Exception:
        return [_safe_log_entry(item) for item in PUBLISH_LOG[-safe_limit:]]


# ---------------------------------------------------------------------------
# QUEUE (register endpoint block avvakunda background lo post)
# ---------------------------------------------------------------------------
def enqueue(profile: Dict, tsap_id: str, score: int | None = None, photo_path: Optional[str] = None) -> Dict:
    """Queue a profile post; deprecated ``score`` argument is ignored and never stored."""
    job = {"profile": profile, "tsap_id": tsap_id,
           "photo_path": photo_path, "queued_at": datetime.utcnow().isoformat()}
    PUBLISH_QUEUE.append(job)
    return {"queued": True, "position": len(PUBLISH_QUEUE), "tsap_id": tsap_id,
            "targets": post_targets(profile)["routing_candidates"]}


async def _worker_loop(interval: float = 2.0):
    while True:
        if PUBLISH_QUEUE:
            job = PUBLISH_QUEUE.pop(0)
            try:
                await publish_profile(job["profile"], job["tsap_id"], photo_path=job["photo_path"])
            except Exception:
                _append_log_file({"tsap_id": "publisher-worker", "ok": False,
                                  "error": "publisher worker iteration failed",
                                  "at": datetime.utcnow().isoformat()})
        await asyncio.sleep(interval)


def start_worker() -> bool:
    """FastAPI startup లో call chey — background queue worker start అవుతుంది."""
    global _WORKER_TASK
    try:
        loop = asyncio.get_event_loop()
        if _WORKER_TASK is None or _WORKER_TASK.done():
            _WORKER_TASK = loop.create_task(_worker_loop())
            start_wa_worker()
            return True
    except Exception:
        pass
    return False


def worker_running() -> bool:
    return _WORKER_TASK is not None and not _WORKER_TASK.done()


# ---------------------------------------------------------------------------
# READ-ONLY STATUS CLI — python publisher.py
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    print("STATUS:", json.dumps(publish_status(), indent=2, ensure_ascii=False))
    print("\nNo sample profile is created and no channel post is sent by this command.")
    print("\n--- WHATSAPP ANTI-BAN STATUS ---")
    print(json.dumps(WA_ENGINE.stats(), indent=2, ensure_ascii=False))
