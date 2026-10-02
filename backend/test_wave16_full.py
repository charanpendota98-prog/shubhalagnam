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


from fastapi.testclient import TestClient
import main
from interest import safe_user
from testutil_paths import src_page  # noqa: E402  # App Router page.tsx + page-client.tsx aware

client = TestClient(main.app, raise_server_exceptions=False)
client.post("/api/demo/seed")

BASE = {"height": "5'6\"", "education": "BTech", "job": "Software", "salary": "60k",
        "state": "TS", "district": "Hyderabad", "religion": "Hindu", "caste": "Reddy"}


def reg(name, gender, phone, marital, children=None, age="27"):
    d = dict(BASE, gender=gender, age=age, phone=phone, full_name=name,
             marital_status=marital)
    if children is not None:
        d["children"] = children
    return client.post("/api/register", data=d)


# ═══════════════════════════════════════════════════════════════════════════
section("A. MARITAL CANONICAL")
# ═══════════════════════════════════════════════════════════════════════════
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
check("B3 never-married forces None", nu.get("children") == "None", nu.get("children"))
r = reg("W Sixteen Kid Junk", "Bride", "9951099994", "Divorced", "ten")
check("B4 junk children 400", r.status_code == 400, r.status_code)
r = reg("W Sixteen Default Kid", "Groom", "9951099995", "Widower")
w = next((u for u in main.DB_USERS if u.get("tsap_id") == r.json().get("tsap_id", "")), {})
check("B5 children default None", w.get("children") == "None", w.get("children"))

# ═══════════════════════════════════════════════════════════════════════════
section("C–D. FILTER + FIELDS")
# ═══════════════════════════════════════════════════════════════════════════
for _u in main.DB_USERS:
    if _u.get("tsap_id") in (DID, NID):
        _u["is_approved"] = True
sr = client.get("/api/search?children=2&limit=100").json().get("results", [])
check("C1 children=2 filter hits divorcee", DID in [x.get("tsap_id") for x in sr],
      [x.get("tsap_id") for x in sr][:6])
check("C2 filter exact (never-married ledu)", NID not in [x.get("tsap_id") for x in sr])
su = safe_user(du)
check("D1 safe_user children+marital+physical",
      su.get("children") == "2" and su.get("marital_status") == "Divorced"
      and su.get("physical_status") == "Normal", {k: su.get(k) for k in ("children", "marital_status", "physical_status")})
check("D2 no phone leak via new fields", "phone" not in su or su.get("phone") in (None, ""), "phone" in su)
pf = client.get(f"/api/search/{DID}").json().get("profile", {})
check("D3 profile pub children", pf.get("children") == "2", pf.get("children"))

# ═══════════════════════════════════════════════════════════════════════════
section("E–F. FRONTEND STATIC + HEIGHT MATH")
# ═══════════════════════════════════════════════════════════════════════════
reg_src = src_page("frontend/src/app/register/page.tsx")
check("E1 PillGroup atom", "function PillGroup" in reg_src)
check("E2 SelectField atom", "function SelectField" in reg_src)
check("E3 height dropdown ft/cm", "heightLabel(h)" in reg_src and "Select your height" in reg_src)
check("E4 gender-aware widow(er)", '"Widower" : "Widow"' in reg_src)
check("E5 conditional children", 'f.marital_status !== "Pelli Kaledu"' in reg_src)
check("E6 children validation", "Number of children select చెయ్యండి" in reg_src)
check("E7 religion dropdown", "Select religion" in reg_src and "<option" in reg_src)
check("E8 physical pills", "Physically challenged" in reg_src and "దివ్యాంగులు" in reg_src)
td = src_page("frontend/src/lib/telugu-data.ts")
check("E9 canonical statuses", '"Awaiting Divorce"' in td and '"Widower"' in td and "CHILDREN_OPTIONS" in td)
mp = src_page("frontend/src/app/matches/page.tsx")
check("E10 matches children filter+card", 'setF("children"' in mp and "👶 {row.children}" in mp)
pv = src_page("frontend/src/app/search/[id]/ProfileView.tsx")
check("E11 profile children row", "Children • పిల్లలు" in pv)
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
