"""
🌊 WAVE 16 TEST SUITE — PRO REGISTER UX (pills + dropdowns + children)
=======================================================================
  A. marital canonical (Widow/Widower/Divorced/Awaiting/Separated + legacy + junk)
  B. children store/force/guard
  C. search children filter
  D. safe_user + profile + top-matches children fields
  E. frontend static (PillGroup/SelectField/heightLabel/children UI)
  F. heightLabel math via node (5'6" → 5 ft 6 in (168 cm))

Run:  WA_TEST_FAST=1 python3 test_wave16_full.py   (backend/ nunchi)
"""
import os
import re
import subprocess
import sys
from unittest.mock import patch

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
os.environ.setdefault("WHATSAPP_MODE", "off")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

PASS, FAIL, FAILED = 0, 0, []
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


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
        print(f"  ❌ {name} :: {str(extra)[:200]}")


from test_storage import isolate_test_stores
isolate_test_stores("wave16")

from testutil_client import TestClient
import hardening as H
import main
from models import is_never_married_status
from interest import safe_user
from testutil_paths import src_page  # noqa: E402  # App Router page.tsx + page-client.tsx aware

client = TestClient(main.app, raise_server_exceptions=False)
HDR_ADMIN = {"X-Admin-Key": H.ADMIN_KEY}
client.post("/api/demo/seed")

BASE = {"height": "5'6\"", "dob": "1999-01-15", "password": "test-profile-password",
        "education": "BTech", "job": "Software", "salary": "60k",
        "state": "TS", "district": "Hyderabad", "religion": "Hindu", "caste": "Reddy",
        "physical_status": "Normal"}


def reg(name, gender, phone, marital, children=None, age="27"):
    d = dict(BASE, gender=gender, age=age, phone=phone, full_name=name,
             marital_status=marital)
    if children is not None:
        d["children"] = children
    return client.post("/api/register", data=d)


# ═══════════════════════════════════════════════════════════════════════════
section("A. MARITAL CANONICAL")
# ═══════════════════════════════════════════════════════════════════════════
_never_married_aliases = ("Pelli Kaledu", "Pelli Kaaledu", "Never Married", "Unmarried",
                          "first_marriage", "పెళ్లి కాలేదు", "పెళ్లికాలేదు")
check("A0 first-marriage status aliases normalize consistently",
      all(is_never_married_status(value) for value in _never_married_aliases)
      and not is_never_married_status("Divorced"))
for i, m in enumerate(["Widow", "Widower", "Divorced", "Awaiting Divorce", "Separated"]):
    r = reg(f"W Sixteen Bride {['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon'][i]}", "Bride",
            f"99510{i}000{i}", m, "None")
    check(f"A{i + 1} {m} registers 200", r.status_code == 200,
          (r.status_code, str(r.json())[:120]))
r = reg("W Sixteen Legacy", "Groom", "9951099990", "Vidakuulu")
check("A6 legacy Vidakuulu still ok", r.status_code == 200, r.status_code)
r = reg("W Sixteen Junk", "Bride", "9951099991", "Complicated")
check("A7 junk marital 400", r.status_code == 400, r.status_code)

# ═══════════════════════════════════════════════════════════════════════════
section("B. CHILDREN")
# ═══════════════════════════════════════════════════════════════════════════
r = reg("W Sixteen Div Mom", "Bride", "9951099992", "Divorced", "2")
DID = r.json().get("tsap_id", "")
check("B1 divorced+2 registers", r.status_code == 200 and DID, (r.status_code, DID))
du = next((u for u in main.DB_USERS if u.get("tsap_id") == DID), {})
check("B2 children stored 2", du.get("children") == "2", du.get("children"))
r = reg("W Sixteen Never", "Bride", "9951099993", "Pelli Kaledu", "3")
NID = r.json().get("tsap_id", "")
nu = next((u for u in main.DB_USERS if u.get("tsap_id") == NID), {})
check("B3 never-married ignores stale child count", not nu.get("children"), nu.get("children"))
r = reg("W Sixteen Kid Junk", "Bride", "9951099994", "Divorced", "ten")
check("B4 junk children 400", r.status_code == 400, r.status_code)
r = reg("W Sixteen No Children", "Groom", "9951099995", "Widower", "None")
WID = r.json().get("tsap_id", "")
w = next((u for u in main.DB_USERS if u.get("tsap_id") == WID), {})
check("B5 explicit no-children selection stored", w.get("children") == "None", w.get("children"))

# ═══════════════════════════════════════════════════════════════════════════
section("C–D. FILTER + FIELDS")
# ═══════════════════════════════════════════════════════════════════════════
for _u in main.DB_USERS:
    if _u.get("tsap_id") in (DID, NID, WID):
        _u["is_approved"] = True
# Simulate a pre-normalization record whose first-marriage row still has stale data.
nu["children"] = "2"
sr = client.get("/api/search?children=2&limit=100").json().get("results", [])
sr_ids = [x.get("tsap_id") for x in sr]
check("C1 children=2 filter hits divorced profile", DID in sr_ids, sr_ids[:6])
check("C2 active children filter excludes stale first-marriage count", NID not in sr_ids)
first_married_stale_filter = client.get("/api/search?marital_status=single&children=2&limit=100").json().get("results", [])
check("C3 stale child filter ignored for never-married alias",
      NID in [x.get("tsap_id") for x in first_married_stale_filter])
_alias_results = [client.get("/api/search", params={"marital_status": alias, "children": "2", "limit": 100})
                  for alias in ("Pelli Kaaledu", "Never Married", "Unmarried", "first_marriage", "పెళ్లి కాలేదు")]
check("C4 all never-married aliases ignore stale child filters",
      all(response.status_code == 200 and NID in [x.get("tsap_id") for x in response.json().get("results", [])]
          for response in _alias_results))
mixed_filter = client.get("/api/search", params={"marital_status": "single,Divorced", "children": "2", "limit": 100})
mixed_ids = [x.get("tsap_id") for x in mixed_filter.json().get("results", [])]
check("C5 mixed status + child filter matches only relevant child-count profiles",
      DID in mixed_ids and NID not in mixed_ids, mixed_ids)
admin_first = client.get(f"/api/admin/match-send/{WID}",
                         params={"marital": "Pelli Kaledu", "children": "2"}, headers=HDR_ADMIN)
admin_first_rows = admin_first.json().get("results", [])
admin_first_ids = [x.get("tsap_id") for x in admin_first_rows]
admin_first_n = next((x for x in admin_first_rows if x.get("tsap_id") == NID), {})
check("C6 admin never-married filter ignores stale child count and hides it",
      admin_first.status_code == 200 and NID in admin_first_ids and admin_first_n.get("children") == "",
      admin_first_rows)
admin_mixed = client.get(f"/api/admin/match-send/{WID}",
                         params={"marital": "Pelli Kaledu,Divorced", "children": "2"}, headers=HDR_ADMIN)
admin_mixed_ids = [x.get("tsap_id") for x in admin_mixed.json().get("results", [])]
check("C7 admin mixed filter excludes first-marriage stale child data",
      admin_mixed.status_code == 200 and DID in admin_mixed_ids and NID not in admin_mixed_ids,
      admin_mixed_ids)
public_matches = client.get(f"/api/top-matches/{WID}?limit=100&min_score=0").json()
public_match_n = next((x for x in public_matches.get("results", []) if x.get("tsap_id") == NID), {})
check("C8 top-match cards never expose a legacy first-marriage child count",
      bool(public_match_n) and public_match_n.get("children") == "", public_match_n)
with patch.object(main.CONTROL_AUTH, "require", return_value={"role": "owner"}):
    control_directory = main.control_directory(request=None, status="all", limit=100)
control_profile_n = next((x for x in control_directory.get("profiles", []) if x.get("tsap_id") == NID), {})
check("C9 owner directory hides stale first-marriage child counts",
      bool(control_profile_n) and control_profile_n.get("children") == "", control_profile_n)
admin_profiles = client.get("/api/admin/profiles?status=all&limit=100", headers=HDR_ADMIN).json()
admin_profile_n = next((x for x in admin_profiles.get("profiles", []) if x.get("tsap_id") == NID), {})
check("C10 staff profile queue does not expose child-count fields",
      admin_profiles.get("success") is True and bool(admin_profile_n) and "children" not in admin_profile_n,
      admin_profile_n)
su = safe_user(du)
check("D1 safe_user children+marital+physical",
      su.get("children") == "2" and su.get("marital_status") == "Divorced"
      and su.get("physical_status") == "Normal", {k: su.get(k) for k in ("children", "marital_status", "physical_status")})
check("D2 no phone leak via new fields", "phone" not in su or su.get("phone") in (None, ""), "phone" in su)
pf = client.get(f"/api/search/{DID}").json().get("profile", {})
check("D3 profile pub children", pf.get("children") == "2", pf.get("children"))
legacy_first_marriage = safe_user({"tsap_id": "LEGACY-FIRST", "marital_status": "unmarried", "children": "2"})
check("D4 public serializer hides stale first-marriage child count",
      legacy_first_marriage.get("children") == "")

# ═══════════════════════════════════════════════════════════════════════════
section("E–F. FRONTEND STATIC + HEIGHT MATH")
# ═══════════════════════════════════════════════════════════════════════════
reg_src = src_page("frontend/src/app/register/page.tsx")
check("E1 PillGroup atom", "function PillGroup" in reg_src)
check("E2 SelectField atom", "function SelectField" in reg_src)
check("E3 height dropdown ft/cm", "heightLabel(h)" in reg_src and "Select your height" in reg_src)
check("E4 gender-aware widow(er)", '"Widower" : "Widow"' in reg_src)
check("E5 conditional children", "!isNeverMarriedStatus(f.marital_status)" in reg_src)
check("E6 children validation", "Select the number of children" in reg_src
      and "!isNeverMarriedStatus(f.marital_status) && !f.children" in reg_src)
check("E7 religion dropdown", "Select religion" in reg_src and "<option" in reg_src)
check("E8 physical pills", "Physically challenged" in reg_src and "దివ్యాంగులు" in reg_src)
td = src_page("frontend/src/lib/telugu-data.ts")
check("E9 canonical statuses", '"Awaiting Divorce"' in td and '"Widower"' in td and "CHILDREN_OPTIONS" in td)
mp = src_page("frontend/src/app/matches/page.tsx")
check("E10 matches children filter+card", 'setF("children"' in mp
      and "hasChildrenRelevantMaritalFilter(filters.marital_status)" in mp
      and "👶 {children}" in mp)
pv = src_page("frontend/src/app/search/[id]/ProfileView.tsx")
check("E11 profile children row", "👶 Children" in pv and "👶 పిల్లలు" in pv
      and "!isNeverMarriedStatus(profile.marital_status)" in pv)
m = re.search(r"export function heightLabel\(h: string\): string \{(.*?)\n\}", td, re.S)
node_src = "function heightLabel(h){" + m.group(1).replace(": string", "") + "\n}" if m else ""
out = ""
if m:
    try:
        r = subprocess.run(["node", "-e", node_src + "\nconsole.log(heightLabel(\"5'6\\\"\"));console.log(heightLabel(\"4'8\\\"\"));"],
                           capture_output=True, text=True, timeout=15)
        out = (r.stdout or "").strip()
    except Exception as e:
        out = f"ERR {e}"
check("F1 5'6\" → 5 ft 6 in (168 cm)", "5 ft 6 in (168 cm)" in out, out)
check("F2 4'8\" → 4 ft 8 in (142 cm)", "4 ft 8 in (142 cm)" in out, out)

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
