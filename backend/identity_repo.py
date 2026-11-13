"""
Phase 2 — Transactional Identity, Credentials, Sessions & Reconciliation Slice.

Provides:
  1. SQLite WAL transactional store using the portable 001_phase2_identity.sql schema
     (ready for PostgreSQL parity in staging/production).
  2. Shadow-write & dual-read reconciliation against the JSON core database without
     ever silently dropping or overwriting source JSON records.
  3. Per-device session registry (`member_sessions`) and hashed OTP challenge ledger.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import sqlite3
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple

_LOCK = threading.RLock()
_MIGRATION_VERSION = "001_phase2_identity"
_HERE = os.path.dirname(os.path.abspath(__file__))
_MIGRATION_FILE = os.path.join(_HERE, "migrations", "001_phase2_identity.sql")


def _utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def resolve_identity_db_path() -> str:
    explicit = os.getenv("MANA_VIVAHA_IDENTITY_DB", "").strip()
    if explicit:
        return os.path.abspath(explicit)
    state_dir = os.getenv("MANA_VIVAHA_STATE_DIR", "").strip()
    if state_dir:
        return os.path.abspath(os.path.join(state_dir, "identity_phase2.sqlite3"))
    return os.path.abspath(os.path.join(_HERE, "identity_phase2.sqlite3"))


def normalize_phone(raw: Any) -> str:
    digits = re.sub(r"\D", "", str(raw or ""))
    if len(digits) == 12 and digits.startswith("91"):
        digits = digits[2:]
    return digits if len(digits) >= 10 else ""


def member_identity_checksum(user: Dict[str, Any], token_ver: int = 0) -> str:
    canonical = {
        "tsap_id": str(user.get("tsap_id") or "").strip().upper(),
        "phone": normalize_phone(user.get("phone")),
        "email": str(user.get("email") or "").strip().lower(),
        "full_name": str(user.get("full_name") or "").strip(),
        "gender": str(user.get("gender") or "").strip(),
        "status": str(user.get("status") or "pending").strip().lower(),
        "account_status": str(user.get("account_status") or "active").strip().lower(),
        "password_hash": str(user.get("password_hash") or ""),
        "token_version": int(token_ver or 0),
    }
    blob = json.dumps(canonical, sort_keys=True, separators=(",", ":"), ensure_ascii=True)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()[:32]


def _connect() -> sqlite3.Connection:
    db_path = resolve_identity_db_path()
    parent = os.path.dirname(db_path)
    if parent:
        os.makedirs(parent, mode=0o700, exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=15.0, isolation_level=None)
    conn.row_factory = sqlite3.Row
    if os.name == "posix" and os.path.exists(db_path):
        try:
            os.chmod(db_path, 0o600)
        except OSError:
            pass
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn


def ensure_schema() -> str:
    db_path = resolve_identity_db_path()
    with _LOCK:
        conn = _connect()
        try:
            with open(_MIGRATION_FILE, "r", encoding="utf-8") as fh:
                ddl = fh.read()
            conn.executescript(ddl)
            row = conn.execute(
                "SELECT version FROM schema_migrations WHERE version = ?",
                (_MIGRATION_VERSION,),
            ).fetchone()
            if not row:
                conn.execute(
                    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
                    (_MIGRATION_VERSION, _utc_now()),
                )
        finally:
            conn.close()
        if os.name == "posix" and os.path.exists(db_path):
            try:
                os.chmod(db_path, 0o600)
            except OSError:
                pass
    return db_path


def upsert_member_from_dict(user: Dict[str, Any], token_ver: int = 0) -> Tuple[bool, str]:
    """Shadow-write a single member profile + credential state into SQLite."""
    if not isinstance(user, dict):
        return False, "invalid_user"
    tid = str(user.get("tsap_id") or "").strip().upper()
    if not tid:
        return False, "missing_tsap_id"
    phone = normalize_phone(user.get("phone")) or None
    email = str(user.get("email") or "").strip().lower() or None
    full_name = str(user.get("full_name") or "").strip()
    gender = str(user.get("gender") or "").strip()
    status = str(user.get("status") or "pending").strip().lower()
    account_status = str(user.get("account_status") or "active").strip().lower()
    created_at = str(user.get("created_at") or _utc_now())
    now = _utc_now()
    checksum = member_identity_checksum(user, token_ver)
    pw_hash = str(user.get("password_hash") or "")

    ensure_schema()
    with _LOCK:
        conn = _connect()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            if phone:
                clash = conn.execute(
                    "SELECT tsap_id FROM identity_members WHERE normalized_phone = ? AND tsap_id != ?",
                    (phone, tid),
                ).fetchone()
                if clash:
                    conn.execute("ROLLBACK;")
                    return False, f"duplicate_phone_conflict:{clash['tsap_id']}"

            conn.execute(
                """
                INSERT INTO identity_members (
                    tsap_id, normalized_phone, email, full_name, gender,
                    status, account_status, created_at, updated_at, json_checksum
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(tsap_id) DO UPDATE SET
                    normalized_phone = excluded.normalized_phone,
                    email = excluded.email,
                    full_name = excluded.full_name,
                    gender = excluded.gender,
                    status = excluded.status,
                    account_status = excluded.account_status,
                    updated_at = excluded.updated_at,
                    json_checksum = excluded.json_checksum
                """,
                (tid, phone, email, full_name, gender, status, account_status, created_at, now, checksum),
            )
            conn.execute(
                """
                INSERT INTO identity_credentials (tsap_id, password_hash, token_version, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(tsap_id) DO UPDATE SET
                    password_hash = excluded.password_hash,
                    token_version = excluded.token_version,
                    updated_at = excluded.updated_at
                """,
                (tid, pw_hash, int(token_ver or 0), now),
            )
            conn.execute("COMMIT;")
            return True, "synced"
        except Exception as exc:
            try:
                conn.execute("ROLLBACK;")
            except Exception:
                pass
            return False, f"sql_error:{exc}"
        finally:
            conn.close()


def sync_from_users(
    users: List[Dict[str, Any]],
    token_version_fn: Optional[Callable[[str], int]] = None,
) -> Dict[str, Any]:
    """Idempotently syncs JSON core users into transactional SQLite without mutating JSON."""
    ensure_schema()
    synced = 0
    conflicts: List[Dict[str, str]] = []
    for u in users or []:
        if not isinstance(u, dict):
            continue
        tid = str(u.get("tsap_id") or "").strip().upper()
        if not tid:
            continue
        tv = int(token_version_fn(tid)) if token_version_fn else 0
        ok, msg = upsert_member_from_dict(u, token_ver=tv)
        if ok:
            synced += 1
        else:
            conflicts.append({"tsap_id": tid, "reason": msg})
    return {
        "synced": synced,
        "conflict_count": len(conflicts),
        "conflicts": conflicts[:50],
        "at": _utc_now(),
    }


def reconcile(
    users: List[Dict[str, Any]],
    token_version_fn: Optional[Callable[[str], int]] = None,
) -> Dict[str, Any]:
    """Dual-read parity check comparing authoritative JSON users vs SQLite shadow tables."""
    ensure_schema()
    json_by_id: Dict[str, Dict[str, Any]] = {}
    seen_phones: Dict[str, str] = {}
    json_phone_duplicates: List[Dict[str, str]] = []

    for u in users or []:
        if not isinstance(u, dict):
            continue
        tid = str(u.get("tsap_id") or "").strip().upper()
        if not tid:
            continue
        json_by_id[tid] = u
        ph = normalize_phone(u.get("phone"))
        if ph:
            if ph in seen_phones and seen_phones[ph] != tid:
                json_phone_duplicates.append({"first_id": seen_phones[ph], "second_id": tid})
            else:
                seen_phones[ph] = tid

    with _LOCK:
        conn = _connect()
        try:
            rows = conn.execute(
                """
                SELECT m.tsap_id, m.json_checksum, c.token_version
                FROM identity_members m
                LEFT JOIN identity_credentials c ON c.tsap_id = m.tsap_id
                """
            ).fetchall()
            active_sessions = conn.execute(
                "SELECT COUNT(*) AS cnt FROM member_sessions WHERE revoked_at IS NULL AND expires_at > ?",
                (_utc_now(),),
            ).fetchone()["cnt"]
        finally:
            conn.close()

    sql_by_id = {str(r["tsap_id"]): dict(r) for r in rows}
    missing_in_sql = sorted(tid for tid in json_by_id if tid not in sql_by_id)
    extra_in_sql = sorted(tid for tid in sql_by_id if tid not in json_by_id)
    checksum_mismatches: List[str] = []

    for tid, u in json_by_id.items():
        s_row = sql_by_id.get(tid)
        if not s_row:
            continue
        tv = int(token_version_fn(tid)) if token_version_fn else 0
        expected = member_identity_checksum(u, tv)
        if s_row.get("json_checksum") != expected or int(s_row.get("token_version") or 0) != tv:
            checksum_mismatches.append(tid)

    parity_ok = (
        not missing_in_sql
        and not extra_in_sql
        and not checksum_mismatches
        and not json_phone_duplicates
    )
    return {
        "migration_version": _MIGRATION_VERSION,
        "db_file": os.path.basename(resolve_identity_db_path()),
        "json_count": len(json_by_id),
        "sql_count": len(sql_by_id),
        "missing_in_sql_count": len(missing_in_sql),
        "missing_in_sql": missing_in_sql[:30],
        "extra_in_sql_count": len(extra_in_sql),
        "extra_in_sql": extra_in_sql[:30],
        "checksum_mismatch_count": len(checksum_mismatches),
        "checksum_mismatches": checksum_mismatches[:30],
        "json_phone_duplicate_count": len(json_phone_duplicates),
        "json_phone_duplicates": json_phone_duplicates[:20],
        "active_sessions": int(active_sessions or 0),
        "parity_ok": parity_ok,
        "checked_at": _utc_now(),
    }


def _mask_ip(ip_addr: str) -> str:
    raw = str(ip_addr or "").strip()
    if "." in raw:
        parts = raw.split(".")
        if len(parts) == 4:
            return f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"
    if ":" in raw:
        parts = raw.split(":")
        return ":".join(parts[:3]) + "::/48"
    return ""


def register_session(
    user: Dict[str, Any],
    *,
    device_label: str = "Web Browser",
    ip_addr: str = "",
    user_agent: str = "",
    cookie_mode: bool = False,
    token_ver: int = 0,
    ttl_seconds: int = 720 * 3600,
) -> Dict[str, Any]:
    tid = str(user.get("tsap_id") or "").strip().upper()
    upsert_member_from_dict(user, token_ver=token_ver)
    sid = f"SES-{secrets.token_hex(8).upper()}"
    now_dt = datetime.now(timezone.utc).replace(microsecond=0)
    exp_dt = now_dt + timedelta(seconds=max(300, int(ttl_seconds)))
    label = re.sub(r"[\r\n\t]+", " ", str(device_label or "Web Browser")).strip()[:80] or "Web Browser"
    ua = re.sub(r"[\r\n\t]+", " ", str(user_agent or "")).strip()[:160]
    ip_pref = _mask_ip(ip_addr)

    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO member_sessions (
                    session_id, tsap_id, device_label, ip_prefix, user_agent,
                    cookie_mode, token_version, created_at, last_seen_at, expires_at, revoked_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                """,
                (
                    sid,
                    tid,
                    label,
                    ip_pref,
                    ua,
                    1 if cookie_mode else 0,
                    int(token_ver or 0),
                    now_dt.isoformat(),
                    now_dt.isoformat(),
                    exp_dt.isoformat(),
                ),
            )
        finally:
            conn.close()

    return {
        "session_id": sid,
        "tsap_id": tid,
        "device_label": label,
        "ip_prefix": ip_pref,
        "cookie_mode": bool(cookie_mode),
        "token_version": int(token_ver or 0),
        "created_at": now_dt.isoformat(),
        "expires_at": exp_dt.isoformat(),
        "status": "active",
    }


def list_sessions(tsap_id: str, current_token_ver: int = 0) -> List[Dict[str, Any]]:
    tid = str(tsap_id or "").strip().upper()
    if not tid:
        return []
    ensure_schema()
    now_iso = _utc_now()
    with _LOCK:
        conn = _connect()
        try:
            rows = conn.execute(
                """
                SELECT session_id, tsap_id, device_label, ip_prefix, user_agent,
                       cookie_mode, token_version, created_at, last_seen_at, expires_at, revoked_at
                FROM member_sessions
                WHERE tsap_id = ?
                ORDER BY created_at DESC
                LIMIT 30
                """,
                (tid,),
            ).fetchall()
        finally:
            conn.close()

    out: List[Dict[str, Any]] = []
    for r in rows:
        revoked = bool(r["revoked_at"]) or int(r["token_version"] or 0) < int(current_token_ver or 0)
        expired = str(r["expires_at"] or "") <= now_iso
        status = "revoked" if revoked else ("expired" if expired else "active")
        out.append(
            {
                "session_id": r["session_id"],
                "device_label": r["device_label"],
                "ip_prefix": r["ip_prefix"],
                "user_agent": r["user_agent"],
                "cookie_mode": bool(r["cookie_mode"]),
                "token_version": int(r["token_version"] or 0),
                "created_at": r["created_at"],
                "last_seen_at": r["last_seen_at"],
                "expires_at": r["expires_at"],
                "revoked_at": r["revoked_at"],
                "status": status,
            }
        )
    return out


def revoke_session(tsap_id: str, session_id: str) -> bool:
    tid = str(tsap_id or "").strip().upper()
    sid = str(session_id or "").strip().upper()
    if not tid or not sid:
        return False
    ensure_schema()
    now = _utc_now()
    with _LOCK:
        conn = _connect()
        try:
            cur = conn.execute(
                """
                UPDATE member_sessions
                SET revoked_at = ?
                WHERE session_id = ? AND tsap_id = ? AND revoked_at IS NULL
                """,
                (now, sid, tid),
            )
            return (cur.rowcount or 0) > 0
        finally:
            conn.close()


def revoke_all_sessions(tsap_id: str, new_token_ver: int) -> int:
    tid = str(tsap_id or "").strip().upper()
    if not tid:
        return 0
    ensure_schema()
    now = _utc_now()
    with _LOCK:
        conn = _connect()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            cur = conn.execute(
                "UPDATE member_sessions SET revoked_at = ? WHERE tsap_id = ? AND revoked_at IS NULL",
                (now, tid),
            )
            conn.execute(
                "UPDATE identity_credentials SET token_version = ?, updated_at = ? WHERE tsap_id = ?",
                (int(new_token_ver), now, tid),
            )
            conn.execute("COMMIT;")
            return int(cur.rowcount or 0)
        except Exception:
            try:
                conn.execute("ROLLBACK;")
            except Exception:
                pass
            return 0
        finally:
            conn.close()


def record_otp_challenge(raw_phone: str, purpose: str = "login", ttl_seconds: int = 600) -> str:
    norm = normalize_phone(raw_phone)
    if not norm:
        return ""
    ensure_schema()
    cid = f"OTP-{secrets.token_hex(6).upper()}"
    phone_hash = hashlib.sha256(norm.encode("utf-8")).hexdigest()
    now_dt = datetime.now(timezone.utc).replace(microsecond=0)
    exp_dt = now_dt + timedelta(seconds=max(60, int(ttl_seconds)))
    with _LOCK:
        conn = _connect()
        try:
            conn.execute(
                """
                INSERT INTO otp_challenges (challenge_id, phone_hash, purpose, attempts, created_at, expires_at, consumed_at)
                VALUES (?, ?, ?, 0, ?, ?, NULL)
                """,
                (cid, phone_hash, str(purpose or "login")[:32], now_dt.isoformat(), exp_dt.isoformat()),
            )
        finally:
            conn.close()
    return cid
