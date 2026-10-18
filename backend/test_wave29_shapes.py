"""
WAVE 29 SHAPE CONTRACT — page reads d.X → API must return X. Browser-truth without browser.
Untested-route sweep: /api/block, /api/facets, /api/channels/join, og/poster PNGs, meta/castes, free-plan.
Run: WA_TEST_FAST=1 python3 test_wave29_shapes.py (backend/ nunchi)
"""
import io
import os
import sys
from unittest.mock import patch

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
# Keep integration checks offline and prevent test approval from sending externally.
os.environ["WA_ENABLED"] = "false"
os.environ["WHATSAPP_MODE"] = "off"
os.environ["PUBLISH_DRY_RUN"] = "true"
os.environ["AUTO_POST_ON_APPROVAL"] = "false"
os.environ["AUTO_POST_ON_REGISTER"] = "false"
os.environ["OTP_CHANNELS"] = "none"
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
import quality as Q
import referral
import paypro as PP
from testutil_client import TestClient

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
    d = {"gender": gender, "age": 27 if gender == "male" else 24,
         "dob": "1999-01-15" if gender == "male" else "2002-01-15", "height": "5'8",
         "star": "Rohini" if gender == "male" else "Ashwini",
         "rasi": "Vrishabha" if gender == "male" else "Mesha",
         "marital_status": "Pelli Kaledu", "caste": "Reddy", "religion": "Hindu", "education": "BTech",
         "job": "Software", "salary": "10L", "state": "TS", "district": "Hyderabad",
         "phone": new_phone(), "full_name": kw.pop("full_name", "Shape Test"),
         "password": "test-password",
         "consent_confirmed": "true"}
    d.update(kw)
    return c.post("/api/register", data=d)


def user_of(tsap):
    return next((u for u in M.DB_USERS if u.get("tsap_id") == tsap), None)


try:
    section("S0 saved-search filter semantics")
    normalized_filters = Q.normalize_filters({
        "sub_caste": "Kapu subgroup A,Kapu subgroup B", "rasi": "Mesha,Meena",
        "children": "1", "nri_only": "false", "photo_only": "false", "verified_only": "true",
    })
    check("S0.1 normalizer keeps new filters typed and does not turn string false into true",
          normalized_filters.get("sub_caste") == "Kapu subgroup A,Kapu subgroup B"
          and normalized_filters.get("rasi") == "Mesha,Meena"
          and normalized_filters.get("children") == "1"
          and normalized_filters.get("verified_only") is True
          and "nri_only" not in normalized_filters and "photo_only" not in normalized_filters,
          normalized_filters)
    age_only_rejected = False
    try:
        Q.normalize_filters({"age_min": 70})
    except Exception as error:
        age_only_rejected = getattr(error, "status_code", None) in (400, 422)
    check("S0.1b one-sided age minimum respects the default maximum", age_only_rejected)
    search_profile = {
        "tsap_id": "TEST-SEARCH-01", "gender": "Bride", "caste": "Kapu", "sub_caste": "Kapu subgroup A",
        "district": "Hyderabad", "current_city": "Hyderabad", "state": "TS", "job": "Software Engineer",
        "work_type": "IT", "education": "MTech Computer Science", "marital_status": "Divorced",
        "children": "1", "religion": "Hindu", "age": 30, "salary": "10L", "height": "5'6",
        "phone_verified": True, "photo_status": "approved", "photo_urls": ["/media/test-approved.jpg"],
        "dosham": "No", "star": "Rohini", "rasi": "Mesha", "country": "India",
        "full_name": "Kapu Sample", "gothram": "Test Gothram",
    }
    combined_filter = {
        "gender": "female", "caste": "Reddy,Kapu", "sub_caste": "Other,Kapu subgroup",
        "district": "Nope,Hyderabad", "state": "AP,TS", "job": "Doctor,Software",
        "education": "BTech,MTech", "marital_status": "Never married,Divorced", "children": "1",
        "religion": "Christian,Hindu", "age_min": 25, "age_max": 35,
        "salary_min": 500_000, "salary_max": 1_500_000, "height_min": "5'5", "height_max": "5'7",
        "verified_only": True, "photo_only": True, "dosham": "Manglik,No", "star": "Ashwini,Rohini",
        "rasi": "Meena,Mesha", "q": "Kapu",
    }
    check("S0.2 all visible filters use multi-value OR and member-provided matching",
          Q.matches_filters(search_profile, combined_filter))
    check("S0.3 NRI-only uses location evidence",
          Q.matches_filters({"country": "USA", "age": 30}, {"nri_only": True}))
    check("S0.4 missing religion and dosham remain unknown",
          not Q.matches_filters({"age": 30}, {"religion": "Hindu"})
          and not Q.matches_filters({"age": 30}, {"dosham": "No"}))
    check("S0.5 constrained age, salary, height exclude unknown values",
          not Q.matches_filters({}, {"age_min": 18, "age_max": 60})
          and not Q.matches_filters({"age": 30}, {"salary_max": 5_000_000})
          and not Q.matches_filters({"age": 30}, {"height_min": "5'0"}))
    check("S0.6 photo-only excludes private or unapproved photos",
          not Q.matches_filters({"photo_status": "pending", "photo_urls": ["/photo.jpg"]}, {"photo_only": True})
          and not Q.matches_filters({"photo_status": "approved", "photo_urls": ["/photo.jpg"], "photo_private": True}, {"photo_only": True}))

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
    no_channel = c.post("/api/otp/send", json={"phone": gph})
    check("S1.4 OTP fails closed without configured delivery and returns no code",
          no_channel.status_code == 503 and gph not in M.DB_OTPS
          and "code" not in no_channel.text.lower(),
          (no_channel.status_code, no_channel.text[:150]))
    with patch("main.otp_channel_send", return_value={"ok": True, "channel": "test_stub"}), patch("main.secrets.randbelow", return_value=0):
        s = c.post("/api/otp/send", json={"phone": gph})
    v = c.post("/api/otp/verify", json={"phone": gph, "code": "1000"})
    check("S1.5 OTP verify returns the expected account token through isolated test transport",
          s.status_code == 200 and v.status_code == 200
          and all(k in v.json() for k in ("tsap_id", "auth_token")),
          (s.status_code, v.status_code, v.text[:200]))
    TOK = H.sign_token(G)
    HD = {"X-TSAP-Token": TOK}
    HD2 = {"X-TSAP-Token": H.sign_token(B)}

    section("S2 matches/search shapes (matches page)")
    ap1 = c.post(f"/api/admin/approve/{B}", headers=ADMIN)
    ap2 = c.post(f"/api/admin/approve/{G}", headers=ADMIN)
    check("S2.0 admin approve", ap1.status_code in (200, 201) and ap2.status_code in (200, 201),
          (ap1.status_code, ap2.status_code))
    user_of(B)["sub_caste"] = "Test Subcaste A"
    user_of(B)["dosham"] = "No"
    user_of(G)["sub_caste"] = "Test Subcaste B"
    user_of(G).pop("dosham", None)  # Unknown must not be silently treated as "No".
    sub_a = c.get("/api/search?sub_caste=Test%20Subcaste%20A")
    sub_any = c.get("/api/search?sub_caste=Test%20Subcaste%20A%2CTest%20Subcaste%20B")
    check("S2.0a sub-caste filter accepts an independent multi-value parameter",
          sub_a.status_code == 200 and sub_a.json().get("total") == 1
          and sub_a.json()["results"][0].get("tsap_id") == B,
          (sub_a.status_code, sub_a.json().get("total"), [row.get("tsap_id") for row in sub_a.json().get("results", [])]))
    check("S2.0b sub-caste multi-select uses OR semantics",
          sub_any.status_code == 200 and sub_any.json().get("total") == 2,
          (sub_any.status_code, sub_any.json().get("total")))
    rasi = c.get("/api/search?rasi=Mesha")
    check("S2.0c rasi filter is applied by the API",
          rasi.status_code == 200 and rasi.json().get("total") == 1
          and rasi.json()["results"][0].get("tsap_id") == B,
          (rasi.status_code, rasi.json().get("total"), [row.get("tsap_id") for row in rasi.json().get("results", [])]))
    dosham_no = c.get("/api/search?dosham=No")
    check("S2.0d missing dosham remains unknown rather than matching No",
          dosham_no.status_code == 200 and dosham_no.json().get("total") == 1
          and dosham_no.json()["results"][0].get("tsap_id") == B,
          (dosham_no.status_code, dosham_no.json().get("total"), [row.get("tsap_id") for row in dosham_no.json().get("results", [])]))
    f = c.get("/api/search?gender=Bride&age_min=20&age_max=30", headers=HD)
    check("S2.1a male/female alias", c.get("/api/search?gender=female", headers=HD).json().get("total", 0) >= 1)
    j = f.json()
    check("S2.1 search keys", f.status_code == 200 and isinstance(j.get("results"), list)
          and "total" in j, (f.status_code, list(j)[:8]))
    page0 = c.get("/api/search?limit=1&offset=0")
    page1 = c.get("/api/search?limit=1&offset=1")
    page2 = c.get("/api/search?limit=1&offset=2")
    ids0 = [row.get("tsap_id") for row in page0.json().get("results", [])]
    ids1 = [row.get("tsap_id") for row in page1.json().get("results", [])]
    check("S2.1b limit/offset returns distinct pages and an empty end page",
          page0.status_code == page1.status_code == page2.status_code == 200
          and page0.json().get("total") == page1.json().get("total") == 2
          and len(ids0) == len(ids1) == 1 and ids0[0] != ids1[0]
          and page2.json().get("results") == [],
          (page0.status_code, page1.status_code, page2.status_code, ids0, ids1))
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
    created_search = c.post("/api/saved-searches", headers=HD, json={
        "tsap_id": G, "name": "Sub-caste filter", "filters": {"sub_caste": "Test Subcaste A"}, "alert": False,
    })
    default_alert_search = c.post("/api/saved-searches", headers=HD, json={
        "tsap_id": G, "name": "Rasi filter", "filters": {"rasi": "Mesha"},
    })
    check("S2.5a saved-search create keeps filters and notifications off by explicit consent",
          created_search.status_code == 200 and created_search.json().get("search", {}).get("alert") is False
          and created_search.json().get("search", {}).get("filters", {}).get("sub_caste") == "Test Subcaste A"
          and created_search.json().get("alert_enabled") is False,
          (created_search.status_code, created_search.text[:200]))
    check("S2.5b omitted alert flag is safely disabled by default",
          default_alert_search.status_code == 200 and default_alert_search.json().get("search", {}).get("alert") is False,
          (default_alert_search.status_code, default_alert_search.text[:150]))
    unconfirmed_alert = c.post("/api/saved-searches", headers=HD, json={
        "tsap_id": G, "name": "Unconfirmed alert", "filters": {"gender": "Bride"}, "alert": True,
    })
    check("S2.5b1 alert cannot turn on without explicit consent confirmation",
          unconfirmed_alert.status_code in (400, 422), (unconfirmed_alert.status_code, unconfirmed_alert.text[:150]))
    opted_in_search = c.post("/api/saved-searches", headers=HD, json={
        "tsap_id": G, "name": "Temporary alert test", "filters": {"gender": "Bride"},
        "alert": True, "alert_consent_confirmed": True,
    })
    opted_in_id = (opted_in_search.json().get("search") or {}).get("search_id", "")
    unconfirmed_update = c.put(f"/api/saved-searches/{G}/{opted_in_id}", headers=HD,
                               json={"alert": True}) if opted_in_id else None
    alert_off = c.put(f"/api/saved-searches/{G}/{opted_in_id}", headers=HD, json={"alert": False}) if opted_in_id else None
    alert_removed = c.delete(f"/api/saved-searches/{G}/{opted_in_id}", headers=HD) if opted_in_id else None
    check("S2.5c explicit alert consent is timestamped, required to opt in, and withdrawable",
          opted_in_search.status_code == 200
          and bool((opted_in_search.json().get("search") or {}).get("alert_consent_at"))
          and unconfirmed_update is not None and unconfirmed_update.status_code in (400, 422)
          and alert_off is not None and alert_off.status_code == 200
          and alert_off.json().get("alert_enabled") is False
          and alert_removed is not None and alert_removed.status_code == 200,
          (opted_in_search.status_code, getattr(unconfirmed_update, "status_code", None),
           getattr(alert_off, "status_code", None), getattr(alert_removed, "status_code", None)))
    ss0 = c.get(f"/api/saved-searches/{G}", headers=HD)
    saved_rows = ss0.json().get("searches", []) if ss0.status_code == 200 else []
    check("S2.6 saved-searches shape and filter-aware current matches",
          ss0.status_code == 200 and len(saved_rows) == 2
          and any(row.get("new_matches") == 1 and row.get("sample", [{}])[0].get("tsap_id") == B for row in saved_rows),
          (ss0.status_code, ss0.text[:250]))
    target_profile = user_of(B)
    prior_status = target_profile.get("status")
    target_profile["status"] = "pending"
    pending_rows_response = c.get(f"/api/saved-searches/{G}", headers=HD)
    target_profile["status"] = prior_status
    pending_rows = pending_rows_response.json().get("searches", []) if pending_rows_response.status_code == 200 else []
    check("S2.6a saved-search previews exclude pending profiles",
          pending_rows_response.status_code == 200 and len(pending_rows) == 2
          and all(row.get("new_matches") == 0 and not row.get("sample") for row in pending_rows),
          (pending_rows_response.status_code, pending_rows))
    block_result = c.post("/api/block", headers=HD, json={"tsap_id": G, "block_id": B})
    blocked_rows_response = c.get(f"/api/saved-searches/{G}", headers=HD)
    blocked_rows = blocked_rows_response.json().get("searches", []) if blocked_rows_response.status_code == 200 else []
    unblock_result = c.post("/api/unblock", headers=HD, json={"tsap_id": G, "block_id": B})
    check("S2.6b saved-search previews exclude blocked profiles",
          block_result.status_code == 200 and blocked_rows_response.status_code == 200
          and len(blocked_rows) == 2 and all(row.get("new_matches") == 0 for row in blocked_rows)
          and unblock_result.status_code == 200 and unblock_result.json().get("success") is True,
          (block_result.status_code, blocked_rows_response.status_code, unblock_result.status_code))
    no_alerts = c.post(f"/api/saved-searches/{G}/alerts", headers=HD)
    check("S2.6c manual alert trigger respects explicit per-search consent",
          no_alerts.status_code == 200 and no_alerts.json().get("alerts_sent") == 0
          and no_alerts.json().get("alerts_skipped") == 2 and not no_alerts.json().get("details"),
          (no_alerts.status_code, no_alerts.text[:200]))
    paused_queue_search = c.post("/api/saved-searches", headers=HD, json={
        "tsap_id": G, "name": "Offline queue safety", "filters": {"gender": "Bride"},
        "alert": True, "alert_consent_confirmed": True,
    })
    paused_search_id = (paused_queue_search.json().get("search") or {}).get("search_id", "")
    paused_alerts = c.post(f"/api/saved-searches/{G}/alerts", headers=HD) if paused_search_id else None
    paused_detail = ((paused_alerts.json().get("details") or [{}])[0]
                     if paused_alerts is not None and paused_alerts.status_code == 200 else {})
    paused_search = next((r for r in Q.saved_for(G) if r.get("search_id") == paused_search_id), {})
    check("S2.6d offline WhatsApp does not queue or mark consented alert results as sent",
          paused_search_id and paused_alerts is not None and paused_alerts.status_code == 200
          and paused_alerts.json().get("alerts_sent") == 0 and paused_alerts.json().get("new_matches_total", 0) >= 1
          and paused_detail.get("queued") is False and paused_search.get("alerts_sent") == 0
          and not paused_search.get("last_seen_ids"),
          (getattr(paused_alerts, "status_code", None), getattr(paused_alerts, "text", "")[:200], paused_search))
    if paused_search_id:
        c.delete(f"/api/saved-searches/{G}/{paused_search_id}", headers=HD)
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
    check("S3.2 contact stays locked before owner acceptance",
          un.status_code == 409 and un.json().get("reason") == "consent_required"
          and user_of(B).get("phone") not in un.text,
          (un.status_code, un.text[:200]))
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
    accepted_unlock = c.post("/api/unlock", json={"viewer_id": G, "target_id": B}, headers=HD)
    check("S4.5 accepted request enables zero-charge contact access",
          accepted_unlock.status_code == 200 and accepted_unlock.json().get("success") is True
          and accepted_unlock.json().get("charged") == 0
          and accepted_unlock.json().get("phone") == user_of(B).get("phone"),
          (accepted_unlock.status_code, accepted_unlock.text[:180]))
    wa = c.get("/api/wa/status", headers=HD)
    check("S4.6 wa status (auth)", wa.status_code in (200, 403), wa.status_code)
    if wa.status_code == 200:
        check("S4.7 antiban keys", "antiban" in wa.json(), list(wa.json())[:8])

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
    vl = c.get("/api/vendors?category=catering&district=Hyderabad")
    vj = vl.json()
    check("S6.4 vendors keys", vl.status_code == 200 and "vendors" in vj and "total" in vj,
          (vl.status_code, list(vj)[:8]))
    vr = c.post("/api/vendors/register", json={"business_name": "Shape Hall",
                 "owner_name": "Shape Owner", "category": "catering", "phone": new_phone(),
                 "city": "Hyd", "district": "Hyderabad", "state": "TS", "package": "V_STANDARD",
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
    check("S6.7 porutham evidence-required shape", por.status_code == 200
          and pj.get("available") is False and pj.get("calculation_available") is False
          and pj.get("status") == "jathakam_required" and pj.get("items") == [],
          (por.status_code, list(pj)[:12]))
    check("S6.7 porutham has no fabricated tally, score, or verdict",
          pj.get("passed_checks") is None and pj.get("total_checks") is None
          and not ({"score", "max_score", "percent", "stars", "verdict"} & set(pj)))
    og = c.get(f"/api/og/porutham/{B}/{G}.png")
    check("S6.8 retired og route fails closed", og.status_code == 410,
          (og.status_code, len(og.content)))
    cj = c.get("/api/channels/join")
    check("S6.9 channels join", cj.status_code in (200, 404), (cj.status_code, cj.text[:150]))
    ck = c.get("/api/channels/routing-eligible")
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
