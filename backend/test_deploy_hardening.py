"""Isolated deploy-hardening regression checks.

Run: python3 backend/test_deploy_hardening.py

The suite never starts application workers, reads the live database, writes to
backend/backups, or sends requests to external services. All state and auth are
test-only and disposable.
"""
from __future__ import annotations

import glob
import io
import json
import os
import shutil
import sys
import tempfile
import zipfile
import secrets

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from test_storage import isolate_test_stores  # noqa: E402
_TEST_STORE = isolate_test_stores("deploy-hardening")

# Explicit isolated test configuration: no inherited production credentials,
# no auth bypass, and no startup/worker side effects (the client is not entered
# as a lifespan context manager below).
os.environ["APP_ENV"] = "test"
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ.pop("WA_TEST_FAST", None)
os.environ["TSAP_AUTH_SECRET"] = "test-only-" + secrets.token_urlsafe(48)
os.environ["ADMIN_KEY"] = "test-only-" + secrets.token_urlsafe(32)

import main as M  # noqa: E402
import db_store  # noqa: E402
import backup39  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

client = TestClient(M.app, raise_server_exceptions=False)
passed = 0
failed = 0


def check(name, cond, detail=None):
    global passed, failed
    if cond:
        passed += 1
        print(f"  ✅ {name}")
    else:
        failed += 1
        print(f"  ❌ {name} — DETAIL: {detail}")


def section(title):
    print(f"\n{'=' * 66}\n{title}\n{'=' * 66}")


# This is the only profile data used by the API smoke checks. It remains in
# memory inside this isolated test process and is never seeded into production.
M.DB_USERS[:] = [
    {
        "tsap_id": "TEST-DEPLOY-001", "full_name": "Deploy Test Fixture One",
        "gender": "Bride", "status": "approved", "is_approved": True,
        "phone_verified": True, "state": "TS", "district": "Hyderabad",
        "caste": "Test fixture community", "created_at": "2026-10-01T00:00:00",
    },
    {
        "tsap_id": "TEST-DEPLOY-002", "full_name": "Deploy Test Fixture Two",
        "gender": "Groom", "status": "approved", "is_approved": True,
        "state": "AP", "district": "Guntur", "caste": "Other test fixture community",
        "created_at": "2026-10-02T00:00:00",
    },
]

# ═══════════════════════════════════════════════════════════════════════
section("A. HONEST PUBLIC STATS (isolated approved fixtures; no padded counts)")
# ═══════════════════════════════════════════════════════════════════════
real_approved = sum(1 for user in M.DB_USERS if M._is_approved_profile(user))
st_response = client.get("/api/stats")
st = st_response.json()
check("A1 /api/stats stats_are_live=True", st_response.status_code == 200 and st.get("stats_are_live") is True, st)
check("A2 /api/stats count equals approved isolated fixture count",
      st.get("profiles_count") == real_approved,
      {"api": st.get("profiles_count"), "fixtures": real_approved})
check("A3 /api/stats is not padded to 10,000 when inventory is smaller",
      not (real_approved < 10000 and st.get("profiles_count", 0) >= 10000),
      st.get("profiles_count"))
check("A4 recorded-check percentage is derived from the two fixtures",
      st.get("recorded_check_percentage") == 50.0,
      st.get("recorded_check_percentage"))
home_response = client.get("/api/meta/home-stats")
home = home_response.json()
check("A5 home-stats has the same live profile count",
      home_response.status_code == 200 and home.get("profiles_count") == real_approved
      and home.get("stats_are_live") is True,
      {"home": home.get("profiles_count"), "fixtures": real_approved})
check("A6 home-stats includes public channel count and plans",
      home.get("channels_total") == M.public_channel_stats().get("total")
      and isinstance(home.get("plans"), list) and bool(home.get("plans")),
      {"public_channels": home.get("channels_total"),
       "public_registry_total": M.public_channel_stats().get("total"),
       "plans": len(home.get("plans") or [])})

# Frontend source must not hard-code the retired fabricated inventory claim.
FE = os.path.join(HERE, "..", "frontend", "src")
fabricated_count_hits = []
for source_path in glob.glob(os.path.join(FE, "**", "*.tsx"), recursive=True):
    try:
        source = open(source_path, encoding="utf-8").read()
    except OSError:
        continue
    if "10,000+" in source or "10000+" in source:
        fabricated_count_hits.append(os.path.relpath(source_path, FE))
check("A7 frontend .tsx has no hard-coded 10,000+ claim",
      not fabricated_count_hits, fabricated_count_hits[:5])

# ═══════════════════════════════════════════════════════════════════════
section("B. DEMO TOKEN IS RETIRED IN ALL MODES")
# ═══════════════════════════════════════════════════════════════════════
original_app_env = os.environ.get("APP_ENV")
original_demo_login = os.environ.get("DEMO_LOGIN")
try:
    for label, app_env, demo_login in (
        ("test", "test", None),
        ("production", "production", None),
        ("production with legacy flag", "production", "1"),
    ):
        os.environ["APP_ENV"] = app_env
        if demo_login is None:
            os.environ.pop("DEMO_LOGIN", None)
        else:
            os.environ["DEMO_LOGIN"] = demo_login
        response = client.post("/api/auth/demo-token", json={})
        body = response.json()
        check(f"B {label}: retired endpoint issues no token (410)",
              response.status_code == 410 and not body.get("auth_token")
              and "retired" in str(body.get("detail") or body.get("message") or "").lower(),
              {"status": response.status_code, "body": body})
finally:
    if original_app_env is None:
        os.environ.pop("APP_ENV", None)
    else:
        os.environ["APP_ENV"] = original_app_env
    if original_demo_login is None:
        os.environ.pop("DEMO_LOGIN", None)
    else:
        os.environ["DEMO_LOGIN"] = original_demo_login

# ═══════════════════════════════════════════════════════════════════════
section("C. BACKUP USES DB_FILE OUTSIDE THE APPLICATION DIRECTORY")
# ═══════════════════════════════════════════════════════════════════════
_tmp = tempfile.mkdtemp(prefix="mana-vivaha-deploy-test-")
_volume_db = os.path.join(_tmp, "volume", "test_live_db.json")
_backup_base = os.path.join(_tmp, "isolated-backend-state")
_state_dir = os.path.join(_tmp, "durable-state")
_backup_dir = os.path.join(_tmp, "snapshots")
os.makedirs(os.path.dirname(_volume_db), exist_ok=True)
os.makedirs(_backup_base, exist_ok=True)
os.makedirs(_state_dir, exist_ok=True)

_core = {
    "storage_format": db_store.STORAGE_FORMAT,
    "saved_at": "2026-10-02T00:00:00",
    "users": [{"tsap_id": "TEST-DB-001"}, {"tsap_id": "TEST-DB-002"}],
    "interests": [], "payments": [], "otps": {}, "verified_phones": [],
    "views": [], "saves": [], "digest": [],
}
with open(_volume_db, "w", encoding="utf-8") as handle:
    json.dump(_core, handle)
_satellite_path = os.path.join(_state_dir, "test_satellite.json")
with open(_satellite_path, "w", encoding="utf-8") as handle:
    json.dump({"fixture": "isolated"}, handle)
_token_versions_path = os.path.join(_state_dir, "token_versions.json")
with open(_token_versions_path, "w", encoding="utf-8") as handle:
    json.dump({"TEST-DB-001": 3}, handle)

_original_db_file = db_store.DB_FILE
_original_backup_base = backup39.BASE
_original_backup_dir = backup39.BACKUP_DIR
_original_state_dir = os.environ.get("MANA_VIVAHA_STATE_DIR")
try:
    db_store.DB_FILE = _volume_db
    backup39.BASE = _backup_base
    backup39.BACKUP_DIR = _backup_dir
    os.environ["MANA_VIVAHA_STATE_DIR"] = _state_dir

    blob, filename = backup39.export_zip()
    with zipfile.ZipFile(io.BytesIO(blob)) as archive:
        names = archive.namelist()
        metadata = json.loads(archive.read("meta.json").decode("utf-8"))
        check("C1 export includes canonical data_db.json for a volume DB",
              "data_db.json" in names, names)
        archived_core = json.loads(archive.read("data_db.json").decode("utf-8"))
        check("C2 canonical DB content matches the configured volume DB",
              archived_core.get("users") == _core["users"], archived_core.get("users"))
        check("C3 metadata identifies this backup and contains files",
              metadata.get("app") == "mana-vivaha-backup" and metadata.get("count", 0) > 0,
              {"app": metadata.get("app"), "count": metadata.get("count")})
        check("C4 metadata records the configured DB_FILE path",
              metadata.get("db_file") == os.path.abspath(_volume_db), metadata.get("db_file"))
        check("C5 backup includes satellite JSON and token-revocation state from the durable directory",
              "test_satellite.json" in names and "token_versions.json" in names, names)

    # Recovery test: preserve even the corrupt pre-restore core bytes in a
    # same-volume snapshot, then restore the verified archive over that file.
    with open(_volume_db, "wb") as handle:
        handle.write(b"{corrupt live database; preserve before restore")
    os.remove(_satellite_path)
    os.remove(_token_versions_path)
    restored = backup39.import_zip(blob)
    check("C6 import restores canonical DB to the configured volume path",
          os.path.exists(_volume_db) and "data_db.json" in restored.get("restored", []),
          {"exists": os.path.exists(_volume_db), "restored": restored.get("restored")})
    with open(_volume_db, encoding="utf-8") as handle:
        restored_core = json.load(handle)
    check("C7 restored DB content matches the archive",
          restored_core.get("users") == _core["users"], restored_core.get("users"))
    satellite_restored = os.path.exists(_satellite_path)
    satellite_body = json.load(open(_satellite_path, encoding="utf-8")) if satellite_restored else {}
    check("C8 satellite state restores to the configured durable state directory",
          satellite_restored and satellite_body.get("fixture") == "isolated",
          {"exists": satellite_restored, "body": satellite_body})
    token_state_restored = os.path.exists(_token_versions_path)
    token_state_body = json.load(open(_token_versions_path, encoding="utf-8")) if token_state_restored else {}
    check("C8a token revocation counters restore privately with durable JSON state",
          token_state_restored and token_state_body.get("TEST-DB-001") == 3
          and (os.name != "posix" or os.stat(_token_versions_path).st_mode & 0o777 == 0o600),
          {"exists": token_state_restored, "body": token_state_body,
           "mode": (oct(os.stat(_token_versions_path).st_mode & 0o777)
                    if token_state_restored and os.name == "posix" else "n/a")})
    check("C9 test used a disposable backup path, not backend/backups",
          os.path.commonpath([os.path.abspath(backup39.BACKUP_DIR), os.path.abspath(_tmp)]) == os.path.abspath(_tmp),
          backup39.BACKUP_DIR)
    os.remove(_volume_db)
    try:
        backup39.export_zip()
        missing_core_refused = False
    except RuntimeError as exc:
        missing_core_refused = "refusing to export an incomplete backup" in str(exc)
    check("C10 missing live DB refuses to create a placeholder backup", missing_core_refused)
finally:
    db_store.DB_FILE = _original_db_file
    backup39.BASE = _original_backup_base
    backup39.BACKUP_DIR = _original_backup_dir
    if _original_state_dir is None:
        os.environ.pop("MANA_VIVAHA_STATE_DIR", None)
    else:
        os.environ["MANA_VIVAHA_STATE_DIR"] = _original_state_dir
    shutil.rmtree(_tmp, ignore_errors=True)

print(f"\n{'=' * 66}")
print(f"DEPLOY-HARDENING: {passed} passed, {failed} failed")
print(f"{'=' * 66}")
if failed:
    sys.exit(1)
print("ALL GREEN — honest stats, retired demo sign-in, and isolated volume-backup test")
