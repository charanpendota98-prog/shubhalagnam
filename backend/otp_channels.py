"""
📱🌊 WAVE 18 — FREE OTP CHANNELS (multi-channel sender + fallback chain)
============================================================================
"OTP free ga ela pampali?" — options (India, honest):
  1. WHATSAPP (own session/bridge) — FREE ✅ (mana WA bridge worker unna session nunchi)
     → WHATSAPP_MODE=bridge + bridge connected → priority-0 fast lane (60–120s gap).
  2. TELEGRAM (linked users) — FREE ✅ (mana bot nunchi linked chat_id ki DM)
     → BOT_TOKEN + user /link chesi unte.
  3. SMS provider (MSG91/Fast2SMS) — trial FREE, tarvata ~₹0.15/SMS (env keys unte).

Priority: OTP_CHANNELS env (default "wa,telegram,sms"). First success wins.
If no configured delivery channel succeeds, OTP delivery fails closed; codes are never returned to the client.
Returns {ok, channel, detail} — channel ∈ wa|telegram|sms|none.
"""
from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

OTP_TEXT = "మన వివాహ OTP: {code} (10 min valid). Evariki cheppakandi 🙏"


def _wa_send(phone: str, text: str) -> Dict[str, Any]:
    """WhatsApp bridge queue (FREE — own session). priority=0 fast lane."""
    try:
        from publisher import enqueue_whatsapp  # lazy (circular import avoid)
    except Exception as e:
        return {"ok": False, "detail": f"wa_import:{str(e)[:60]}"}
    try:
        r = enqueue_whatsapp([phone], text, priority=0, kind="otp")
        if r.get("queued"):
            return {"ok": True, "detail": f"wa_queue:{r.get('queued_total', 0)}"}
        return {"ok": False, "detail": str(r.get("reason", "wa_off"))}
    except Exception as e:
        return {"ok": False, "detail": f"wa_err:{str(e)[:60]}"}


def _telegram_send(phone: str, text: str, users: Optional[List[Dict]] = None) -> Dict[str, Any]:
    """Telegram DM to linked chat (FREE). Needs BOT_TOKEN + /link చేసిన user."""
    token = os.getenv("BOT_TOKEN", "").strip()
    if not token:
        return {"ok": False, "detail": "no_bot_token"}
    chat_id = ""
    try:
        for u in (users or []):
            if str(u.get("phone", "")) == str(phone):
                chat_id = str(u.get("telegram_chat_id", "") or u.get("chat_id", ""))
                break
    except Exception:
        pass
    if not chat_id:
        return {"ok": False, "detail": "not_linked (/link చెయ్యండి)"}
    try:
        import urllib.request
        import urllib.parse
        import json
        data = urllib.parse.urlencode({"chat_id": chat_id, "text": text}).encode()
        req = urllib.request.Request(f"https://api.telegram.org/bot{token}/sendMessage",
                                     data=data, method="POST")
        with urllib.request.urlopen(req, timeout=10) as resp:
            j = json.load(resp)
        if j.get("ok"):
            return {"ok": True, "detail": f"tg_chat:{chat_id[-4:]}"}
        return {"ok": False, "detail": f"tg_api:{str(j)[:60]}"}
    except Exception as e:
        return {"ok": False, "detail": f"tg_err:{str(e)[:60]}"}


def _sms_send(phone: str, text: str) -> Dict[str, Any]:
    """SMS provider (MSG91/Fast2SMS) — env keys ఉంటే మాత్రమే (trial free)."""
    key = os.getenv("MSG91_KEY", "").strip() or os.getenv("FAST2SMS_KEY", "").strip()
    if not key:
        return {"ok": False, "detail": "no_sms_key (MSG91_KEY/FAST2SMS_KEY పెట్టండి)"}
    sender = os.getenv("SMS_SENDER", "MNVIVH").strip() or "MNVIVH"
    route = os.getenv("SMS_ROUTE", "4").strip() or "4"
    try:
        import urllib.request
        import urllib.parse
        if os.getenv("MSG91_KEY", "").strip():
            url = ("https://api.msg91.com/api/sendhttp.php?authkey=" + urllib.parse.quote(key)
                   + "&mobiles=91" + urllib.parse.quote(phone)
                   + "&message=" + urllib.parse.quote(text)
                   + "&sender=" + urllib.parse.quote(sender) + "&route=" + urllib.parse.quote(route)
                   + "&DLT_TE_ID=" + urllib.parse.quote(os.getenv("MSG91_TEMPLATE", "")))
        else:
            url = ("https://www.fast2sms.com/dev/bulkV2?authorization=" + urllib.parse.quote(key)
                   + "&message=" + urllib.parse.quote(text) + "&language=english&route=q"
                   + "&numbers=91" + urllib.parse.quote(phone))
        req = urllib.request.Request(url, method="GET",
                                     headers={"User-Agent": "manavivaha-otp/1.0"})
        with urllib.request.urlopen(req, timeout=12) as resp:
            body = resp.read()[:200].decode("utf-8", "replace")
        if resp.status == 200 and "error" not in body.lower():
            return {"ok": True, "detail": "sms_sent"}
        return {"ok": False, "detail": f"sms_api:{body[:60]}"}
    except Exception as e:
        return {"ok": False, "detail": f"sms_err:{str(e)[:60]}"}


def send_otp(phone: str, code: str, users: Optional[List[Dict]] = None) -> Dict[str, Any]:
    """Try configured delivery channels only; never expose the OTP as a fallback."""
    text = OTP_TEXT.format(code=code)
    order = [c.strip().lower() for c in os.getenv("OTP_CHANNELS", "wa,telegram,sms").split(",") if c.strip()]
    tried: Dict[str, str] = {}
    for ch in order:
        if ch in ("wa", "whatsapp"):
            result = _wa_send(phone, text)
        elif ch in ("telegram", "tg"):
            result = _telegram_send(phone, text, users)
        elif ch == "sms":
            result = _sms_send(phone, text)
        else:
            continue
        tried[ch] = str(result.get("detail", ""))
        if result.get("ok"):
            return {"ok": True, "channel": ch if ch != "tg" else "telegram",
                    "detail": result.get("detail", ""), "tried": tried}
    return {"ok": False, "channel": "none", "detail": "no_channel_configured", "tried": tried}


CHANNEL_TELUGU = {
    "wa": "📲 WhatsApp లో OTP పంపించాం (FREE)",
    "telegram": "✈️ Telegram lo OTP pampinchaam (FREE)",
    "sms": "📩 SMS lo OTP pampinchaam",
    "none": "⚠️ OTP channel configure కాలేదు — support కి చెప్పండి",
}
