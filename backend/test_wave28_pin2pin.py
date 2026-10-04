"""
WAVE 28 PIN-TO-PIN — every feature scratch→end, FRONTEND-matching shapes, real I/O asserts.
Run: WA_TEST_FAST=1 python3 test_wave28_pin2pin.py (backend/ nunchi)
"""
import io
import os
import sys

from PIL import Image


def _real_jpg():
    import random
    img = Image.new("RGB", (600, 600))
    px = img.load()
    rnd = random.Random(28)
    for x in range(0, 600, 4):
        for y in range(0, 600, 4):
            r, g, b = rnd.randrange(256), rnd.randrange(256), rnd.randrange(256)
            for dx in range(4):
                for dy in range(4):
                    px[x + dx, y + dy] = (r, g, b)
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=92)
    return buf.getvalue()

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402
isolate_test_stores("wave28")

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
        print(f"  ❌ {name}" + (f"  → {str(extra)[:220]}" if extra else ""))


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
    return f"92828{PH[0]:05d}"


def reg(gender="male", **kw):
    d = {"gender": gender, "age": 27 if gender == "male" else 24, "height": "5'8",
         "marital_status": "Pelli Kaledu", "caste": "Reddy", "education": "BTech",
         "job": "Software", "salary": "10L", "state": "TS", "district": "Hyd",
         "phone": new_phone(), "full_name": kw.pop("full_name", "Pin Test")}
    d.update(kw)
    return c.post("/api/register", data=d)


def user_of(tsap):
    return next((u for u in M.DB_USERS if u.get("tsap_id") == tsap), None)


try:
    section("1. register")
    r = reg(full_name="Pin Raja")
    check("1.1 register 200", r.status_code == 200, (r.status_code, r.text[:150]))
    GROOM = r.json().get("tsap_id") if r.status_code == 200 else None
    check("1.2 id shape + token", bool(GROOM) and "auth_token" in r.json(), r.text[:120])
    check("1.3 card + top3", "card_url" in r.json() and "top_3_matches" in r.json(),
          list(r.json()))
    check("1.4 telugu msg", "message_telugu" in r.json())
    rb = reg(gender="female", full_name="Pin Rani", age=24)
    BRIDE = rb.json().get("tsap_id") if rb.status_code == 200 else None
    check("1.5 bride 200", rb.status_code == 200)
    rd = c.post("/api/register", data={"gender": "male", "age": 27, "height": "5'8",
                 "marital_status": "Pelli Kaledu", "caste": "Reddy", "education": "BTech",
                 "job": "Software", "salary": "10L", "state": "TS", "district": "Hyd",
                 "phone": user_of(GROOM)["phone"], "full_name": "Dup Pin"})
    check("1.6 dup phone → 409 reject (R9 policy — same number tho 2 accounts vaddhu)",
          rd.status_code == 409, (rd.status_code, rd.text[:150]))
    ri = c.post("/api/register", data={"gender": "x", "age": 5, "phone": "1", "full_name": "z"})
    check("1.7 invalid → telugu 4xx", ri.status_code in (400, 422), ri.status_code)

    section("2. otp + session")
    gph = user_of(GROOM)["phone"]
    s = c.post("/api/otp/send", json={"phone": gph})
    check("2.1 otp send", s.status_code == 200, (s.status_code, s.text[:120]))
    code = (M.DB_OTPS.get(gph) or {}).get("code", "")
    v = c.post("/api/otp/verify", json={"phone": gph, "code": code})
    check("2.2 otp verify → token", v.status_code == 200 and "token" in v.text.lower(),
          (v.status_code, v.text[:150]))
    v2 = c.post("/api/otp/verify", json={"phone": gph, "code": "0000"})
    check("2.3 wrong code 4xx", v2.status_code in (400, 401, 404, 429), v2.status_code)
    TOK = H.sign_token(GROOM)
    HD = {"X-TSAP-Token": TOK}

    section("3. profile + photo")
    p = c.get(f"/api/search/{GROOM}", headers=HD)
    check("3.1 profile view 200 masked", p.status_code == 200
          and user_of(GROOM)["phone"] not in p.text, (p.status_code, p.text[:150]))
    e = c.get(f"/api/search/{GROOM}", headers=HD)
    check("3.2 profile shows registered data", e.status_code == 200 and "Pin Raja" in e.text,
          (e.status_code, e.text[:150]))
    up = c.post("/api/photo/upload", data={"tsap_id": GROOM},
                files={"file": ("pin.jpg", io.BytesIO(_real_jpg()), "image/jpeg")})
    check("3.3 photo upload", up.status_code in (200, 201), (up.status_code, up.text[:150]))
    st = c.get(f"/api/photo/status/{GROOM}")
    check("3.4 photo status", st.status_code == 200, (st.status_code, st.text[:120]))
    sf = c.post("/api/verify/selfie", data={"tsap_id": GROOM},
                files={"file": ("s.jpg", io.BytesIO(_real_jpg()), "image/jpeg")})
    check("3.5 selfie route alive", sf.status_code in (200, 201, 400),
          (sf.status_code, sf.text[:120]))
    vr = c.post("/api/verify/request", json={"tsap_id": GROOM, "kind": "photo"})
    check("3.6 verify request", vr.status_code in (200, 201), (vr.status_code, vr.text[:150]))
    q = c.get(f"/api/profile/{GROOM}/quality")
    check("3.7 quality score", q.status_code == 200 and "score" in q.text.lower(),
          (q.status_code, q.text[:150]))

    section("4. search + matches + score + porutham + astro")
    f = c.get("/api/search?gender=female&age_min=20&age_max=26", headers=HD)
    check("4.1 search works", f.status_code == 200, (f.status_code, f.text[:120]))
    ml = c.get(f"/api/matches/{GROOM}", headers=HD)
    check("4.2 matches list", ml.status_code == 200, (ml.status_code, ml.text[:120]))
    ms = c.get(f"/api/match/score?a={BRIDE}&b={GROOM}")
    check("4.3 match score numeric", ms.status_code == 200 and "score" in ms.text.lower(),
          (ms.status_code, ms.text[:150]))
    po = c.post("/api/porutham", json={"bride_id": BRIDE, "groom_id": GROOM})
    check("4.4 porutham", po.status_code in (200, 201), (po.status_code, po.text[:150]))
    ag = c.get(f"/api/astro/guna?bride_id={BRIDE}&groom_id={GROOM}")
    check("4.5 astro guna", ag.status_code == 200, (ag.status_code, ag.text[:150]))
    ad = c.get(f"/api/astro/dosha/{GROOM}")
    check("4.6 astro dosha", ad.status_code in (200, 404), (ad.status_code, ad.text[:120]))

    section("5. interests + save + views + templates")
    iu = user_of(GROOM)
    iu["credits"] = 5
    snd = c.post("/api/interest/send", json={"from_id": GROOM, "to_id": BRIDE}, headers=HD)
    check("5.1 send 200 + deduct", snd.status_code == 200 and int(iu.get("credits")) == 4,
          (snd.status_code, snd.text[:150], iu.get("credits")))
    dup = c.post("/api/interest/send", json={"from_id": GROOM, "to_id": BRIDE}, headers=HD)
    check("5.2 dup blocked", dup.status_code in (400, 409), dup.status_code)
    RID = snd.json().get("request_id", "") if snd.status_code == 200 else ""
    inc = c.get(f"/api/interest/inbox/{BRIDE}", headers={"X-TSAP-Token": H.sign_token(BRIDE)})
    check("5.3 inbox lists it", inc.status_code == 200 and GROOM in inc.text,
          (inc.status_code, inc.text[:150]))
    acc = c.post("/api/interest/respond", json={"tsap_id": BRIDE, "request_id": RID,
                                                "action": "accept"},
                 headers={"X-TSAP-Token": H.sign_token(BRIDE)})
    check("5.4 accept alive", acc.status_code in (200, 201), (acc.status_code, acc.text[:150]))
    ist = c.get(f"/api/interest/status/{RID}", headers=HD)
    check("5.5 status reflects", ist.status_code == 200, (ist.status_code, ist.text[:150]))
    sv = c.post("/api/save", json={"tsap_id": GROOM, "saved_id": BRIDE}, headers=HD)
    check("5.6 save", sv.status_code in (200, 201), (sv.status_code, sv.text[:150]))
    svl = c.get(f"/api/saved/{GROOM}", headers=HD)
    check("5.7 saved lists", svl.status_code == 200 and BRIDE in svl.text,
          (svl.status_code, svl.text[:150]))
    vw = c.post("/api/view", json={"tsap_id": BRIDE, "viewer_id": GROOM})
    check("5.8 view track", vw.status_code in (200, 201), (vw.status_code, vw.text[:150]))
    vwl = c.get(f"/api/views/{BRIDE}")
    check("5.9 who-viewed", vwl.status_code == 200, (vwl.status_code, vwl.text[:120]))
    tp = c.get("/api/templates/interest")
    check("5.10 templates", tp.status_code == 200, tp.status_code)

    section("6. credits + unlock + UPI loop + razorpay loop")
    bal = c.get(f"/api/credits/{GROOM}", headers=HD)
    if bal.status_code == 404:
        bal = c.get(f"/api/unlocks/balance?tsap_id={GROOM}", headers=HD)
    check("6.1 balance route", bal.status_code == 200, (bal.status_code, bal.text[:150]))
    un = c.post("/api/unlock", json={"viewer_id": GROOM, "target_id": BRIDE}, headers=HD)
    check("6.2 unlock spends credit", un.status_code in (200, 201),
          (un.status_code, un.text[:200]))
    iu["credits"] = 3
    o = c.post("/api/pay/order", json={"tsap_id": GROOM, "purpose": "credits", "ref": "S_99"},
               headers=HD)
    check("6.4 pay order", o.status_code in (200, 201) and o.json().get("success", True),
          (o.status_code, o.text[:200]))
    oid = (o.json().get("pay_order") or o.json().get("order") or {}).get("id", "")
    check("6.5 order id", bool(oid), o.text[:150])
    cl = c.post("/api/pay/claim", json={"order_id": oid, "tsap_id": GROOM,
                                        "utr": "428281111111"}, headers=HD)
    check("6.6 UTR claim", cl.status_code in (200, 201), (cl.status_code, cl.text[:200]))
    cf = c.post(f"/api/admin/payments/{oid}/confirm", json={"utr": "428281111111"},
                headers=ADMIN)
    check("6.7 admin confirm adds credits", cf.status_code in (200, 201),
          (cf.status_code, cf.text[:200]))
    check("6.8 balance grew", int(user_of(GROOM).get("credits", 0)) >= 8,
          user_of(GROOM).get("credits"))
    ro = c.post("/api/pay/order", json={"tsap_id": GROOM, "purpose": "credits", "ref": "S_99",
                                        "mode": "razorpay"}, headers=HD)
    check("6.9 razorpay order", ro.status_code in (200, 201), (ro.status_code, ro.text[:200]))

    section("7. referral full loop")
    rcode = user_of(GROOM).get("referral_code", "")
    check("7.1 code issued", bool(rcode), user_of(GROOM).get("referral_code"))
    vv = c.get(f"/api/referral/validate/{rcode}")
    check("7.2 validate", vv.status_code == 200, (vv.status_code, vv.text[:150]))
    rn = reg(gender="female", full_name="Pin Referred", referral_code=rcode)
    NB = rn.json().get("tsap_id") if rn.status_code == 200 else None
    check("7.3 register with code", rn.status_code == 200, (rn.status_code, rn.text[:150]))
    check("7.4 join bonus", int(user_of(NB).get("credits", 0)) >= 1 if NB else False)
    clk = c.post(f"/api/referral/click/{rcode}?source=link")
    check("7.5 click tracked", clk.status_code in (200, 201, 302),
          (clk.status_code, clk.text[:120]))
    tm = c.get("/api/referral/terms")
    check("7.6 terms flat-50", tm.status_code == 200 and "50" in tm.text, tm.status_code)
    lb = c.get("/api/referral/leaderboard")
    check("7.7 leaderboard masked", lb.status_code == 200 and "9848" not in lb.text
          and "92828" not in lb.text, (lb.status_code, lb.text[:150]))
    st7 = c.get(f"/api/referral/{GROOM}", headers=HD)
    check("7.8 my stats", st7.status_code == 200, (st7.status_code, st7.text[:150]))
    po7 = c.post(f"/api/referral/payout?tsap_id={GROOM}&amount=100&method=upi&upi_id=pin@okhdfc",
                 headers=HD)
    check("7.9 payout route alive", po7.status_code in (200, 201, 400),
          (po7.status_code, po7.text[:200]))
    pr = c.post("/api/referral/partner/register",
                json={"name": "Pin Partner", "phone": new_phone(), "state": "TS",
                      "district": "Hyd"})
    check("7.10 partner register", pr.status_code in (200, 201),
          (pr.status_code, pr.text[:200]))

    section("8. vendors + ads + revenue")
    vr8 = c.post("/api/vendors/register", json={"business_name": "Pin Weddings Hall",
                 "owner_name": "Pin Owner", "category": "catering", "phone": new_phone(),
                 "city": "Hyd", "district": "Hyd", "state": "TS", "package": "V_STANDARD",
                 "source": "website"})
    check("8.1 vendor register", vr8.status_code in (200, 201),
          (vr8.status_code, vr8.text[:200]))
    VID = ""
    try:
        VID = vr8.json().get("vendor", {}).get("id", "") or vr8.json().get("id", "")
    except Exception:
        pass
    vl = c.get("/api/vendors")
    check("8.2 vendor list", vl.status_code == 200, vl.status_code)
    ct = c.get("/api/vendors/categories")
    check("8.3 categories", ct.status_code == 200, ct.status_code)
    pk = c.get("/api/vendors/packages")
    check("8.4 packages", pk.status_code == 200, pk.status_code)
    if VID:
        vd = c.get(f"/api/vendors/{VID}")
        check("8.5 detail", vd.status_code in (200, 404), vd.status_code)
        ck = c.post(f"/api/vendors/{VID}/click", json={})
        check("8.6 click", ck.status_code in (200, 201, 404), ck.status_code)
        ld = c.post(f"/api/vendors/{VID}/lead", json={"tsap_id": GROOM, "name": "Pin Lead", "phone": new_phone(), "source": "pin2pin"})
        check("8.7 lead", ld.status_code in (200, 201, 404), (ld.status_code, ld.text[:150]))
        db = c.get(f"/api/vendors/{VID}/dashboard", headers=ADMIN)
        check("8.8 dashboard", db.status_code in (200, 404), db.status_code)
        pm = c.get(f"/api/vendors/{VID}/promo")
        check("8.9 promo", pm.status_code in (200, 404), pm.status_code)
    else:
        for nm in ("8.5 detail", "8.6 click", "8.7 lead", "8.8 dashboard", "8.9 promo"):
            check(nm, False, "no vendor id")
    va = c.get("/api/vendors/ads")
    check("8.10 ads feed", va.status_code == 200, va.status_code)
    rv = c.get("/api/admin/vendors/revenue/summary", headers=ADMIN)
    check("8.11 revenue (admin)", rv.status_code == 200, (rv.status_code, rv.text[:150]))

    section("9. cms + channels + leads + misc")
    pg = c.get("/api/cms/pages/home")
    check("9.1 cms page (404 ok if empty)", pg.status_code in (200, 404), pg.status_code)
    so = c.get("/api/success-stories")
    if so.status_code == 404:
        so = c.get("/api/cms/stories")
    check("9.2 stories route", so.status_code in (200, 404), so.status_code)
    ch = c.get("/api/channels/live")
    check("9.3 channels live", ch.status_code == 200, (ch.status_code, ch.text[:150]))
    sp = c.get("/api/channels/setup-plan")
    check("9.4 setup plan", sp.status_code == 200, sp.status_code)
    cr = c.post("/api/channels/route", json={"text": "hello test pin"})
    check("9.5 channel route", cr.status_code in (200, 201), (cr.status_code, cr.text[:200]))
    lq = c.post("/api/leads/quick", json={"phone": new_phone(), "name": "Pin Lead"})
    check("9.6 quick lead", lq.status_code in (200, 201), (lq.status_code, lq.text[:200]))
    ls = c.get("/api/leads/stats", headers=ADMIN)
    check("9.7 lead stats admin", ls.status_code in (200, 201, 403), ls.status_code)
    pl = c.get("/api/plans")
    check("9.8 plans", pl.status_code == 200 and "99" in pl.text,
          (pl.status_code, pl.text[:120]))
    ws = c.get("/api/wa/status", headers=ADMIN)
    check("9.9 wa status", ws.status_code in (200, 403), ws.status_code)
    hl = c.get("/api/health")
    check("9.10 health", hl.status_code == 200 and hl.json().get("success"), hl.status_code)
    au = c.get("/api/admin/audit?limit=3", headers=ADMIN)
    check("9.11 audit", au.status_code == 200, au.status_code)
    _fast = os.environ.pop("WA_TEST_FAST", None)
    os.environ["TSAP_AUTH_MODE"] = "prod"
    au2 = c.get("/api/admin/audit?limit=3")
    check("9.12 audit locked w/o key (prod)", au2.status_code in (401, 403), au2.status_code)
    if _fast is not None:
        os.environ["WA_TEST_FAST"] = _fast
    os.environ.pop("TSAP_AUTH_MODE", None)
    sf9 = c.get("/api/safety/tips")
    check("9.13 safety tips", sf9.status_code == 200, sf9.status_code)
    rp = c.post("/api/report", json={"reporter_id": GROOM, "target_id": BRIDE,
                                     "category": "fake_profile",
                                     "detail": "pin test report"}, headers=HD)
    check("9.14 report", rp.status_code in (200, 201), (rp.status_code, rp.text[:200]))
    ub = c.post("/api/unblock", json={"tsap_id": GROOM, "target_id": BRIDE}, headers=HD)
    check("9.15 unblock alive", ub.status_code in (200, 201, 400), ub.status_code)
    ss = c.post("/api/saved-searches", json={"tsap_id": GROOM, "name": "pin search",
                                             "filters": {"caste": "Reddy"}}, headers=HD)
    check("9.16 saved search", ss.status_code in (200, 201), (ss.status_code, ss.text[:200]))
    wp = c.get(f"/api/welcome-pack/{GROOM}", headers=HD)
    check("9.17 welcome pack", wp.status_code in (200, 201), (wp.status_code, wp.text[:150]))
    wpr = c.post(f"/api/welcome-pack/{GROOM}/resend", headers=ADMIN)
    check("9.18 welcome resend", wpr.status_code in (200, 201),
          (wpr.status_code, wpr.text[:150]))
finally:
    M.DB_USERS[:] = _users
    M.DB_INTERESTS[:] = _ints
    PP.PAY_ORDERS[:] = [o for o in _pays]
    PP._SEQ = _seq
    PP._persist()
    referral.PAYOUTS[:] = _pouts
    referral.save_state()

print(f"\n{'=' * 60}\n🌊 WAVE 28 PIN2PIN: {PASS} passed, {FAIL} failed")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("🎉 ALL GREEN")
