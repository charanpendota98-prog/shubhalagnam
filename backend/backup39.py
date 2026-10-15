"""
WAVE 39 - BACKUP/RESTORE: anni data files ni okka ZIP lo export + safe import.
================================================================================
Core DB (backend/data_db.json: users/interests/payments/OTP/views) + anni
satellite state files (*.json/*.jsonl) kalipi okka zip. Crash ayina, server
marina — ee zip + code + .env unte anni 5 mins lo malli vastayi.

- export_zip() -> (bytes, filename)
- auto_snapshot(tag) -> path (backend/backups/, last 10 keep)
- import_zip(bytes) -> {restored, skipped, pre_restore} (bounded archive + strict
  core-schema checks, destructive-count confirmation, pre-restore snapshot, atomic writes)
"""
import glob
import io
import json
import os
import tempfile
import zipfile
from datetime import datetime

APP_MARKER = "mana-vivaha-backup"
BASE = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.environ.get("MANA_VIVAHA_BACKUP_DIR", os.path.join(BASE, "backups"))
CANONICAL_DB = "data_db.json"   # zip lo core DB eppudu ee peru tho untundi


def _live_db_file() -> str:
    """🛡️ The ACTUAL core DB path the running app writes to (db_store.DB_FILE).

    Default = backend/data_db.json, but operators often point TSAP_DB_FILE at a
    persistent volume (e.g. /data/db.json) so the DB survives container
    rebuilds. The old backup globbed only `BASE/*.json`, which SILENTLY omitted
    the core DB whenever it lived outside the backend dir or had a different
    name — producing a zip that looked fine (meta.count>0) but could not
    restore the site. We now always resolve the real DB_FILE.
    """
    try:
        import db_store
        return os.path.abspath(getattr(db_store, "DB_FILE", "") or os.path.join(BASE, CANONICAL_DB))
    except Exception:
        return os.path.abspath(os.getenv("TSAP_DB_FILE") or os.path.join(BASE, CANONICAL_DB))
KEEP_SNAPS = 10
MAX_IMPORT_BYTES = 20 * 1024 * 1024
MAX_IMPORT_UNCOMPRESSED_BYTES = 128 * 1024 * 1024
MAX_IMPORT_ENTRIES = 512
CORE_COLLECTIONS = {
    "users": list,
    "interests": list,
    "payments": list,
    "otps": dict,
    "verified_phones": list,
    "views": list,
    "saves": list,
    "digest": list,
}
CORE_ROW_COLLECTIONS = ("users", "interests", "payments", "views", "saves", "digest")
CORE_STORAGE_FORMAT = "mana-vivaha-core-db-v1"


class DestructiveRestoreRequired(ValueError):
    """Raised when a restore would reduce active core records without confirmation."""

    def __init__(self, decreases: dict):
        self.decreases = decreases
        summary = ", ".join(
            "%s %s -> %s" % (name, values["current"], values["backup"])
            for name, values in decreases.items()
        )
        super().__init__("backup contains fewer core records than the active database (%s)" % summary)


def _validate_core_payload(payload: object) -> dict:
    """Reject incomplete/corrupt registration snapshots before touching live files."""
    if not isinstance(payload, dict):
        raise ValueError("core database must be a JSON object")
    missing = [name for name in CORE_COLLECTIONS if name not in payload]
    if missing:
        raise ValueError("core database is missing required collections: %s" % ", ".join(missing))
    wrong_types = [name for name, expected in CORE_COLLECTIONS.items()
                   if not isinstance(payload.get(name), expected)]
    if wrong_types:
        raise ValueError("core database has invalid collection types: %s" % ", ".join(wrong_types))
    if any(not isinstance(row, dict)
           for name in CORE_ROW_COLLECTIONS for row in payload[name]):
        raise ValueError("core database contains malformed collection rows")
    if any(not isinstance(phone, str) for phone in payload["verified_phones"]):
        raise ValueError("core database contains malformed verified-phone values")
    if any(not isinstance(phone, str) or not isinstance(record, dict)
           for phone, record in payload["otps"].items()):
        raise ValueError("core database contains malformed OTP state")

    seen_ids, seen_phones = set(), set()
    for row_number, profile in enumerate(payload["users"], start=1):
        if (profile.get("demo") is True or profile.get("is_demo") is True
                or profile.get("seed_source") or profile.get("source") == "demo_seed"
                or profile.get("profile_note") == "TSAP demo profile"
                or profile.get("inventory_status") or profile.get("seed")):
            raise ValueError("core database contains a demo/seed profile at row %d" % row_number)
        profile_id = str(profile.get("tsap_id") or "").strip().upper()
        if not profile_id or profile_id in seen_ids:
            raise ValueError("core database contains a missing/duplicate profile ID at row %d" % row_number)
        seen_ids.add(profile_id)
        phone = str(profile.get("phone") or "").strip()
        if phone and phone in seen_phones:
            raise ValueError("core database contains a duplicate profile phone at row %d" % row_number)
        if phone:
            seen_phones.add(phone)

    has_records = any(bool(payload[name]) for name in CORE_COLLECTIONS)
    if not has_records and payload.get("storage_format") != CORE_STORAGE_FORMAT:
        raise ValueError("empty core database is missing its initialization marker")
    return {name: len(payload[name]) for name in CORE_COLLECTIONS}


def _best_effort_core_counts(payload: object) -> dict:
    """Extract safe counts from a readable legacy store even if some fields are damaged."""
    if not isinstance(payload, dict):
        return {}
    counts = {}
    for name, expected in CORE_COLLECTIONS.items():
        value = payload.get(name)
        if isinstance(value, expected):
            counts[name] = len(value)
    return counts


def _state_root() -> str:
    """Resolve the configured runtime-state directory (legacy default: app dir)."""
    return os.path.abspath(os.getenv("MANA_VIVAHA_STATE_DIR") or BASE)


def state_files() -> list:
    """List runtime JSON stores from the configured state directory only.

    When production uses an external durable state volume, bundling JSON files
    from the replaceable application image could back up stale fixtures instead
    of the live stores. Keep the legacy app-directory behavior only when no
    state directory is explicitly configured.
    """
    root = _state_root()
    out = []
    for pat in ("*.json", "*.jsonl"):
        for fp in glob.glob(os.path.join(root, pat)):
            bn = os.path.basename(fp)
            if bn.endswith(".tmp") or ".tmp" in bn:
                continue
            out.append(fp)
    return sorted(out)


def _stamp() -> str:
    # Microseconds avoid silently overwriting two sensitive snapshots created in
    # the same second (for example startup and pre-restore snapshots).
    return datetime.now().strftime("%Y%m%d-%H%M%S-%f")


def export_zip() -> tuple:
    files = state_files()
    meta_files = {}
    buf = io.BytesIO()
    db_file = _live_db_file()
    db_in_base = os.path.abspath(db_file) == os.path.join(BASE, CANONICAL_DB)
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for fp in files:
            bn = os.path.basename(fp)
            # 🛡️ If the live DB sits in BASE under a NON-canonical name (e.g.
            # TSAP_DB_FILE=BASE/live.json), the glob already added it as
            # `live.json`; skip that duplicate — we re-add it canonically below
            # so import (which requires "data_db.json") always finds the core.
            if not db_in_base and (os.path.abspath(fp) == db_file or bn == CANONICAL_DB):
                # An external DB_FILE is the source of truth. Do not let a stale
                # backend/data_db.json occupy the canonical archive name first.
                continue
            with open(fp, "rb") as f:
                blob = f.read()
            z.writestr(bn, blob)
            meta_files[bn] = len(blob)
        # 🛡️ GUARANTEE the live core DB is in the zip under the canonical name,
        # even when TSAP_DB_FILE points outside the backend dir (persistent
        # volume). Without this the backup silently omits the whole database.
        if CANONICAL_DB not in meta_files:
            try:
                with open(db_file, "rb") as f:
                    blob = f.read()
            except OSError as exc:
                # Never label an empty/corrupt placeholder as a complete backup:
                # an owner could otherwise restore it over real registrations.
                raise RuntimeError(
                    "configured core database is unavailable; refusing to export an incomplete backup"
                ) from exc
            z.writestr(CANONICAL_DB, blob)
            meta_files[CANONICAL_DB] = len(blob)
        meta = {"app": APP_MARKER, "at": datetime.now().isoformat(timespec="seconds"),
                "files": meta_files, "count": len(meta_files),
                "db_file": db_file, "db_canonical": CANONICAL_DB}
        z.writestr("meta.json", json.dumps(meta, ensure_ascii=False, indent=1))
    return buf.getvalue(), "mana-vivaha-backup-%s.zip" % _stamp()


def auto_snapshot(tag="auto") -> str:
    os.makedirs(BACKUP_DIR, mode=0o700, exist_ok=True)
    # Backups contain personal and payment-related data. Keep snapshots private
    # even when the process umask or a pre-existing directory is permissive.
    os.chmod(BACKUP_DIR, 0o700)
    blob, name = export_zip()
    safe_tag = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in str(tag)) or "auto"
    path = os.path.join(BACKUP_DIR, "%s-%s" % (safe_tag, name))
    tmp = path + ".tmp"
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, "wb") as f:
            f.write(blob)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
        if os.name == "posix":
            try:
                directory_fd = os.open(BACKUP_DIR, os.O_RDONLY)
                try:
                    os.fsync(directory_fd)
                finally:
                    os.close(directory_fd)
            except OSError:
                pass
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise
    snaps = sorted(glob.glob(os.path.join(BACKUP_DIR, "*.zip")), key=os.path.getmtime)
    for old in snaps[:max(0, len(snaps) - KEEP_SNAPS)]:
        try:
            os.remove(old)
        except OSError:
            pass
    return path


def _read_bounded(zf: zipfile.ZipFile, info: zipfile.ZipInfo, limit: int) -> bytes:
    """Read one member incrementally and cap actual decompressed bytes."""
    if limit < 0:
        raise ValueError("backup exceeds uncompressed size limit")
    out = bytearray()
    with zf.open(info, "r") as member:
        while True:
            chunk = member.read(min(64 * 1024, limit - len(out) + 1))
            if not chunk:
                return bytes(out)
            out.extend(chunk)
            if len(out) > limit:
                raise ValueError("backup exceeds uncompressed size limit")


def import_zip(data: bytes, *, allow_destructive: bool = False,
               current_counts: dict | None = None) -> dict:
    if not data or len(data) > MAX_IMPORT_BYTES:
        raise ValueError("bad size (empty or >20MB)")
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except Exception:
        raise ValueError("not a zip file") from None

    infos = zf.infolist()
    if len(infos) > MAX_IMPORT_ENTRIES:
        raise ValueError("too many archive entries")
    names = [info.filename for info in infos]
    if len(names) != len(set(names)):
        raise ValueError("duplicate archive entries")
    if any(info.flag_bits & 0x1 for info in infos):
        raise ValueError("encrypted archive entries are not supported")
    if any(info.file_size < 0 for info in infos):
        raise ValueError("invalid archive entry size")
    if sum(info.file_size for info in infos) > MAX_IMPORT_UNCOMPRESSED_BYTES:
        raise ValueError("backup exceeds uncompressed size limit")

    by_name = {info.filename: info for info in infos}
    if "meta.json" not in by_name:
        raise ValueError("meta.json ledu — mana backup file kadu")
    try:
        meta_blob = _read_bounded(zf, by_name["meta.json"], MAX_IMPORT_UNCOMPRESSED_BYTES)
        meta = json.loads(meta_blob.decode("utf-8"))
    except Exception:
        raise ValueError("meta.json corrupt") from None
    if not isinstance(meta, dict):
        raise ValueError("meta.json must be an object")
    if meta.get("app") != APP_MARKER:
        raise ValueError("vere app backup — reject")
    if "data_db.json" not in by_name:
        raise ValueError("data_db.json ledu — incomplete backup")

    restored, skipped, validated = [], [], {}
    actual_uncompressed = len(meta_blob)
    incoming_core_counts = None
    for info in infos:
        name = info.filename
        if name == "meta.json" or "/" in name or "\\" in name or name.startswith("."):
            continue
        if not (name.endswith(".json") or name.endswith(".jsonl")):
            skipped.append(name)
            continue
        try:
            blob = _read_bounded(zf, info, MAX_IMPORT_UNCOMPRESSED_BYTES - actual_uncompressed)
        except ValueError:
            raise
        except Exception:
            skipped.append(name)
            continue
        actual_uncompressed += len(blob)
        try:
            if name.endswith(".json"):
                parsed = json.loads(blob.decode("utf-8"))
                if name == CANONICAL_DB:
                    incoming_core_counts = _validate_core_payload(parsed)
            else:
                for line in blob.decode("utf-8").splitlines():
                    if line.strip():
                        json.loads(line)
        except Exception as exc:
            if name == CANONICAL_DB:
                raise ValueError("data_db.json invalid: %s" % str(exc)[:180]) from None
            skipped.append(name)
            continue
        restored.append(name)
        validated[name] = blob

    if CANONICAL_DB not in validated or incoming_core_counts is None:
        raise ValueError("data_db.json corrupt or invalid — restore refused")
    if not restored:
        raise ValueError("emi restore cheyyadaniki ledu")

    db_file = _live_db_file()
    baseline_counts = {}
    try:
        with open(db_file, encoding="utf-8") as handle:
            live_payload = json.load(handle)
        baseline_counts.update(_best_effort_core_counts(live_payload))
    except Exception:
        # A verified backup may be the recovery path for a damaged live file.
        # The caller also supplies active in-memory counts when the API is used.
        pass
    if isinstance(current_counts, dict):
        for name in CORE_COLLECTIONS:
            value = current_counts.get(name)
            if isinstance(value, int) and value >= 0:
                baseline_counts[name] = max(baseline_counts.get(name, 0), value)

    decreases = {
        name: {"current": baseline_counts[name], "backup": incoming_core_counts[name]}
        for name in CORE_COLLECTIONS
        if name in baseline_counts and incoming_core_counts[name] < baseline_counts[name]
    }
    if decreases and not allow_destructive:
        raise DestructiveRestoreRequired(decreases)

    # Snapshot is made only after the archive is fully validated and any
    # reduction in the active core store has been explicitly confirmed.
    pre = auto_snapshot("pre-restore")
    # Install satellite JSON first and the core database last. If an I/O error
    # interrupts restore, the current registration store remains authoritative.
    write_order = [name for name in restored if name != CANONICAL_DB] + [CANONICAL_DB]
    for name in write_order:
        # 🛡️ Core DB ni the configured DB_FILE ki restore cheyyali (BASE ki kaadu)
        # — TSAP_DB_FILE persistent volume ki set chesi unte, BASE/data_db.json
        # lo write cheste running app dani ni chadavadu (restore vyarham).
        dest = db_file if name == CANONICAL_DB else os.path.join(_state_root(), name)
        dest_dir = os.path.dirname(os.path.abspath(dest))
        os.makedirs(dest_dir, mode=0o700, exist_ok=True)
        fd, tmp = tempfile.mkstemp(
            prefix=".%s.restore-" % os.path.basename(dest), suffix=".tmp", dir=dest_dir
        )
        try:
            if hasattr(os, "fchmod"):
                os.fchmod(fd, 0o600)
            with os.fdopen(fd, "wb") as f:
                fd = None
                f.write(validated[name])
                f.flush()
                os.fsync(f.fileno())
            # State archives can contain contact/payment data. Restore files
            # privately, including the token-revocation index.
            os.chmod(tmp, 0o600)
            os.replace(tmp, dest)
            tmp = None
            if os.name == "posix":
                try:
                    dir_fd = os.open(dest_dir, os.O_RDONLY)
                    try:
                        os.fsync(dir_fd)
                    finally:
                        os.close(dir_fd)
                except OSError:
                    pass
        except Exception:
            if fd is not None:
                try:
                    os.close(fd)
                except OSError:
                    pass
            if tmp is not None:
                try:
                    os.unlink(tmp)
                except OSError:
                    pass
            raise
    return {"restored": restored, "skipped": skipped,
            "pre_restore": os.path.basename(pre), "db_file": db_file,
            "core_counts": incoming_core_counts,
            "destructive_restore": bool(decreases)}
