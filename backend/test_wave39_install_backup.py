"""
WAVE 39 INSTALL+BACKUP - app-laga shortcut NOW + AI Telugu vibe + backup/restore.
===============================================================================
P1 install UX: PWA iOS steps + manual event + hero button + manifest/icons.
P2 AI photos: promo files exist + wired in homepage.
B1 backup export: auth + zip shape (data_db.json + meta marker).
B2 backup import: roundtrip ok + invalid rejects + method guard.
B3 guide + gitignore.

Run: WA_TEST_FAST=1 /home/user/venv/bin/python test_wave39_install_backup.py
"""
import io
import json
import os
import shutil
import sys
import zipfile

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

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
check("P1 hero button dispatches", 'dispatchEvent(new Event("tsap:install-show"))' in home)
check("P1 installApp te+en", "App లాగా install చేసుకోండి" in home and "Install as app" in home)
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
section("P2 - AI Telugu vibe photos")
for img in ("hero-wedding.jpg", "bride-card.jpg"):
    fp = os.path.join(ROOT, "frontend", "public", "promo", img)
    check(f"P2 {img} exists+real", os.path.exists(fp) and os.path.getsize(fp) > 50000,
          os.path.getsize(fp) if os.path.exists(fp) else "missing")
check("P2 banner wired", "/promo/hero-wedding.jpg" in home and "vibeTitle" in home)
check("P2 card photo wired", "/promo/bride-card.jpg" in home)

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
      and meta.get("count", 0) >= 5, (len(znames), meta.get("count")))
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
check("B2 pre-restore snap", str(j1.get("pre_restore", "")).endswith(".zip")
      and os.path.exists(os.path.join(BE, "backups", str(j1.get("pre_restore", "")))), j1)
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
g1 = client.get("/api/admin/backup/import", headers=H_ADMIN)
check("B2 GET on import -> 405", g1.status_code in (405, 404), g1.status_code)
shutil.rmtree(os.path.join(BE, "backups"), ignore_errors=True)

# ===========================================================================
# B3 - guide + ignore + owner card
# ===========================================================================
section("B3 - guide + owner card")
check("B3 guide exists", os.path.exists(os.path.join(ROOT, "BACKUP-GUIDE-TELUGU.md")))
check("B3 gitignore backups", "backend/backups/" in src_page(".gitignore"))
own = src_page("frontend/src/app/owner/page.tsx")
check("B3 owner backup card", "/api/admin/backup/export" in own
      and "/api/admin/backup/import" in own)

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail\n{'=' * 76}")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("WAVE39 ALL GREEN")
