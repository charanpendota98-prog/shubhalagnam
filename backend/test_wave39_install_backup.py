"""
WAVE 39 INSTALL+BACKUP - app-laga shortcut NOW + AI Telugu vibe + backup/restore.
===============================================================================
P1 install UX: PWA iOS guidance + install prompt + manifest/icons.
P2 homepage media: cinematic hero poster/video exist and are wired; no gallery requirement.
B1 backup export: auth + zip shape (data_db.json + meta marker).
B2 backup import: roundtrip, strict core schema, destructive-restore confirmation, and size/auth guards.
B3 guide + gitignore.

Run: WA_TEST_FAST=1 /home/user/venv/bin/python test_wave39_install_backup.py
"""
import io
import json
import os
import stat
import sys
import warnings
import zipfile

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402
_TEST_STORE = isolate_test_stores("wave39-backup")
# Backup export must never manufacture an empty placeholder for a missing DB.
# Give this disposable suite a real, explicitly initialized empty core store.
with open(os.environ["TSAP_DB_FILE"], "w", encoding="utf-8") as _test_db_handle:
    json.dump({
        "storage_format": "mana-vivaha-core-db-v1", "saved_at": "2026-10-13T00:00:00",
        "users": [], "interests": [], "payments": [], "otps": {},
        "verified_phones": [], "views": [], "saves": [], "digest": [],
    }, _test_db_handle)

PASS, FAIL, FAILED = 0, 0, []


def check(name, cond, extra=None):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  PASS {name}")
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  FAIL {name}" + (f"  | {str(extra)[:200]}" if extra is not None else ""))


def section(t):
    print(f"\n{'=' * 76}\n{t}\n{'=' * 76}")


import main  # noqa: E402
import backup39 as BACKUP  # noqa: E402
from hardening import ADMIN_KEY  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from testutil_paths import src_page  # noqa: E402  # App Router page.tsx + page-client.tsx aware

client = TestClient(main.app, raise_server_exceptions=False)
BE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(BE, "..")
H_ADMIN = {"x-admin-key": ADMIN_KEY}

# ===========================================================================
# P1 - install UX markers
# ===========================================================================
section("P1 - install UX")
pwa = src_page("frontend/src/components/PWA.tsx")
check("P1 manual event listener", "tsap:install-show" in pwa)
check("P1 iOS steps", "Add to Home Screen" in pwa)
check("P1 installed detect", "appinstalled" in pwa and "display-mode: standalone" in pwa)
check("P1 sw register", 'register("/sw.js")' in pwa)
home = src_page("frontend/src/app/page.tsx")
layout_src = src_page("frontend/src/app/layout.tsx")
check("P1 install prompt component is mounted globally", "<PWA />" in layout_src)
check("P1 bilingual install guidance stays in the prompt", "మన వివాహ app లాగా install చేసుకోండి" in pwa
      and "Install మన వివాహ as app" in pwa)
check("P1 homepage stays focused; no install prompt panel is embedded in the hero", "tsap:install-show" not in home)
mf = json.load(open(os.path.join(ROOT, "frontend", "public", "manifest.webmanifest"),
                    encoding="utf-8"))
check("P1 manifest installable", mf.get("display") == "standalone"
      and mf.get("start_url", "").startswith("/")
      and any("192" in i.get("sizes", "") for i in mf.get("icons", []))
      and any("512" in i.get("sizes", "") for i in mf.get("icons", []))
      and any(i.get("purpose") == "maskable" for i in mf.get("icons", [])))
for ic in ("icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"):
    check(f"P1 icon {ic}", os.path.exists(
        os.path.join(ROOT, "frontend", "public", "icons", ic)))

# ===========================================================================
# P2 - AI photos
# ===========================================================================
section("P2 - cinematic hero media")
hero = src_page("frontend/src/components/CinematicHero.tsx")
for media in ("hero-bg-ultra.jpg", "wedding-film.mp4"):
    fp = os.path.join(ROOT, "frontend", "public", "promo", media)
    check(f"P2 {media} exists", os.path.exists(fp) and os.path.getsize(fp) > 50000,
          os.path.getsize(fp) if os.path.exists(fp) else "missing")
check("P2 cinematic hero poster and local film are wired", "/promo/hero-bg-ultra.jpg" in hero
      and "wedding-film.mp4" in hero and "<CinematicHero />" in home)
check("P2 homepage does not render the rejected celebrations gallery",
      "CinematicGallery" not in home and "A glimpse of Telugu celebrations" not in home)

# ===========================================================================
# B1 - backup export
# ===========================================================================
section("B1 - backup export")
e1 = client.get("/api/admin/backup/export", headers=H_ADMIN)
check("B1 export 200", e1.status_code == 200, e1.status_code)
check("B1 zip headers", "zip" in e1.headers.get("content-type", "")
      and "attachment" in e1.headers.get("content-disposition", ""), dict(e1.headers))
znames, zbytes = [], b""
try:
    zf = zipfile.ZipFile(io.BytesIO(e1.content))
    znames = zf.namelist()
    zbytes = e1.content
    meta = json.loads(zf.read("meta.json").decode("utf-8"))
except Exception as ex:
    meta = {}
    check("B1 zip parses", False, ex)
check("B1 has core+meta", "data_db.json" in znames and meta.get("app") == "mana-vivaha-backup"
      and meta.get("count", 0) >= 1, (len(znames), meta.get("count")))
_export_db_path = main.DBSTORE.DB_FILE
with open(_export_db_path, "rb") as _export_db_handle:
    _export_db_before = _export_db_handle.read()
_export_db_mode = stat.S_IMODE(os.stat(_export_db_path).st_mode)
try:
    os.unlink(_export_db_path)
    missing_export = client.get("/api/admin/backup/export", headers=H_ADMIN)
    check("B1 missing configured core DB returns controlled 503, not a placeholder ZIP",
          missing_export.status_code == 503, missing_export.status_code)
finally:
    with open(_export_db_path, "wb") as _export_db_handle:
        _export_db_handle.write(_export_db_before)
    os.chmod(_export_db_path, _export_db_mode)
_wtf = os.environ.get("WA_TEST_FAST")
os.environ["WA_TEST_FAST"] = "0"
os.environ.pop("TSAP_AUTH_MODE", None)
try:
    rn = client.get("/api/admin/backup/export")
    check("B1 export noauth -> 403", rn.status_code == 403, rn.status_code)
    ri = client.post("/api/admin/backup/import", content=b"x")
    check("B1 import noauth -> 403", ri.status_code == 403, ri.status_code)
finally:
    if _wtf is None:
        os.environ.pop("WA_TEST_FAST", None)
    else:
        os.environ["WA_TEST_FAST"] = _wtf

# ===========================================================================
# B2 - backup import
# ===========================================================================
section("B2 - backup import")
i1 = client.post("/api/admin/backup/import", content=zbytes,
                 headers={**H_ADMIN, "Content-Type": "application/zip"})
j1 = i1.json() if i1.status_code == 200 else {}
check("B2 roundtrip ok", i1.status_code == 200 and j1.get("success")
      and "data_db.json" in j1.get("restored", []), (i1.status_code, j1))
_pre_restore_path = os.path.join(BACKUP.BACKUP_DIR, str(j1.get("pre_restore", "")))
check("B2 pre-restore snap", str(j1.get("pre_restore", "")).endswith(".zip")
      and os.path.isfile(_pre_restore_path), j1)
try:
    _snapshot_modes = (stat.S_IMODE(os.stat(BACKUP.BACKUP_DIR).st_mode),
                       stat.S_IMODE(os.stat(_pre_restore_path).st_mode))
except OSError:
    _snapshot_modes = (None, None)
check("B2 snapshots use private 0700 directory and 0600 file permissions",
      _snapshot_modes == (0o700, 0o600), _snapshot_modes)
check("B2 core flag bool", isinstance(j1.get("core_reloaded"), bool), j1)
i2 = client.post("/api/admin/backup/import", content=b"not-a-zip",
                 headers={**H_ADMIN, "Content-Type": "application/zip"})
check("B2 junk bytes -> 400", i2.status_code == 400, i2.status_code)
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w") as z:
    z.writestr("hello.txt", "hi")
i3 = client.post("/api/admin/backup/import", content=buf.getvalue(), headers=H_ADMIN)
check("B2 no-meta zip -> 400", i3.status_code == 400, i3.status_code)
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w") as z:
    z.writestr("meta.json", json.dumps({"app": "vere-app"}))
    z.writestr("data_db.json", "{}")
i4 = client.post("/api/admin/backup/import", content=buf.getvalue(), headers=H_ADMIN)
check("B2 wrong-app zip -> 400", i4.status_code == 400, i4.status_code)
i5 = client.post("/api/admin/backup/import", content=b"", headers=H_ADMIN)
check("B2 empty body -> 400", i5.status_code == 400, i5.status_code)
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w") as z:
    z.writestr("meta.json", "[]")
    z.writestr("data_db.json", "{}")
i6 = client.post("/api/admin/backup/import", content=buf.getvalue(), headers=H_ADMIN)
check("B2 non-object metadata -> 400, not server error", i6.status_code == 400, i6.status_code)
buf = io.BytesIO()
with warnings.catch_warnings():
    warnings.simplefilter("ignore", UserWarning)
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("meta.json", json.dumps({"app": BACKUP.APP_MARKER}))
        z.writestr("data_db.json", "{}")
        z.writestr("data_db.json", "{}")
i7 = client.post("/api/admin/backup/import", content=buf.getvalue(), headers=H_ADMIN)
check("B2 duplicate archive entries -> 400", i7.status_code == 400, i7.status_code)
buf = io.BytesIO()
with zipfile.ZipFile(buf, "w") as z:
    z.writestr("meta.json", json.dumps({"app": BACKUP.APP_MARKER}))
    z.writestr("data_db.json", "{invalid")
    z.writestr("astro13.json", "{}")
i8 = client.post("/api/admin/backup/import", content=buf.getvalue(), headers=H_ADMIN)
check("B2 invalid required core DB rejects entire restore", i8.status_code == 400, i8.status_code)

# Structurally valid JSON is not enough: require the complete registration-store
# shape, and require a second owner confirmation before a snapshot can reduce data.
_incomplete = io.BytesIO()
with zipfile.ZipFile(_incomplete, "w") as z:
    z.writestr("meta.json", json.dumps({"app": BACKUP.APP_MARKER}))
    z.writestr("data_db.json", json.dumps({"users": []}))
i_incomplete_response = client.post("/api/admin/backup/import", content=_incomplete.getvalue(), headers=H_ADMIN)
check("B2 structurally incomplete core DB rejects before restore",
      i_incomplete_response.status_code == 400
      and "required collections" in str(i_incomplete_response.json().get("detail", "")),
      {"status": i_incomplete_response.status_code, "body": i_incomplete_response.json()})

_empty_core = {
    "storage_format": main.DBSTORE.STORAGE_FORMAT, "saved_at": "2026-10-13T00:00:00",
    "users": [], "interests": [], "payments": [], "otps": {},
    "verified_phones": [], "views": [], "saves": [], "digest": [],
}
_destructive_archive = io.BytesIO()
with zipfile.ZipFile(_destructive_archive, "w") as z:
    z.writestr("meta.json", json.dumps({"app": BACKUP.APP_MARKER}))
    z.writestr("data_db.json", json.dumps(_empty_core))
_core_memory_names = ("DB_USERS", "DB_INTERESTS", "DB_PAYMENTS", "DB_VIEWS", "DB_SAVES", "DB_DIGEST")
_core_memory_snapshot = {name: list(getattr(main, name)) for name in _core_memory_names}
_core_otps_snapshot = dict(main.DB_OTPS)
_verified_phones_snapshot = set(main.VERIFIED_PHONES)
_active_db_path = main.DBSTORE.DB_FILE
try:
    with open(_active_db_path, "rb") as _active_db_handle:
        _active_db_before = _active_db_handle.read()
except OSError:
    _active_db_before = None
try:
    main.DB_USERS[:] = [
        {"tsap_id": "W39-PROTECTED-001"}, {"tsap_id": "W39-PROTECTED-002"},
    ]
    _blocked_restore = client.post("/api/admin/backup/import", content=_destructive_archive.getvalue(),
                                   headers=H_ADMIN)
    try:
        with open(_active_db_path, "rb") as _active_db_handle:
            _active_db_after = _active_db_handle.read()
    except OSError:
        _active_db_after = None
    _blocked_detail = _blocked_restore.json().get("detail", {})
    check("B2 fewer-user restore needs explicit confirmation and leaves active DB untouched",
          _blocked_restore.status_code == 409
          and _blocked_detail.get("code") == "restore_requires_confirmation"
          and _active_db_after == _active_db_before
          and len(main.DB_USERS) == 2,
          {"status": _blocked_restore.status_code, "detail": _blocked_detail,
           "db_unchanged": _active_db_after == _active_db_before})
    _confirmed_restore = client.post(
        "/api/admin/backup/import", content=_destructive_archive.getvalue(),
        headers={**H_ADMIN, "X-Confirm-Destructive-Restore": "true"},
    )
    check("B2 confirmed destructive restore is explicit and creates a pre-restore snapshot",
          _confirmed_restore.status_code == 200
          and _confirmed_restore.json().get("destructive_restore") is True
          and bool(_confirmed_restore.json().get("pre_restore"))
          and main.DB_USERS == [],
          {"status": _confirmed_restore.status_code,
           "body": _confirmed_restore.json() if _confirmed_restore.status_code != 200 else {
               "destructive_restore": _confirmed_restore.json().get("destructive_restore"),
               "pre_restore": _confirmed_restore.json().get("pre_restore"),
               "users_after": len(main.DB_USERS),
           }})
finally:
    for _name, _rows in _core_memory_snapshot.items():
        getattr(main, _name)[:] = _rows
    main.DB_OTPS.clear()
    main.DB_OTPS.update(_core_otps_snapshot)
    main.VERIFIED_PHONES.clear()
    main.VERIFIED_PHONES.update(_verified_phones_snapshot)
    if _active_db_before is None:
        try:
            os.unlink(_active_db_path)
        except OSError:
            pass
    else:
        os.makedirs(os.path.dirname(os.path.abspath(_active_db_path)), exist_ok=True)
        with open(_active_db_path, "wb") as _active_db_handle:
            _active_db_handle.write(_active_db_before)
_original_import_limit = BACKUP.MAX_IMPORT_UNCOMPRESSED_BYTES
try:
    BACKUP.MAX_IMPORT_UNCOMPRESSED_BYTES = 8
    i9 = client.post("/api/admin/backup/import", content=zbytes, headers=H_ADMIN)
    check("B2 expanded archive size cap rejects before restore",
          i9.status_code == 400 and "uncompressed size limit" in str(i9.json().get("detail", "")),
          {"status": i9.status_code, "body": i9.json()})
finally:
    BACKUP.MAX_IMPORT_UNCOMPRESSED_BYTES = _original_import_limit
g1 = client.get("/api/admin/backup/import", headers=H_ADMIN)
check("B2 GET on import -> 405", g1.status_code in (405, 404), g1.status_code)

# ===========================================================================
# B3 - guide + ignore + owner card
# ===========================================================================
section("B3 - guide + owner card")
backup_guide_path = os.path.join(ROOT, "BACKUP-GUIDE-TELUGU.md")
check("B3 guide exists", os.path.exists(backup_guide_path))
backup_guide = open(backup_guide_path, encoding="utf-8").read() if os.path.exists(backup_guide_path) else ""
check("B3 guide truthfully excludes media/secrets and requires off-host restore testing",
      "does **not** include uploaded profile photos" in backup_guide
      and ".env.production" in backup_guide
      and "off-host" in backup_guide
      and "NO-GO" in backup_guide)
check("B3 gitignore backups", "backend/backups/" in src_page(".gitignore"))
own = src_page("frontend/src/app/owner/page.tsx")
owner_client = src_page("frontend/src/app/owner/page-client.tsx")
check("B3 owner backup card", "/api/admin/backup/export" in owner_client
      and "/api/admin/backup/import" in owner_client)
check("B3 owner backup copy does not claim the ZIP restores the whole site",
      "It is not an encrypted off-site backup" in owner_client
      and "Everything (users, payments, interests, channels) in one zip" not in owner_client)

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail\n{'=' * 76}")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("WAVE39 ALL GREEN")
