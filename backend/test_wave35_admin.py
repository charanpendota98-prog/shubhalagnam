"""
WAVE 35 ADMIN - admin panel perfect: backend queues + static dead-API audit.
===============================================================================
User: "ADVANCEDGAA PERFECTGA ... TOP WEBSITE MATRIMONY SITE ... ADMIN PANEL ANTHA OKAYNAA"

A. Static dead-API audit: EVERY /api/* URL used by admin frontend MUST match a
   registered backend route (zero dead admin APIs - top-matrimony standard).
B. Route-count guard (>= 226 = 222 + 4 new).
C. Profiles queue: pending/approved/banned/all + search + pagination + 400 + auth.
D. Ban/unban: flags + audit trail + queue visibility + 404 + enforced 403.
E. Stories queue: submit -> pending -> approve (share_text) / reject + 400s.
F. Admin surface matrix (enforced): moderation/leads/dead/publish/audit/vendors/
   stories -> noauth 403, wrong key 403, good key 200/4xx-never-403.
G. Wrong-method 405s on new routes.

Run: WA_TEST_FAST=1 /home/user/venv/bin/python test_wave35_admin.py
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
import advanced11 as A11  # noqa: E402
import safety  # noqa: E402
import money_audit as MAUD  # noqa: E402
from hardening import sign_token, ADMIN_KEY  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

client = TestClient(main.app, raise_server_exceptions=False)

# tracked jsonl must stay byte-identical (test audit writes restore at end)
_JSONL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "money_audit26.jsonl")
_JSONL_BAK = open(_JSONL, "rb").read() if os.path.exists(_JSONL) else None

H_ADMIN = {"x-admin-key": ADMIN_KEY}
H_WRONG = {"x-admin-key": "wrong-key"}

BASE = {"gender": "Bride", "full_name": "W35 T", "credits": 0, "plan": "FREE",
        "phone_verified": True, "is_verified": False, "is_approved": False,
        "referral_code": "", "referred_by": "", "credit_history": [],
        "created_at": "2026-01-01T00:00:00", "district": "Guntur",
        "state": "AP", "caste": "Kamma", "age": 23, "job": "Teacher",
        "education": "BSc", "marital_status": "Pelli Kaledu"}
U_P = dict(BASE, tsap_id=f"TSAP-F-2026-{RUN}1", full_name="W35 Pending", phone="9100000001")
U_A = dict(BASE, tsap_id=f"TSAP-M-2026-{RUN}2", full_name="W35 Approved", phone="9100000002",
           gender="Groom", is_approved=True, age=27)
U_B = dict(BASE, tsap_id=f"TSAP-F-2026-{RUN}3", full_name="W35 Banned", phone="9100000003",
           is_banned=True)
main.DB_USERS.extend([U_P, U_A, U_B])

try:
    # =======================================================================
    # A - static admin dead-API audit
    # =======================================================================
    section("A - static admin dead-API audit (frontend URL -> backend route)")
    FRONT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "src")
    ADMIN_FILES = ["app/(telugu)/admin/page.tsx", "app/(telugu)/admin/photos/page.tsx",
                   "components/AdminOps.tsx", "components/PayConsole.tsx",
                   "components/MatchSend.tsx", "components/AstroConsole.tsx",
                   "components/AdsConsole.tsx", "components/OffersConsole.tsx",
                   "components/ContentConsole.tsx", "components/ChannelsConsole.tsx",
                   "components/WANumbersConsole.tsx", "components/ReferralReport.tsx"]
    routes = [(m, r.path) for r in main.app.routes for m in getattr(r, "methods", set() | set())
              if getattr(r, "path", "").startswith("/api")]

    def _match(url):
        us = [x for x in url.split("/") if x]
        for _, p in routes:
            ps = [x for x in p.split("/") if x]
            if len(ps) < len(us):
                continue
            # exact OR segment-aligned prefix (frontend appends dynamic tail)
            ok = all(p.startswith("{") and p.endswith("}") or p == u for p, u in zip(ps, us))
            if ok:
                return True
        return False

    found, missing_files = [], []
    for f in ADMIN_FILES:
        fp = os.path.join(FRONT, f)
        if not os.path.exists(fp):
            missing_files.append(f)
            continue
        txt = open(fp, encoding="utf-8").read()
        txt = re.sub(r"\{/\*.*?\*/\}", "", txt, flags=re.S)  # {/* */}
        txt = re.sub(r"(?m)^\s*//.*$", "", txt)  # full-line //
        for m in re.finditer(r"/api/[A-Za-z0-9_/{}.?$&%=-]+", txt):
            u = m.group(0).split("${")[0]  # dynamic tail cut
            u = u.split("?")[0].rstrip("/")  # query cut
            if len(u) <= 5:
                continue
            found.append((f, u))
    check("A0 admin files all present", not missing_files, missing_files)
    dead = [(f, u) for f, u in found if not _match(u)]
    check("A1 every admin /api/* maps to a route", not dead,
          "; ".join(f"{f}:{u}" for f, u in dead[:8]) if dead else f"{len(found)} urls ok")
    if dead:
        for f, u in dead[:20]:
            print(f"    DEAD-API: {f} -> {u}")

    # =======================================================================
    # B - route count
    # =======================================================================
    section("B - route truth")
    api_only = sorted(set((m, p) for m, p in routes))
    check("B0 api routes >= 226", len(api_only) >= 226, len(api_only))
    for m, p in [("GET", "/api/admin/profiles"), ("POST", "/api/admin/profiles/{tsap_id}/ban"),
                 ("POST", "/api/admin/profiles/{tsap_id}/unban"), ("GET", "/api/admin/stories")]:
        check(f"B1 {m} {p} registered", (m, p) in api_only)

    # =======================================================================
    # C - profiles queue
    # =======================================================================
    section("C - profiles queue")
    qp = client.get("/api/admin/profiles?status=pending", headers=H_ADMIN).json()
    ids_p = [x["tsap_id"] for x in qp.get("profiles", [])]
    check("C0 pending has U_P", U_P["tsap_id"] in ids_p, qp.get("total"))
    check("C1 pending hides approved+banned",
          U_A["tsap_id"] not in ids_p and U_B["tsap_id"] not in ids_p)
    qa = client.get("/api/admin/profiles?status=approved", headers=H_ADMIN).json()
    ids_a = [x["tsap_id"] for x in qa.get("profiles", [])]
    check("C2 approved has U_A only", U_A["tsap_id"] in ids_a and U_P["tsap_id"] not in ids_a)
    qb = client.get("/api/admin/profiles?status=banned", headers=H_ADMIN).json()
    ids_b = [x["tsap_id"] for x in qb.get("profiles", [])]
    check("C3 banned has U_B", U_B["tsap_id"] in ids_b)
    qall = client.get("/api/admin/profiles?status=all", headers=H_ADMIN).json()
    ids_all = [x["tsap_id"] for x in qall.get("profiles", [])]
    check("C4 all has trio", all(i in ids_all for i in (U_P["tsap_id"], U_A["tsap_id"], U_B["tsap_id"])))
    row = next(x for x in qall["profiles"] if x["tsap_id"] == U_P["tsap_id"])
    check("C5 row has admin fields (phone/credits/plan/photo)",
          row.get("phone") == "9100000001" and "credits" in row and "plan" in row and "has_photo" in row, row)
    qs = client.get(f"/api/admin/profiles?status=all&q={RUN.lower()}3", headers=H_ADMIN).json()
    check("C6 search narrows", [x["tsap_id"] for x in qs.get("profiles", [])] == [U_B["tsap_id"]],
          qs.get("total"))
    qpg = client.get("/api/admin/profiles?status=all&limit=1&offset=0", headers=H_ADMIN).json()
    check("C7 pagination shape", qpg.get("count") == 1 and qpg.get("total", 0) >= 3
          and qpg.get("limit") == 1 and qpg.get("offset") == 0, qpg.get("total"))
    qbad = client.get("/api/admin/profiles?status=nope", headers=H_ADMIN)
    check("C8 bad status -> 400", qbad.status_code == 400, qbad.status_code)

    # =======================================================================
    # D - ban / unban
    # =======================================================================
    section("D - ban / unban")
    b1 = client.post(f"/api/admin/profiles/{U_A['tsap_id']}/ban",
                     json={"reason": "w35-test"}, headers=H_ADMIN).json()
    check("D0 ban success", b1.get("success") and b1.get("banned"), b1)
    check("D1 ban flags (banned, approval off, at, reason)",
          U_A.get("is_banned") and not U_A.get("is_approved")
          and U_A.get("banned_at") and U_A.get("banned_reason") == "w35-test")
    qb2 = client.get("/api/admin/profiles?status=banned", headers=H_ADMIN).json()
    check("D2 banned queue shows it", U_A["tsap_id"] in [x["tsap_id"] for x in qb2.get("profiles", [])])
    trail = MAUD.read_audit(event="profile_ban", limit=5)
    check("D3 ban audit trail", any(U_A["tsap_id"] in str(e) for e in trail))
    ub = client.post(f"/api/admin/profiles/{U_A['tsap_id']}/unban", headers=H_ADMIN).json()
    check("D4 unban success", ub.get("success") and not ub.get("banned"), ub)
    check("D5 unban flags (clear + approve)", not U_A.get("is_banned") and U_A.get("is_approved")
          and U_A.get("unbanned_at"))
    b404 = client.post("/api/admin/profiles/TSAP-X-0000/ban", json={}, headers=H_ADMIN)
    check("D6 ban unknown -> 404", b404.status_code == 404, b404.status_code)
    u404 = client.post("/api/admin/profiles/TSAP-X-0000/unban", headers=H_ADMIN)
    check("D7 unban unknown -> 404", u404.status_code == 404, u404.status_code)

    # =======================================================================
    # E - stories queue
    # =======================================================================
    section("E - stories queue")
    st1 = A11.submit_story(U_A["tsap_id"], "W35 test story with enough words for minimum length rule ok",
                           couple_names="W35 A weds X", district="Guntur")
    st2 = A11.submit_story(U_P["tsap_id"], "Second w35 story body long enough to pass validation fine",
                           couple_names="W35 P weds Y", district="Guntur")
    sq = client.get("/api/admin/stories?status=pending", headers=H_ADMIN).json()
    sq_ids = [x["story_id"] for x in sq.get("stories", [])]
    check("E0 pending has both", st1["story_id"] in sq_ids and st2["story_id"] in sq_ids, sq.get("count"))
    ap = client.post(f"/api/admin/stories/{st1['story_id']}/action",
                     json={"action": "approve", "note": "w35"}, headers=H_ADMIN).json()
    check("E1 approve -> approved + share_text", ap.get("story", {}).get("status") == "approved"
          and "Guntur" in (ap.get("share_text") or "")
          and "W35 A weds X" in (ap.get("share_text") or ""),
          (ap.get("story") or {}).get("status"))
    rj = client.post(f"/api/admin/stories/{st2['story_id']}/action",
                     json={"action": "reject"}, headers=H_ADMIN).json()
    check("E2 reject -> rejected", rj.get("story", {}).get("status") == "rejected", rj)
    qap = client.get("/api/admin/stories?status=approved", headers=H_ADMIN).json()
    check("E3 approved queue filters", st1["story_id"] in [x["story_id"] for x in qap.get("stories", [])]
          and st2["story_id"] not in [x["story_id"] for x in qap.get("stories", [])])
    e404 = client.post("/api/admin/stories/STORY-9999/action", json={"action": "approve"},
                       headers=H_ADMIN)
    check("E4 unknown story -> 404", e404.status_code == 404, e404.status_code)
    e400 = client.post(f"/api/admin/stories/{st1['story_id']}/action", json={"action": "maybe"},
                       headers=H_ADMIN)
    check("E5 bad action -> 400", e400.status_code == 400, e400.status_code)

    # =======================================================================
    # F - enforced auth matrix on admin surface
    # =======================================================================
    section("F - enforced auth matrix (403 noauth / wrong key, 200 good key)")
    _wtf = os.environ.get("WA_TEST_FAST")
    os.environ["WA_TEST_FAST"] = "0"
    os.environ.pop("TSAP_AUTH_MODE", None)
    try:
        SURF = [("GET", "/api/admin/profiles?status=pending", 200),
                ("GET", "/api/admin/stories?status=pending", 200),
                ("GET", "/api/moderation/queue", 200),
                ("GET", "/api/leads", 200),
                ("GET", "/api/wa/dead?limit=5", 200),
                ("GET", "/api/admin/audit?limit=5", 200)]
        for m, path, want in SURF:
            rn = client.request(m, path)
            rw = client.request(m, path, headers=H_WRONG)
            rg = client.request(m, path, headers=H_ADMIN)
            check(f"F {m} {path.split('?')[0]} noauth->403", rn.status_code == 403, rn.status_code)
            check(f"F {m} {path.split('?')[0]} wrong->403", rw.status_code == 403, rw.status_code)
            check(f"F {m} {path.split('?')[0]} key->{want}", rg.status_code == want,
                  f"{rg.status_code} {rg.text[:120]}")
        pn = client.get("/api/publish/status")
        pa = client.get("/api/publish/status", headers=H_ADMIN)
        check("F publish/status public masked", pn.status_code == 200 and pn.json().get("pii_masked"),
              pn.status_code)
        check("F publish/status admin full", pa.status_code == 200 and not pa.json().get("pii_masked"),
              pa.status_code)
        bn = client.post(f"/api/admin/profiles/{U_A['tsap_id']}/ban", json={})
        check("F ban noauth (enforced) -> 403", bn.status_code == 403, bn.status_code)
        r404 = client.post("/api/moderation/resolve/NOPE-1", json={"action": "warn"}, headers=H_ADMIN)
        check("F resolve unknown -> 400 (not 403/500)", r404.status_code == 400, r404.status_code)
        v404 = client.post("/api/admin/vendors/NOPE/token", headers=H_ADMIN)
        check("F vendor token unknown -> 404", v404.status_code == 404, v404.status_code)
    finally:
        if _wtf is None:
            os.environ.pop("WA_TEST_FAST", None)
        else:
            os.environ["WA_TEST_FAST"] = _wtf

    # moderation resolve happy path (dev-open) + safety skips banned
    ok_rep, msg_rep, rep = safety.submit_report(U_P["tsap_id"], U_B["tsap_id"], "spam", "w35 test report")
    check("F report submit ok", ok_rep, msg_rep)
    rr = client.post(f"/api/moderation/resolve/{rep['id']}",
                     json={"action": "dismiss", "note": "w35"}, headers=H_ADMIN).json()
    check("F resolve dismiss ok", rr.get("success"), rr)

    # =======================================================================
    # G - wrong method
    # =======================================================================
    section("G - wrong method")
    g1 = client.get(f"/api/admin/profiles/{U_A['tsap_id']}/ban", headers=H_ADMIN)
    check("G0 GET on ban -> 405", g1.status_code == 405, g1.status_code)
    g2 = client.post("/api/admin/profiles", json={}, headers=H_ADMIN)
    check("G1 POST on queue -> 405", g2.status_code == 405, g2.status_code)
    g3 = client.get(f"/api/admin/stories/{st1['story_id']}/action", headers=H_ADMIN)
    check("G2 GET on story action -> 405", g3.status_code == 405, g3.status_code)
finally:
    if _JSONL_BAK is not None:
        open(_JSONL, "wb").write(_JSONL_BAK)

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail\n{'=' * 76}")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("WAVE35 ALL GREEN")
