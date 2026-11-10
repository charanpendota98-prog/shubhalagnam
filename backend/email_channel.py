"""
📧 WAVE 22 — EMAIL DELIVERY CHANNEL (verification / OTP / reset)
============================================================================
Email lo OTP/verification codes pampadaniki single module — provider-agnostic.

Modes (EMAIL_MODE env):
  off    — default. Fail closed: delivery reports not-configured, codes are
           never logged, never returned to any client.
  mock   — local testing only. Email text stdout ki print avuthundi (code
           visible in server log), send "success" ga report avuthundi.
           PRODUCTION lo asalu vadakudadu.
  resend — Resend API (https://resend.com). Needs RESEND_API_KEY +
           MANA_VIVAHA_EMAIL_FROM (verified domain sender).

Free-tier grounding (Resend, fetched 2026-11-10):
  100 emails/day (UTC calendar day) + 3,000/month hard cap, per-recipient
  counts, 10 req/s. Quota aipothe sends fail — we surface that as detail.

Security rules:
  * Code eppatiki client response lo raadu; "sent" anipisthe message generic.
  * Fail closed: provider error / no key / mode off → ok=False, detail short.
  * From-address env-driven; verified domain (manavivaha.in) sender only.
"""
from __future__ import annotations

import json
import os
import urllib.request
from typing import Any, Dict

EMAIL_MODE = os.getenv("EMAIL_MODE", "off").strip().lower() or "off"
RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
EMAIL_FROM = os.getenv("MANA_VIVAHA_EMAIL_FROM", "").strip()
APP_NAME = os.getenv("APP_NAME", "Mana Vivaha").strip() or "Mana Vivaha"


def send_email(to: str, subject: str, text: str) -> Dict[str, Any]:
    """Send one plain-text email. Returns {ok, channel, detail} — fail closed."""
    to = (to or "").strip().lower()
    if not to or "@" not in to:
        return {"ok": False, "channel": "email", "detail": "bad_recipient"}
    if EMAIL_MODE == "mock":
        # LOCAL TEST ONLY — body redacted even here; codes never land in logs.
        print(f"[EMAIL:mock] to={to} subject={subject!r} (body redacted)")
        return {"ok": True, "channel": "email", "detail": "mock_sent"}
    if EMAIL_MODE != "resend":
        return {"ok": False, "channel": "email", "detail": "email_mode_off"}
    if not RESEND_API_KEY:
        return {"ok": False, "channel": "email", "detail": "no_resend_key"}
    if not EMAIL_FROM:
        return {"ok": False, "channel": "email", "detail": "no_from_address"}
    try:
        payload = json.dumps({
            "from": EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "text": text,
        }).encode("utf-8")
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=payload, method="POST",
            headers={
                "Authorization": "Bearer " + RESEND_API_KEY,
                "Content-Type": "application/json",
                "User-Agent": "manavivaha-email/1.0",
            })
        with urllib.request.urlopen(req, timeout=15) as resp:
            body = resp.read()[:200].decode("utf-8", "replace")
        if 200 <= resp.status < 300:
            return {"ok": True, "channel": "email", "detail": "resend_sent"}
        return {"ok": False, "channel": "email", "detail": f"resend_http:{resp.status}"}
    except urllib.error.HTTPError as e:
        # 429 = rate/daily quota, 4xx = config — both surfaced, never retried blind.
        return {"ok": False, "channel": "email", "detail": f"resend_http:{e.code}"}
    except Exception as e:
        return {"ok": False, "channel": "email", "detail": f"resend_err:{str(e)[:60]}"}


def otp_email_text(code: str) -> str:
    return (f"{APP_NAME} OTP: {code} (10 min valid). "
            "Evariki cheppakandi. Mee request kakapothe ignore cheyyandi.")


def verify_email_text(code: str) -> str:
    return (f"{APP_NAME} email verification code: {code} (10 min valid). "
            "Ee code tho mee email mee account ki verify avuthundi. "
            "Mee request kakapothe ignore cheyyandi.")
