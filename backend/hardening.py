"""
🛡️ WAVE 9 — HARDENING LAYER (auth + validation + rate limit + anti-abuse)
=========================================================================
Ee module lo anni security/validation primitives okate chota:
  • HMAC signed auth tokens   → private endpoints ki ownership proof (IDOR fix)
  • Admin key                 → /api/admin/*, /api/leads, /api/moderation (PII leak fix)
  • Sliding-window rate limit → OTP/register/interest/webhook abuse fix
  • Input sanitization        → XSS / control chars / 10MB name fix
  • Strict validators         → phone / age / gender / int ranges (500 + bad-data fix)
  • Idempotency store         → payment replay (double credit) fix
  • Security headers          → clickjacking / MIME sniffing / referrer leak fix
  • Abuse ledger              → admin dashboard ki (429 count, OTP locks, webhook rejects)

Design rule: **tests/harness ki brake veyyakudadu** → WA_TEST_FAST=1 or TSAP_AUTH_MODE=off
unna appudu enforcement skip avutundi (documented, single place).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import re
import secrets
import time
from collections import deque
from datetime import datetime, timedelta
from typing import Any, Deque, Dict, Iterable, List, Optional, Tuple

from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

try:
    import control_auth as CONTROL_AUTH
except Exception:  # keeps isolated utility tests importable
    CONTROL_AUTH = None

# ---------------------------------------------------------------------------
# 0. CONFIG
# ---------------------------------------------------------------------------
APP_VERSION = "2.1-hardened"


def _flag(name: str, default: str = "") -> str:
    return str(os.getenv(name, default)).strip().lower()


def dev_mode() -> bool:
    """Tests / local harness — enforcement skip (ఒక chota decide అవుతుంది)."""
    return _flag("WA_TEST_FAST") in ("1", "true", "yes", "on") or _flag("TSAP_AUTH_MODE") in ("off", "dev", "test")


def auth_enforced() -> bool:
    if _flag("TSAP_AUTH_MODE") in ("off", "dev", "test"):
        return False
    if _flag("TSAP_AUTH_ENFORCE") in ("0", "false", "no"):
        return False
    if _flag("WA_TEST_FAST") in ("1", "true", "yes", "on"):
        return False
    return True


SECRET = os.getenv("TSAP_AUTH_SECRET") or os.getenv("JWT_SECRET") or ""
if not SECRET:
    SECRET = "tsap-dev-secret-" + hashlib.sha256(b"manavivaha-local").hexdigest()[:12]
    SECRET_IS_DEV = True
else:
    SECRET_IS_DEV = False

ADMIN_KEY = os.getenv("ADMIN_KEY", "").strip()
PRODUCTION = _flag("APP_ENV") in ("production", "prod", "live")
if not ADMIN_KEY:
    if PRODUCTION:
        raise RuntimeError("ADMIN_KEY must be configured in production; refusing derived admin credentials")
    ADMIN_KEY = "tsap-admin-" + hmac.new(SECRET.encode(), b"admin", hashlib.sha256).hexdigest()[:10]
    ADMIN_KEY_IS_DERIVED = True
else:
    ADMIN_KEY_IS_DERIVED = False

if PRODUCTION and SECRET_IS_DEV:
    raise RuntimeError("TSAP_AUTH_SECRET/JWT_SECRET must be configured in production")

# 👤 WAVE 41 — STAFF ROLE: owner mathrame full admin; staff ki limited access
# (matchsend + daily matches + showcase + profiles + photos). Money/data/exports → owner only.
STAFF_KEY = os.getenv("STAFF_KEY", "").strip()

# automation key (bots / bridge / cron) — optional; set TSAP_API_KEY in prod
API_KEY = os.getenv("TSAP_API_KEY", "").strip()
TOKEN_TTL_SECONDS = int(os.getenv("TSAP_TOKEN_TTL_HOURS", "720") or 720) * 3600

print(f"[HARDENING] auth={'ENFORCED' if auth_enforced() else 'dev/test bypass'} | "
      f"secret={'env' if not SECRET_IS_DEV else 'derived(dev)'} | "
      f"admin_key={'env' if not ADMIN_KEY_IS_DERIVED else 'derived'} | token_ttl={TOKEN_TTL_SECONDS // 3600}h")


# ---------------------------------------------------------------------------
# 1. AUTH TOKENS (HMAC-SHA256, stateless)
#    token = base64url(payload).base64url(sig)   payload = tsap_id|exp|nonce
# ---------------------------------------------------------------------------
def _b64e(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _b64d(txt: str) -> bytes:
    pad = "=" * (-len(txt) % 4)
    return base64.urlsafe_b64decode(txt + pad)


def sign_token(tsap_id: str, ttl_seconds: int = TOKEN_TTL_SECONDS, scope: str = "user") -> str:
    """User కి signed token — private endpoints కి proof (IDOR fix)."""
    exp = int(time.time()) + int(ttl_seconds)
    payload = f"{tsap_id}|{exp}|{scope}|{secrets.token_hex(4)}"
    sig = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).digest()
    return f"{_b64e(payload.encode())}.{_b64e(sig)}"


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Valid token → {'tsap_id', 'exp', 'scope'} , else None (tamper/expire)."""
    try:
        p_b64, s_b64 = str(token or "").split(".", 1)
        payload = _b64d(p_b64).decode()
        sig = _b64d(s_b64)
        expect = hmac.new(SECRET.encode(), payload.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expect):
            return None
        tsap_id, exp, scope, *_ = (payload.split("|") + ["", "0", "user"])[:4]
        if int(exp) < int(time.time()):
            return None
        return {"tsap_id": tsap_id, "exp": int(exp), "scope": scope or "user"}
    except Exception:
        return None


def token_from_request(request: Request) -> Optional[Dict[str, Any]]:
    h = request.headers if request is not None else {}
    raw = (h.get("x-tsap-token") or h.get("authorization") or "").strip()
    if raw.lower().startswith("bearer "):
        raw = raw[7:].strip()
    if not raw:
        return None
    return verify_token(raw)


def is_admin(request: Request) -> bool:
    if request is None:
        return False
    # Private control session is the preferred production path. Legacy headers
    # remain only for backwards compatibility and are never exposed by the UI.
    if CONTROL_AUTH and CONTROL_AUTH.role(request) == "owner":
        return True
    key = (request.headers.get("x-admin-key") or "").strip()
    if key and hmac.compare_digest(key, ADMIN_KEY):
        return True
    api_key = (request.headers.get("x-api-key") or "").strip()
    if API_KEY and api_key and hmac.compare_digest(api_key, API_KEY):
        return True
    return False


def is_staff(request: Request) -> bool:
    """Worker/control roles can only use endpoints explicitly marked staff_ok."""
    if request is None:
        return False
    if CONTROL_AUTH and CONTROL_AUTH.role(request) in {"worker", "moderator", "support"}:
        return True
    if not STAFF_KEY:
        return False
    key = (request.headers.get("x-admin-key") or "").strip()
    return bool(key) and not is_admin(request) and hmac.compare_digest(key, STAFF_KEY)


def admin_role(request: Request) -> str:
    """'owner' | 'staff' | '' — frontend tab gating + endpoint permissions ki."""
    if is_admin(request):
        return "owner"
    if is_staff(request):
        return "staff"
    return ""


def is_automation(request: Request) -> bool:
    if request is None or not API_KEY:
        return False
    return hmac.compare_digest((request.headers.get("x-api-key") or "").strip(), API_KEY)


# ---------------------------------------------------------------------------
# 2. ABUSE LEDGER (admin dashboard ki) + rate limit
# ---------------------------------------------------------------------------
ABUSE: Dict[str, Any] = {
    "rate_limited": 0, "rate_limit_by_route": {}, "otp_locked": 0, "otp_sent": 0,
    "webhook_rejected": 0, "webhook_replay": 0, "auth_denied": 0, "admin_denied": 0,
    "validation_errors": 0, "validation_by_field": {}, "blocked_interest": 0,
    "duplicate_phone_registers": 0, "sanitized_inputs": 0, "events": deque(maxlen=200),
}
_RL_BUCKETS: Dict[str, Deque[float]] = {}
RL_RULES: Dict[str, Tuple[int, int]] = {          # route-prefix → (max hits, window seconds)
    "POST /api/otp/send": (5, 300),
    "POST /api/otp/verify": (15, 300),
    "POST /api/register": (12, 3600),
    "POST /api/interest/send": (40, 3600),
    "POST /api/payment/webhook": (60, 60),
    "POST /api/leads/quick": (10, 600),
    "POST /api/vendors/register": (10, 3600),
    "POST /api/report": (20, 3600),
    "POST /api/track": (120, 60),
    # 🌊 WAVE 26 — money routes (order spam / verify brute / claim flood / payout spam)
    "POST /api/pay/order": (20, 600),
    "POST /api/pay/verify": (30, 300),
    "POST /api/pay/claim": (10, 600),
    "POST /api/pay/webhook": (120, 60),
    "POST /api/referral/payout": (10, 3600),
}
RL_DEFAULT = (120, 60)
RL_DISABLED = _flag("TSAP_RATE_LIMIT") in ("0", "false", "no", "off")


def client_ip(request: Request) -> str:
    try:
        fwd = request.headers.get("x-forwarded-for", "")
        if fwd:
            return fwd.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    except Exception:
        return "unknown"


def rate_limit_hit(request: Request, extra_key: str = "") -> Optional[Dict[str, Any]]:
    """Sliding window. Limit cross అయితే dict return (caller 429 isthadu), else None."""
    if RL_DISABLED or dev_mode():
        return None
    # 🛡️ admin/bridge key unte bypass — ops/testing ki (admin key secret, evariki telidu).
    #    Maa smoke/verify scripts 10/hour vendor-register limit ni tagulukokunda run avvali.
    try:
        from hardening import is_admin as _ia, is_automation as _iau
        if _ia(request) or _iau(request):
            return None
    except Exception:
        pass
    rule_key = f"{request.method} {request.url.path}"
    max_hits, window = RL_RULES.get(rule_key, RL_DEFAULT)
    ident = f"{client_ip(request)}|{rule_key}|{extra_key}"
    now = time.time()
    bucket = _RL_BUCKETS.setdefault(ident, deque())
    while bucket and bucket[0] < now - window:
        bucket.popleft()
    if len(bucket) >= max_hits:
        retry = int(window - (now - bucket[0])) + 1
        ABUSE["rate_limited"] += 1
        ABUSE["rate_limit_by_route"][rule_key] = ABUSE["rate_limit_by_route"].get(rule_key, 0) + 1
        abuse_log("rate_limit", rule_key, {"ip": client_ip(request), "retry_after": retry})
        return {"limit": max_hits, "window_seconds": window, "retry_after": retry,
                "message_telugu": f"⚠️ చాలా fast గా try chestunnaru — {retry} sec తర్వాత మళ్లీ try చెయ్యండి"}
    bucket.append(now)
    return None


def abuse_log(kind: str, where: str, data: Optional[Dict[str, Any]] = None) -> None:
    ABUSE["events"].append({"at": datetime.utcnow().isoformat(), "kind": kind, "where": where,
                            "data": {k: v for k, v in (data or {}).items() if k not in ("phone", "otp")}})


def abuse_count(kind: str, n: int = 1) -> None:
    """Counter penchadam (webhook replay, OTP locks, blocked attempts…) — admin dashboard కి."""
    ABUSE[kind] = int(ABUSE.get(kind, 0)) + int(n)


def abuse_snapshot() -> Dict[str, Any]:
    """Admin dashboard ki summary (PII ledu)."""
    return {
        "rate_limited": ABUSE["rate_limited"], "rate_limit_by_route": dict(ABUSE["rate_limit_by_route"]),
        "otp_locked": ABUSE["otp_locked"], "otp_sent": ABUSE["otp_sent"],
        "webhook_rejected": ABUSE["webhook_rejected"], "webhook_replay": ABUSE["webhook_replay"],
        "auth_denied": ABUSE["auth_denied"], "admin_denied": ABUSE["admin_denied"],
        "validation_errors": ABUSE["validation_errors"], "validation_by_field": dict(ABUSE["validation_by_field"]),
        "blocked_interest": ABUSE["blocked_interest"], "duplicate_phone_registers": ABUSE["duplicate_phone_registers"],
        "sanitized_inputs": ABUSE["sanitized_inputs"], "recent": list(ABUSE["events"])[-25:],
    }


# ---------------------------------------------------------------------------
# 3. SANITIZATION + VALIDATORS (Telugu error messages, kabatti user ki clear)
# ---------------------------------------------------------------------------
_TAG_RE = re.compile(r"<[^>]*>")
_SCRIPT_RE = re.compile(r"(?i)(javascript:|data:text/html|<script|</script|onerror=|onload=|onclick=)")
_CTRL_RE = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_MULTISPACE_RE = re.compile(r"[ \t]{2,}")
PHONE_RE = re.compile(r"^[6-9]\d{9}$")
NAME_RE = re.compile(r"^[A-Za-z\u0C00-\u0C7F .'\-]{2,60}$")
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{4,255}$")


def clean(value: Any, max_len: int = 200, field: str = "", allow_newlines: bool = False) -> str:
    """HTML/script/control chars theesi, length cap చేసి safe string."""
    try:
        s = "" if value is None else str(value)
    except Exception:
        return ""
    original = s
    s = _CTRL_RE.sub("", s)
    s = _TAG_RE.sub("", s)
    if _SCRIPT_RE.search(s):
        s = _SCRIPT_RE.sub("", s)
        ABUSE["events"].append({"at": datetime.utcnow().isoformat(), "kind": "sanitize_xss",
                                "where": field or "input", "data": {"sample": s[:40]}})
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    if not allow_newlines:
        s = s.replace("\n", " ")
    s = _MULTISPACE_RE.sub(" ", s).strip()
    if len(s) > max_len:
        s = s[:max_len].strip()
    if s != original:
        ABUSE["sanitized_inputs"] += 1
    return s


def req_text(value: Any, field: str, min_len: int = 1, max_len: int = 200, required: bool = True,
             allow_newlines: bool = False, pattern: Optional[re.Pattern] = None,
             pattern_msg: str = "") -> str:
    s = clean(value, max_len=max_len, field=field, allow_newlines=allow_newlines)
    if required and len(s) < min_len:
        validation_error(field, f"⚠️ {field} సరిగ్గా ఇవ్వండి ({min_len}-{max_len} characters)")
    if s and pattern is not None and not pattern.match(s):
        validation_error(field, pattern_msg or f"⚠️ {field} format tappu")
    return s


def req_phone(value: Any, field: str = "phone") -> str:
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    if digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if not PHONE_RE.match(digits):
        validation_error(field, "⚠️ 10 digit mobile number ఇవ్వండి (6/7/8/9 తో start అవ్వాలి)")
    return digits


def req_int(value: Any, field: str, lo: int, hi: int, default: Optional[int] = None) -> int:
    if value in (None, "", "None"):
        if default is not None:
            return default
        validation_error(field, f"⚠️ {field} ఇవ్వండి")
    try:
        if isinstance(value, bool):
            raise ValueError
        s = str(value).strip()
        if s.lower() in ("nan", "inf", "-inf", "none", "null"):
            raise ValueError
        n = int(float(s))
    except Exception:
        validation_error(field, f"⚠️ {field} number గా ఉండాలి")
    if n < lo or n > hi:
        validation_error(field, f"⚠️ {field} {lo}–{hi} madhya లో ఉండాలి (మీరు icchindi: {n})")
    return n


def clamp_int(value: Any, field: str, lo: int, hi: int, default: int) -> int:
    """Range బయట ఉంటే **clamp** (400 కాదు) — limit=-5 → 1, limit=99999 → hi. Junk అయితే 400."""
    if value in (None, "", "None"):
        return default
    try:
        if isinstance(value, bool):
            raise ValueError
        s = str(value).strip()
        if s.lower() in ("nan", "inf", "-inf", "none", "null"):
            raise ValueError
        n = int(float(s))
    except Exception:
        validation_error(field, f"⚠️ {field} number గా ఉండాలి")
    return max(lo, min(hi, n))


def req_choice(value: Any, field: str, allowed: Iterable[str], required: bool = True,
               default: str = "") -> str:
    allowed_list = [str(a) for a in allowed]
    s = clean(value, max_len=60, field=field)
    if not s:
        if required:
            validation_error(field, f"⚠️ {field} select చెయ్యండి ({', '.join(allowed_list[:6])}…)")
        return default
    low = {a.lower(): a for a in allowed_list}
    if s.lower() not in low:
        validation_error(field, f"⚠️ {field} కి '{s}' valid కాదు — ఇవి మాత్రమే: {', '.join(allowed_list[:6])}")
    return low[s.lower()]


def req_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value or "").strip().lower() in ("1", "true", "yes", "on", "y")


def validation_error(field: str, message: str) -> None:
    ABUSE["validation_errors"] += 1
    ABUSE["validation_by_field"][field] = ABUSE["validation_by_field"].get(field, 0) + 1
    abuse_log("validation_error", field)
    raise HTTPException(400, message)


# ---------------------------------------------------------------------------
# 4. GUARDS (ownership + admin)
# ---------------------------------------------------------------------------
def require_owner(request: Request, tsap_id: str) -> None:
    """Private data (inbox/credits/views…) — token lekapote 401. IDOR fix."""
    if not auth_enforced() or is_admin(request) or is_automation(request):
        return
    ident = token_from_request(request)
    if ident and str(ident.get("tsap_id")) == str(tsap_id):
        return
    ABUSE["auth_denied"] += 1
    abuse_log("auth_denied", request.url.path if request else "?", {"has_token": bool(ident)})
    raise HTTPException(401, "🔒 మీ account కి login చెయ్యండి (OTP) — token lekapote ee data chudaleru")


def require_admin(request: Request, staff_ok: bool = False) -> str:
    """Admin/leads/moderation — key lekapote 403. PII leak fix.
    👤 WAVE 41: staff_ok=True aite staff key kooda chali (profiles/matchsend/daily/showcase).
    Returns role: 'owner' | 'staff' (dev bypass → owner)."""
    if dev_mode():
        return "owner"
    role = admin_role(request)
    if role == "owner" or (staff_ok and role == "staff"):
        return role
    ABUSE["admin_denied"] += 1
    abuse_log("admin_denied", request.url.path if request else "?")
    if role == "staff":
        raise HTTPException(403, "🔒 ఇది owner-only section — staff కి money/data permissions లేవు")
    raise HTTPException(403, "🔒 Admin access — X-Admin-Key కావాలి (lekapote మీ team కి చెప్పండి)")


def vendor_token(vendor_id: str) -> str:
    """Vendor కి signed token (vendor dashboard own data — vendor users కి phone OTP లేదు)."""
    return sign_token(f"vendor:{vendor_id}", scope="vendor")


def require_vendor(request: Request, vendor_id: str) -> None:
    """Vendor dashboard — X-Vendor-Token కావాలి (lekapote 401). Vendor data leak fix."""
    if not auth_enforced() or is_admin(request) or is_automation(request):
        return
    raw = ""
    if request is not None:
        raw = (request.headers.get("x-vendor-token") or "").strip()
    ident = verify_token(raw) if raw else None
    if ident and str(ident.get("tsap_id")) == f"vendor:{vendor_id}":
        return
    ABUSE["auth_denied"] += 1
    abuse_log("vendor_auth_denied", vendor_id)
    raise HTTPException(401, "🔒 Vendor dashboard కి మీ vendor token కావాలి (register లో వచ్చింది) — support కి చెప్పండి")


def require_self_credit(request: Request, user: Dict[str, Any]) -> None:
    """Credits balance కి owner token (lekapote balance gurinchi cheppakudadu)."""
    require_owner(request, str((user or {}).get("tsap_id", "")))


# ---------------------------------------------------------------------------
# 5. SECURITY HEADERS + SAFE RESPONSES
# ---------------------------------------------------------------------------
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "X-Permitted-Cross-Domain-Policies": "none",
}
HSTS_HEADER = "Strict-Transport-Security"


def apply_security_headers(headers) -> None:
    for k, v in SECURITY_HEADERS.items():
        headers.setdefault(k, v)


def too_many(limit_info: Dict[str, Any]) -> JSONResponse:
    return JSONResponse(status_code=429, content={
        "success": False, "error": "rate_limited", **limit_info,
        "help_telugu": "Anti-spam protection — konchem aagi మళ్లీ try చెయ్యండి."},
        headers={"Retry-After": str(limit_info.get("retry_after", 60))})


# ---------------------------------------------------------------------------
# 6. IDEMPOTENCY (payment replay fix)
# ---------------------------------------------------------------------------
_SEEN_KEYS: Dict[str, float] = {}
_IDEMPOTENCY_TTL = 30 * 24 * 3600


def seen(key: str) -> bool:
    """True = idi ముందు already process అయ్యింది (replay!)."""
    if not key:
        return False
    now = time.time()
    for k in [k for k, t in _SEEN_KEYS.items() if t < now - _IDEMPOTENCY_TTL][:200]:
        _SEEN_KEYS.pop(k, None)
    if key in _SEEN_KEYS:
        return True
    _SEEN_KEYS[key] = now
    return False


def seen_count() -> int:
    return len(_SEEN_KEYS)


# ---------------------------------------------------------------------------
# 7. SECURITY POSTURE (public endpoint ki)
# ---------------------------------------------------------------------------
def posture() -> Dict[str, Any]:
    return {
        "version": APP_VERSION,
        "auth_enforced": auth_enforced(),
        "admin_key_set": bool(ADMIN_KEY),
        "api_key_set": bool(API_KEY),
        "rate_limit": "off" if RL_DISABLED else "sliding-window",
        "rate_rules": len(RL_RULES),
        "token_ttl_hours": TOKEN_TTL_SECONDS // 3600,
        "headers": sorted(list(SECURITY_HEADERS.keys()) + [HSTS_HEADER]),
        "idempotency_entries": seen_count(),
        "numbers_policy": "🔒 phone numbers public API లో ఎప్పుడు లేదు — interest accept తో మాత్రమే exchange (consent)",
    }
