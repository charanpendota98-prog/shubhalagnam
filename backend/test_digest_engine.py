"""
MANA VIVAHA — PERSONALIZED DAILY DIGEST ENGINE TEST SUITE 📬
============================================================
Run:  python test_digest_engine.py   (backend/ cwd nunchi)

Cover: build_personal_digest (should_send + counts + saved-search hits + text),
opt-out (user flag / notif pref / consent ledger), no-phone, engagement window,
dedup (recent_keys), saved-search alert flag, run_personal_digests batch
classification + queue cap + samples, send_digest_queue (injectable), gated send
(DIGEST_PERSONAL_SEND off → no send), crash-safety, privacy (no raw phone),
and the 3 endpoints (admin preview/run, owner digest) + their guards.
"""
import os
import sys
import json
from datetime import datetime, timedelta

os.environ.setdefault("WA_TEST_FAST", "1")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import digest_engine as DE  # noqa: E402

PASS = []
FAIL = []


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name + (("  | " + str(extra)) if extra else ""))


NOW = datetime(2026, 10, 2, 9, 0, 0)


def P(tid, g, name, age, caste, dist, days=1, phone=True, **kw):
    d = dict(tsap_id=tid, gender=g, full_name=name, age=age, caste=caste, district=dist,
             state="TS", is_approved=True, phone=("98" + tid[-8:].rjust(8, "0") if phone else ""),
             created_at=(NOW - timedelta(days=days)).isoformat(), education="BTech", job="Engineer",
             salary="10L", height="5'5\"", marital_status="Never Married", religion="Hindu", diet="Veg")
    d.update(kw)
    return d


ME = P("GROOM-1", "Groom", "Ravi", 28, "Reddy", "Hyderabad", days=2)
POOL = [ME,
        P("BRIDE-1", "Bride", "Lakshmi", 24, "Reddy", "Hyderabad", days=1),
        P("BRIDE-2", "Bride", "Priya", 26, "Reddy", "Warangal", days=2),
        P("BRIDE-3", "Bride", "Sana", 25, "Kamma", "Guntur", days=1)]
INTS = [{"from_id": "GROOM-1", "to_id": "BRIDE-9", "status": "pending", "created_at": NOW.isoformat()}]
VIEWS = [{"tsap_id": "GROOM-1", "viewer_id": "BRIDE-2", "at": NOW.isoformat()}]
SAVED = [{"search_id": "SRCH-1", "tsap_id": "GROOM-1", "name": "Reddy Hyderabad", "alert": True,
          "filters": {"caste": "Reddy", "district": "Hyderabad"}, "last_seen_ids": []}]


def new_matches_fn(rec, users, excl, lim):
    f = rec.get("filters", {})
    out = []
    for u in users:
        if not isinstance(u, dict) or u.get("tsap_id") in excl:
            continue
        if all(str(u.get(k, "")) == v for k, v in f.items()):
            out.append(u)
        if len(out) >= lim:
            break
    return out


print("=== 1. BUILD ONE DIGEST ===")
rec = DE.build_personal_digest(ME, POOL, INTS, VIEWS, [], SAVED, new_matches_fn, now=NOW)
check("should_send True", rec["should_send"] is True, rec["reason"])
check("reason ok", rec["reason"] == "ok")
check("matches_count > 0", rec["matches_count"] > 0, rec["matches_count"])
check("saved_hits from saved search", rec["saved_hits"] >= 1, rec["saved_hits"])
check("has dedup_key", bool(rec["dedup_key"]))
check("text non-empty", bool(rec["text"]))
check("text has saved-search line", "saved search" in rec["text"])

print("\n=== 2. PRIVACY — NO RAW PHONE ===")
allphones = [p["phone"] for p in POOL if p["phone"]]
check("no raw phone in digest text", not any(ph in rec["text"] for ph in allphones))

print("\n=== 3. OPT-OUT ===")
o1 = DE.build_personal_digest(P("G-2", "Groom", "A", 29, "Reddy", "Hyderabad", days=1, digest_opt_out=True),
                              POOL, [], [], [], [], now=NOW)
check("user digest_opt_out → opted_out", o1["reason"] == "opted_out", o1["reason"])
o2 = DE.build_personal_digest(P("G-3", "Groom", "B", 29, "Reddy", "Hyderabad", days=1,
                                notifications={"digest": False}), POOL, [], [], [], [], now=NOW)
check("notif pref digest=False → opted_out", o2["reason"] == "opted_out", o2["reason"])
o3 = DE.build_personal_digest(P("G-4", "Groom", "C", 29, "Reddy", "Hyderabad", days=1), POOL, [], [], [], [],
                              consent_rows=[{"action": "wa_opt_out", "actor_id": "G-4"}], now=NOW)
check("consent ledger wa_opt_out → opted_out", o3["reason"] == "opted_out", o3["reason"])

print("\n=== 4. NO PHONE / ENGAGEMENT ===")
np = DE.build_personal_digest(P("G-5", "Groom", "D", 30, "Reddy", "Hyderabad", days=1, phone=False),
                              POOL, [], [], [], [], now=NOW)
check("no phone → no_phone", np["reason"] == "no_phone", np["reason"])
dorm = DE.build_personal_digest(P("G-6", "Groom", "E", 31, "Reddy", "Hyderabad", days=400),
                                POOL, [], [], [], [], now=NOW)
check("dormant (400d, no activity) → not_engaged", dorm["reason"] == "not_engaged", dorm["reason"])
eng = DE.build_personal_digest(P("G-7", "Groom", "F", 32, "Reddy", "Hyderabad", days=400),
                               POOL, [{"from_id": "G-7", "to_id": "BRIDE-1", "created_at": NOW.isoformat()}],
                               [], [], [], now=NOW)
check("old but recent interest → engaged (sendable)", eng["reason"] in ("ok", "no_new_content"), eng["reason"])

print("\n=== 5. DEDUP ===")
dup = DE.build_personal_digest(ME, POOL, INTS, VIEWS, [], SAVED, new_matches_fn,
                               recent_keys=[rec["dedup_key"]], now=NOW)
check("same digest in recent_keys → duplicate", dup["reason"] == "duplicate", dup["reason"])
check("duplicate not sendable", dup["should_send"] is False)

print("\n=== 6. SAVED-SEARCH ALERT FLAG ===")
saved_off = [{"search_id": "S-2", "tsap_id": "GROOM-1", "name": "Off", "alert": False,
              "filters": {"caste": "Reddy"}, "last_seen_ids": []}]
r_off = DE.build_personal_digest(ME, POOL, INTS, VIEWS, [], saved_off, new_matches_fn, now=NOW)
check("alert=False search → 0 saved hits", r_off["saved_hits"] == 0, r_off["saved_hits"])

print("\n=== 7. BATCH RUN ===")
users = [ME,
         P("G-2", "Groom", "A", 29, "Reddy", "Hyderabad", days=1, digest_opt_out=True),
         P("G-5", "Groom", "D", 30, "Reddy", "Hyderabad", days=1, phone=False),
         P("G-6", "Groom", "E", 31, "Reddy", "Hyderabad", days=400)]
batch = DE.run_personal_digests(users, POOL, INTS, VIEWS, [], SAVED, new_matches_fn, now=NOW)
check("batch success", batch["success"] is True)
c = batch["counts"]
check("counts total = 4", c["total"] == 4, c["total"])
check("counts opted_out = 1", c["opted_out"] == 1, c["opted_out"])
check("counts no_phone = 1", c["no_phone"] == 1, c["no_phone"])
check("counts not_engaged = 1", c["not_engaged"] == 1, c["not_engaged"])
check("counts sendable = 1", c["sendable"] == 1, c["sendable"])
check("queued = 1", batch["queued"] == 1, batch["queued"])
check("samples ≤ 3", len(batch["samples"]) <= 3, len(batch["samples"]))
check("generation did NOT send (note present)", "nothing was sent" in batch["note"].lower())

print("\n=== 8. QUEUE CAP ===")
big = [P(f"GROOM-{i}", "Groom", f"U{i}", 28, "Reddy", "Hyderabad", days=1) for i in range(10)]
bigpool = big + [P("BRIDE-1", "Bride", "L", 24, "Reddy", "Hyderabad", days=1)]
cap = DE.run_personal_digests(big, bigpool, [], [], [], [], None, now=NOW, max_queue=3)
check("max_queue caps queue", cap["queued"] <= 3, cap["queued"])

print("\n=== 9. SEND (injectable) ===")
stub = []
res = DE.send_digest_queue(batch["queue"], lambda r: (stub.append(r["tsap_id"]), {"ok": True})[1])
check("send_digest_queue sent count", res["sent"] == batch["queued"], res["sent"])
check("send_fn actually invoked", len(stub) == batch["queued"], stub)
check("send failed = 0", res["failed"] == 0)


def boom(r):
    raise RuntimeError("wa down")


res2 = DE.send_digest_queue(batch["queue"], boom)
check("send_fn exception → failed counted", res2["failed"] == 1 and res2["sent"] == 0, res2)

print("\n=== 10. CRASH-SAFETY ===")
check("junk users batch ok", DE.run_personal_digests(["x", None, 5], ["bad"], None, None, None, None, None, now=NOW)["success"] is True)
check("None everything ok", DE.build_personal_digest(None, None, None, None, None, None, None, now=NOW)["should_send"] is False)
check("empty send ok", DE.send_digest_queue([], lambda r: {})["sent"] == 0)

print("\n=== 11. ENDPOINTS (dev harness) ===")
try:
    os.environ["TSAP_AUTH_MODE"] = "off"
    os.environ["DEMO_SEED_ENABLED"] = "true"
    os.environ["LAUNCH_SEED_COUNT"] = "60"
    os.environ["WHATSAPP_MODE"] = "off"
    os.environ.pop("DIGEST_PERSONAL_SEND", None)
    import main as M
    from fastapi.testclient import TestClient
    from hardening import sign_token, ADMIN_KEY
    cl = TestClient(M.app, raise_server_exceptions=False)
    with cl:
        AH = {"x-tsap-token": sign_token("ADMIN"), "X-Admin-Key": ADMIN_KEY}
        pv = cl.get("/api/digest/personal/preview", headers=AH)
        check("GET /api/digest/personal/preview 200", pv.status_code == 200, pv.status_code)
        pj = pv.json()
        check("preview dry_run True", pj.get("dry_run") is True)
        check("preview send_gated True (default off)", pj.get("send_gated") is True)
        check("preview has counts+samples", isinstance(pj.get("counts"), dict) and isinstance(pj.get("samples"), list))
        rn = cl.post("/api/digest/personal/run", headers=AH, json={"lang": "te"})
        check("POST /api/digest/personal/run 200", rn.status_code == 200, rn.status_code)
        rj = rn.json()
        check("run send_enabled False (gated)", rj.get("send_enabled") is False)
        check("run send skipped (nothing sent)", rj.get("send", {}).get("skipped") is True, rj.get("send"))
        check("run logged to DB_DIGEST (kind=personal)", any(e.get("kind") == "personal" for e in M.DB_DIGEST))
        groom = next((u for u in M.DB_USERS if u.get("gender") == "Groom" and u.get("is_approved", True) and u.get("phone")), None)
        if groom:
            gid = groom["tsap_id"]
            od = cl.get(f"/api/assistant/digest/{gid}", headers={"x-tsap-token": sign_token(gid)})
            check("GET /api/assistant/digest/{id} 200", od.status_code == 200, od.status_code)
            oj = od.json()
            check("owner digest has reason+counts", "reason" in oj and "matches_count" in oj)
            ep_blob = json.dumps(pj, ensure_ascii=False) + json.dumps(rj, ensure_ascii=False) + json.dumps(oj, ensure_ascii=False)
            ep_leak = [u["tsap_id"] for u in M.DB_USERS if u.get("phone") and u["phone"] in ep_blob]
            check("endpoint privacy (no raw phone)", not ep_leak, ep_leak[:3])
        else:
            check("seed groom present", False)
except Exception as e:  # pragma: no cover
    check("endpoint suite", False, repr(e))

print("\n=== 12. GUARDS (source contract) ===")
try:
    import inspect
    check("preview route require_admin", "require_admin(request)" in inspect.getsource(M.digest_personal_preview))
    check("run route require_admin", "require_admin(request)" in inspect.getsource(M.digest_personal_run))
    check("owner digest route require_owner", "require_owner(request, tsap_id)" in inspect.getsource(M.api_assistant_digest))
except Exception as e:  # pragma: no cover
    check("guard source contract", False, repr(e))

print("\n=== RESULT: %d pass / %d fail ===" % (len(PASS), len(FAIL)))
if FAIL:
    print("FAILED:", FAIL)
    sys.exit(1)
print("🏆 PERSONALIZED DIGEST ENGINE — ANNI TESTS PASS")
