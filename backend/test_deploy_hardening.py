"""
🛡️ DEPLOY-HARDENING REGRESSION SUITE
=====================================
Ee suite 2026-10 deploy-audit round lo fix chesina 3 production risks ni
LOCK chestundi — future lo evaru maarchina ventane ee test fail avutundi.

  A. HONEST STATS  — /api/stats + /api/meta/home-stats fabricated "10,000+"
     constant ni return cheyyakudadu; real DB inventory matrame.
     (Consumer Protection Act 2019 / ASCI misleading-ads + gateway KYC risk.)

  B. DEMO-TOKEN    — APP_ENV=production lo /api/auth/demo-token eppudu 403
     (real + seed profiles ki kuda). Dev/preview (dev_mode) lo allow.
     (Mundu production lo kuda legacy seed profile ki auth-less token vachedi.)

  C. BACKUP DB_FILE— TSAP_DB_FILE backend dir BAYATA (persistent volume) set
     chesina, export_zip() core DB ni canonical "data_db.json" ga zip lo
     guarantee cheyyali + import_zip() dani ni DB_FILE ki restore cheyyali.
     (Mundu backup silently core DB ni miss ayyedi → restore vyarham.)

Run: python3 backend/test_deploy_hardening.py
"""
import io
import os
import sys
import json
import glob
import zipfile
import tempfile

os.environ.setdefault("TSAP_AUTH_MODE", "off")   # dev_mode ON (harness)
os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import main as M                                   # noqa: E402
import db_store                                    # noqa: E402
import backup39                                    # noqa: E402
from fastapi.testclient import TestClient          # noqa: E402

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


def section(t):
    print(f"\n{'=' * 66}\n{t}\n{'=' * 66}")


# ═══════════════════════════════════════════════════════════════════════
section("A. HONEST PUBLIC STATS (no fabricated 10,000+)")
# ═══════════════════════════════════════════════════════════════════════
with client:  # triggers startup (demo/launch seed) so DB_USERS is populated
    real_approved = len([u for u in M.DB_USERS if u.get("is_approved", True)])
    st = client.get("/api/stats").json()
    check("A1 /api/stats stats_are_live=True", st.get("stats_are_live") is True, st.get("stats_are_live"))
    check("A2 /api/stats count == real approved DB count",
          st.get("profiles_count") == real_approved,
          {"api": st.get("profiles_count"), "real": real_approved})
    check("A3 /api/stats NOT inflated to >=10000 when DB is smaller",
          not (real_approved < 10000 and st.get("profiles_count", 0) >= 10000),
          st.get("profiles_count"))
    check("A4 verified_percentage derived (0-100, not hard-coded 98.4 unless real)",
          isinstance(st.get("verified_percentage"), (int, float)) and 0 <= st["verified_percentage"] <= 100,
          st.get("verified_percentage"))
    hs = client.get("/api/meta/home-stats").json()
    check("A5 home-stats carries same live profiles_count",
          hs.get("profiles_count") == real_approved and hs.get("stats_are_live") is True,
          {"hs": hs.get("profiles_count"), "real": real_approved})
    check("A6 home-stats still has channels/plans truth (no regression)",
          hs.get("channels_total") == 52 and isinstance(hs.get("plans"), list) and hs.get("plans"),
          {"channels": hs.get("channels_total"), "plans": len(hs.get("plans") or [])})

# frontend must not hard-code fabricated counts anymore
FE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "src")
fake_hits = []
for fp in glob.glob(os.path.join(FE, "**", "*.tsx"), recursive=True):
    try:
        s = open(fp, encoding="utf-8").read()
    except Exception:
        continue
    if "10,000+" in s or "10000+" in s:
        fake_hits.append(os.path.relpath(fp, FE))
check("A7 no hard-coded '10,000+' fabricated claims in frontend .tsx",
      not fake_hits, fake_hits[:5])


# ═══════════════════════════════════════════════════════════════════════
section("B. DEMO-TOKEN — production block, dev/preview allow")
# ═══════════════════════════════════════════════════════════════════════
# a seed/inventory profile to aim at
_seed = next((u for u in M.DB_USERS
              if u.get("demo") or u.get("is_demo") or u.get("inventory_status") or u.get("seed")), None)
_seed_id = (_seed or {}).get("tsap_id", "")

# B1: dev_mode (current harness env, APP_ENV not production) → allowed
os.environ.pop("APP_ENV", None)
os.environ.pop("DEMO_LOGIN", None)
_dev = client.post("/api/auth/demo-token", json={"tsap_id": _seed_id}) if _seed_id else None
if _dev is not None:
    check("B1 dev/preview: demo-token works for seed profile",
          _dev.status_code == 200 and _dev.json().get("auth_token"),
          (_dev.status_code, _dev.text[:100]))

# B2: APP_ENV=production → blocked EVEN for a seed profile (defense-in-depth)
os.environ["APP_ENV"] = "production"
os.environ.pop("DEMO_LOGIN", None)          # default must be OFF in prod
_prod = client.post("/api/auth/demo-token", json={"tsap_id": _seed_id}) if _seed_id else \
        client.post("/api/auth/demo-token", json={"tsap_id": "MV1001"})
check("B2 production: demo-token blocked (403) even for seed profile",
      _prod.status_code == 403, (_prod.status_code, _prod.text[:120]))

# B3: production + explicit DEMO_LOGIN=1 STILL blocked (prod never issues demo tokens)
os.environ["DEMO_LOGIN"] = "1"
_prod2 = client.post("/api/auth/demo-token", json={"tsap_id": _seed_id or "MV1001"})
check("B3 production + DEMO_LOGIN=1 still blocked (hard prod guard)",
      _prod2.status_code == 403, (_prod2.status_code, _prod2.text[:120]))
os.environ.pop("DEMO_LOGIN", None)
os.environ.pop("APP_ENV", None)


# ═══════════════════════════════════════════════════════════════════════
section("C. BACKUP is DB_FILE-aware (persistent-volume safe)")
# ═══════════════════════════════════════════════════════════════════════
# Simulate an operator who moved the core DB OUTSIDE the backend dir
# (TSAP_DB_FILE=/some/volume/live_db.json) — the common persistence pattern.
_tmp = tempfile.mkdtemp(prefix="tsap-bk-")
_vol_db = os.path.join(_tmp, "volume_live_db.json")
_core = {"saved_at": "2026-10-02T00:00:00", "users": [{"tsap_id": "BK-1"}, {"tsap_id": "BK-2"}],
         "interests": [], "payments": [], "otps": {}, "verified_phones": [], "views": [], "saves": []}
with open(_vol_db, "w", encoding="utf-8") as f:
    json.dump(_core, f)

_orig_db = db_store.DB_FILE
try:
    db_store.DB_FILE = _vol_db            # point the app's DB at the volume
    blob, fname = backup39.export_zip()
    zf = zipfile.ZipFile(io.BytesIO(blob))
    names = zf.namelist()
    meta = json.loads(zf.read("meta.json").decode("utf-8"))
    check("C1 export includes canonical data_db.json even when DB is on a volume",
          "data_db.json" in names, names[:8])
    _in_zip = json.loads(zf.read("data_db.json").decode("utf-8"))
    check("C2 zipped core == live DB_FILE content (not a stale/empty file)",
          _in_zip.get("users") == _core["users"], _in_zip.get("users"))
    check("C3 meta marks app + count>0", meta.get("app") == "mana-vivaha-backup" and meta.get("count", 0) > 0,
          {"app": meta.get("app"), "count": meta.get("count")})
    check("C4 meta records the real db_file path", meta.get("db_file") == os.path.abspath(_vol_db),
          meta.get("db_file"))

    # restore round-trip: wipe the volume DB, import, ensure it lands back on DB_FILE
    os.remove(_vol_db)
    res = backup39.import_zip(blob)
    check("C5 import restores core to the configured DB_FILE (volume), not BASE",
          os.path.exists(_vol_db) and "data_db.json" in res.get("restored", []),
          {"exists": os.path.exists(_vol_db), "restored": res.get("restored")})
    _back = json.load(open(_vol_db, encoding="utf-8")) if os.path.exists(_vol_db) else {}
    check("C6 restored volume DB content matches backup",
          _back.get("users") == _core["users"], _back.get("users"))
finally:
    db_store.DB_FILE = _orig_db
    import shutil
    shutil.rmtree(_tmp, ignore_errors=True)
    for _b in glob.glob(os.path.join(backup39.BASE, "backups", "*.zip")):
        try:
            os.remove(_b)
        except Exception:
            pass


print(f"\n{'=' * 66}")
print(f"🛡️ DEPLOY-HARDENING: {passed} passed, {failed} failed")
print(f"{'=' * 66}")
if failed:
    print("FAILED — ee 3 production risks regression ayyayi!")
    sys.exit(1)
print("🎉 ALL GREEN — honest stats + prod demo-token block + volume-safe backup")
