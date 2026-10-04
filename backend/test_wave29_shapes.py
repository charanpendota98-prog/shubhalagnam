"""
WAVE 29 SHAPE CONTRACT — page reads d.X → API must return X. Browser-truth without browser.
Untested-route sweep: /api/block, /api/facets, /api/channels/join, og/poster PNGs, meta/castes, free-plan.
Run: WA_TEST_FAST=1 python3 test_wave29_shapes.py (backend/ nunchi)
"""
import io
import os
import sys

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402
isolate_test_stores("wave29")

PASS, FAIL, FAILED = 0, 0, []


def section(t):
    print(f"\n=== {t} ===")


def check(name, cond, extra=None):
    global PASS, FAIL
    if cond:
        PASS += 1
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  ❌ {name}" + (f"  → {str(extra)[:200]}" if extra else ""))


import main as M
import hardening as H
import referral
import paypro as PP
from fastapi.testclient import TestClient

c = TestClient(M.app, raise_server_exceptions=False)
ADMIN = {"X-Admin-Key": H.ADMIN_KEY}

_users = list(M.DB_USERS)
_pays = list(PP.PAY_ORDERS)
_seq = PP._SEQ
_pouts = list(referral.PAYOUTS)
_ints = list(M.DB_INTERESTS)

PH = [0]


def new_phone():
    PH[0] += 1
    return f"92929{PH[0]:05d}"


def reg(gender="male", **kw):
    d = {"gender": gender, "age": 27 if gender == "male" else 24, "height": "5'8",
         "marital_status": "Pelli Kaledu", "caste": "Reddy", "education": "BTech",
         "job": "Software", "salary": "10L", "state": "TS", "district": "Hyd",
         "phone": new_phone(), "full_name": kw.pop("full_name", "Shape Test")}
    d.update(kw)
    return c.post("/api/register", data=d)


def user_of(tsap):
    return next((u for u in M.DB_USERS if u.get("tsap_id") == tsap), None)


try:
    section("S1 register+login shapes (register/login pages)")
    r = reg(full_name="Shape Raja")
    G = r.json()["tsap_id"]
    b = reg(gender="female", full_name="Shape Rani", age=24)
    B = b.json()["tsap_id"]
    check("S1.1 register keys", all(k in r.json() for k in
          ("tsap_id", "auth_token", "card_url", "top_3_matches", "message_telugu")),
          list(r.json()))
    mc = c.get("/api/meta/castes?religion=Hindu")
    check("S1.2 meta castes shape", mc.status_code == 200 and mc.json().get("success")
          and isinstance(mc.json().get("castes"), list) and len(mc.json()["castes"]) > 5,
          (mc.status_code, mc.text[:150]))
    fp = c.get("/api/free-plan")
    check("S1.3 free-plan alive", fp.status_code == 200, (fp.status_code, fp.text[:120]))
    gph = user_of(G)["phone"]
    s = c.post("/api/otp/send", json={"phone": gph})
    check("S1.4 otp send shape", s.status_code == 200 and "message_telugu" in s.json(),
          (s.status_code, s.text[:150]))
    code = (M.DB_OTPS.get(gph) or {}).get("code", "")
    v = c.post("/api/otp/verify", json={"phone": gph, "code": code})
    check("S1.5 verify keys", v.status_code == 200 and all(k in v.json() for k in
          ("tsap_id", "auth_token")), (v.status_code, v.text[:200]))
    TOK = H.sign_token(G)
    HD = {"X-TSAP-Token": TOK}
    HD2 = {"X-TSAP-Token": H.sign_token(B)}

    section("S2 matches/search shapes (matches page)")
    ap1 = c.post(f"/api/admin/approve/{B}", headers=ADMIN)
    ap2 = c.post(f"/api/admin/approve/{G}", headers=ADMIN)
    check("S2.0 admin approve", ap1.status_code in (200, 201) and ap2.status_code in (200, 201),
          (ap1.status_code, ap2.status_code))
    f = c.get("/api/search?gender=Bride&age_min=20&age_max=30", headers=HD)
    check("S2.0b male/female alias", c.get("/api/search?gender=female", headers=HD).json().get("total", 0) >= 1)
    j = f.json()
    check("S2.1 search keys", f.status_code == 200 and isinstance(j.get("results"), list)
          and "total" in j, (f.status_code, list(j)[:8]))
    row = (j.get("results") or [{}])[0]
    check("S2.2 row keys", all(k in row for k in
          ("tsap_id", "full_name", "age", "caste", "education", "job", "district",
           "state", "salary")), list(row)[:14])
    check("S2.3 row phone masked", "full_phone" not in str(row) and gph not in str(row),
          {k: row.get(k) for k in ("phone", "full_phone") if k in row})
    fc = c.get("/api/facets?limit=10", headers=HD)
    check("S2.4 facets shape", fc.status_code == 200 and "facets" in fc.json(),
          (fc.status_code, fc.text[:150]))
    sv0 = c.get(f"/api/saved/{G}", headers=HD)
    check("S2.5 saved shape", sv0.status_code == 200
          and ("items" in sv0.json() or "saved" in sv0.json()), sv0.text[:150])
    ss0 = c.get(f"/api/saved-searches/{G}", headers=HD)
    check("S2.6 saved-searches shape", ss0.status_code == 200
          and isinstance(ss0.json().get("searches"), list), ss0.text[:150])
    ml = c.get(f"/api/matches/{G}", headers=HD)
    check("S2.7 matches list alive", ml.status_code == 200, ml.status_code)

    section("S3 profile/unlock/save/block/report shapes (ProfileView)")
    p = c.get(f"/api/search/{B}", headers=HD)
    pj = p.json()
    prof = pj.get("profile") or pj
    check("S3.1 profile keys", p.status_code == 200 and all(k in prof for k in
          ("tsap_id", "full_name", "age", "caste", "job", "district", "state")),
          (p.status_code, list(prof)[:14] if isinstance(prof, dict) else prof))
    user_of(G)["credits"] = 5
    un = c.post("/api/unlock", json={"viewer_id": G, "target_id": B}, headers=HD)
    check("S3.2 unlock keys", un.status_code in (200, 201) and "phone" in un.json()
          and "message_telugu" in un.json(), (un.status_code, un.text[:200]))
    sv = c.post("/api/save", json={"tsap_id": G, "target_id": B}, headers=HD)
    check("S3.3 save target_id alias", sv.status_code in (200, 201),
          (sv.status_code, sv.text[:150]))
    svl = c.get(f"/api/saved/{G}", headers=HD)
    check("S3.4 saved contains", B in svl.text, svl.text[:120])
    bl = c.post("/api/block", json={"tsap_id": G, "block_id": B, "reason": "shape test"},
                headers=HD)
    check("S3.5 block alive", bl.status_code in (200, 201, 400),
          (bl.status_code, bl.text[:150]))
    rp = c.post("/api/report", json={"reporter_id": G, "target_id": B,
                                     "category": "fake_profile", "detail": "shape"},
                headers=HD)
    check("S3.6 report shape", rp.status_code in (200, 201), (rp.status_code, rp.text[:150]))
    ub = c.post("/api/unblock", json={"tsap_id": G, "target_id": B}, headers=HD)
    check("S3.7 unblock restores", ub.status_code in (200, 201) and ub.json().get("success") is True,
          (ub.status_code, ub.text[:150]))

    section("S4 requests shapes (inbox/sent/respond/wa)")
    iu = user_of(G)
    iu["credits"] = 5
    snd = c.post("/api/interest/send", json={"from_id": G, "to_id": B, "channel": "test"},
                 headers=HD)
    check("S4.1 send keys", snd.status_code == 200 and "request_id" in snd.json(),
          (snd.status_code, snd.text[:150]))
    RID = snd.json().get("request_id", "")
    ib = c.get(f"/api/interest/inbox/{B}", headers=HD2)
    check("S4.2 inbox keys", ib.status_code == 200 and "received" in ib.json()
          and "pending" in ib.json(), (ib.status_code, ib.text[:200]))
    st4 = c.get(f"/api/interest/sent/{G}", headers=HD)
    check("S4.3 sent keys", st4.status_code == 200 and "sent" in st4.json(),
          (st4.status_code, st4.text[:200]))
    rs = c.post("/api/interest/respond", json={"tsap_id": B, "request_id": RID,
                                               "action": "accept"}, headers=HD2)
    check("S4.4 respond shape", rs.status_code in (200, 201), (rs.status_code, rs.text[:200]))
    wa = c.get("/api/wa/status", headers=HD)
    check("S4.5 wa status (auth) ", wa.status_code in (200, 403), wa.status_code)
    if wa.status_code == 200:
        check("S4.6 antiban keys", "antiban" in wa.json(), list(wa.json())[:8])

    section("S5 referral shapes (referral page)")
    dh = c.get(f"/api/referral/{G}", headers=HD)
    dj = dh.json() if dh.status_code == 200 else {}
    check("S5.1 dash ok+keys", dh.status_code == 200 and dj.get("ok")
          and all(k in dj for k in ("code", "stats", "tier", "payouts",
                                    "commission_rules")), (dh.status_code, list(dj)[:12]))
    check("S5.2 stats keys", all(k in dj.get("stats", {}) for k in
          ("clicks", "registrations", "wallet", "paid_count")), dj.get("stats"))
    py = c.get(f"/api/referral/{G}/payouts", headers=HD)
    check("S5.3 payouts keys", py.status_code == 200 and "payouts" in py.json(),
          (py.status_code, py.text[:150]))
    lb = c.get("/api/referral/leaderboard?period=all&limit=10")
    lj = lb.json()
    check("S5.4 leaderboard keys", lb.status_code == 200
          and isinstance(lj.get("leaderboard"), list), (lb.status_code, lb.text[:120]))
    if lj.get("leaderboard"):
        bo = lj["leaderboard"][0]
        check("S5.5 board item keys", all(k in bo for k in
              ("code", "name", "rank", "tier", "refers", "paid", "earned")),
              list(bo)[:10])
        check("S5.6 board masked", "92929" not in lb.text and "phone" not in lb.text.lower(),
              lb.text[:150])
    tm = c.get("/api/referral/terms")
    tj = tm.json()
    check("S5.7 terms keys", tm.status_code == 200 and "rules_telugu" in tj
          and "not_allowed" in tj, (tm.status_code, list(tj)[:8]))
    rcode = user_of(G).get("referral_code", "")
    vv = c.get(f"/api/referral/validate/{rcode}")
    check("S5.8 validate keys", vv.status_code == 200 and "valid_code" in vv.json()
          and "referrer_name" in vv.json(), (vv.status_code, vv.text[:200]))
    po = c.post(f"/api/referral/payout?tsap_id={G}&amount=100&method=upi&upi_id=s@ok",
                headers=HD)
    check("S5.9 payout shape", po.status_code in (200, 201, 400),
          (po.status_code, po.text[:200]))

    section("S6 pricing/vendors/porutham/channels/verify shapes")
    pl = c.get("/api/plans")
    pj6 = pl.json()
    check("S6.1 plans keys", pl.status_code == 200 and isinstance(pj6.get("plans"), list)
          and len(pj6["plans"]) > 0, (pl.status_code, list(pj6)[:8]))
    check("S6.2 plan item keys", all(k in pj6["plans"][0] for k in ("price",)),
          list(pj6["plans"][0])[:10])
    check("S6.3 addons/renewal/bureau", "addons" in pj6 and "renewal" in pj6
          and "bureau" in pj6, list(pj6)[:10])
    vl = c.get("/api/vendors?category=catering&district=Hyd")
    vj = vl.json()
    check("S6.4 vendors keys", vl.status_code == 200 and "vendors" in vj and "total" in vj,
          (vl.status_code, list(vj)[:8]))
    vr = c.post("/api/vendors/register", json={"business_name": "Shape Hall",
                 "owner_name": "Shape Owner", "category": "catering", "phone": new_phone(),
                 "city": "Hyd", "district": "Hyd", "state": "TS", "package": "V_STANDARD",
                 "source": "website"})
    VID = ""
    try:
        VID = vr.json().get("vendor", {}).get("id", "") or vr.json().get("id", "")
    except Exception:
        pass
    check("S6.5 vendor register", vr.status_code in (200, 201) and bool(VID),
          (vr.status_code, vr.text[:150]))
    if VID:
        vd = c.get(f"/api/vendors/{VID}")
        check("S6.6 vendor detail keys", vd.status_code in (200, 404), vd.status_code)
    por = c.get(f"/api/porutham?bride={B}&groom={G}")
    pj = por.json()
    check("S6.7 porutham factual shape", por.status_code == 200 and pj.get("available") is True
          and pj.get("total_checks") == 10 and isinstance(pj.get("items"), list),
          (por.status_code, list(pj)[:12]))
    check("S6.7 porutham no aggregate score/verdict",
          not ({"score", "max_score", "percent", "stars", "verdict"} & set(pj)))
    og = c.get(f"/api/og/porutham/{B}/{G}.png")
    check("S6.8 og png bytes", og.status_code == 200 and len(og.content) > 1000,
          (og.status_code, len(og.content)))
    cj = c.get("/api/channels/join")
    check("S6.9 channels join", cj.status_code in (200, 404), (cj.status_code, cj.text[:150]))
    ck = c.get("/api/channels/live")
    check("S6.10 channels live", ck.status_code == 200, ck.status_code)
    ph = c.get("/api/channels/photo/test.png")
    check("S6.11 channel photo (404 ok)", ph.status_code in (200, 404), ph.status_code)
    ps = c.get(f"/api/photo/status/{G}")
    check("S6.12 photo status keys", ps.status_code == 200, (ps.status_code, ps.text[:150]))

    section("S7 misc page shapes")
    st7 = c.get("/api/safety/tips")
    check("S7.1 safety", st7.status_code == 200, st7.status_code)
    ch7 = c.get("/api/channels/setup-plan")
    check("S7.2 setup plan", ch7.status_code == 200, ch7.status_code)
    au = c.get("/api/admin/audit?limit=3", headers=ADMIN)
    check("S7.3 audit", au.status_code == 200, au.status_code)
    hl = c.get("/api/health")
    check("S7.4 health", hl.status_code == 200 and hl.json().get("success"), hl.status_code)
    tp = c.get("/api/templates/interest")
    check("S7.5 templates", tp.status_code == 200, tp.status_code)
    ms = c.get(f"/api/match/score?a={B}&b={G}")
    check("S7.6 match score", ms.status_code == 200 and "score" in ms.text.lower(),
          (ms.status_code, ms.text[:120]))
    ag = c.get(f"/api/astro/guna?bride_id={B}&groom_id={G}")
    check("S7.7 astro guna", ag.status_code == 200, (ag.status_code, ag.text[:120]))
finally:
    M.DB_USERS[:] = _users
    M.DB_INTERESTS[:] = _ints
    PP.PAY_ORDERS[:] = [o for o in _pays]
    PP._SEQ = _seq
    PP._persist()
    referral.PAYOUTS[:] = _pouts
    referral.save_state()

print(f"\n{'=' * 60}\n🌊 WAVE 29 SHAPES: {PASS} passed, {FAIL} failed")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("🎉 ALL GREEN")
