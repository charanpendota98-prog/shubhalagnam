#!/usr/bin/env python3
"""
🌊 WAVE 40 — RETENTION + DAILY MATCHES + EXPORTS + BRAND TEST SUITE
===================================================================
A. RETENTION: archive before active-store removal; preserve paid entitlements,
   profile/referral balances, and pending payouts; verify support-log fields.
B. DAILY MATCHES: public list is factual; admin selection never publishes unless
   the request explicitly opts in; no admin key → 401/403.
C. EXPORTS: users.csv / payments.csv / leads.csv → 200 + text/csv + header + BOM.
D. BRAND: retain both "Mana Vivaha" and "మన వివాహ"; reject the fused Telugu typo.
E. WALLET: payout approval preserves the settled ledger history.
"""
import os
import sys
import json
import secrets
from datetime import datetime, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from test_storage import isolate_test_stores  # noqa: E402
_TEST_STORE = isolate_test_stores("wave40")
# This suite must prove the owner/admin guard, while keeping every store and
# credential test-only. Never inherit production credentials or auth bypass.
os.environ["APP_ENV"] = "test"
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ.pop("WA_TEST_FAST", None)
os.environ["TSAP_AUTH_SECRET"] = "test-only-" + secrets.token_urlsafe(48)
os.environ["ADMIN_KEY"] = "test-only-" + secrets.token_urlsafe(32)

from fastapi.testclient import TestClient  # noqa: E402
import main as M  # noqa: E402
from hardening import ADMIN_KEY  # noqa: E402

H_ADMIN = {"x-admin-key": ADMIN_KEY}
PASS = 0
FAIL = 0


def section(t):
    print("\n" + "=" * 62 + "\n" + t + "\n" + "=" * 62)


def check(name, cond, extra=""):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        print(f"  ❌ {name} {extra}")


client = TestClient(M.app)

# ---------------------------------------------------------------- A. RETENTION
section("A. RETENTION — 3-year auto-delete (archive first)")
import retention as RT  # noqa: E402

old_iso = (datetime.utcnow() - timedelta(days=365 * 4 + 10)).isoformat()
fresh_iso = datetime.utcnow().isoformat()
plan_iso = (datetime.utcnow() + timedelta(days=30)).isoformat()
fake_users = [
    {"tsap_id": "OLD001", "full_name": "Old Profile", "created_at": old_iso, "phone": "9848012345"},
    {"tsap_id": "OLD002", "full_name": "Wallet Active", "created_at": old_iso, "wallet": 150},
    {"tsap_id": "OLD003", "full_name": "Legacy Plan Active", "created_at": old_iso, "plan_until": plan_iso},
    {"tsap_id": "OLD004", "full_name": "Paid Plan Active", "created_at": old_iso, "plan": "S_99", "plan_expiry": plan_iso},
    {"tsap_id": "OLD005", "full_name": "Payout Pending", "created_at": old_iso,
     "wallet": 0, "referral_stats": {"wallet": 0, "pending_payout": 75}},
    {"tsap_id": "NEW001", "full_name": "Fresh", "created_at": fresh_iso},
]
p = RT.preview(fake_users)
check("preview: OLD001 → to_delete", any(x["tsap_id"] == "OLD001" for x in p["to_delete"]))
check("preview: wallet ₹150 → skipped", any(x["tsap_id"] == "OLD002" and x["reason"] == "wallet_balance" for x in p["skipped_active"]))
check("preview: legacy plan_until active → skipped", any(x["tsap_id"] == "OLD003" and x["reason"] == "plan_until" for x in p["skipped_active"]))
check("preview: current paid plan_expiry active → skipped", any(x["tsap_id"] == "OLD004" and x["reason"] == "plan_expiry" for x in p["skipped_active"]))
check("preview: nested referral payout pending → skipped", any(x["tsap_id"] == "OLD005" and x["reason"] == "pending_payout" for x in p["skipped_active"]))
check("preview: fresh untouched", not any(x["tsap_id"] == "NEW001" for x in p["to_delete"]))

ints = [{"from_id": "OLD001", "to_id": "NEW001"}, {"from_id": "NEW001", "to_id": "NEW001"}]
views = [{"tsap_id": "OLD001", "viewer_id": "NEW001"}]
saves = [{"tsap_id": "NEW001", "saved_id": "OLD001"}]
res = RT.run(fake_users, ints, views, saves)
check("run: deleted=1", res.get("deleted") == 1)
check("run: archive file created", os.path.exists(res.get("archive", "")))
arc = json.load(open(res["archive"], encoding="utf-8"))
check("run: archive has OLD001 full profile", any(u["tsap_id"] == "OLD001" for u in arc["profiles"]))
check("run: OLD001 removed from users", not any(u["tsap_id"] == "OLD001" for u in fake_users))
check("run: NEW001 kept", any(u["tsap_id"] == "NEW001" for u in fake_users))
check("run: OLD001 interests cleaned", not any(i.get("from_id") == "OLD001" for i in ints))
check("run: OLD001 views cleaned", not any(v.get("tsap_id") == "OLD001" for v in views))
check("run: OLD001 saves cleaned", not any(s.get("saved_id") == "OLD001" for s in saves))
check("run: retention_log written", os.path.exists(RT.LOG_FILE))
with open(RT.LOG_FILE, encoding="utf-8") as _log_fp:
    _support_log = json.load(_log_fp)
_old_log = next((row for row in _support_log if row.get("tsap_id") == "OLD001"), {})
check("support log stores ID/name/removal time, not phone",
      set(_old_log) == {"tsap_id", "name", "deleted_at"} and "9848012345" not in json.dumps(_old_log))
check("run: dry_run safe", RT.run(fake_users, ints, views, saves, dry_run=True)["deleted"] == 0)

# live admin endpoints
r = client.get("/api/admin/retention/preview", headers=H_ADMIN)
check("GET /api/admin/retention/preview 200", r.status_code == 200 and r.json().get("success"))
check("preview has policy_years", r.json().get("policy_years") == 3)
if M.auth_enforced():
    r = client.get("/api/admin/retention/preview")
    check("retention preview: NO admin key → 401/403", r.status_code in (401, 403))
else:
    print("  ⏭️ retention no-key check skipped (dev/test auth bypass)")

# ---------------------------------------------------------------- B. DAILY MATCHES
section("B. DAILY MATCHES — admin select → today's featured")
r = client.get("/api/daily-matches")
d = r.json()
check("GET /api/daily-matches 200", r.status_code == 200 and d.get("success"))
check("public: featured_profiles list present", "featured_profiles" in d and d.get("count") == 0)

# Deterministic approved fixtures live only in this suite's temporary store.
# Never fall back to whatever candidate profiles happen to exist in another DB.
_now = datetime.utcnow().isoformat()
M.DB_USERS[:] = [
    {"tsap_id": "W40D01", "full_name": "Daily Test Fixture One", "gender": "Bride", "age": 26,
     "caste": "Test community A", "district": "Nalgonda", "state": "TS",
     "status": "approved", "is_approved": True, "created_at": _now},
    {"tsap_id": "W40D02", "full_name": "Daily Test Fixture Two", "gender": "Groom", "age": 29,
     "caste": "Test community B", "district": "Warangal", "state": "TS",
     "status": "approved", "is_approved": True, "created_at": _now},
]
r = client.get("/api/admin/daily-matches/candidates", headers=H_ADMIN)
check("GET candidates 200 + rows", r.status_code == 200 and isinstance(r.json().get("candidates"), list))
cand = r.json().get("candidates") or []
fixture_ids = {"W40D01", "W40D02"}
pick = [c["tsap_id"] for c in cand if c.get("tsap_id") in fixture_ids]
check("candidate list contains only the two approved isolated fixtures",
      set(pick) == fixture_ids and len(pick) == 2, pick)

r = client.post("/api/admin/daily-matches", headers={**H_ADMIN, "Content-Type": "application/json"},
                json={"profile_ids": pick})
set_result = r.json()
check("POST set today 200", r.status_code == 200 and set_result.get("success"))
check("selected == sent ids", set_result.get("selected") == pick)
check("external posting requires explicit opt-in",
      set_result.get("posting_attempted") is False and set_result.get("posted") == []
      and set_result.get("queued") == [])
r = client.get("/api/daily-matches")
d = r.json()
check("public shows today's picks", d.get("count") == len(pick)
      and [m["tsap_id"] for m in d["featured_profiles"]] == pick)
row = (d.get("featured_profiles") or [{}])[0]
check("public row: NO phone leak", "phone" not in row)

r = client.post("/api/admin/daily-matches", headers={**H_ADMIN, "Content-Type": "application/json"},
                json={"profile_ids": []})
check("empty ids → 400", r.status_code == 400)
r = client.post("/api/admin/daily-matches", headers={**H_ADMIN, "Content-Type": "application/json"},
                json={"profile_ids": ["NOPE999"], "post_to_channels": False})
check("bad ID → 404", r.status_code == 404)
if M.auth_enforced():
    r = client.post("/api/admin/daily-matches", headers={"Content-Type": "application/json"},
                    json={"profile_ids": pick})
    check("set: NO admin key → 401/403", r.status_code in (401, 403))
else:
    print("  ⏭️ set no-key check skipped (dev/test auth bypass)")

# ---------------------------------------------------------------- C. EXPORTS
section("C. EXCEL EXPORTS — CSV (BOM + header)")
for path, fname in [("/api/admin/export/users.csv", "profiles"),
                    ("/api/admin/export/payments.csv", "payments"),
                    ("/api/admin/export/leads.csv", "leads")]:
    r = client.get(path, headers=H_ADMIN)
    ok = r.status_code == 200 and "csv" in r.headers.get("content-type", "")
    body = r.text
    check(f"{fname}.csv 200 + csv type", ok)
    check(f"{fname}.csv BOM (Excel Telugu)", body.startswith("\ufeff"))
    check(f"{fname}.csv header row", body.splitlines()[0].count(",") >= 2)
if M.auth_enforced():
    r = client.get("/api/admin/export/users.csv")
    check("users.csv NO admin key → 401/403", r.status_code in (401, 403))
else:
    print("  ⏭️ users.csv no-key check skipped (dev/test auth bypass)")
r = client.get("/api/admin/export/users.csv", headers=H_ADMIN)
check("users.csv rows == DB users", len(r.text.strip().splitlines()) - 1 == len(M.DB_USERS))

# ---------------------------------------------------------------- D. BRAND
section("D. BRAND — మన వివాహ (Mana Vivaha, vivaham కాదు)")
r = client.get("/api/plans")
check("plans: VIP label (Vivaha VIP కాదు)", not any("Vivaha VIP" in str(p.get("label", "")) for p in r.json().get("plans", [])))
brand_sources = "\n".join(
    open(os.path.join(HERE, f), encoding="utf-8").read()
    for f in ("main.py", "referral.py", "card_pro.py", "channels_config.py", "channel_content.py", "interest.py", "credits.py")
)
check("backend retains both brand forms", "Mana Vivaha" in brand_sources and "మన వివాహ" in brand_sources)
check("backend avoids fused Telugu brand typo", "మనవివాహం" not in brand_sources)
mani = open(os.path.join(HERE, "..", "frontend", "public", "manifest.webmanifest"), encoding="utf-8").read()
check("manifest: మన వివాహ (without fused typo)", "మన వివాహ" in mani and "మనవివాహం" not in mani)

# ---------------------------------------------------------------- E. WALLET
section("E. WALLET — pay చేసిన తర్వాత 0, history ఉంటుంది")
import referral as R  # noqa: E402
u = {"tsap_id": "W40T01", "full_name": "Wallet Test", "wallet": 200,
     "referral_code": "W400001"}
req = R.payout_request(u, 200, upi_id="wallet40@okhdfcbank")
check("payout request ok", req.get("ok"))
st = u["referral_stats"]
check("payout request: wallet → 0", float(u.get("wallet", 0)) == 0 and float(st["wallet"]) == 0)
check("payout request: pending 200", float(st["pending_payout"]) == 200)
check("lifetime_earned stays 200 (history)", float(st["lifetime_earned"]) == 200)
res = R.payout_action(req["request"]["id"], "paid", [u], utr="UTR12345678")
check("payout approve ok", res.get("ok"))
check("paid: pending → 0", float(st["pending_payout"]) == 0)
check("paid: paid_out 200 (settled history)", float(st["paid_out"]) == 200)
check("paid: ledger has UTR entry", any("UTR" in str(e.get("note", "")) for e in st.get("ledger", [])))

# ---------------------------------------------------------------- RESULT
section("RESULT")
print(f"PASS {PASS} · FAIL {FAIL}")
if FAIL:
    print("❌ WAVE 40 — FIX CHEYALI")
    sys.exit(1)
print("✅ WAVE 40 — ALL GREEN (retention + daily matches + exports + brand + wallet)")
