"""
🌊 WAVE 14 TEST SUITE — FACT-ONLY MATCH FILTERS + ADMIN SAFETY
==============================================================
  A. age comparisons are descriptive only (DOB, fallback, unknown)
  B. profession observations do not add compatibility or ranking scores
  C. NRI classification (explicit country/member-entered location)
  D. religion→community options (alphabetized lists + self-description + aliases)
  E. API matching is not blocked or ranked by age/name/gothram
  F. profession facts do not alter recency/explicit-filter ordering
  G. NRI API (country + search filter + profile fields)
  H. payment configuration fails closed without a real merchant destination
  I. Razorpay HMAC flow through an isolated sandbox stub (valid/tamper/replay)
  J. offer creation, quote math, toggle and expiry (no payment implied)
  K. ads update (dates/districts/days + guards)
  L. bot matches (top-3 facts, masked, recency-limited)
  M. meta endpoints (religions + communities)
  N. legacy name/gothram/age filters do not create eligibility or scores

Run:  WA_TEST_FAST=1 python3 test_wave14_full.py   (backend/ nunchi)
"""
import atexit
import hashlib
import hmac
import os
import re
import sys
import tempfile

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
os.environ.setdefault("WHATSAPP_MODE", "off")
# Scenario data must never clear or write the application's persisted payment/ad stores.
_TEST_DATA_DIR = tempfile.TemporaryDirectory(prefix="mana-vivaha-wave14-test-")
atexit.register(_TEST_DATA_DIR.cleanup)
os.environ["MANA_VIVAHA_PAYPRO_FILE"] = os.path.join(_TEST_DATA_DIR.name, "paypro-test.json")
os.environ["MANA_VIVAHA_ADS_FILE"] = os.path.join(_TEST_DATA_DIR.name, "ads-test.json")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402
isolate_test_stores("wave14")

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
import matchpro as MP
import paypro as PP
import ads as ADS
import topmatch

client = TestClient(main.app, raise_server_exceptions=False)
HDR_ADMIN = {"X-Admin-Key": H.ADMIN_KEY}

# clean pay stores (deterministic counts)
PP.PAY_ORDERS.clear(); PP.OFFERS.clear(); PP.RECEIPTS.clear(); PP._SEQ = 0
try:
    os.remove(PP.PERSIST_FILE)
except OSError:
    pass

# Keep real payment credentials out of test requests; the Razorpay section uses
# synthetic sandbox values and a local network stub, restored before exit.
_PAYMENT_ENV_KEYS = ("PAY_UPI_ID", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_KEY", "RAZORPAY_SECRET")
_PAYMENT_ENV_ORIGINAL = {key: os.environ.get(key) for key in _PAYMENT_ENV_KEYS}
for _key in _PAYMENT_ENV_KEYS:
    os.environ.pop(_key, None)

# ═══════════════════════════════════════════════════════════════════════════
section("A. AGE-RULE PURE (DOB-date accurate)")
# ═══════════════════════════════════════════════════════════════════════════
G = {"gender": "Groom", "dob": "1998-05-10", "age": 27}
B_OLDER1 = {"gender": "Bride", "dob": "1998-05-09", "age": 27}   # 1 day peddadi
B_SAME = {"gender": "Bride", "dob": "1998-05-10", "age": 27}     # same date
B_YOUNG6 = {"gender": "Bride", "dob": "1998-11-10", "age": 27}   # 6mo younger
B_YOUNG2Y = {"gender": "Bride", "dob": "2000-05-10", "age": 25}  # 2y younger

r = MP.age_rule_check(B_OLDER1, G)
check("A1 reports one-day DOB difference without blocking", r["blocked"] is False and r["gap_days"] == -1
      and r["via"] == "dob", r)
check("A2 note asks users to verify member-entered dates", "స్వతంత్రంగా నిర్ధారించండి" in r["note_telugu"])
r = MP.age_rule_check(G, B_OLDER1)   # direction flip
check("A3 date-difference magnitude is direction-independent",
      r["blocked"] is False and abs(r["gap_days"]) == 1)
r = MP.age_rule_check(B_SAME, G)
check("A4 same-day comparison is factual only", r["blocked"] is False and r["gap_days"] == 0, r)
check("A5 ages never change the priority key",
      MP.age_priority_key(G, B_YOUNG6) == MP.age_priority_key(G, B_YOUNG2Y) == (0, 0))
check("A6 no age difference receives a special rank", MP.age_priority_key(G, B_OLDER1) == (0, 0))
r = MP.age_rule_check({"gender": "Bride", "age": 29}, {"gender": "Groom", "age": 27})
check("A7 age-year fallback reports facts without blocking", r["blocked"] is False and r["via"] == "age_years" and r["gap_years"] == 2, r)
r = MP.age_rule_check({"gender": "Bride", "age": 27}, {"gender": "Groom", "age": 27})
check("A8 equal ages are reported without an eligibility decision", r["blocked"] is False and r["via"] == "age_years", r)
r = MP.age_rule_check({"gender": "Bride"}, {"gender": "Groom"})
check("A9 unknown ages remain unknown without blocking",
      r["blocked"] is False and r["via"] == "unknown", r)
r = MP.age_rule_check(G, dict(G))
check("A10 same-gender roles are not age-ranked", r["applicable"] is False and r["blocked"] is False, r)
f = MP.filter_age_ok(dict(G, tsap_id="M"),
                     [dict(B_OLDER1, tsap_id="X1"), dict(B_YOUNG6, tsap_id="X2"),
                      dict(B_SAME, tsap_id="X3")])
check("A11 legacy age filter keeps every candidate", f["skipped_ids"] == [] and len(f["kept"]) == 3, f)

# ═══════════════════════════════════════════════════════════════════════════
section("B. PROFESSION PURE")
# ═══════════════════════════════════════════════════════════════════════════
check("B1 doctor group", MP.job_group({"job": "Doctor at Apollo"}) == "doctor")
check("B2 software group", MP.job_group({"job": "Software Engineer", "company": "TCS"}) == "software")
check("B3 govt group", MP.job_group({"job": "Group-2 Officer", "company": "Govt of TS"}) == "govt")
check("B4 teacher group", MP.job_group({"job": "School Teacher"}) == "teacher")
check("B5 unknown → other", MP.job_group({"job": "xyz abc"}) == "other")
a = MP.profession_affinity({"job": "Doctor"}, {"job": "Doctor"})
check("B6 identical job text is a factual observation with zero boost",
      a["same_group"] is True and a["boost"] == 0 and bool(a["reason_telugu"]), a)
a = MP.profession_affinity({"job": "Doctor"}, {"job": "Software Engineer"})
check("B7 different job text creates no compatibility boost", a["same_group"] is False and a["boost"] == 0, a)
me = {"job": "Doctor"}
rows = [{"tsap_id": "S1", "profile": {"job": "Software Engineer"}, "observations": ["x"]},
        {"tsap_id": "D1", "profile": {"job": "Doctor"}, "observations": []},
        {"tsap_id": "D2", "profile": {"job": "MBBS"}, "observations": []}]
rr = MP.rerank_profession(me, rows)
check("B8 profession helper does not change candidate order",
      [x["tsap_id"] for x in rr] == ["S1", "D1", "D2"], [x["tsap_id"] for x in rr])
check("B9 profession helper adds no synthetic score",
      all(not ({"score", "match_score", "compatibility_score", "trust_score"} & set(x)) for x in rr))
check("B10 profession helper does not invent reasons", all(x.get("observations") in (["x"], []) for x in rr))
check("B11 profession helper preserves input rows", rr == rows)

# ═══════════════════════════════════════════════════════════════════════════
section("C. NRI PURE")
# ═══════════════════════════════════════════════════════════════════════════
check("C1 USA → NRI", MP.detect_nri("USA", "", "")["is_nri"] is True)
check("C2 India → local, with explicit-country provenance",
      MP.detect_nri("India", "", "") == {"is_nri": False, "country": "India", "via": "country"})
check("C3 empty → local India", MP.detect_nri("", "", "")["is_nri"] is False)
check("C4 Dallas location → NRI", MP.detect_nri("", "Dallas, USA", "")["is_nri"] is True)
check("C5 Hyderabad → local", MP.detect_nri("India", "Hyderabad", "Hyderabad")["is_nri"] is False)
check("C6 Dubai → NRI", MP.detect_nri("UAE", "Dubai", "")["is_nri"] is True)

# ═══════════════════════════════════════════════════════════════════════════
section("D. RELIGION→CASTE PURE")
# ═══════════════════════════════════════════════════════════════════════════
check("D1 7 religions", MP.RELIGIONS == ["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"])
h = MP.castes_for("Hindu")
check("D2 Hindu community list includes local and self-described options", len(h["castes"]) >= 50 and "Other / self-described" in h["castes"], len(h["castes"]))
check("D3 Hindu communities alphabetize case-insensitively",
      h["castes"] == MP._alpha_unique(h["castes"]) and h["castes"][0] == "Adi Andhra", h["castes"][:3])
m = MP.castes_for("Muslim")
check("D4 Muslim groups A–Z", "Syed" in m["castes"] and m["castes"] == sorted(m["castes"]), m["castes"][:3])
c = MP.castes_for("Christian")
check("D5 Christian groups", "CSI" in c["castes"] and len(c["castes"]) >= 8, c["castes"])
check("D6 alias Islam→Muslim", MP.castes_for("Islam")["religion"] == "Muslim")
check("D7 unknown religion safely maps to Other", MP.castes_for("Zoro")["religion"] == "Other" and "Other / self-described" in MP.castes_for("Zoro")["castes"])

# ═══════════════════════════════════════════════════════════════════════════
section("E–G. API REGISTERS (age + profession + NRI)")
# ═══════════════════════════════════════════════════════════════════════════
client.post("/api/demo/seed")
BASE = {"height": "5'6\"", "marital_status": "Pelli Kaledu", "education": "BTech",
        "salary": "60k", "state": "TS", "district": "Hyderabad", "religion": "Hindu",
        "password": "test-profile-password"}
GG = dict(BASE, gender="Groom", age="27", dob="1998-05-10", phone="9948011111",
          full_name="Wave Fourteen Groom Alpuri", job="Doctor", caste="Reddy", gothram="GTA")
BB1 = dict(BASE, gender="Bride", age="27", dob="1998-05-09", phone="9948022222",
           full_name="Wave Fourteen Bride Bokka", job="Teacher", caste="Kamma", gothram="GTB")
BB2 = dict(BASE, gender="Bride", age="26", dob="2000-06-01", phone="9948033333",
           full_name="Wave Fourteen Bride Chillara", job="Doctor at Apollo", caste="Kapu", gothram="GTC")
BB3 = dict(BASE, gender="Bride", age="27", dob="1999-03-03", phone="9948044444",
           full_name="Wave Fourteen Bride Domala", job="Software Engineer", caste="Velama", gothram="GTD")
BNRI = dict(BASE, gender="Bride", age="25", dob="2001-01-01", phone="9948055555",
            full_name="Wave Fourteen Bride Endla", job="Nurse", caste="Reddy", gothram="GTE",
            state="AP", district="Guntur", country="USA", work_location="New Jersey, USA")
g = client.post("/api/register", data=GG).json()
b1 = client.post("/api/register", data=BB1).json()
b2 = client.post("/api/register", data=BB2).json()
b3 = client.post("/api/register", data=BB3).json()
bn = client.post("/api/register", data=BNRI).json()
GID, B1, B2, B3, NRI = (x.get("tsap_id", "") for x in (g, b1, b2, b3, bn))
check("E0 5 register", all([GID, B1, B2, B3, NRI]), (GID, B1, B2, B3, NRI))
for _u in main.DB_USERS:
    if _u.get("tsap_id") in (GID, B1, B2, B3, NRI):
        _u["is_approved"] = True

ib = client.post("/api/interest/send", json={"from_id": GID, "to_id": B1})
check("E1 a member can send interest regardless of age ordering",
      ib.status_code == 200 and ib.json().get("success") is True,
      (ib.status_code, str(ib.json())[:150]))
cr = next(u for u in main.DB_USERS if u["tsap_id"] == GID).get("credits", 0)
check("E2 accepted request leaves a nonnegative credit balance", cr >= 0, cr)
io = client.post("/api/interest/send", json={"from_id": GID, "to_id": B2})
check("E3 another eligible profile accepts an interest request",
      io.status_code == 200 and io.json().get("success") is True,
      (io.status_code, str(io.json())[:150]))
tm = client.get(f"/api/top-matches/{GID}?limit=30&min_score=100").json()
ids = [r.get("tsap_id") for r in tm.get("results", [])]
check("E4 same-gothram/name/age legacy flags do not filter profiles",
      B1 in ids and "legacy_exclusion_flags_ignored" in tm and tm.get("legacy_exclusion_flags_ignored") is True,
      {"count": tm.get("count"), "has_B1": B1 in ids})
check("E5 legacy min_score cannot remove profiles", tm.get("min_score_ignored") is True and B2 in ids)
tm2 = client.get(f"/api/top-matches/{GID}?limit=30&min_score=0&include_age_block=1").json()
check("E6 legacy include flag does not change recency order",
      [r.get("tsap_id") for r in tm2.get("results", [])] == ids)
sc = client.get(f"/api/match/score?a={GID}&b={B1}").json()
check("E7 profile comparison returns no age or compatibility verdict",
      not ({"score", "match_score", "compatibility_score", "trust_score", "grade", "verdict", "age_rule"} & set(sc)), list(sc.keys()))
sc2 = client.get(f"/api/match/score?a={GID}&b={B2}").json()
check("E8 factual comparison gives observations without ranking scores",
      isinstance(sc2.get("observations"), list) and "compatibility_score_calculated" in sc2
      and sc2.get("compatibility_score_calculated") is False, list(sc2.keys()))
ms = client.get(f"/api/admin/match-send/{GID}?limit=30&min_score=100", headers=HDR_ADMIN).json()
ms_ids = [r.get("tsap_id") for r in ms.get("results", [])]
check("E9 assisted matching does not age/gothram/surname-filter candidates",
      B1 in ms_ids and ms.get("legacy_exclusion_flags_ignored") is True,
      {"count": ms.get("count"), "has_B1": B1 in ms_ids})

# F. Profession is descriptive only; recency and explicit filters govern order.
res = tm.get("results", [])
check("F1 result rows have profile facts and no compatibility score",
      all(not ({"score", "match_score", "compatibility_score", "trust_score", "grade"} & set(row))
          for row in res))
check("F2 profession categories do not change candidate order",
      [row.get("tsap_id") for row in res] == ids)
check("F3 legacy min_score cannot alter API results",
      all(not ({"score", "match_score", "compatibility_score", "trust_score"} & set(row)) for row in res))
check("F4 profession label + listed-location facts remain available",
      all("profession_label" in r and "is_nri" in r for r in res))
sr = client.get(f"/api/search?viewer_id={GID}&profession_first=true&limit=30").json().get("results", [])
sr_plain = client.get(f"/api/search?viewer_id={GID}&profession_first=false&limit=30").json().get("results", [])
check("F5 profession_first legacy flag does not reorder candidates",
      [r.get("tsap_id") for r in sr] == [r.get("tsap_id") for r in sr_plain])
check("F6 search rows expose observations, not synthetic reasons",
      all("reasons" not in r and not ({"score", "compatibility_score", "trust_score"} & set(r)) for r in sr))

# G. NRI API
nr = client.get("/api/search?nri_only=true&limit=100").json().get("results", [])
check("G1 nri_only contains NRI bride", NRI in [r.get("tsap_id") for r in nr],
      [r.get("tsap_id") for r in nr][:8])
check("G2 nri_only anni NRI", all(r.get("is_nri") for r in nr), len(nr))
pf = client.get(f"/api/search/{NRI}").json().get("profile", {})
check("G3 profile is_nri + country", pf.get("is_nri") is True and pf.get("country") == "USA", pf)
tmn = client.get(f"/api/top-matches/{GID}?limit=30&min_score=0&nri_only=1").json()
check("G4 top-matches nri_only", tmn.get("nri_only") is True and NRI in [r.get("tsap_id") for r in tmn.get("results", [])]
      and all(r.get("is_nri") for r in tmn.get("results", [])), tmn.get("count"))
check("G5 local profile is_nri False",
      client.get(f"/api/search/{B2}").json().get("profile", {}).get("is_nri") is False)

# ═══════════════════════════════════════════════════════════════════════════
section("H. SAFE PAYMENTS FAIL CLOSED")
# ═══════════════════════════════════════════════════════════════════════════
cfg = client.get("/api/pay/config").json()
check("H1 no provider or merchant destination reports unconfigured",
      cfg.get("success") and cfg.get("mode") == "unconfigured" and not cfg.get("upi_id")
      and "secret" not in str(cfg).lower(), cfg)
orders_before = len(PP.PAY_ORDERS)
unconfigured_order = client.post("/api/pay/order", json={
    "tsap_id": GID, "purpose": "credits", "ref": "S_99", "amount": 1
})
check("H2 checkout fails closed without a real configured destination",
      unconfigured_order.status_code == 400 and "unavailable" in unconfigured_order.json().get("detail", "").lower()
      and len(PP.PAY_ORDERS) == orders_before, unconfigured_order.text[:160])
bad_purpose = client.post("/api/pay/order", json={
    "tsap_id": GID, "purpose": "lottery", "ref": "X", "amount": 1
})
check("H3 unknown payment purpose is rejected", bad_purpose.status_code == 400, bad_purpose.status_code)
bad_offer = client.post("/api/pay/order", json={
    "tsap_id": GID, "purpose": "credits", "ref": "S_99", "offer_code": "BOGUS99"
})
check("H4 invalid offer is rejected without creating an order",
      bad_offer.status_code == 400 and len(PP.PAY_ORDERS) == orders_before, bad_offer.status_code)
seed = client.post("/api/admin/offers/seed", json={"valid_from": "2020-01-01", "valid_to": "2030-12-31"},
                   headers=HDR_ADMIN).json()
check("H5 admin can seed offers without creating a payment",
      seed.get("success") and len(seed.get("added", [])) == 4 and len(PP.PAY_ORDERS) == orders_before, seed)
valid_offer = PP.validate_offer("DIWALI25", "credits", 99, GID)
check("H6 offer quote can be validated without implying payment",
      valid_offer.get("ok") is True and 0 < valid_offer.get("discount", 0) < 99
      and valid_offer.get("final_amount") + valid_offer.get("discount") == 99, valid_offer)
invalid_offer = PP.validate_offer("NO-SUCH-OFFER", "credits", 99, GID)
check("H7 unknown offer fails validation", invalid_offer.get("ok") is False, invalid_offer)
_saved_fast = os.environ.pop("WA_TEST_FAST", None)
noauth = client.get("/api/admin/payments")
check("H8 payment queue remains protected", noauth.status_code == 403, noauth.status_code)
if _saved_fast is not None:
    os.environ["WA_TEST_FAST"] = _saved_fast
admin_payments = client.get("/api/admin/payments", headers=HDR_ADMIN).json()
check("H9 no unconfigured order appears in the payment queue",
      admin_payments.get("success") is True and admin_payments.get("count") == 0
      and admin_payments.get("stats", {}).get("total", 0) == 0, admin_payments)

# ═══════════════════════════════════════════════════════════════════════════
section("I. SAFE-PAY RAZORPAY (HMAC)")
# ═══════════════════════════════════════════════════════════════════════════
os.environ["RAZORPAY_KEY_ID"] = "rzp_test_w14key"
os.environ["RAZORPAY_KEY_SECRET"] = "w14_secret_abc123"
# 🌊 WAVE 25: server-side RZP order create — network stub (offline sandbox)
import paypro as _PP14
_PPx = _PP14._rzp_create_order
_PP14._rzp_create_order = lambda pid, amt, label: {"ok": True, "rzp_order_id": "rzp_o_w14",
                                                   "rzp_amount": int(amt) * 100}
cfg2 = client.get("/api/pay/config").json()
check("I1 keys unte razorpay mode + key_id only",
      cfg2.get("mode") == "razorpay" and cfg2.get("key_id") == "rzp_test_w14key"
      and "w14_secret" not in str(cfg2), cfg2)
o3 = client.post("/api/pay/order", json={"tsap_id": GID, "purpose": "credits", "ref": "S_99"}).json()
po3 = o3.get("pay_order", {})
check("I2 razorpay order + paise + server order_id",
      po3.get("mode") == "razorpay" and po3.get("checkout_amount_paise") == 9900
      and po3.get("rzp_order_id") == "rzp_o_w14", po3)
PO3 = po3.get("id", "")


def _sig(order_id, pay_id):
    return hmac.new(b"w14_secret_abc123", f"{order_id}|{pay_id}".encode(), hashlib.sha256).hexdigest()


crb = next(u for u in main.DB_USERS if u["tsap_id"] == GID).get("credits", 0)
v3 = client.post("/api/pay/verify", json={"order_id": PO3, "razorpay_order_id": "rzp_o_w14",
                                           "razorpay_payment_id": "pay_w14_ok1",
                                           "razorpay_signature": _sig("rzp_o_w14", "pay_w14_ok1")}).json()
cra = next(u for u in main.DB_USERS if u["tsap_id"] == GID).get("credits", 0)
check("I3 valid HMAC → paid + receipt", v3.get("success") and v3.get("receipt", {}).get("payment_id") == "pay_w14_ok1"
      and cra - crb == 5, (v3, crb, cra))
v3b = client.post("/api/pay/verify", json={"order_id": PO3, "razorpay_order_id": "rzp_o_w14",
                                            "razorpay_payment_id": "pay_w14_ok1",
                                            "razorpay_signature": _sig("rzp_o_w14", "pay_w14_ok1")}).json()
crc = next(u for u in main.DB_USERS if u["tsap_id"] == GID).get("credits", 0)
check("I4 replay → duplicate, credit same", v3b.get("duplicate") is True and crc == cra, (v3b, crc))
o4 = client.post("/api/pay/order", json={"tsap_id": GID, "purpose": "credits", "ref": "S_99"}).json()
PO4 = o4["pay_order"]["id"]
v4 = client.post("/api/pay/verify", json={"order_id": PO4, "razorpay_order_id": "rzp_o_w14",
                                           "razorpay_payment_id": "pay_w14_bad",
                                           "razorpay_signature": "deadbeef" * 8})
check("I5 tampered signature FAIL", v4.status_code == 400, v4.status_code)
crd = next(u for u in main.DB_USERS if u["tsap_id"] == GID).get("credits", 0)
check("I6 fail ayina credit add kadu", crd == crc, (crc, crd))
st4 = client.get(f"/api/pay/status/{PO4}").json()
check("I7 failed order stays created", st4["order"]["status"] == "created", st4["order"]["status"])
_PP14._rzp_create_order = _PPx
os.environ.pop("RAZORPAY_KEY_ID", None)
os.environ.pop("RAZORPAY_KEY_SECRET", None)
for _key, _value in _PAYMENT_ENV_ORIGINAL.items():
    if _value is None:
        os.environ.pop(_key, None)
    else:
        os.environ[_key] = _value

# ═══════════════════════════════════════════════════════════════════════════
section("J. OFFERS ADMIN")
# ═══════════════════════════════════════════════════════════════════════════
co = client.post("/api/admin/offers", json={"code": "W14FLAT", "title": "Wave14 flat",
                                             "flat_off": 30, "applies_to": "credits",
                                             "valid_from": "2020-01-01", "valid_to": "2030-12-31",
                                             "max_uses": 5}, headers=HDR_ADMIN).json()
check("J1 create flat offer", co.get("success") and co["offer"]["code"] == "W14FLAT", co)
dup = client.post("/api/admin/offers", json={"code": "W14FLAT", "flat_off": 10}, headers=HDR_ADMIN)
check("J2 duplicate code reject", dup.status_code == 400, dup.status_code)
of = PP.validate_offer("W14FLAT", "credits", 99, GID)
check("J3 flat 30 off 99 → 69 is quote math only",
      of.get("ok") and of.get("final_amount") == 69 and of.get("discount") == 30, of)
tg = client.post("/api/admin/offers/W14FLAT/toggle", headers=HDR_ADMIN).json()
check("J4 toggle OFF", tg.get("success") and tg["offer"]["active"] is False, tg)
of2 = PP.validate_offer("W14FLAT", "credits", 99, GID)
check("J5 OFF offer rejected without attempting payment", of2.get("ok") is False, of2)
client.post("/api/admin/offers/W14FLAT/toggle", headers=HDR_ADMIN)
exp = client.post("/api/admin/offers", json={"code": "W14OLD", "pct_off": 50, "applies_to": "credits",
                                              "valid_from": "2020-01-01", "valid_to": "2020-02-01"},
                  headers=HDR_ADMIN).json()
check("J6 expired offer can be recorded (enforce at use)", exp.get("success"), exp)
exp2 = PP.validate_offer("W14OLD", "credits", 99, GID)
check("J7 expired offer fails quote validation", exp2.get("ok") is False and exp2.get("reason") == "expired", exp2)
la = client.get("/api/admin/offers", headers=HDR_ADMIN).json()
check("J8 admin offers list", la.get("success") and la.get("count", 0) >= 6, la.get("count"))
pub = client.get("/api/offers/active").json()
check("J9 public active (expired ledu)", pub.get("success") and "W14OLD" not in [o["code"] for o in pub["offers"]]
      and "DIWALI25" in [o["code"] for o in pub["offers"]], [o["code"] for o in pub["offers"]])

# ═══════════════════════════════════════════════════════════════════════════
section("K. ADS UPDATE (dates/districts)")
# ═══════════════════════════════════════════════════════════════════════════
ADS.CAMPAIGNS.clear()
cc = ADS.create_campaign("V-W14", "Wave14 Test Ad", "district", 7, districts=["Hyderabad"],
                        slots=["home_hero"])
CID = cc["campaign"]["id"]
up = client.post(f"/api/admin/ads/{CID}/update",
                 json={"districts": ["Hyderabad", "Vijayawada"], "days": 10, "offer": "Diwali 20% off"},
                 headers=HDR_ADMIN).json()
check("K1 update districts+days+offer",
      up.get("success") and up["campaign"]["districts"] == ["Hyderabad", "Vijayawada"]
      and up["campaign"]["days"] == 10, up.get("campaign"))
ap = client.post(f"/api/admin/ads/{CID}/approve", json={"utr": "UTR-W14-AD", "days": 10},
                 headers=HDR_ADMIN).json()
check("K2 approve live", ap.get("success") and ap["campaign"]["status"] == "active", ap)
up2 = client.post(f"/api/admin/ads/{CID}/update", json={"days": 15}, headers=HDR_ADMIN).json()
check("K3 active extend → end recompute",
      up2.get("success") and up2["campaign"]["days"] == 15
      and up2["campaign"]["end"] > ap["campaign"]["end"],
      (ap["campaign"]["end"], up2["campaign"]["end"]))
sv = client.get("/api/ads?slot=home_hero&district=Vijayawada").json()
check("K4 Vijayawada scope serve", sv.get("ok") and CID in str(sv), str(sv)[:150])
badk = client.post(f"/api/admin/ads/{CID}/update", json={"start": "not-a-date"}, headers=HDR_ADMIN)
check("K5 bad date reject", badk.status_code == 400, badk.status_code)
_saved_fast = os.environ.pop("WA_TEST_FAST", None)
noa = client.post(f"/api/admin/ads/{CID}/update", json={"days": 5})
check("K6 no admin key 403", noa.status_code == 403, noa.status_code)
if _saved_fast is not None:
    os.environ["WA_TEST_FAST"] = _saved_fast

# ═══════════════════════════════════════════════════════════════════════════
section("L. BOT /matches")
# ═══════════════════════════════════════════════════════════════════════════
bot = client.get(f"/api/bot/matches?tsap_id={GID}").json()
check("L1 bot top-3", bot.get("success") and bot.get("count") == 3 and len(bot.get("matches", [])) == 3, bot)
check("L2 bot text describes profiles to review + /view", "profiles to review" in bot.get("text", "") and "/view" in bot.get("text", ""),
      bot.get("text", "")[:200])
check("L3 bot masked (no phone)", not PHONE_RE.findall(bot.get("text", "")))
check("L4 bot uses recency order with no invented exclusion counters",
      bot.get("ranking_basis") == "creation_time_descending" and "skipped" not in bot)
check("L5 older-than-groom profile remains eligible in the full review pool",
      B1 in ids and tm.get("legacy_exclusion_flags_ignored") is True)
bot404 = client.get("/api/bot/matches?tsap_id=BOGUS-ID")
check("L6 bogus ID 404", bot404.status_code == 404, bot404.status_code)

# ═══════════════════════════════════════════════════════════════════════════
section("M. META ENDPOINTS")
# ═══════════════════════════════════════════════════════════════════════════
mr = client.get("/api/meta/religions").json()
check("M1 religions 7", mr.get("success") and len(mr.get("religions", [])) == 7, mr)
mc = client.get("/api/meta/castes?religion=Muslim").json()
check("M2 muslim castes API", mc.get("success") and "Syed" in mc.get("castes", []), mc.get("castes", [])[:4])
mc2 = client.get("/api/meta/castes?religion=Hindu").json()
_hindu_community_options = MP.castes_for("Hindu")["castes"]
check("M3 Hindu community API includes alphabetized self-description option",
      mc2.get("success") and mc2.get("castes") == _hindu_community_options
      and _hindu_community_options == MP._alpha_unique(_hindu_community_options)
      and "Other / self-described" in _hindu_community_options,
      {"api_count": len(mc2.get("castes", [])), "expected_count": len(_hindu_community_options)})

# ═══════════════════════════════════════════════════════════════════════════
section("N. REGRESSION GUARDS (old waves intact)")
# ═══════════════════════════════════════════════════════════════════════════
check("N1 legacy gotra/name filters do not remove candidates",
      tm.get("legacy_exclusion_flags_ignored") is True and B1 in ids, list(tm.keys()))
check("N2 comparison contains no surname/gothram/age eligibility verdict",
      not ({"surname", "gothram", "age_rule", "score", "grade", "verdict"} & set(sc2)), list(sc2.keys()))
sg = client.get(f"/api/match/score?a={GID}&b={B1}").json()
check("N3 legacy score API publishes only factual comparisons",
      "observations" in sg and "differences" in sg
      and not ({"score", "grade", "verdict", "trust_score"} & set(sg)), list(sg.keys())[:8])

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
