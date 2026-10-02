"""
WAVE 39 - BACKUP/RESTORE: anni data files ni okka ZIP lo export + safe import.
================================================================================
Core DB (backend/data_db.json: users/interests/payments/OTP/views) + anni
satellite state files (*.json/*.jsonl) kalipi okka zip. Crash ayina, server
marina — ee zip + code + .env unte anni 5 mins lo malli vastayi.

- export_zip() -> (bytes, filename)
- auto_snapshot(tag) -> path (backend/backups/, last 10 keep)
- import_zip(bytes) -> {restored, skipped, pre_restore} (validates + pre-restore
  snapshot teesukuni atomic write; zip-slip guard; JSON parse check)
"""
import glob
import io
import json
import os
import zipfile
from datetime import datetime

APP_MARKER = "mana-vivaha-backup"
BASE = os.path.dirname(os.path.abspath(__file__))
BACKUP_DIR = os.path.join(BASE, "backups")
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


def state_files() -> list:
    out = []
    for pat in ("*.json", "*.jsonl"):
        for fp in glob.glob(os.path.join(BASE, pat)):
            bn = os.path.basename(fp)
            if bn.endswith(".tmp") or ".tmp" in bn:
                continue
            out.append(fp)
    return sorted(out)


def _stamp() -> str:
    return datetime.now().strftime("%Y%m%d-%H%M%S")


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
            if not db_in_base and os.path.abspath(fp) == db_file:
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
                if os.path.exists(db_file):
                    with open(db_file, "rb") as f:
                        blob = f.read()
                else:
                    blob = b"{}"      # DB ఇంకా disk ki flush కాలేదు — khali core
                z.writestr(CANONICAL_DB, blob)
                meta_files[CANONICAL_DB] = len(blob)
            except Exception:
                z.writestr(CANONICAL_DB, b"{}")
                meta_files[CANONICAL_DB] = 2
        meta = {"app": APP_MARKER, "at": datetime.now().isoformat(timespec="seconds"),
                "files": meta_files, "count": len(meta_files),
                "db_file": db_file, "db_canonical": CANONICAL_DB}
        z.writestr("meta.json", json.dumps(meta, ensure_ascii=False, indent=1))
    return buf.getvalue(), "mana-vivaha-backup-%s.zip" % _stamp()


def auto_snapshot(tag="auto") -> str:
    os.makedirs(BACKUP_DIR, exist_ok=True)
    blob, name = export_zip()
    path = os.path.join(BACKUP_DIR, "%s-%s" % (tag, name))
    with open(path, "wb") as f:
        f.write(blob)
    snaps = sorted(glob.glob(os.path.join(BACKUP_DIR, "*.zip")), key=os.path.getmtime)
    for old in snaps[:max(0, len(snaps) - KEEP_SNAPS)]:
        try:
            os.remove(old)
        except OSError:
            pass
    return path


def import_zip(data: bytes) -> dict:
    if not data or len(data) > MAX_IMPORT_BYTES:
        raise ValueError("bad size (empty or >20MB)")
    try:
        zf = zipfile.ZipFile(io.BytesIO(data))
    except Exception:
        raise ValueError("not a zip file")
    names = zf.namelist()
    if "meta.json" not in names:
        raise ValueError("meta.json ledu — mana backup file kadu")
    try:
        meta = json.loads(zf.read("meta.json").decode("utf-8"))
    except Exception:
        raise ValueError("meta.json corrupt")
    if meta.get("app") != APP_MARKER:
        raise ValueError("vere app backup — reject")
    if "data_db.json" not in names:
        raise ValueError("data_db.json ledu — incomplete backup")
    restored, skipped = [], []
    for n in names:
        if n == "meta.json" or "/" in n or "\\" in n or n.startswith("."):
            continue
        if not (n.endswith(".json") or n.endswith(".jsonl")):
            skipped.append(n)
            continue
        try:
            blob = zf.read(n)
            if n.endswith(".json"):
                json.loads(blob.decode("utf-8"))
            else:
                for ln in blob.decode("utf-8").splitlines():
                    if ln.strip():
                        json.loads(ln)
        except Exception:
            skipped.append(n)
            continue
        restored.append(n)
    if not restored:
        raise ValueError("emi restore cheyyadaniki ledu")
    pre = auto_snapshot("pre-restore")
    db_file = _live_db_file()
    for n in restored:
        # 🛡️ Core DB ni the configured DB_FILE ki restore cheyyali (BASE ki kaadu)
        # — TSAP_DB_FILE persistent volume ki set chesi unte, BASE/data_db.json
        # lo write cheste running app dani ni chadavadu (restore vyarham).
        dest = db_file if n == CANONICAL_DB else os.path.join(BASE, n)
        os.makedirs(os.path.dirname(os.path.abspath(dest)), exist_ok=True)
        tmp = dest + ".tmp"
        with open(tmp, "wb") as f:
            f.write(zf.read(n))
        os.replace(tmp, dest)
    return {"restored": restored, "skipped": skipped,
            "pre_restore": os.path.basename(pre), "db_file": db_file}
