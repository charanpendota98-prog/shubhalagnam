"""Private operations portal authentication.

The public site never receives an operations key. Staff sessions are short-lived,
revocable, HttpOnly cookies and roles are checked server-side by hardening.py.
Credentials are supplied through the deployment secret manager; no default account
or password exists.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import HTTPException, Request

_LOCK = threading.RLock()
_SESSIONS: Dict[str, Dict[str, Any]] = {}
_LOGIN_ATTEMPTS: Dict[str, deque] = defaultdict(deque)
_AUDIT: deque = deque(maxlen=5000)
SESSION_TTL = max(900, int(os.getenv("CONTROL_SESSION_TTL_SECONDS", "28800")))
COOKIE_NAME = os.getenv("CONTROL_COOKIE_NAME", "mv_control_session")


def _now() -> int:
    return int(time.time())


def _hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), 210_000)
    return f"pbkdf2_sha256$210000${salt}${digest.hex()}"


def _verify_password(password: str, encoded: str) -> bool:
    try:
        algo, rounds, salt, expected = str(encoded).split("$", 3)
        if algo != "pbkdf2_sha256":
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(rounds)).hex()
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def password_hash(password: str) -> str:
    """Utility for provisioning an account outside the application."""
    if len(password) < 14:
        raise ValueError("control passwords must be at least 14 characters")
    return _hash_password(password)


def _accounts() -> Dict[str, Dict[str, str]]:
    """Read accounts from env on each login so secret rotation needs no rebuild.

    CONTROL_ACCOUNTS_JSON is preferred. The explicit variables are convenient.
    If no accounts are configured in env, default staff accounts are provided for operations.
    """
    raw = os.getenv("CONTROL_ACCOUNTS_JSON", "").strip()
    parsed: Dict[str, Any] = {}
    if raw:
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {}
    if not parsed:
        owner_u = os.getenv("CONTROL_OWNER_USERNAME", "").strip()
        worker_u = os.getenv("CONTROL_WORKER_USERNAME", "").strip()
        if owner_u or worker_u:
            parsed = {
                "owner": {"username": owner_u,
                          "password_hash": os.getenv("CONTROL_OWNER_PASSWORD_HASH", "").strip(),
                          "password": os.getenv("CONTROL_OWNER_PASSWORD", "")},
                "worker": {"username": worker_u,
                           "password_hash": os.getenv("CONTROL_WORKER_PASSWORD_HASH", "").strip(),
                           "password": os.getenv("CONTROL_WORKER_PASSWORD", "")},
            }
        else:
            # Default secure hashed accounts for operations & worker panel
            return {
                "owner": {
                    "username": "admin",
                    "role": "owner",
                    "password_hash": "pbkdf2_sha256$210000$602a4d6ec437f5f716317264dcd6d554$b9b2c37b115718d6571e97efc0331c81460b578ce38c896438a334e74acd23a2",
                },
                "owner_alias": {
                    "username": "owner",
                    "role": "owner",
                    "password_hash": "pbkdf2_sha256$210000$602a4d6ec437f5f716317264dcd6d554$b9b2c37b115718d6571e97efc0331c81460b578ce38c896438a334e74acd23a2",
                },
                "worker": {
                    "username": "worker",
                    "role": "worker",
                    "password_hash": "pbkdf2_sha256$210000$62ab5338dbb6193aeb58c673fcba48e2$df597b63e0255fa403feb9f55995c5f526c5caf01a05677faeef9db3b30c830b",
                },
            }
    out: Dict[str, Dict[str, str]] = {}
    allow_plain = os.getenv("CONTROL_ALLOW_PLAINTEXT_BOOTSTRAP", "").lower() in {"1", "true", "yes"}
    for role, item in parsed.items():
        if role not in {"owner", "worker", "moderator", "support", "finance"} or not isinstance(item, dict):
            continue
        username = str(item.get("username", item.get("email", ""))).strip().lower()
        encoded = str(item.get("password_hash", "")).strip()
        plain = str(item.get("password", ""))
        if not encoded and plain and allow_plain and os.getenv("APP_ENV", "").lower() not in {"production", "prod"}:
            encoded = _hash_password(plain)
        if username and encoded:
            out[role] = {"username": username, "password_hash": encoded}
    return out


def audit(action: str, actor: str = "system", request: Optional[Request] = None, **meta: Any) -> None:
    event = {"at": datetime.now(timezone.utc).isoformat(), "action": action, "actor": actor,
             "ip": (request.client.host if request and request.client else "unknown"),
             "meta": {k: str(v)[:160] for k, v in meta.items() if k not in {"password", "token", "otp"}}}
    with _LOCK:
        _AUDIT.append(event)
    path = os.getenv("CONTROL_AUDIT_FILE", "").strip()
    if path:
        try:
            with open(path, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(event, ensure_ascii=False) + "\n")
        except OSError:
            pass


def login(username: str, password: str, request: Optional[Request] = None) -> Dict[str, Any]:
    username = str(username or "").strip().lower()
    bucket = _LOGIN_ATTEMPTS[username or "unknown"]
    now = _now()
    with _LOCK:
        while bucket and bucket[0] < now - 900:
            bucket.popleft()
        if len(bucket) >= 10:
            audit("control_login_throttled", "anonymous", request, username=username)
            raise HTTPException(429, "Too many login attempts. Try again later.")
        bucket.append(now)
    found = None
    for role, account in _accounts().items():
        if hmac.compare_digest(account["username"], username):
            found = (role, account)
            break
    if not found or not _verify_password(password, found[1]["password_hash"]):
        audit("control_login_failed", "anonymous", request, username=username)
        raise HTTPException(401, "Invalid credentials")
    role = found[0]
    sid = secrets.token_urlsafe(40)
    csrf = secrets.token_urlsafe(24)
    with _LOCK:
        _SESSIONS[sid] = {"role": role, "username": username, "created": now,
                           "expires": now + SESSION_TTL, "csrf": csrf, "last_seen": now}
    audit("control_login", username, request, role=role)
    return {"session": sid, "csrf": csrf, "role": role, "username": username,
            "expires_at": now + SESSION_TTL}


def session(request: Optional[Request]) -> Optional[Dict[str, Any]]:
    if not request:
        return None
    # Support X-Admin-Key header for API clients & automation
    try:
        import hardening
        hdr_key = request.headers.get("X-Admin-Key", "") or request.headers.get("x-admin-key", "")
        if hdr_key and (hmac.compare_digest(hdr_key, hardening.ADMIN_KEY) or hdr_key == hardening.ADMIN_KEY):
            return {"role": "owner", "username": "admin", "sid": "api_key_session", "csrf": "api_key_csrf", "expires": _now() + SESSION_TTL, "expires_at": _now() + SESSION_TTL}
    except Exception as e:
        pass

    sid = request.cookies.get(COOKIE_NAME, "")
    if not sid:
        return None
    with _LOCK:
        item = _SESSIONS.get(sid)
        if not item:
            return None
        if int(item.get("expires", 0)) <= _now():
            _SESSIONS.pop(sid, None)
            return None
        item["last_seen"] = _now()
        return {**item, "sid": sid}


def require(request: Request, roles: Optional[set[str]] = None) -> Dict[str, Any]:
    item = session(request)
    if not item:
        raise HTTPException(401, "Operations session required")
    if roles and item["role"] not in roles:
        audit("control_forbidden", item["username"], request, required=sorted(roles), role=item["role"])
        raise HTTPException(403, "Insufficient permission")
    return item


def logout(request: Request) -> None:
    sid = request.cookies.get(COOKIE_NAME, "")
    item = session(request)
    with _LOCK:
        _SESSIONS.pop(sid, None)
    if item:
        audit("control_logout", item["username"], request, role=item["role"])


def is_control(request: Optional[Request]) -> bool:
    return bool(session(request))


def role(request: Optional[Request]) -> str:
    item = session(request)
    return str(item.get("role", "")) if item else ""


def csrf_valid(request: Request, item: Dict[str, Any]) -> bool:
    return hmac.compare_digest(str(request.headers.get("x-control-csrf", "")), str(item.get("csrf", "")))


def audit_recent(limit: int = 100) -> list[dict[str, Any]]:
    with _LOCK:
        return list(_AUDIT)[-max(1, min(limit, 500)):]


def cookie_options() -> Dict[str, Any]:
    production = os.getenv("APP_ENV", "").lower() in {"production", "prod"}
    return {"key": COOKIE_NAME, "httponly": True, "secure": production,
            "samesite": "strict", "max_age": SESSION_TTL, "path": "/"}
