"""
🌟 WAVE 13 TEST SUITE — FIRST-NAME + NAME-TOKEN NOTICE + ASTRO + ADS
=====================================================================
  A. first-name display + optional final-token comparison (never eligibility)
  B. public display: caption/bot first-name, rest of name hidden, number ledu
  C. non-blocking name-token behavior across interest + matches + admin list
  D. astro pure: star/rasi norm + 27 table + gana/yoni/nadi sanity
  E. 36-guna math: known-answers (tara/yoni/nadi/bhakoot/maitri) + totals + verdicts
  F. dosha screening + jathakam engine (submit/verify/stats)
  G. astro API: guna/dosha/upload/queue/verify/stats
  H. ads pure: quote math + create/approve guards + serve targeting + expiry + track
  I. ads API: rates/quote/serve/click + vendor campaigns + admin queue
  J. login/session: token persist contract (verify + demo-token + tsap_id echo)

Run:  WA_TEST_FAST=1 python3 test_wave13_full.py   (backend/ nunchi)
"""
import os
import re
import sys

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
os.environ.setdefault("WHATSAPP_MODE", "off")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402
isolate_test_stores("wave13")

PASS, FAIL, FAILED = 0, 0, []
PHONE_RE = re.compile(r"(?<![\d•])[6-9]\d{9}(?!\d)")


def section(t):
    print(f"\n=== {t} ===")


def check(name, cond, extra=None):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  ❌ {name} :: {str(extra)[:220]}")


from testutil_client import TestClient
import hardening as H
import main
import smart12 as S12
import astro as AST
import ads as ADS
import channels_config as CC
import telegram_bot as TB

client = TestClient(main.app, raise_server_exceptions=False)
HDR_ADMIN = {"X-Admin-Key": H.ADMIN_KEY}

ADS.CAMPAIGNS.clear()
AST.JATHAKAMS.clear()

# ═══════════════════════════════════════════════════════════════════════════
section("A. FIRST-NAME + SURNAME (pure)")
# ═══════════════════════════════════════════════════════════════════════════
check("A1 first_name_of", S12.first_name_of("Lakshmi Reddy") == "Lakshmi")
check("A2 first single word", S12.first_name_of("Sravani") == "Sravani")
check("A3 first empty → —", S12.first_name_of("") == "—")
check("A4 surname_of", S12.surname_of("Lakshmi Reddy") == "Reddy")
check("A5 surname single → ''", S12.surname_of("Sravani") == "")
check("A6 norm_surname", S12.norm_surname(" Reddy. ") == "reddy", S12.norm_surname(" Reddy. "))
c = S12.same_surname_check({"full_name": "Lakshmi Reddy"}, {"full_name": "RAVI  reddy "})
check("A7 same final name token is reported but never blocks", c["same"] is True and c["blocked"] is False
      and c["reason"] == "same_final_name_token", c)
check("A8 explanatory copy avoids an eligibility verdict",
      "వివాహ నిర్ణయం కాదు" in c["note_telugu"] and "does not determine eligibility" in c["notice"])
c2 = S12.same_surname_check({"full_name": "Lakshmi Reddy"}, {"full_name": "Ravi Kumar"})
check("A9 different final token is informational only",
      c2["same"] is False and c2["blocked"] is False and c2["reason"] == "different_final_name_token")
c3 = S12.same_surname_check({"full_name": "Lakshmi"}, {"full_name": "Ravi Kumar"})
check("A10 missing token stays unknown and non-blocking",
      c3["blocked"] is False and c3["same"] is None and c3["reason"] == "name_token_unavailable")
f = S12.filter_same_surname({"tsap_id": "M", "full_name": "A Reddy"},
                             [{"tsap_id": "X1", "full_name": "B REDDY"},
                              {"tsap_id": "X2", "full_name": "C Kumar"},
                              {"tsap_id": "X3", "full_name": "Solo"}])
check("A11 legacy filter keeps every profile", f["skipped_count"] == 0 and len(f["kept"]) == 3, f)
check("A12 no profile is skipped by a name token", f["skipped_ids"] == [])

# ═══════════════════════════════════════════════════════════════════════════
section("B. PUBLIC DISPLAY (first-name, surname/number hidden)")
# ═══════════════════════════════════════════════════════════════════════════
prof = {"full_name": "Lakshmi Reddy", "gender": "Bride", "age": 24, "caste": "Reddy",
        "education": "BTech", "job": "Software", "district": "Hyderabad", "state": "TS",
        "gothram": "Bharadwaj", "star": "Rohini", "phone": "9848012345"}
cap = CC.build_caption(prof, "TSAP-F-2025-5775", 92)
check("B1 first name visible", "Lakshmi" in cap)
check("B2 full-name string ledu", "Lakshmi Reddy" not in cap)
check("B3 number ledu", not PHONE_RE.findall(cap))
check("B4 public CTA uses profile route and owner-consent copy",
      "/search/TSAP-F-2025-5775" in cap and "profile-owner acceptance" in cap
      and "/unlock" not in cap)
card = TB.format_id_search(dict(prof, tsap_id="TSAP-F-1"))
check("B5 bot card first-name + hidden rest",
      "Lakshmi" in card and "Lakshmi Reddy" not in card and "9848012345" not in card, card[:150])

# ═══════════════════════════════════════════════════════════════════════════
section("C. NON-BLOCKING NAME-TOKEN POLICY (API)")
# ═══════════════════════════════════════════════════════════════════════════
client.post("/api/demo/seed")
import random as _r13
_PH = lambda: "9933%06d" % _r13.randint(0, 999999)  # R10: unique per run (demo fixed phones tho dup vaddhu)
BB = {"gender": "Bride", "age": "25", "dob": "2001-01-01", "password": "test-profile-password",
      "height": "5'4\"", "marital_status": "Pelli Kaledu", "caste": "Reddy",
      "education": "BTech", "job": "Software", "salary": "60k", "state": "TS", "district": "Hyderabad",
      "phone": _PH(), "full_name": "Wave Thirteen Reddy", "gothram": "Bharadwaj",
      "star": "Rohini", "rasi": "Vrishabha", "religion": "Hindu"}
BG_SAME = dict(BB, gender="Groom", age="29", dob="1997-01-01", phone=_PH(), full_name="Wave Groom REDDY",
               gothram="Koundinya", height="5'9\"", star="Mrigasira", rasi="Vrishabha")
BG_DIFF = dict(BB, gender="Groom", age="30", dob="1996-01-01", phone=_PH(), full_name="Wave Groom Kumar",
               gothram="Koundinya", height="5'10\"", star="Ardra", rasi="Mithuna")
b = client.post("/api/register", data=BB).json()
g1 = client.post("/api/register", data=BG_SAME).json()
g2 = client.post("/api/register", data=BG_DIFF).json()
BID, G1, G2 = b.get("tsap_id", ""), g1.get("tsap_id", ""), g2.get("tsap_id", "")
check("C0 3 register", all([BID, G1, G2]), (BID, G1, G2))
for _u in main.DB_USERS:
    if _u.get("tsap_id") in (BID, G1, G2):
        _u["is_approved"] = True
g1_user = next(u for u in main.DB_USERS if u["tsap_id"] == G1)
credits_before = int(g1_user.get("credits", 0) or 0)
ib = client.post("/api/interest/send", json={"from_id": G1, "to_id": BID})
check("C1 matching final name tokens never block an interest",
      ib.status_code == 200 and ib.json().get("success") is True,
      (ib.status_code, str(ib.json())[:150]))
credits_after = int(g1_user.get("credits", 0) or 0)
check("C2 pending interest uses one request credit",
      credits_before >= 1 and credits_after == credits_before - 1, (credits_before, credits_after))
io = client.post("/api/interest/send", json={"from_id": G2, "to_id": BID})
check("C3 different final token also has no special eligibility effect",
      io.status_code == 200 and io.json().get("success") is True,
      (io.status_code, str(io.json())[:150]))
tm = client.get(f"/api/top-matches/{BID}?limit=10&min_score=0").json()
tm_ids = [row.get("tsap_id") for row in tm.get("results", [])]
check("C4 top matches use recency/paid placement, not name-token exclusions",
      tm.get("legacy_exclusion_flags_ignored") is True and "surname_skipped" not in tm
      and tm.get("compatibility_score_calculated") is False, list(tm.keys()))
check("C5 same final token does not exclude G1", G1 in tm_ids, tm_ids)
tm2 = client.get(f"/api/top-matches/{BID}?limit=10&min_score=0&include_same_surname=1").json()
tm2_ids = [row.get("tsap_id") for row in tm2.get("results", [])]
check("C6 legacy surname flag does not change eligibility", tm_ids == tm2_ids, tm2_ids)
sc_response = client.post("/api/match/score", json={
    "a": next(u for u in main.DB_USERS if u["tsap_id"] == G1),
    "b": next(u for u in main.DB_USERS if u["tsap_id"] == BID),
})
sc = sc_response.json()
check("C7 match comparison exposes facts, not a surname verdict or score",
      sc_response.status_code == 200 and sc.get("compatibility_score_calculated") is False
      and "surname" not in sc and "score" not in sc, list(sc.keys()))
sc2_response = client.post("/api/match/score", json={
    "a": next(u for u in main.DB_USERS if u["tsap_id"] == G2),
    "b": next(u for u in main.DB_USERS if u["tsap_id"] == BID),
})
sc2 = sc2_response.json()
check("C8 different token comparison has same factual-only policy",
      sc2_response.status_code == 200 and sc2.get("compatibility_score_calculated") is False
      and "surname" not in sc2 and "score" not in sc2)
ms = client.get(f"/api/admin/match-send/{BID}?limit=20&min_score=0", headers=HDR_ADMIN).json()
ms_ids = [row.get("tsap_id") for row in ms.get("results", [])]
check("C9 admin list does not use name-token or compatibility ranking",
      ms.get("legacy_exclusion_flags_ignored") is True and "surname_skipped" not in ms
      and G1 in ms_ids
      and all(not ({"score", "compatibility_score", "surname", "surname_skipped"} & set(row))
              for row in ms.get("results", [])), (ms_ids, list(ms.get("results", [{}])[0].keys())))

# ═══════════════════════════════════════════════════════════════════════════
section("D. ASTRO PURE (stars/rasis/tables)")
# ═══════════════════════════════════════════════════════════════════════════
check("D1 27 nakshatras", len(AST.NAKSHATRAS) == 27)
check("D2 star_index Rohini", AST.star_index("Rohini") == 3)
check("D3 alias Aswini→0", AST.star_index("Aswini") == 0)
check("D4 alias Moola→18", AST.star_index("Moola") == 18)
check("D5 space/case proof", AST.star_index("  purva phalguni ") == 10, AST.star_index("  purva phalguni "))
check("D6 unknown → None", AST.star_index("XyzStar") is None and AST.star_index("") is None)
check("D7 rasi Karkataka→3", AST.rasi_index("Karkataka") == 3)
check("D8 rasi kumbham→10", AST.rasi_index("kumbham") == 10)
check("D9 rasi unknown None", AST.rasi_index("") is None)
ganas = [n[1] for n in AST.NAKSHATRAS]
check("D10 gana 9-9-9", ganas.count("deva") == 9 and ganas.count("manushya") == 9 and ganas.count("rakshasa") == 9)
nadis = [n[3] for n in AST.NAKSHATRAS]
check("D11 nadi 9-9-9", nadis.count("adi") == 9 and nadis.count("madhya") == 9 and nadis.count("antya") == 9)
check("D12 12 rasis + lords", len(AST.RASIS) == 12 and len(AST.RASI_LORD) == 12)

# ═══════════════════════════════════════════════════════════════════════════
section("E. ASTROLOGY EVIDENCE GATE")
# ═══════════════════════════════════════════════════════════════════════════
# Star/rasi labels are retained as member-entered metadata only.  No legacy
# calculator may turn them into a 36-guna total, dosha flag, or verdict.
g = AST.guna_milan("Rohini", "Vrishabha", "Mrigasira", "Vrishabha")
check("E1 guna result unavailable without reviewed Jathakam",
      g.get("available") is False and g.get("calculation_available") is False
      and g.get("status") == "jathakam_review_required")
check("E2 no fabricated guna totals, kootas, or doshas",
      g.get("total_36") is None and g.get("percent") is None
      and g.get("kootas") == [] and g.get("doshas") == [])
check("E3 missing and present star/rasi inputs use the same safe contract",
      AST.guna_milan("", "", "Rohini", "Vrishabha").get("status") == "jathakam_review_required")

# ═══════════════════════════════════════════════════════════════════════════
section("F. DOSHA EVIDENCE + JATHAKAM QUEUE")
# ═══════════════════════════════════════════════════════════════════════════
d1 = AST.dosha_screening({"star": "Rohini", "rasi": "Vrishabha", "dosham": "No"})
check("F1 dosha screening is unavailable from profile fields",
      d1["available"] is False and d1["calculation_available"] is False
      and d1["status"] == "jathakam_review_required")
check("F2 no profile-derived dosha flags or verdict",
      d1["flags"] == [] and d1["level"] == "unavailable" and d1["kuja"] == "unavailable")
j = AST.submit_jathakam(BID, "f.jpg", "photo")
check("F3 jathakam submit pending", j["status"] == "pending" and j["id"].startswith("J-"), j)
v = AST.verify_jathakam(j["id"], True, "pandit ok")
check("F4 review status records without creating a chart", v["success"] and AST.JATHAKAMS[-1]["status"] == "verified")
v2 = AST.verify_jathakam("J-9999", True)
check("F5 invalid review ID fails safely", v2["success"] is False)
st = AST.astro_stats([{"star": "Rohini", "rasi": "Vrishabha", "dosham": "Kuja"},
                      {"star": "Moola", "rasi": "Dhanu", "dosham": "No", "jathakam_verified": True}])
check("F6 admin stats count recorded fields, not generated results",
      st["dosha_declared"] == 1 and st["jathakam_verified"] == 1 and st["total"] == 2, st)

# ═══════════════════════════════════════════════════════════════════════════
section("G. ASTRO API")
# ═══════════════════════════════════════════════════════════════════════════
ga = client.get(f"/api/astro/guna?bride_id={BID}&groom_id={G2}").json()
check("G1 guna API fails closed without a reviewed real chart", ga.get("available") is False and ga.get("calculation_available") is False and ga.get("status") == "jathakam_review_required", ga)
check("G2 guna bride/groom echo", ga.get("bride_id") == BID and ga.get("groom_id") == G2)
ga_swap = client.get(f"/api/astro/guna?bride_id={G2}&groom_id={BID}").json()
check("G3 gender auto-swap", ga_swap.get("bride_id") == BID and ga_swap.get("total_36") == ga.get("total_36"))
ga_bad = client.get("/api/astro/guna?bride_id=TSAP-X-1&groom_id=TSAP-X-2")
check("G4 tappu IDs → 404", ga_bad.status_code == 404)
ga_same = client.get(f"/api/astro/guna?bride_id={BID}&groom_id={BID}")
check("G5 same ID → 400", ga_same.status_code == 400, ga_same.status_code)
gd = client.get(f"/api/astro/dosha/{BID}").json()
check("G6 dosha API", gd.get("tsap_id") == BID and "verdict_telugu" in gd)
fake = b"\xff\xd8" + b"0" * 2048
up = client.post("/api/astro/jathakam/upload", files={"file": ("j.jpg", fake, "image/jpeg")},
                 data={"tsap_id": BID}).json()
check("G7 jathakam upload", up.get("success") and up.get("jathakam_id", "").startswith("J-"), up)
JID = up.get("jathakam_id", "")
up_bad = client.post("/api/astro/jathakam/upload", files={"file": ("j.txt", b"x" * 2048, "text/plain")},
                     data={"tsap_id": BID})
check("G8 bad format → 400", up_bad.status_code == 400)
q = client.get("/api/admin/astro/queue", headers=HDR_ADMIN).json()
check("G9 admin queue", q.get("success") and q.get("count", 0) >= 1)
vv = client.post(f"/api/admin/astro/verify/{JID}", json={"ok": True, "note": "t13 pandit ok"},
                 headers=HDR_ADMIN).json()
check("G10 admin verify + badge", vv.get("success") and
      next(u for u in main.DB_USERS if u["tsap_id"] == BID).get("jathakam_verified") is True, vv)
st_api = client.get("/api/admin/astro/stats", headers=HDR_ADMIN).json()
check("G11 admin stats", st_api.get("success") and st_api.get("total", 0) >= 3, st_api.get("total"))

# ═══════════════════════════════════════════════════════════════════════════
section("H. ADS PURE (quote/create/approve/serve/expiry/track)")
# ═══════════════════════════════════════════════════════════════════════════
q1 = ADS.quote("district", 7, ["Hyderabad", "Rangareddy"], ["matches_sidebar"], False)
check("H1 quote district math 7×(49+38)=609", q1.get("ok") and q1.get("total") == 609, q1)
q2 = ADS.quote("state", 7, [], ["matches_sidebar"], False)
check("H2 quote state 7×299", q2.get("total") == 2093, q2)
q3 = ADS.quote("all", 3, [], ["home_hero"], True)
check("H3 quote all+hero+video 3×(499+99+30)=1884", q3.get("total") == 1884, q3)
check("H4 bad level/days/districts",
      ADS.quote("city", 7)["ok"] is False and ADS.quote("district", 2, ["Hyd"])["ok"] is False
      and ADS.quote("district", 7, [])["ok"] is False)
c1 = ADS.create_campaign("MVV-1", "Lens Studio", "district", 7, ["Hyderabad"], "TS",
                         ["matches_sidebar"], image_url="http://x/y.jpg", offer="20% off")
check("H5 create pending + amount", c1.get("success") and c1["campaign"]["status"] == "pending"
      and c1["campaign"]["amount"] == 7 * (49 + 19), c1.get("campaign", {}).get("amount"))
CID = c1["campaign"]["id"]
check("H6 create validation", ADS.create_campaign("V", "", "district", 7, ["H"])["success"] is False)
ap0 = ADS.approve_campaign(CID, "")
check("H7 UTR lekunda approve KUDADU", ap0["success"] is False)
ap1 = ADS.approve_campaign(CID, "UTR-AD-1")
check("H8 approve → active + dates", ap1["success"] and ADS.get_campaign(CID)["status"] == "active"
      and ADS.get_campaign(CID)["end"] > ADS.get_campaign(CID)["start"])
sv1 = ADS.serve("matches_sidebar", "Hyderabad", "TS")
check("H9 serve scope-match (Hyd)", sv1.get("ok") and sv1["ad"]["id"] == CID, sv1)
sv2 = ADS.serve("matches_sidebar", "Vijayawada", "AP")
check("H10 scope-mismatch (VJA) → no_ads", sv2.get("ok") is False, sv2)
sv3 = ADS.serve("home_hero", "Hyderabad", "TS")
check("H11 veru slot → no_ads", sv3.get("ok") is False)
check("H12 impression +1", ADS.get_campaign(CID)["impressions"] >= 1, ADS.get_campaign(CID)["impressions"])
ADS.track_click(CID)
check("H13 click track", ADS.get_campaign(CID)["clicks"] == 1)
ADS.get_campaign(CID)["end"] = "2020-01-01T00:00:00"
sv4 = ADS.serve("matches_sidebar", "Hyderabad", "TS")
check("H14 expiry auto (old end → no_ads + expired)", sv4.get("ok") is False
      and ADS.get_campaign(CID)["status"] == "expired")
expired_resume = ADS.campaign_action(CID, "resume")
check("H15 expired campaigns cannot be resumed",
      expired_resume.get("success") is False and ADS.get_campaign(CID)["status"] == "expired")
paused_campaign = ADS.create_campaign("MVV-2", "Second Test Studio", "district", 7,
                                      ["Hyderabad"], "TS", ["matches_sidebar"])
PAUSE_ID = paused_campaign.get("campaign", {}).get("id", "")
ADS.approve_campaign(PAUSE_ID, "UTR-AD-2")
pause_result = ADS.campaign_action(PAUSE_ID, "pause")
check("H16 active campaign can be paused and resumed only from paused state",
      pause_result.get("success") is True and ADS.campaign_action(PAUSE_ID, "resume").get("success") is True
      and ADS.get_campaign(PAUSE_ID)["status"] == "active")
check("H17 stats", ADS.ads_stats()["total"] >= 2 and "collected" in ADS.ads_stats())

# ═══════════════════════════════════════════════════════════════════════════
section("I. ADS API (rates/serve/vendor/admin)")
# ═══════════════════════════════════════════════════════════════════════════
rt = client.get("/api/ads/rates").json()
check("I1 rates public", rt.get("success") and rt["rates"]["base_per_day"] == 49)
qt = client.post("/api/ads/quote", json={"level": "district", "days": 7, "districts": ["Hyd"]}).json()
check("I2 quote API", qt.get("success") and qt.get("total") == 7 * 68, qt.get("total"))
reg = client.post("/api/vendors/register", json={"business_name": "T13 Photo Studio",
                                                  "category": "photography", "phone": "9848055555",
                                                  "city": "Hyderabad", "package": "V_BASIC"}).json()
VID = reg.get("vendor_id", "")
check("I3 vendor register", reg.get("success") and VID, reg.get("reason"))
cc = client.post(f"/api/vendors/{VID}/campaigns",
                 json={"title": "Wedding 4K Video", "level": "district", "days": 7,
                       "districts": ["Hyderabad"], "state": "TS", "slots": ["matches_sidebar"],
                       "video_url": "https://youtu.be/x", "offer": "Free album"}).json()
check("I4 vendor campaign create", cc.get("success") and cc["campaign"]["id"].startswith("AD-"), cc)
VCID = cc.get("campaign", {}).get("id", "")
cc_bad = client.post(f"/api/vendors/{VID}/campaigns", json={"title": "x", "level": "city", "days": 7})
check("I5 bad level → 400", cc_bad.status_code == 400, cc_bad.status_code)
vl = client.get(f"/api/vendors/{VID}/campaigns").json()
check("I6 vendor campaigns list", vl.get("success") and vl.get("count", 0) >= 1)
al = client.get("/api/admin/ads?status=pending", headers=HDR_ADMIN).json()
check("I7 admin ads queue", al.get("success") and any(c["id"] == VCID for c in al.get("campaigns", [])))
ap = client.post(f"/api/admin/ads/{VCID}/approve", json={"utr": "UTR-T13-1"}, headers=HDR_ADMIN).json()
check("I8 admin approve → LIVE", ap.get("success") and ap["campaign"]["status"] == "active", ap)
sv = client.get("/api/ads?slot=matches_sidebar&district=Hyderabad&state=TS").json()
check("I9 serve API Hyd (ad undi)", sv.get("ok") is True and sv.get("ad", {}).get("title") != "", sv)
sv_ap = client.get("/api/ads?slot=matches_sidebar&district=Vijayawada&state=AP").json()
served_ap = sv_ap.get("ad", {}).get("id", "") if sv_ap.get("ok") else ""
check("I10 AP ki Hyd-only ad RAKUDADU", VCID != served_ap, served_ap)
ck = client.post(f"/api/ads/{VCID}/click").json()
check("I11 click API", ck.get("ok") is True)
stt = client.get("/api/admin/ads/stats", headers=HDR_ADMIN).json()
check("I12 admin ads stats + revenue", stt.get("success") and stt.get("collected", 0) > 0, stt.get("collected"))

# ═══════════════════════════════════════════════════════════════════════════
section("J. SESSION CONTRACT (login persist)")
# ═══════════════════════════════════════════════════════════════════════════
dt_response = client.post("/api/auth/demo-token", json={"tsap_id": BID})
dt = dt_response.json()
check("J1 demo-token is retired", dt_response.status_code == 410 and "retired" in dt.get("detail", "").lower(), dt)
login_user = next(u for u in main.DB_USERS if u["tsap_id"] == BID)
login_response = client.post("/api/auth/login-password", json={
    "phone": login_user["phone"], "password": BB["password"]
})
login_data = login_response.json()
check("J2 password login returns a session token",
      login_response.status_code == 200 and bool(login_data.get("auth_token")), login_data)
tok = login_data.get("auth_token", "")
vv = client.get("/api/auth/verify", headers={"Authorization": f"Bearer {tok}"}).json()
check("J3 verify echoes the authenticated member ID", vv.get("valid") is True and vv.get("tsap_id") == BID, vv)
vv2 = client.get("/api/auth/verify", headers={"Authorization": "Bearer bogus-token-xyz"}).json()
check("J4 bogus token invalid", vv2.get("valid") is not True, vv2)
cr_api = client.get(f"/api/credits/{BID}").json()
check("J5 credits API (session data)", "credits" in cr_api, str(cr_api)[:120])

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
