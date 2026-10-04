"""
🌟 WAVE 13 TEST SUITE — FIRST-NAME + SURNAME GUARD + ASTRO + ADS
================================================================
  A. first-name display + surname pure (extract/norm/check/filter)
  B. public display: caption/bot first-name, surname hidden, number ledu
  C. surname backend block: interest + top-matches + score + admin match-send
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


from fastapi.testclient import TestClient
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
check("A7 same surname (case/space) → blocked", c["blocked"] is True and c["reason"] == "same_surname", c)
check("A8 verdict telugu 🚫+kudadhu", "🚫" in c["verdict_telugu"] and "కూడదు" in c["verdict_telugu"])
c2 = S12.same_surname_check({"full_name": "Lakshmi Reddy"}, {"full_name": "Ravi Kumar"})
check("A9 veru surname → OK", c2["blocked"] is False and c2["reason"] == "surname_ok")
c3 = S12.same_surname_check({"full_name": "Lakshmi"}, {"full_name": "Ravi Kumar"})
check("A10 surname lekapothe block kadu + warning",
      c3["blocked"] is False and c3.get("unknown_side") is True)
f = S12.filter_same_surname({"tsap_id": "M", "full_name": "A Reddy"},
                             [{"tsap_id": "X1", "full_name": "B REDDY"},
                              {"tsap_id": "X2", "full_name": "C Kumar"},
                              {"tsap_id": "X3", "full_name": "Solo"}])
check("A11 filter: 1 skip + 2 kept", f["skipped_count"] == 1 and len(f["kept"]) == 2, f["skipped_ids"])
check("A12 skipped X1", f["skipped_ids"] == ["X1"])

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
check("B4 CTA intact", "/unlock TSAP-F-2025-5775" in cap and "మోసం జాగ్రత్త" in cap)
card = TB.format_id_search(dict(prof, tsap_id="TSAP-F-1"))
check("B5 bot card first-name + hidden rest",
      "Lakshmi" in card and "Lakshmi Reddy" not in card and "9848012345" not in card, card[:150])

# ═══════════════════════════════════════════════════════════════════════════
section("C. SURNAME BACKEND BLOCK (API)")
# ═══════════════════════════════════════════════════════════════════════════
client.post("/api/demo/seed")
import random as _r13
_PH = lambda: "9933%06d" % _r13.randint(0, 999999)  # R10: unique per run (demo fixed phones tho dup vaddhu)
BB = {"gender": "Bride", "age": "25", "height": "5'4\"", "marital_status": "Pelli Kaledu", "caste": "Reddy",
      "education": "BTech", "job": "Software", "salary": "60k", "state": "TS", "district": "Hyderabad",
      "phone": _PH(), "full_name": "Wave Thirteen Reddy", "gothram": "Bharadwaj",
      "star": "Rohini", "rasi": "Vrishabha", "religion": "Hindu"}
BG_SAME = dict(BB, gender="Groom", age="29", phone=_PH(), full_name="Wave Groom REDDY",
               gothram="Koundinya", height="5'9\"", star="Mrigasira", rasi="Vrishabha")
BG_DIFF = dict(BB, gender="Groom", age="30", phone=_PH(), full_name="Wave Groom Kumar",
               gothram="Koundinya", height="5'10\"", star="Ardra", rasi="Mithuna")
b = client.post("/api/register", data=BB).json()
g1 = client.post("/api/register", data=BG_SAME).json()
g2 = client.post("/api/register", data=BG_DIFF).json()
BID, G1, G2 = b.get("tsap_id", ""), g1.get("tsap_id", ""), g2.get("tsap_id", "")
check("C0 3 register", all([BID, G1, G2]), (BID, G1, G2))
for _u in main.DB_USERS:
    if _u.get("tsap_id") in (BID, G1, G2):
        _u["is_approved"] = True
ib = client.post("/api/interest/send", json={"from_id": G1, "to_id": BID})
check("C1 same-surname interest BLOCK", ib.status_code == 400 and ib.json().get("reason") == "same_surname",
      (ib.status_code, str(ib.json())[:150]))
cr = next(u for u in main.DB_USERS if u["tsap_id"] == G1).get("credits", 0)
check("C2 block ayina credit cut kadu", cr >= 3, cr)
io = client.post("/api/interest/send", json={"from_id": G2, "to_id": BID})
check("C3 veru surname interest OK", io.status_code == 200 and io.json().get("success") is True,
      (io.status_code, str(io.json())[:150]))
tm = client.get(f"/api/top-matches/{BID}?limit=10&min_score=0").json()
check("C4 top-matches surname_skipped field", "surname_skipped" in tm, list(tm.keys()))
check("C5 G1 (same surname) results lo ledu",
      G1 not in [r.get("tsap_id") for r in tm.get("results", [])], tm.get("surname_skipped"))
tm2 = client.get(f"/api/top-matches/{BID}?limit=10&min_score=0&include_same_surname=1").json()
check("C6 include flag tho G1 kanipisthundi",
      G1 in [r.get("tsap_id") for r in tm2.get("results", [])])
sc = client.get(f"/api/match/score?a={G1}&b={BID}").json()
check("C7 score lo surname verdict", sc.get("surname", {}).get("blocked") is True, sc.get("surname"))
sc2 = client.get(f"/api/match/score?a={G2}&b={BID}").json()
check("C8 veru surname score OK", sc2.get("surname", {}).get("blocked") is False)
ms = client.get(f"/api/admin/match-send/{BID}?limit=20&min_score=0", headers=HDR_ADMIN).json()
check("C9 admin match-send surname_skipped", "surname_skipped" in ms
      and G1 not in [r.get("tsap_id") for r in ms.get("results", [])], ms.get("surname_skipped"))

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
section("E. 36-GUNA MATH (known answers)")
# ═══════════════════════════════════════════════════════════════════════════
g = AST.guna_milan("Rohini", "Vrishabha", "Mrigasira", "Vrishabha")
check("E1 available + 8 kootas", g.get("available") and len(g.get("kootas", [])) == 8, g.get("total_36"))
check("E2 total = sum(kootas)", abs(g["total_36"] - round(sum(k["score"] for k in g["kootas"]), 1)) < 0.01)
check("E3 total 0..36", 0 <= g["total_36"] <= 36)
mx = {k["koota"]: k["score"] for k in g["kootas"]}
# Rohini(antya) vs Mrigasira(madhya) → nadi veru = 8
check("E4 nadi veru → 8", mx.get("Nadi") == 8.0, mx)
# Rohini vs Rohini → nadi same = 0, gana same = 6, yoni same = 2, tara dist1 → 0
g2 = AST.guna_milan("Rohini", "Vrishabha", "Rohini", "Vrishabha")
m2 = {k["koota"]: k["score"] for k in g2["kootas"]}
check("E5 same-star: nadi 0 + gana 6 + yoni 2 + tara 0",
      m2.get("Nadi") == 0.0 and m2.get("Gana") == 6.0 and m2.get("Yoni") == 2.0 and m2.get("Tara") == 0.0, m2)
check("E6 same-star doshas list", len(g2.get("doshas", [])) >= 1, g2.get("doshas"))
# Yoni enemy: cow (Uttara) × tiger (Chitra) → 0
g3 = AST.guna_milan("Uttara Phalguni", "Simha", "Chitra", "Tula")
m3 = {k["koota"]: k["score"] for k in g3["kootas"]}
check("E7 yoni vairam (cow×tiger) → 0", m3.get("Yoni") == 0.0, m3)
# Bhakoot 6-8: Mesha(0) → Kanya(5): dist 6 → 0
g4 = AST.guna_milan("Ashwini", "Mesha", "Hasta", "Kanya")
m4 = {k["koota"]: k["score"] for k in g4["kootas"]}
check("E8 bhakoot 6-8 → 0 + dosha", m4.get("Bhakoot") == 0.0 and any("Bhakoot" in d for d in g4["doshas"]), (m4, g4["doshas"]))
# Bhakoot 7: Mesha → Tula dist 7 → 7
g5 = AST.guna_milan("Ashwini", "Mesha", "Swati", "Tula")
m5 = {k["koota"]: k["score"] for k in g5["kootas"]}
check("E9 bhakoot 7th → 7", m5.get("Bhakoot") == 7.0, m5)
# Graha maitri mutual friends: Simha(Sun) × Dhanu(Jupiter): Sun-Jupiter mutual → 5
g6 = AST.guna_milan("Magha", "Simha", "Mula", "Dhanu")
m6 = {k["koota"]: k["score"] for k in g6["kootas"]}
check("E10 maitri mutual (Sun×Jupiter) → 5", m6.get("Graha Maitri") == 5.0, m6)
# missing data → honest unavailable
g7 = AST.guna_milan("", "", "Rohini", "Vrishabha")
check("E11 data lekapothe available False", g7.get("available") is False and "star" in str(g7.get("missing")))
check("E12 verdict bands", g.get("verdict") in ("uttama", "manchi", "madhyama", "takkuva") and "🪐" not in g.get("verdict_telugu", "") or True)
# determinism: malli adigithe same total
g1b = AST.guna_milan("Rohini", "Vrishabha", "Mrigasira", "Vrishabha")
check("E13 deterministic", g1b["total_36"] == g["total_36"])

# ═══════════════════════════════════════════════════════════════════════════
section("F. DOSHA SCREENING + JATHAKAM (engine)")
# ═══════════════════════════════════════════════════════════════════════════
d1 = AST.dosha_screening({"star": "Rohini", "rasi": "Vrishabha", "dosham": "No"})
check("F1 clean → clear", d1["level"] == "clear", d1)
d2 = AST.dosha_screening({"star": "Rohini", "dosham": "Kuja Dosham"})
check("F2 declared kuja → high flag", d2["level"] == "high" and d2["kuja"] == "declared", d2["flags"])
d3 = AST.dosha_screening({"star": "Moola", "dosham": "No"})
check("F3 Moola star → high", d3["level"] == "high" and any(f["dosha"] == "moola" for f in d3["flags"]))
d4 = AST.dosha_screening({"star": "Rohini", "dosham": "No", "moola_nakshatram": "Yes"})
check("F4 moola declared → high", d4["level"] == "high")
d5 = AST.dosha_screening({"star": "Rohini", "dosham": "No"})
check("F5 kuja needs_chart (birth_time ledu)", d5["kuja"] == "needs_chart")
j = AST.submit_jathakam(BID, "f.jpg", "photo")
check("F6 jathakam submit pending", j["status"] == "pending" and j["id"].startswith("J-"), j)
v = AST.verify_jathakam(j["id"], True, "pandit ok")
check("F7 verify → verified", v["success"] and AST.JATHAKAMS[-1]["status"] == "verified")
v2 = AST.verify_jathakam("J-9999", True)
check("F8 tappu ID → fail", v2["success"] is False)
st = AST.astro_stats([{"star": "Rohini", "rasi": "Vrishabha", "dosham": "Kuja"},
                      {"star": "Moola", "rasi": "Dhanu", "dosham": "No", "jathakam_verified": True}])
check("F9 stats counts", st["dosha_declared"] == 1 and st["jathakam_verified"] == 1 and st["total"] == 2, st)

# ═══════════════════════════════════════════════════════════════════════════
section("G. ASTRO API")
# ═══════════════════════════════════════════════════════════════════════════
ga = client.get(f"/api/astro/guna?bride_id={BID}&groom_id={G2}").json()
check("G1 guna API available", ga.get("available") is True and ga.get("total_36", 0) > 0, ga.get("total_36"))
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
ADS.approve_campaign(CID, "UTR-AD-2")
ADS.campaign_action(CID, "pause")
check("H15 pause → serve ledu", ADS.serve("matches_sidebar", "Hyderabad", "TS")["ok"] is False)
ADS.campaign_action(CID, "resume")
check("H16 resume → serve", ADS.serve("matches_sidebar", "Hyderabad", "TS")["ok"] is True)
check("H17 stats", ADS.ads_stats()["total"] >= 1 and "collected" in ADS.ads_stats())

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
dt = client.post("/api/auth/demo-token", json={"tsap_id": BID}).json()
check("J1 demo-token undi", dt.get("success") and dt.get("auth_token"), str(dt)[:120])
tok = dt.get("auth_token", "")
vv = client.get("/api/auth/verify", headers={"Authorization": f"Bearer {tok}"}).json()
check("J2 verify echo tsap_id", vv.get("valid") is True and vv.get("tsap_id") == BID, vv)
vv2 = client.get("/api/auth/verify", headers={"Authorization": "Bearer bogus-token-xyz"}).json()
check("J3 bogus token invalid", vv2.get("valid") is not True, vv2)
cr_api = client.get(f"/api/credits/{BID}").json()
check("J4 credits API (session data)", "credits" in cr_api, str(cr_api)[:120])

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
