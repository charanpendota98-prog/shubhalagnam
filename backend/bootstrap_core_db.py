"""One-time, explicit bootstrap/marker upgrade for an empty production core DB.

This program is separate from server startup so no persistent environment flag can
silently authorize an empty replacement volume on a later rebuild. It only creates
an absent database after explicit confirmation, or marks a structurally valid legacy
empty database after separate explicit confirmation. It never overwrites records.
"""
from __future__ import annotations

import argparse
import json
import os

import db_store as DBSTORE

_COLLECTIONS = {
    "users": list,
    "interests": list,
    "payments": list,
    "otps": dict,
    "verified_phones": list,
    "views": list,
    "saves": list,
    "digest": list,
}


def initialize_empty_core_db(*, confirm_new_install: bool = False,
                              confirm_existing_empty: bool = False) -> dict:
    if confirm_new_install == confirm_existing_empty:
        raise RuntimeError("choose exactly one explicit confirmation: new install or existing empty database")

    raw_root = os.getenv("MANA_VIVAHA_PERSISTENT_ROOT", "").strip()
    raw_path = str(DBSTORE.DB_FILE)
    if not raw_root or not os.path.isabs(raw_root):
        raise RuntimeError("MANA_VIVAHA_PERSISTENT_ROOT must be an absolute durable-volume path")
    if not os.path.isabs(raw_path):
        raise RuntimeError("TSAP_DB_FILE must be an absolute path inside the durable volume")

    root = os.path.realpath(raw_root)
    path = os.path.abspath(raw_path)
    resolved_path = os.path.realpath(path)
    if root == "/" or root == "/tmp" or root.startswith("/tmp/"):
        raise RuntimeError("empty database bootstrap cannot use the container root or ephemeral /tmp")
    try:
        within_root = os.path.commonpath((root, resolved_path)) == root
    except ValueError:
        within_root = False
    if not within_root:
        raise RuntimeError("TSAP_DB_FILE must resolve inside MANA_VIVAHA_PERSISTENT_ROOT")
    if os.path.islink(path):
        raise RuntimeError("refusing to initialize through a database symlink; preserve and inspect the target first")

    path_exists = os.path.lexists(path)
    if not path_exists:
        if not confirm_new_install:
            raise RuntimeError("database path is absent; --confirm-new-install is required")
        payload = DBSTORE.snapshot([], [], [], {}, set(), [], [], [])
    else:
        if not confirm_existing_empty:
            raise RuntimeError("refusing to overwrite an existing database path; preserve and inspect it first")
        if not os.path.isfile(path):
            raise RuntimeError("existing database path is not a regular file; it was not modified")
        try:
            with open(path, encoding="utf-8") as handle:
                payload = json.load(handle)
        except Exception as exc:
            raise RuntimeError("existing database is unreadable/corrupt; it was not modified") from exc
        if not isinstance(payload, dict):
            raise RuntimeError("existing database is not a JSON object; it was not modified")
        missing = [key for key in _COLLECTIONS if key not in payload]
        if missing:
            raise RuntimeError("existing database lacks required collections; it was not modified")
        if any(not isinstance(payload.get(key), expected) for key, expected in _COLLECTIONS.items()):
            raise RuntimeError("existing database has invalid collection types; it was not modified")
        if any(payload[key] for key in _COLLECTIONS):
            raise RuntimeError("existing database contains records; it was not modified")
        # Preserve all prior metadata/unknown fields; the only change is the marker.
        payload["storage_format"] = DBSTORE.STORAGE_FORMAT

    if not DBSTORE.save(payload, force=True):
        raise RuntimeError("could not safely initialize/mark the explicitly approved empty core database")

    try:
        with open(path, encoding="utf-8") as handle:
            created = json.load(handle)
    except Exception as exc:
        raise RuntimeError("core database could not be verified; preserve the file for inspection") from exc
    if not isinstance(created, dict) or created.get("storage_format") != DBSTORE.STORAGE_FORMAT:
        raise RuntimeError("core database did not contain the expected storage marker")
    if any(created.get(key) for key in _COLLECTIONS):
        raise RuntimeError("core database was not empty after bootstrap; preserve it for inspection")
    return {"file": path, "users": 0, "storage_format": created["storage_format"]}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    confirmation = parser.add_mutually_exclusive_group(required=True)
    confirmation.add_argument(
        "--confirm-new-install",
        action="store_true",
        help="confirm this durable volume is new and contains no existing records",
    )
    confirmation.add_argument(
        "--confirm-existing-empty",
        action="store_true",
        help="confirm a verified backup exists and this legacy database has no records",
    )
    args = parser.parse_args()
    try:
        result = initialize_empty_core_db(
            confirm_new_install=args.confirm_new_install,
            confirm_existing_empty=args.confirm_existing_empty,
        )
    except Exception as exc:
        parser.exit(2, f"bootstrap refused: {exc}\n")
    print("Initialized empty core DB: %s (%s)" % (result["file"], result["storage_format"]))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
