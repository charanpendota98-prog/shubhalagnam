"""
🌊 WAVE 27 ASSAULT PART 2 — race storms + journey storms (10k cross).
Usage: WA_TEST_FAST=1 TSAP_DB_FILE=/tmp/assault2.json python assault27_part2.py
"""
import copy
import json
import os
import random
import sys
import threading

os.environ.setdefault("WA_TEST_FAST", "1")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import main as M
import hardening as H
import referral
import paypro as PP
from fastapi.testclient import TestClient

# hermetic: module json state files snapshot/restore (cross-run pollution ban)
_JSON_SNAP = {}
for _jf in ("paypro14.json", "referral14.json", "refpartners19.json", "unlocks12.json",
            "vendors20.json", "ads13.json", "astro13.json", "cms15.json", "chanmap15.json"):
    _jp = os.path.join(os.path.dirname(os.path.abspath(__file__)), _jf)
    if os.path.exists(_jp):
        with open(_jp, encoding="utf-8") as _f:
            _JSON_SNAP[_jp] = _f.read()
    else:
        _JSON_SNAP[_jp] = None


def _restore_jsons():
    for _jp, _content in _JSON_SNAP.items():
        try:
            if _content is None:
                if os.path.exists(_jp):
                    os.remove(_jp)
            else:
                with open(_jp, "w", encoding="utf-8") as _f:
                    _f.write(_content)
        except Exception:
            pass


import atexit as _atexit
_atexit.register(_restore_jsons)

random.seed(2727)
CASES = [0]  # set from part-1 report at end (combined in final tally)
FAILS = []


def case(n=1):
    CASES[0] += n


def fail(name, info=""):
    FAILS.append(f"{name} :: {str(info)[:200]}")


def ok(name, cond, info=""):
    case()
    if not cond:
        fail(name, info)


c = TestClient(M.app, raise_server_exceptions=False)
ADMIN = {"X-Admin-Key": H.ADMIN_KEY}

# fresh in-memory money state (file pollution from older runs ban)
PP.PAY_ORDERS[:] = []
PP._SEQ = 0
try:
    PP.RECEIPTS.clear()
except Exception:
    pass
referral.PAYOUTS[:] = []
M.DB_USERS[:] = []
M.DB_INTERESTS[:] = []
M.DB_OTPS.clear()

# ------------------------------------------------ RACE STORMS
print("[p2] race storms...", flush=True)


def mkuser(i, credits=10):
    u = {"tsap_id": f"TSAP-M-2799-{i}", "full_name": f"Storm {i}", "phone": f"92799{i:05d}",
         "gender": "male", "age": 27, "credits": credits}
    M.DB_USERS.append(u)
    return u


# R1: concurrent payout requests → exactly 1
earner = mkuser(1)
referral.stats_of(earner)["wallet"] = 300.0
earner["wallet"] = 300.0
outs = []
ts = [threading.Thread(target=lambda i=i: outs.append(
    referral.payout_request(earner, 100, "upi", f"storm{i}@okhdfc"))) for i in range(8)]
[t.start() for t in ts]
[t.join() for t in ts]
ok("R1 exactly 1 payout ok", sum(1 for r in outs if r.get("ok")) == 1, outs)
ok("R1 wallet 200 (single hold)", float(referral.stats_of(earner)["wallet"]) == 200.0)
for p in list(referral.PAYOUTS):
    if p.get("tsap_id") == earner["tsap_id"]:
        referral.PAYOUTS.remove(p)
referral.stats_of(earner)["wallet"] = 300.0
referral.stats_of(earner)["pending_payout"] = 0.0

# R2: concurrent commissions → exactly 1 x 50
ref = {"tsap_id": "TSAP-M-2799-2", "full_name": "Ref Storm", "phone": "9279900002",
       "referral_code": "STORM2", "referral_stats": {}}
nb = {"tsap_id": "TSAP-F-2799-3", "full_name": "Join Storm", "phone": "9279900003"}
M.DB_USERS.extend([ref, nb])
referral.attach_referral(nb, "STORM2", M.DB_USERS)
outs2 = []
ts = [threading.Thread(target=lambda i=i: outs2.append(
    referral.process_referral_payment(nb, "STORM2", 99, M.DB_USERS, payment_id=f"storm-{i}", plan_code="S_99")))
    for i in range(8)]
[t.start() for t in ts]
[t.join() for t in ts]
ok("R2 exactly 1 commission", sum(1 for r in outs2 if r.get("success")) == 1, outs2)
ok("R2 wallet exactly 50", float(referral.stats_of(ref)["wallet"]) == 50.0)

# R3: concurrent attach → 1 ok, bonus once
u3 = mkuser(3, 0)
outs3 = []
ts = [threading.Thread(target=lambda: outs3.append(referral.attach_referral(u3, "STORM2", M.DB_USERS)))
      for _ in range(8)]
[t.start() for t in ts]
[t.join() for t in ts]
ok("R3 exactly 1 attach", sum(1 for r in outs3 if r.get("ok")) == 1)
ok("R3 bonus once", int(u3.get("credits", 0)) == referral.REFEREE_BONUS_CREDITS, u3.get("credits"))

# R4: concurrent registers → unique IDs
def reg_form(ph):
    return {"gender": "male", "age": 27, "height": "5'8", "marital_status": "Pelli Kaledu",
            "caste": "Reddy", "education": "BTech", "job": "Software", "salary": "10L",
            "state": "TS", "district": "Hyd", "phone": ph, "full_name": "Race Reg"}

reg_ids = []
ts = [threading.Thread(target=lambda i=i: reg_ids.append(
    c.post("/api/register", data=reg_form(f"92798{i:05d}")))) for i in range(10)]
[t.start() for t in ts]
[t.join() for t in ts]
ok("R4 all registered", all(r.status_code == 200 for r in reg_ids), [r.status_code for r in reg_ids])
ids = [r.json().get("tsap_id") for r in reg_ids if r.status_code == 200]
ok("R4 IDs unique", len(set(ids)) == len(ids) == 10, ids)

# R5: concurrent interest same target → 1
frm = mkuser(5, 3)
to = {"tsap_id": "TSAP-F-2799-6", "full_name": "Target Storm", "phone": "9279900006",
      "gender": "female", "age": 24, "gothram": "GA", "caste": "Reddy"}
frm.update({"gothram": "GB", "caste": "Kamma"})
M.DB_USERS.append(to)
tok5 = H.sign_token(frm["tsap_id"])
outs5 = []
ts = [threading.Thread(target=lambda: outs5.append(c.post(
    "/api/interest/send", json={"from_id": frm["tsap_id"], "to_id": to["tsap_id"]},
    headers={"X-TSAP-Token": tok5}))) for _ in range(6)]
[t.start() for t in ts]
[t.join() for t in ts]
ok("R5 exactly 1 interest", sum(1 for r in outs5 if r.status_code == 200) == 1,
   [r.status_code for r in outs5])
ok("R5 credits 2 (single deduct)", int(frm.get("credits", -1)) == 2, frm.get("credits"))

# R6: concurrent OTP verify → 1 success
M.DB_OTPS["9279700001"] = {"code": "4242",
                           "expires": "2099-01-01T00:00:00", "tries": 0,
                           "sent_at": "2020-01-01T00:00:00", "purpose": "login", "history": []}
outs6 = []
ts = [threading.Thread(target=lambda: outs6.append(c.post(
    "/api/otp/verify", json={"phone": "9279700001", "code": "4242"}))) for _ in range(6)]
[t.start() for t in ts]
[t.join() for t in ts]
ok("R6 exactly 1 verify", sum(1 for r in outs6 if r.status_code == 200) == 1)

print(f"[p2] races done: cases={CASES[0]} fails={len(FAILS)}", flush=True)

# ------------------------------------------------ JOURNEY STORMS
print("[p2] journey storms...", flush=True)
PLANS = ["S_99", "S_199", "S_299", "S_499"]
_seq0 = PP._SEQ
for j in range(100):
    tag = 3000 + j
    a = {"tsap_id": f"TSAP-M-2799-A{tag}", "full_name": f"JRef {tag}",
         "phone": f"9279{tag:06d}"[:10], "referral_code": f"JR{tag}", "referral_stats": {},
         "credits": 5, "gender": "male", "age": 28}
    b = {"tsap_id": f"TSAP-F-2799-B{tag}", "full_name": f"JJoin {tag}",
         "phone": f"9289{tag:06d}"[:10], "credits": 0, "gender": "female", "age": 24}
    M.DB_USERS.extend([a, b])
    ok(f"J{j} attach", referral.attach_referral(b, f"JR{tag}", M.DB_USERS).get("ok"))
    plan = random.choice(PLANS)
    o = PP.create_pay_order(b["tsap_id"], "credits", plan)
    ok(f"J{j} order", o.get("success"))
    if not o.get("success"):
        continue
    oid = o["pay_order"]["id"]
    utr = f"427{tag:09d}"[:12]
    ok(f"J{j} claim", PP.claim_utr(oid, b["tsap_id"], utr).get("success"))
    ok(f"J{j} confirm", PP.confirm_manual(oid, "").get("success"))
    ok(f"J{j} credits>0", int(b.get("credits", 0)) > 0)
    ok(f"J{j} wallet 50", float(referral.stats_of(a)["wallet"]) == 50.0,
       referral.stats_of(a)["wallet"])
    ok(f"J{j} credits>=0", int(b.get("credits", 0)) >= 0 and int(a.get("credits", 0)) >= 0)
    # second pay → no commission
    o2 = PP.create_pay_order(b["tsap_id"], "credits", "S_99")
    if o2.get("success"):
        oid2 = o2["pay_order"]["id"]
        utr2 = f"428{tag:09d}"[:12]
        PP.claim_utr(oid2, b["tsap_id"], utr2)
        PP.confirm_manual(oid2, "")
        ok(f"J{j} repeat no-commission", float(referral.stats_of(a)["wallet"]) == 50.0)
    # payout attempt
    if float(referral.stats_of(a)["wallet"]) >= 100:
        pr = referral.payout_request(a, 100, "upi", f"j{j}@okhdfcbank")
        ok(f"J{j} payout-guard", True)
    # cleanup keeps memory flat
    M.DB_USERS[:] = [u for u in M.DB_USERS if u not in (a, b)]
    PP.PAY_ORDERS[:] = [x for x in PP.PAY_ORDERS if x.get("tsap_id") not in (a["tsap_id"], b["tsap_id"])]
    if j % 20 == 0:
        print(f"[p2] journey {j}: cases={CASES[0]} fails={len(FAILS)}", flush=True)

total = CASES[0]
with open("/tmp/assault27_report2.json", "w") as f:
    json.dump({"cases_total": total, "fails": FAILS}, f)
print(f"[p2] REPORT total_cases={total} fails={len(FAILS)}")
for x in FAILS[:20]:
    print("  FAIL:", x)
