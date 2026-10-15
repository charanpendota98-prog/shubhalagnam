"""
WAVE 36 MY-POWER - user-side advanced: 14 orphaned APIs wired + rasi chart.
===============================================================================
User: "MISSING MANY THINGS BUILD ADVANCEDGA"

R1 reverse coverage: every orphaned user API now called by frontend.
R2 /api/astro/chart: moon house math + 12 houses + 404 + unknown-rasi honesty.
R3 boost packs + buy validation (bad pack 400, unknown user 404).
R4 promo preview: bad code 400, seeded DIWALI25 discount math, bad plan 400.
R5 match/score: breakdown + gothram/surname/age verdicts + 404 + blocked 400.
R6 owner gates (enforced): unlocks/top-matches/streak -> noauth 401, wrong 401, self 200.
R7 smoke: gothram/dosha/share/voice/interest-status shapes (200, never 500).
R8 wrong-method 405s.

Run: WA_TEST_FAST=1 /home/user/venv/bin/python test_wave36_mypower.py
"""
import os
import sys
import re
import uuid

RUN = uuid.uuid4().hex[:6].upper()

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402
isolate_test_stores("wave36")

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
import paypro as PP  # noqa: E402
from hardening import sign_token  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

client = TestClient(main.app, raise_server_exceptions=False)

_PAY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "paypro14.json")
_PAY_BAK = open(_PAY, "rb").read() if os.path.exists(_PAY) else None

BASE = {"gender": "Bride", "full_name": "W36 T", "credits": 0, "plan": "FREE",
        "phone_verified": True, "is_verified": False, "is_approved": True,
        "referral_code": "", "referred_by": "", "credit_history": [],
        "created_at": "2026-01-01T00:00:00", "district": "Guntur",
        "state": "AP", "caste": "Kamma", "age": 23, "job": "Teacher",
        "education": "BSc", "marital_status": "Never Married", "gothram": "Srivatsa",
        "star": "Rohini", "rasi": "Vrishabha"}
U1 = dict(BASE, tsap_id=f"TSAP-F-2026-{RUN}1", full_name="W36 Bride One", phone="9200000001")
U2 = dict(BASE, tsap_id=f"TSAP-M-2026-{RUN}2", full_name="W36 Groom Two", phone="9200000002",
          gender="Groom", age=27, gothram="Kashyapa", star="Mrigasira", rasi="Mithuna")
U3 = dict(BASE, tsap_id=f"TSAP-F-2026-{RUN}3", full_name="W36 NoRasi", phone="9200000003",
          star="", rasi="")
main.DB_USERS.extend([U1, U2, U3])
H1 = {"x-tsap-token": sign_token(U1["tsap_id"])}
H2 = {"x-tsap-token": sign_token(U2["tsap_id"])}

try:
    # =======================================================================
    # R1 - reverse coverage (orphans now wired)
    # =======================================================================
    section("R1 - reverse coverage: orphan APIs now used by frontend")
    FRONT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "src")
    blob = ""
    for dp, _, fns in os.walk(FRONT):
        for fn in fns:
            if fn.endswith((".tsx", ".ts")):
                blob += open(os.path.join(dp, fn), encoding="utf-8").read() + "\n"
    ORPHANS = ["/api/boost/packs", "/api/boost/buy", "/api/top-matches/",
               "/api/match/score", "/api/astro/dosha/", "/api/astro/jathakam/upload",
               "/api/interest/status/", "/api/promo/apply", "/api/share/kit/",
               "/api/streak/", "/api/streak/claim", "/api/unlocks/",
               "/api/voice/upload", "/api/voice/", "/api/gothram/check",
               "/api/astro/chart/"]
    missing = [u for u in ORPHANS if u not in blob]
    check("R1 all orphans wired", not missing, missing)
    check("R1b /me page exists", os.path.exists(os.path.join(FRONT, "app", "me", "page.tsx")))
    check("R1c TopPicks + RasiChart exist",
          os.path.exists(os.path.join(FRONT, "components", "TopPicks.tsx"))
          and os.path.exists(os.path.join(FRONT, "components", "RasiChart.tsx")))

    # =======================================================================
    # R2 - chart
    # =======================================================================
    section("R2 - rasi chart")
    c1 = client.get(f"/api/astro/chart/{U1['tsap_id']}").json()
    check("R2 moon house Vrishabha=2", c1.get("moon_house") == 2 and c1.get("rasi_known"), c1)
    check("R2 12 houses south-indian", len(c1.get("houses", [])) == 12 and c1.get("style") == "south-indian")
    check("R2 moon flag on house 2", [h for h in c1["houses"] if h.get("moon")] == [
        {"house": 2, "rasi_en": "Vrishabha", "moon": True}], c1["houses"][1])
    c3 = client.get(f"/api/astro/chart/{U3['tsap_id']}").json()
    check("R2 unknown rasi honest", c3.get("rasi_known") is False and c3.get("moon_house") is None, c3)
    c404 = client.get("/api/astro/chart/TSAP-X-0000")
    check("R2 unknown -> 404", c404.status_code == 404, c404.status_code)

    # =======================================================================
    # R3 - boost
    # =======================================================================
    section("R3 - boost")
    bp = client.get("/api/boost/packs").json()
    codes = [p.get("code") for p in bp.get("packs", [])]
    check("R3 packs B_1/B_3/B_7", codes == ["B_1", "B_3", "B_7"], codes)
    bb = client.post("/api/boost/buy", json={"tsap_id": U1["tsap_id"], "pack": "B_3"}, headers=H1)
    check("R3 buy ok", bb.status_code == 200 and bb.json().get("success"), bb.text[:150])
    bb2 = client.post("/api/boost/buy", json={"tsap_id": U1["tsap_id"], "pack": "B_99"}, headers=H1)
    check("R3 bad pack -> 400", bb2.status_code == 400, bb2.status_code)
    bb3 = client.post("/api/boost/buy", json={"tsap_id": "TSAP-X-0000", "pack": "B_1"})
    check("R3 unknown user -> 401/404", bb3.status_code in (401, 404), bb3.status_code)

    # =======================================================================
    # R4 - promo
    # =======================================================================
    section("R4 - promo preview")
    PP.seed_festivals("2020-01-01", "2030-12-31", 1000)
    pv = client.get(f"/api/promo/apply?code=DIWALI25&purpose=credits&plan=S_99&user={U1['tsap_id']}").json()
    check("R4 DIWALI25 discounts 99", pv.get("success") and pv.get("amount") == 99
          and 0 < pv.get("final_amount", 99) < 99 and pv.get("discount", 0) > 0, pv)
    pb = client.get("/api/promo/apply?code=NOPE99&purpose=credits&plan=S_99")
    check("R4 bad code -> 400", pb.status_code == 400, pb.status_code)
    pp = client.get("/api/promo/apply?code=DIWALI25&purpose=credits&plan=NOPE")
    check("R4 bad plan -> 400", pp.status_code == 400, pp.status_code)

    # =======================================================================
    # R5 - factual profile comparison
    # =======================================================================
    section("R5 - factual profile comparison")
    ms_response = client.get(f"/api/match/score?a={U1['tsap_id']}&b={U2['tsap_id']}")
    ms = ms_response.json()
    check("R5 comparison has observations/differences", ms_response.status_code == 200
          and isinstance(ms.get("observations"), list) and isinstance(ms.get("differences"), list), list(ms.keys()))
    check("R5 no synthetic score, grade, verdict, or trust score",
          not ({"score", "match_score", "compatibility_score", "trust_score", "grade", "verdict"} & set(ms)))
    check("R5 comparison carries a neutral notice", "not a compatibility" in ms.get("notice", "").lower(), ms.get("notice"))
    m404 = client.get(f"/api/match/score?a={U1['tsap_id']}&b=TSAP-X-0000")
    check("R5 unknown -> 404", m404.status_code == 404, m404.status_code)

    # =======================================================================
    # R6 - owner gates enforced
    # =======================================================================
    section("R6 - owner gates (enforced 401 matrix)")
    _wtf = os.environ.get("WA_TEST_FAST")
    os.environ["WA_TEST_FAST"] = "0"
    os.environ.pop("TSAP_AUTH_MODE", None)
    try:
        GATES = [(f"/api/unlocks/{U1['tsap_id']}"), (f"/api/top-matches/{U1['tsap_id']}?limit=3"),
                 (f"/api/streak/{U1['tsap_id']}")]
        for path in GATES:
            rn = client.get(path)
            rw = client.get(path, headers=H2)
            rg = client.get(path, headers=H1)
            tag = path.split("?")[0].split("/")[2]
            check(f"R6 {tag} noauth->401", rn.status_code == 401, rn.status_code)
            check(f"R6 {tag} wrong-owner->401", rw.status_code == 401, rw.status_code)
            check(f"R6 {tag} self->200", rg.status_code == 200, f"{rg.status_code} {rg.text[:120]}")
    finally:
        if _wtf is None:
            os.environ.pop("WA_TEST_FAST", None)
        else:
            os.environ["WA_TEST_FAST"] = _wtf

    # =======================================================================
    # R7 - smoke shapes
    # =======================================================================
    section("R7 - smoke shapes")
    g = client.get(f"/api/gothram/check?a={U1['tsap_id']}&b={U2['tsap_id']}").json()
    check("R7 gothram text comparison never blocks or gives a marriage verdict",
          "note_telugu" in g and g.get("blocked") is False
          and g.get("notice", "").find("not a compatibility") >= 0 and "verdict_telugu" not in g, g)
    dd = client.get(f"/api/astro/dosha/{U1['tsap_id']}").json()
    check("R7 dosha shape", dd.get("level") in ("clear", "medium", "high") and "verdict_telugu" in dd, dd)
    sk = client.get(f"/api/share/kit/{U1['tsap_id']}").json()
    check("R7 share kit links", sk.get("whatsapp_share", "").startswith("https://wa.me/")
          and "caption" in sk, list(sk.keys())[:8])
    vv = client.get(f"/api/voice/{U1['tsap_id']}").json()
    check("R7 voice shape", "has_voice" in vv and "voice_url" in vv, vv)
    st = client.get(f"/api/streak/{U1['tsap_id']}", headers=H1).json()
    check("R7 streak shape", "count" in st and "claimed_today" in st, st)
    cl = client.post("/api/streak/claim", json={"tsap_id": U1["tsap_id"]}, headers=H1).json()
    check("R7 claim once ok", cl.get("success") and cl.get("count", 0) >= 1, cl)
    cl2 = client.post("/api/streak/claim", json={"tsap_id": U1["tsap_id"]}, headers=H1).json()
    check("R7 claim twice idempotent", cl2.get("already") is True, cl2)

    # =======================================================================
    # R8 - wrong method
    # =======================================================================
    section("R8 - wrong method")
    w1 = client.post(f"/api/astro/chart/{U1['tsap_id']}", json={})
    check("R8 POST on chart -> 405", w1.status_code == 405, w1.status_code)
    w2 = client.post(f"/api/unlocks/{U1['tsap_id']}", json={}, headers=H1)
    check("R8 POST on unlocks -> 405", w2.status_code == 405, w2.status_code)
    w3 = client.get("/api/boost/buy")
    check("R8 GET on boost-buy -> 405", w3.status_code == 405, w3.status_code)
    w4 = client.post("/api/promo/apply", json={})
    check("R8 POST on promo -> 405", w4.status_code == 405, w4.status_code)
finally:
    if _PAY_BAK is not None:
        open(_PAY, "wb").write(_PAY_BAK)

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail\n{'=' * 76}")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("WAVE36 ALL GREEN")
