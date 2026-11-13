"""
Core JSON persistence for profiles, payments, OTPs, interests, and related data.

The file remains a single-process system of record; production startup performs
strict integrity checks before restoring it. Writes use a private temporary file,
fsync, and atomic replace so a container rebuild does not replace a valid database
with a partially written one.
"""
from __future__ import annotations

import atexit
import json
import os
import tempfile
import threading
import time

DB_FILE = os.getenv("TSAP_DB_FILE") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_db.json")
STORAGE_FORMAT = "mana-vivaha-core-db-v1"
_last_save = 0.0
SAVE_DEBOUNCE_S = 5.0
_SAVE_LOCK = threading.RLock()
_pending_payload: dict | None = None
_pending_target: str | None = None
_pending_timer: threading.Timer | None = None


def load() -> dict:
    """Load the store, retaining the historical empty fallback for dev/test tools.

    Production startup must call main._validate_production_core_database() first;
    that gate rejects missing, unreadable, corrupt, or incomplete production state.
    """
    try:
        if not os.path.exists(DB_FILE):
            return {}
        with open(DB_FILE, encoding="utf-8") as f:
            d = json.load(f) or {}
        return d if isinstance(d, dict) else {}
    except Exception as e:
        print(f"[DB] load skip ({str(e)[:80]}) — fresh start")
        return {}


def _write_atomic(payload: dict, target: str) -> bool:
    """Write ``payload`` atomically to ``target`` under ``_SAVE_LOCK``."""
    global _last_save
    temporary_path = None
    file_descriptor = None
    try:
        directory = os.path.dirname(target)
        os.makedirs(directory, mode=0o700, exist_ok=True)
        file_descriptor, temporary_path = tempfile.mkstemp(
            prefix=f".{os.path.basename(target)}.", suffix=".tmp", dir=directory
        )
        if hasattr(os, "fchmod"):
            os.fchmod(file_descriptor, 0o600)
        with os.fdopen(file_descriptor, "w", encoding="utf-8") as f:
            file_descriptor = None  # fdopen owns and closes it now
            json.dump(payload, f, ensure_ascii=False, default=str)
            f.flush()
            os.fsync(f.fileno())
        os.replace(temporary_path, target)
        temporary_path = None
        if os.name == "posix":
            # mkstemp/fchmod already gave the file mode 0600 before it became visible.
            # Persist the rename where the filesystem supports directory fsync.
            try:
                directory_fd = os.open(directory, os.O_RDONLY)
                try:
                    os.fsync(directory_fd)
                finally:
                    os.close(directory_fd)
            except OSError:
                pass
        _last_save = time.time()
        return True
    except Exception as e:
        print(f"[DB] save fail: {str(e)[:100]}")
        return False
    finally:
        if file_descriptor is not None:
            try:
                os.close(file_descriptor)
            except OSError:
                pass
        if temporary_path is not None:
            try:
                os.unlink(temporary_path)
            except OSError:
                pass


def _flush_timer_callback() -> None:
    """Flush trailing debounced snapshot once the quiet window elapses."""
    flush_pending()


def flush_pending() -> bool:
    """Immediately flush any queued debounced snapshot to disk."""
    global _pending_payload, _pending_target, _pending_timer
    with _SAVE_LOCK:
        timer = _pending_timer
        _pending_timer = None
        if timer is not None:
            try:
                timer.cancel()
            except Exception:
                pass
        payload = _pending_payload
        target = _pending_target
        _pending_payload = None
        _pending_target = None
        if payload is None or not target:
            return False
        # Skip flushing if the active DB_FILE was explicitly redirected elsewhere (e.g. isolated test guards).
        if os.path.abspath(DB_FILE) != target:
            return False
        return _write_atomic(payload, target)


atexit.register(flush_pending)


def save(payload: dict, force: bool = False) -> bool:
    """Persist one JSON snapshot via a private temp file and atomic replacement.

    ``force=True`` bypasses the optional debounce and is required for registration
    checkpoints and other operations that must be durable before a success response.
    When ``force=False`` falls inside ``SAVE_DEBOUNCE_S``, the latest snapshot is
    retained and flushed automatically when the debounce window ends (no silent drop).
    """
    global _pending_payload, _pending_target, _pending_timer
    now = time.time()
    with _SAVE_LOCK:
        target = os.path.abspath(DB_FILE)
        elapsed = now - _last_save
        if not force and elapsed < SAVE_DEBOUNCE_S:
            _pending_payload = payload
            _pending_target = target
            if _pending_timer is None:
                delay = max(0.05, SAVE_DEBOUNCE_S - elapsed)
                timer = threading.Timer(delay, _flush_timer_callback)
                timer.daemon = True
                _pending_timer = timer
                timer.start()
            return False

        if _pending_timer is not None:
            try:
                _pending_timer.cancel()
            except Exception:
                pass
            _pending_timer = None
        _pending_payload = None
        _pending_target = None
        return _write_atomic(payload, target)


def snapshot(users, interests, payments, otps, verified_phones, views, saves, digest,
             reports=None, blocks=None) -> dict:
    # WAVE 24 — CAPS: file unbounded ga peragakudadu (views/saves/digest recent matrame)
    return {
        "storage_format": STORAGE_FORMAT,
        "saved_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "users": users or [],
        "interests": interests or [],
        "payments": payments or [],
        "otps": otps or {},
        "verified_phones": sorted(verified_phones or []),
        "views": (views or [])[-5000:],
        "saves": (saves or [])[-5000:],
        "digest": (digest or [])[-2000:],
        # P1 fix: safety state must survive restarts IN FULL - moderation queue
        # and block list are safety-critical; truncating them silently drops
        # active protections, so no caps here (small records, low volume).
        "reports": list(reports or []),
        "blocks": list(blocks or []),
    }
