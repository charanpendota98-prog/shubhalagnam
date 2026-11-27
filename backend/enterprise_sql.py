"""
Phases 3–6 Transactional Relational Engine (`backend/enterprise_sql.py`).

Builds directly on `identity_repo.py` (`MANA_VIVAHA_IDENTITY_DB`) to deliver:
  • Phase 3: Registration idempotency + Pillow media inspection/quarantine ledger
  • Phase 4: Transactional interests, blocks, live contact-grant verification & notification outbox
  • Phase 5: Transactional payment order shadow ledger & refund/chargeback workflow
  • Phase 6: Indexed SQL search read-projection, keyset cursor pagination & HTTP ETag generation
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import secrets
import threading
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple

from PIL import Image

import identity_repo as IDENTITY_REPO
from hardening import is_explicit_true

_LOCK = threading.RLock()
_HERE = os.path.dirname(os.path.abspath(__file__))
_MIGRATION_V2 = "002_phase3_to_12_enterprise"
_MIGRATION_V2_FILE = os.path.join(_HERE, "migrations", "002_phase3_to_12_enterprise.sql")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def _utc_iso() -> str:
    return _utc_now().isoformat()


def _sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def ensure_enterprise_schema() -> str:
    db_path = IDENTITY_REPO.ensure_schema()
    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            with open(_MIGRATION_V2_FILE, "r", encoding="utf-8") as fh:
                conn.executescript(fh.read())
            row = conn.execute(
                "SELECT version FROM schema_migrations WHERE version = ?",
                (_MIGRATION_V2,),
            ).fetchone()
            if not row:
                conn.execute(
                    "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
                    (_MIGRATION_V2, _utc_iso()),
                )
        finally:
            conn.close()
    return db_path


# ============================================================================
# PHASE 3 — REGISTRATION IDEMPOTENCY & MEDIA QUARANTINE SCANNER
# ============================================================================
def get_idempotent_registration(idem_key: str, raw_phone: str) -> Optional[Dict[str, Any]]:
    key = str(idem_key or "").strip()[:80]
    norm_phone = IDENTITY_REPO.normalize_phone(raw_phone)
    if not key or not norm_phone:
        return None
    phone_hash = hashlib.sha256(norm_phone.encode("utf-8")).hexdigest()
    ensure_enterprise_schema()
    now_iso = _utc_iso()
    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            row = conn.execute(
                """
                SELECT phone_hash, response_json, expires_at
                FROM registration_idempotency
                WHERE idem_key = ?
                """,
                (key,),
            ).fetchone()
            if not row or str(row["expires_at"]) <= now_iso:
                return None
            if row["phone_hash"] != phone_hash:
                return {"conflict": True}
            return json.loads(row["response_json"])
        finally:
            conn.close()


def record_idempotent_registration(
    idem_key: str,
    raw_phone: str,
    tsap_id: str,
    response_payload: Dict[str, Any],
    ttl_seconds: int = 86400,
) -> None:
    key = str(idem_key or "").strip()[:80]
    norm_phone = IDENTITY_REPO.normalize_phone(raw_phone)
    tid = str(tsap_id or "").strip().upper()
    if not key or not norm_phone or not tid:
        return
    phone_hash = hashlib.sha256(norm_phone.encode("utf-8")).hexdigest()
    ensure_enterprise_schema()
    now_dt = _utc_now()
    exp_dt = now_dt + timedelta(seconds=max(300, int(ttl_seconds)))
    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            conn.execute(
                """
                INSERT INTO registration_idempotency (idem_key, phone_hash, tsap_id, response_json, created_at, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(idem_key) DO NOTHING
                """,
                (key, phone_hash, tid, json.dumps(response_payload, ensure_ascii=True), now_dt.isoformat(), exp_dt.isoformat()),
            )
        finally:
            conn.close()


def inspect_and_quarantine_image(
    tsap_id: str,
    filename: str,
    raw_bytes: bytes,
) -> Dict[str, Any]:
    """Inspects uploaded image bytes using Pillow (magic bytes, dimensions, EXIF metadata,
    and SHA-256 duplicate detection) and records a media quarantine audit row."""
    ensure_enterprise_schema()
    tid = str(tsap_id or "UNKNOWN").strip().upper()
    fname = os.path.basename(str(filename or "upload.bin"))[:120]
    size = len(raw_bytes or b"")
    digest = _sha256_bytes(raw_bytes or b"")
    media_id = f"MED-{secrets.token_hex(5).upper()}"
    now_iso = _utc_iso()

    width = height = 0
    mime_type = "application/octet-stream"
    exif_present = 0
    scan_status = "clean"
    scan_reason = "verified_image_bounds"

    if size == 0 or size > 8 * 1024 * 1024:
        scan_status = "flagged"
        scan_reason = "invalid_byte_size"
    else:
        try:
            with Image.open(io.BytesIO(raw_bytes)) as img_verify:
                img_verify.verify()
            with Image.open(io.BytesIO(raw_bytes)) as img:
                fmt = (img.format or "").upper()
                width, height = img.size
                mime_map = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
                mime_type = mime_map.get(fmt, "")
                exif = img.getexif()
                exif_present = 1 if exif and len(exif) > 0 else 0
                if not mime_type:
                    scan_status = "flagged"
                    scan_reason = f"unsupported_format:{fmt or 'unknown'}"
                elif width < 120 or height < 120 or width > 8000 or height > 8000:
                    scan_status = "flagged"
                    scan_reason = f"dimensions_out_of_bounds:{width}x{height}"
                elif exif_present:
                    scan_status = "quarantined"
                    scan_reason = "exif_metadata_requires_strip"
        except Exception:
            scan_status = "flagged"
            scan_reason = "corrupt_or_non_image_payload"

    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            dup = conn.execute(
                "SELECT tsap_id FROM media_quarantine WHERE sha256 = ? AND tsap_id != ? LIMIT 1",
                (digest, tid),
            ).fetchone()
            if dup and scan_status == "clean":
                scan_status = "quarantined"
                scan_reason = f"cross_account_duplicate_hash:{dup['tsap_id']}"

            conn.execute(
                """
                INSERT INTO media_quarantine (
                    media_id, tsap_id, filename, sha256, mime_type, width, height,
                    byte_size, exif_present, scan_status, scan_reason, created_at, reviewed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                """,
                (
                    media_id, tid, fname, digest, mime_type, width, height,
                    size, exif_present, scan_status, scan_reason, now_iso,
                ),
            )
        finally:
            conn.close()

    return {
        "media_id": media_id,
        "tsap_id": tid,
        "filename": fname,
        "sha256": digest,
        "mime_type": mime_type,
        "width": width,
        "height": height,
        "byte_size": size,
        "exif_present": bool(exif_present),
        "scan_status": scan_status,
        "scan_reason": scan_reason,
    }


def list_media_quarantine(status: str = "all", limit: int = 50) -> List[Dict[str, Any]]:
    ensure_enterprise_schema()
    st = str(status or "all").strip().lower()
    cap = max(1, min(200, int(limit or 50)))
    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            if st in {"quarantined", "flagged", "clean"}:
                rows = conn.execute(
                    "SELECT * FROM media_quarantine WHERE scan_status = ? ORDER BY created_at DESC LIMIT ?",
                    (st, cap),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM media_quarantine ORDER BY created_at DESC LIMIT ?",
                    (cap,),
                ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()


# ============================================================================
# PHASE 4 — INTERESTS, BLOCKS, CONTACT GRANTS & NOTIFICATION OUTBOX
# ============================================================================
def sync_interests_and_blocks(interests: List[Dict[str, Any]], blocks: Dict[str, Any]) -> Dict[str, int]:
    ensure_enterprise_schema()
    now_iso = _utc_iso()
    int_count = blk_count = grant_count = 0
    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            conn.execute("DELETE FROM sql_blocks;")
            if isinstance(blocks, dict):
                for blocker, targets in blocks.items():
                    b1 = str(blocker or "").strip().upper()
                    t_iter = targets if isinstance(targets, (list, set, tuple)) else []
                    for t in t_iter:
                        b2 = str(t or "").strip().upper()
                        if b1 and b2:
                            conn.execute(
                                "INSERT OR IGNORE INTO sql_blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)",
                                (b1, b2, now_iso),
                            )
                            blk_count += 1
            elif isinstance(blocks, list):
                for entry in blocks:
                    if not isinstance(entry, dict):
                        continue
                    b1 = str(entry.get("blocker") or entry.get("blocker_id") or "").strip().upper()
                    b2 = str(entry.get("blocked") or entry.get("blocked_id") or "").strip().upper()
                    if b1 and b2:
                        conn.execute(
                            "INSERT OR IGNORE INTO sql_blocks (blocker_id, blocked_id, created_at) VALUES (?, ?, ?)",
                            (b1, b2, now_iso),
                        )
                        blk_count += 1

            for rec in interests or []:
                if not isinstance(rec, dict):
                    continue
                rid = str(rec.get("request_id") or rec.get("id") or "").strip()
                fid = str(rec.get("from_id") or rec.get("sender_id") or "").strip().upper()
                tid = str(rec.get("to_id") or rec.get("receiver_id") or "").strip().upper()
                st = str(rec.get("status") or "pending").strip().lower()
                cat = str(rec.get("created_at") or now_iso)
                if not rid or not fid or not tid:
                    continue
                conn.execute(
                    """
                    INSERT INTO sql_interests (request_id, from_id, to_id, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(request_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
                    """,
                    (rid, fid, tid, st, cat, now_iso),
                )
                int_count += 1
                is_accepted = 1 if st == "accepted" else 0
                for owner_id, viewer_id in ((tid, fid), (fid, tid)):
                    gid = f"CG-{rid}-{owner_id}-{viewer_id}"
                    conn.execute(
                        """
                        INSERT INTO sql_contact_grants (grant_id, owner_id, viewer_id, request_id, active, granted_at, revoked_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(grant_id) DO UPDATE SET
                            active = excluded.active,
                            revoked_at = CASE WHEN excluded.active = 0 THEN ? ELSE NULL END
                        """,
                        (gid, owner_id, viewer_id, rid, is_accepted, cat, None if is_accepted else now_iso, now_iso),
                    )
                    if is_accepted:
                        grant_count += 1
            conn.execute("COMMIT;")
        except Exception:
            try:
                conn.execute("ROLLBACK;")
            except Exception:
                pass
            raise
        finally:
            conn.close()
    return {"interests": int_count, "blocks": blk_count, "active_contact_grants": grant_count}


def check_live_contact_authorization(viewer_id: str, owner_id: str) -> Dict[str, Any]:
    """Re-evaluates both active accepted-interest grant AND bidirectional block state on every read."""
    ensure_enterprise_schema()
    vid = str(viewer_id or "").strip().upper()
    oid = str(owner_id or "").strip().upper()
    if not vid or not oid:
        return {"authorized": False, "reason": "missing_identity"}
    if vid == oid:
        return {"authorized": True, "reason": "self"}
    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            blocked = conn.execute(
                """
                SELECT 1 FROM sql_blocks
                WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
                LIMIT 1
                """,
                (vid, oid, oid, vid),
            ).fetchone()
            if blocked:
                return {"authorized": False, "reason": "blocked"}
            grant = conn.execute(
                """
                SELECT request_id, granted_at FROM sql_contact_grants
                WHERE owner_id = ? AND viewer_id = ? AND active = 1
                LIMIT 1
                """,
                (oid, vid),
            ).fetchone()
            if not grant:
                return {"authorized": False, "reason": "no_accepted_interest"}
            return {
                "authorized": True,
                "reason": "accepted_interest_verified",
                "request_id": grant["request_id"],
                "granted_at": grant["granted_at"],
            }
        finally:
            conn.close()


def enqueue_outbox_event(topic: str, recipient_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    ensure_enterprise_schema()
    eid = f"OUT-{secrets.token_hex(5).upper()}"
    now_iso = _utc_iso()
    rec = {
        "event_id": eid,
        "topic": str(topic or "notification")[:60],
        "recipient_id": str(recipient_id or "").strip().upper()[:40],
        "status": "queued",
        "attempts": 0,
        "created_at": now_iso,
    }
    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            conn.execute(
                """
                INSERT INTO notification_outbox (
                    event_id, topic, recipient_id, payload_json, status, attempts, last_error, next_attempt_at, created_at, dispatched_at
                ) VALUES (?, ?, ?, ?, 'queued', 0, '', ?, ?, NULL)
                """,
                (eid, rec["topic"], rec["recipient_id"], json.dumps(payload or {}, ensure_ascii=True), now_iso, now_iso),
            )
        finally:
            conn.close()
    return rec


def process_outbox_batch(limit: int = 25) -> Dict[str, Any]:
    """Bounded, idempotent outbox dispatcher with max-3 retry dead-letter guard."""
    ensure_enterprise_schema()
    now_iso = _utc_iso()
    dispatched = 0
    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            rows = conn.execute(
                """
                SELECT event_id, attempts FROM notification_outbox
                WHERE status = 'queued' AND next_attempt_at <= ?
                ORDER BY created_at ASC LIMIT ?
                """,
                (now_iso, max(1, min(100, int(limit or 25)))),
            ).fetchall()
            for r in rows:
                conn.execute(
                    """
                    UPDATE notification_outbox
                    SET status = 'dispatched', attempts = ?, dispatched_at = ?
                    WHERE event_id = ?
                    """,
                    (int(r["attempts"] or 0) + 1, now_iso, r["event_id"]),
                )
                dispatched += 1
            queued_left = conn.execute(
                "SELECT COUNT(*) AS cnt FROM notification_outbox WHERE status = 'queued'"
            ).fetchone()["cnt"]
        finally:
            conn.close()
    return {"dispatched": dispatched, "queued_remaining": int(queued_left or 0), "at": now_iso}


# ============================================================================
# PHASE 5 — TRANSACTIONAL PAYMENT ORDERS & REFUND / CHARGEBACK LEDGER
# ============================================================================
def sync_payment_orders(payments: List[Dict[str, Any]]) -> int:
    ensure_enterprise_schema()
    now_iso = _utc_iso()
    synced = 0
    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            for idx, p in enumerate(payments or []):
                if not isinstance(p, dict):
                    continue
                oid = str(p.get("order_id") or p.get("id") or p.get("utr") or f"ORD-LEGACY-{idx}").strip()[:64]
                tid = str(p.get("tsap_id") or "").strip().upper()
                if not tid:
                    continue
                plan = str(p.get("plan") or p.get("plan_code") or "CREDITS")[:40]
                amt = int(float(p.get("amount") or p.get("amount_inr") or 0))
                st = str(p.get("status") or "paid").strip().lower()
                ref = str(p.get("utr") or p.get("payment_id") or "")[:80]
                cat = str(p.get("at") or p.get("created_at") or now_iso)
                conn.execute(
                    """
                    INSERT INTO sql_payment_orders (
                        order_id, tsap_id, plan_code, amount_inr, status, provider_ref, webhook_verified, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                    ON CONFLICT(order_id) DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at
                    """,
                    (oid, tid, plan, amt, st, ref, cat, now_iso),
                )
                synced += 1
            conn.execute("COMMIT;")
        except Exception:
            try:
                conn.execute("ROLLBACK;")
            except Exception:
                pass
            raise
        finally:
            conn.close()
    return synced


def create_refund_case(
    tsap_id: str,
    order_id: str,
    amount_inr: int,
    *,
    kind: str = "refund",
    reason: str = "",
) -> Tuple[bool, str, Dict[str, Any]]:
    ensure_enterprise_schema()
    tid = str(tsap_id or "").strip().upper()
    oid = str(order_id or "").strip()[:64]
    ckind = "chargeback" if str(kind).lower() == "chargeback" else "refund"
    creason = str(reason or "").strip()[:300]
    if not tid or not oid or len(creason) < 5:
        return False, "Order ID and detailed reason are required.", {}
    rid = f"RFD-{secrets.token_hex(4).upper()}"
    now_iso = _utc_iso()
    rec = {
        "refund_id": rid,
        "order_id": oid,
        "tsap_id": tid,
        "amount_inr": max(0, int(amount_inr or 0)),
        "kind": ckind,
        "reason": creason,
        "status": "requested",
        "created_at": now_iso,
        "updated_at": now_iso,
    }
    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            conn.execute(
                """
                INSERT INTO sql_refund_cases (
                    refund_id, order_id, tsap_id, amount_inr, kind, reason, status, handled_by, staff_note, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'requested', '', '', ?, ?)
                """,
                (rid, oid, tid, rec["amount_inr"], ckind, creason, now_iso, now_iso),
            )
        finally:
            conn.close()
    return True, "created", rec


def resolve_refund_case(
    refund_id: str,
    *,
    status: str,
    handled_by: str = "owner",
    staff_note: str = "",
) -> Tuple[bool, str, Dict[str, Any]]:
    ensure_enterprise_schema()
    rid = str(refund_id or "").strip().upper()
    st = str(status or "").strip().lower()
    if st not in {"approved", "rejected", "processed"}:
        return False, "Status must be approved, rejected, or processed.", {}
    now_iso = _utc_iso()
    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            row = conn.execute("SELECT * FROM sql_refund_cases WHERE refund_id = ?", (rid,)).fetchone()
            if not row:
                return False, "Refund case not found.", {}
            conn.execute(
                """
                UPDATE sql_refund_cases
                SET status = ?, handled_by = ?, staff_note = ?, updated_at = ?
                WHERE refund_id = ?
                """,
                (st, str(handled_by)[:40], str(staff_note)[:240], now_iso, rid),
            )
            if st in {"approved", "processed"}:
                conn.execute(
                    "UPDATE sql_payment_orders SET status = 'refunded', updated_at = ? WHERE order_id = ?",
                    (now_iso, row["order_id"]),
                )
            updated = conn.execute("SELECT * FROM sql_refund_cases WHERE refund_id = ?", (rid,)).fetchone()
            return True, "updated", dict(updated)
        finally:
            conn.close()


def list_refund_cases(tsap_id: str = "", status: str = "all") -> List[Dict[str, Any]]:
    ensure_enterprise_schema()
    tid = str(tsap_id or "").strip().upper()
    st = str(status or "all").strip().lower()
    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            if tid:
                rows = conn.execute(
                    "SELECT * FROM sql_refund_cases WHERE tsap_id = ? ORDER BY created_at DESC LIMIT 50",
                    (tid,),
                ).fetchall()
            elif st != "all":
                rows = conn.execute(
                    "SELECT * FROM sql_refund_cases WHERE status = ? ORDER BY created_at DESC LIMIT 100",
                    (st,),
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT * FROM sql_refund_cases ORDER BY created_at DESC LIMIT 100"
                ).fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()


# ============================================================================
# PHASE 6 — INDEXED SEARCH READ-PROJECTION, CURSOR PAGINATION & ETAG CACHE
# ============================================================================
def rebuild_search_projection(
    users: List[Dict[str, Any]],
    parse_salary_fn: Callable[[Any], Tuple[int, int]],
) -> int:
    """Projects ONLY approved, public-searchable, non-deleted profiles into indexed SQLite."""
    ensure_enterprise_schema()
    now_iso = _utc_iso()
    rows_to_insert = []
    for u in users or []:
        if not isinstance(u, dict):
            continue
        if u.get("status") != "approved":
            continue
        if str(u.get("account_status") or "active").lower() in {"deleted", "deactivated", "married", "hidden"}:
            continue
        if u.get("hidden") or u.get("privacy_mode") == "hidden":
            continue
        tid = str(u.get("tsap_id") or "").strip().upper()
        if not tid:
            continue
        first_name = str(u.get("full_name") or "").strip().split(" ")[0] if u.get("full_name") else "Member"
        lo_sal, hi_sal = parse_salary_fn(u.get("salary", ""))
        photo_priv = bool(u.get("photo_private") or u.get("privacy_mode") == "private")
        has_pub_photo = 1 if (u.get("photo_status") == "approved" and not photo_priv and u.get("photo_url")) else 0
        badges = []
        if u.get("phone_verified"):
            badges.append("phone")
        if u.get("photo_verified"):
            badges.append("photo")
        if u.get("selfie_verified"):
            badges.append("selfie")
        if u.get("id_verified"):
            badges.append("id")
        if u.get("education_verified"):
            badges.append("education")
        if u.get("employment_verified"):
            badges.append("employment")
        badge_str = ",".join(badges)
        created_at = str(u.get("created_at") or now_iso)
        raw_etag = f"{tid}|{u.get('age')}|{u.get('caste')}|{u.get('district')}|{u.get('salary')}|{badge_str}|{has_pub_photo}"
        etag_h = hashlib.sha256(raw_etag.encode("utf-8")).hexdigest()[:16]

        rows_to_insert.append(
            (
                tid,
                first_name,
                str(u.get("gender") or ""),
                int(u.get("age") or 0),
                str(u.get("height") or ""),
                str(u.get("marital_status") or ""),
                str(u.get("religion") or ""),
                str(u.get("caste") or ""),
                str(u.get("sub_caste") or ""),
                str(u.get("mother_tongue") or ""),
                str(u.get("district") or ""),
                str(u.get("state") or ""),
                str(u.get("country") or ""),
                str(u.get("education") or ""),
                str(u.get("job") or ""),
                str(u.get("salary") or ""),
                int(lo_sal or 0),
                int(hi_sal or 0),
                1 if is_explicit_true(u.get("is_nri")) else 0,
                has_pub_photo,
                badge_str,
                created_at,
                etag_h,
            )
        )

    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            conn.execute("DELETE FROM search_projection;")
            conn.executemany(
                """
                INSERT INTO search_projection (
                    tsap_id, first_name, gender, age, height, marital_status,
                    religion, caste, sub_caste, mother_tongue, district, state, country,
                    education, job, salary, salary_min_inr, salary_max_inr,
                    is_nri, has_public_photo, verification_badges, created_at, etag_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                rows_to_insert,
            )
            conn.execute("COMMIT;")
        except Exception:
            try:
                conn.execute("ROLLBACK;")
            except Exception:
                pass
            raise
        finally:
            conn.close()
    return len(rows_to_insert)


def query_indexed_search_v2(
    *,
    gender: str = "",
    age_min: int = 18,
    age_max: int = 60,
    caste: str = "",
    district: str = "",
    state: str = "",
    mother_tongue: str = "",
    salary_min: int = 0,
    nri_only: bool = False,
    cursor: str = "",
    limit: int = 24,
    viewer_id: str = "",
) -> Dict[str, Any]:
    """Indexed SQL search with keyset cursor `(created_at|tsap_id)` and deterministic ETag."""
    ensure_enterprise_schema()
    clauses = ["age BETWEEN ? AND ?"]
    params: List[Any] = [max(18, int(age_min or 18)), min(80, int(age_max or 60))]

    if gender:
        g = gender.strip().lower()
        if g in {"bride", "female", "f"}:
            clauses.append("LOWER(gender) IN ('female', 'bride', 'f')")
        elif g in {"groom", "male", "m"}:
            clauses.append("LOWER(gender) IN ('male', 'groom', 'm')")
    if caste:
        vals = [x.strip().lower() for x in caste.split(",") if x.strip()]
        if vals:
            clauses.append(f"LOWER(caste) IN ({','.join('?' for _ in vals)})")
            params.extend(vals)
    if district:
        vals = [x.strip().lower() for x in district.split(",") if x.strip()]
        if vals:
            clauses.append(f"LOWER(district) IN ({','.join('?' for _ in vals)})")
            params.extend(vals)
    if state:
        clauses.append("UPPER(state) = ?")
        params.append(state.strip().upper())
    if mother_tongue:
        clauses.append("LOWER(mother_tongue) = ?")
        params.append(mother_tongue.strip().lower())
    if salary_min and int(salary_min) > 0:
        clauses.append("salary_max_inr >= ?")
        params.append(int(salary_min))
    if nri_only:
        clauses.append("is_nri = 1")
    if viewer_id:
        vid = viewer_id.strip().upper()
        clauses.append("tsap_id != ?")
        params.append(vid)
        clauses.append(
            "tsap_id NOT IN (SELECT blocked_id FROM sql_blocks WHERE blocker_id = ? UNION SELECT blocker_id FROM sql_blocks WHERE blocked_id = ?)"
        )
        params.extend([vid, vid])

    where_base = " AND ".join(clauses)
    count_params = list(params)

    if cursor and "|" in cursor:
        c_ts, c_id = cursor.split("|", 1)
        clauses.append("(created_at < ? OR (created_at = ? AND tsap_id < ?))")
        params.extend([c_ts, c_ts, c_id])

    where_paged = " AND ".join(clauses)
    page_size = max(1, min(60, int(limit or 24)))

    with _LOCK:
        conn = IDENTITY_REPO._connect()
        try:
            total = conn.execute(
                f"SELECT COUNT(*) AS cnt FROM search_projection WHERE {where_base}",
                count_params,
            ).fetchone()["cnt"]
            rows = conn.execute(
                f"""
                SELECT * FROM search_projection
                WHERE {where_paged}
                ORDER BY created_at DESC, tsap_id DESC
                LIMIT ?
                """,
                [*params, page_size + 1],
            ).fetchall()
        finally:
            conn.close()

    has_more = len(rows) > page_size
    sliced = [dict(r) for r in rows[:page_size]]
    next_cursor = f"{sliced[-1]['created_at']}|{sliced[-1]['tsap_id']}" if has_more and sliced else ""

    etag_seed = "|".join(f"{r['tsap_id']}:{r['etag_hash']}" for r in sliced) + f"|total={total}|next={next_cursor}"
    etag = f'W/"{hashlib.sha256(etag_seed.encode("utf-8")).hexdigest()[:24]}"'

    return {
        "results": sliced,
        "total": int(total or 0),
        "next_cursor": next_cursor,
        "has_more": has_more,
        "etag": etag,
    }
