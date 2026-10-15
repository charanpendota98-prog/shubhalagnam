"""
Core JSON persistence for profiles, payments, OTPs, interests, and related data.

The file remains a single-process system of record; production startup performs
strict integrity checks before restoring it. Writes use a private temporary file,
fsync, and atomic replace so a container rebuild does not replace a valid database
with a partially written one.
"""
from __future__ import annotations

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


def save(payload: dict, force: bool = False) -> bool:
    """Persist one JSON snapshot via a private temp file and atomic replacement.

    ``force=True`` bypasses the optional debounce and is required for registration
    checkpoints and other operations that must be durable before a success response.
    """
    global _last_save
    now = time.time()
    with _SAVE_LOCK:
        if not force and (now - _last_save) < SAVE_DEBOUNCE_S:
            return False

        temporary_path = None
        file_descriptor = None
        try:
            target = os.path.abspath(DB_FILE)
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


def snapshot(users, interests, payments, otps, verified_phones, views, saves, digest) -> dict:
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
    }
