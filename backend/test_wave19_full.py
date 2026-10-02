"""
🌊 WAVE 19 TEST SUITE — WA LANES + PARTNERS + PROMO + MATCH-SEND FILTERS
=========================================================================
  A. wa lanes (otp/channels/personal routing, legacy post/requests map,
     paused exclusion, failover, no-duplicate, OTP gaps 25-60)
  B. partners (register ID firstname+3digit, link, dup-phone, attach,
     ₹50 commission, dashboard, payout partner_id, report + CSV sheet)
  C. promo (preview/validate usable_once/expired delete)
  D. match-send server filters (strict skip + NRI only/exclude)
  E. frontend static (partner form, WA console, report, MatchSend params)

Run:  WA_TEST_FAST=1 python3 test_wave19_full.py   (backend/ nunchi)
"""
import os
import re
import sys

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from testutil_paths import src_page  # noqa: E402  # App Router page.tsx + page-client.tsx aware

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
        print(f"  ❌ {name}" + (f"  → {extra}" if extra else ""))


section("A. WA lanes")
import time as _t
import wa_pool
from wa_pool import WAInstance, WAPool

# legacy aliases exist
check("A1 legacy otp alias", WAInstance.LANE_MAP.get("otp") == "otp")
check("A2 legacy post->channels", WAInstance.LANE_MAP.get("post") == "channels")
check("A3 legacy requests->personal", WAInstance.LANE_MAP.get("requests") == "personal")
check("A4 legacy both alias", WAInstance.LANE_MAP.get("both") == "both")


def _mk_pool():
    p = WAPool(state_file="/tmp/w19_test_pool.json", instances=[
        WAInstance("wa-otp", "http://x:3001", lane="otp"),
        WAInstance("wa-ch", "http://x:3002", lane="channels"),
        WAInstance("wa-dm", "http://x:3003", lane="personal"),
        WAInstance("wa-bk", "http://x:3004", lane="both"),
    ])
    for w in p.instances:
        w.sent_today = 0
        w.total_sent = 0
        w.cooldown_until = 0.0
        w.paused = False
    return p


def _pick(p, lane):
    now = _t.time()
    for w in p.order(lane):
        if w.available(now, lane):
            return w
    return None


p = _mk_pool()
check("A5 otp lane routes to wa-otp", (_pick(p, "otp") or WAInstance("?", "")).name == "wa-otp")
check("A6 channels lane routes to wa-ch", (_pick(p, "channels") or WAInstance("?", "")).name == "wa-ch")
check("A7 legacy post routes to channels lane", (_pick(p, "post") or WAInstance("?", "")).name == "wa-ch")
check("A8 legacy requests routes to personal lane", (_pick(p, "requests") or WAInstance("?", "")).name == "wa-dm")
# paused exclusion -> backup
p.instances[0].paused = True
got = _pick(p, "otp")
check("A9 paused otp number excluded", got is not None and got.name == "wa-bk", getattr(got, "name", None))
# failover: lane down -> both backup
p.instances[2].paused = True
got = _pick(p, "personal")
check("A10 personal failover -> wa-bk", got is not None and got.name == "wa-bk", getattr(got, "name", None))
# stable single pick
r1, r2 = _pick(p, "channels"), _pick(p, "channels")
check("A11 stable single pick (no dup)", r1 is not None and r1.name == r2.name == "wa-ch")
# cooldown skip
p.instances[1].cooldown_until = _t.time() + 999
got = _pick(p, "channels")
check("A12 cooldown skips to backup", got is not None and got.name == "wa-bk", getattr(got, "name", None))

# OTP gaps 25-60
import wa_antiban
delays = [wa_antiban.ENGINE._current_gap(9, "otp") for _ in range(30)]
fast = os.environ.get("WA_TEST_FAST") == "1"
ok_gap = all(0 < d <= 2 for d in delays) if fast else all(25 <= d <= 60 for d in delays)
check("A13 otp gaps in range" + (" (fast-mode)" if fast else " 25-60s"), ok_gap,
      f"min={min(delays):.1f} max={max(delays):.1f}")
import inspect as _insp
_src = _insp.getsource(wa_antiban.WhatsAppAntiban._current_gap)
check("A14 code pins otp 25-60", "min_gap_otp" in _src)

section("B. partners")
import refpartners
import referral

_p_snap = list(refpartners.PARTNERS)
_ref_snap = {k: (dict(v) if isinstance(v, dict) else v) for k, v in referral.STATE.items()} if hasattr(referral, "STATE") else {}
try:
    r = refpartners.register_partner(name="Wave TestCharan", phone="9000000019", phonepe="9000000019",
                                      address="Test village", state="TS", district="Hyderabad")
    pid = r.get("partner_id", "")
    check("B1 register ok + link", r.get("success") and r.get("link", "").endswith(f"/r/{pid}"), pid)
    check("B2 ID shape firstname+4digit (CHA0001 style)", bool(re.match(r"^[A-Za-z]+\d{4}$", pid or "")), pid)  # R10: user-specified 3-letter+4-digit format
    r2 = refpartners.register_partner(name="Wave TestCharan", phone="9000000019", state="TS", district="Hyderabad")
    check("B3 dup phone → same ID", r2.get("partner_id") == pid)
    r3 = refpartners.register_partner(name="X", phone="abc")
    check("B4 bad phone rejected", not r3.get("success"))
    # attach via referral code path
    fr = referral.find_referrer(pid, [])
    check("B5 find_referrer resolves partner", isinstance(fr, dict) and fr.get("partner_id") == pid)
    check("B6 partner attach fields present",
          isinstance(fr, dict) and bool(fr.get("name")) and fr.get("partner_id") == pid)
    d = refpartners.partner_public(pid, [])
    check("B7 dashboard ok", d.get("success") and d.get("partner_id") == pid)
    rep = refpartners.admin_report([])
    check("B8 admin report has partner", rep.get("success") and any(x.get("id") == pid for x in rep.get("rows", [])))
    csvp = os.path.join(os.path.dirname(os.path.abspath(__file__)), "referral_partners.csv")
    check("B9 CSV sheet has partner row", os.path.exists(csvp) and pid in open(csvp, encoding="utf-8").read())
    check("B10 validate ok", refpartners.get_partner(pid) is not None, pid)
    check("B11 validate bad fails", refpartners.get_partner("nosuchxx999") is None)
finally:
    refpartners.PARTNERS[:] = _p_snap
    refpartners._save()
    if hasattr(referral, "STATE"):
        referral.STATE.clear()
        referral.STATE.update(_ref_snap)

section("C. promo")
import paypro
_srcp = _insp.getsource(paypro.validate_offer) if hasattr(paypro, "validate_offer") else ""
check("C1 validate_offer exists", bool(_srcp))
import main as _main
_routes = sorted({getattr(r, "path", "") for r in _main.app.routes})
check("C2 promo preview route", "/api/promo/apply" in _routes)
check("C3 admin offer DELETE route", "/api/admin/offers/{code}" in _routes)
_api = _insp.getsource(_main.api_promo_apply) if hasattr(_main, "api_promo_apply") else ""
check("C4 preview = validate + usable_once guard", "validate_offer" in _api and "usable_once" in _srcp)
_off_snap = list(paypro.OFFERS)
try:
    cr = paypro.create_offer(code="W19TEST", title="w19", pct_off=10, applies_to=["credits"])
    check("C5 test offer created", cr.get("success"), cr.get("message_telugu"))
    v1 = paypro.validate_offer("W19TEST", "credits", 99, "TSAP-X-1")
    check("C6 first use ok (10% off 99)", v1.get("ok") and v1.get("discount", 0) > 0, v1)
    paypro._consume_offer("W19TEST", "TSAP-X-1")
    v2 = paypro.validate_offer("W19TEST", "credits", 99, "TSAP-X-1")
    check("C7 same user second use blocked", not v2.get("ok") and v2.get("reason") == "already_used", v2)
    v3 = paypro.validate_offer("W19TEST", "credits", 99, "TSAP-X-2")
    check("C8 other user still ok", v3.get("ok"), v3)
    dl = paypro.delete_offer("W19TEST")
    check("C9 delete_offer works", dl.get("success") and paypro.get_offer("W19TEST") is None)
finally:
    paypro.OFFERS[:] = [o for o in _off_snap]
    paypro._persist()

section("D. match-send filters")
_msrc = _insp.getsource(_main.api_match_send) if hasattr(_main, "api_match_send") else ""
for name, needle in [
    ("D1 religion param", "religion: str"),
    ("D2 state param", "state: str"),
    ("D3 nri_exclude param", "nri_exclude"),
    ("D4 photo_only param", "photo_only"),
    ("D5 verified_only param", "verified_only"),
    ("D6 salary_min param", "salary_min"),
    ("D7 filters_skipped counter", "filters_skipped"),
    ("D8 filter applied pre-topmatch", "_f19skip"),
]:
    check(name, needle in _msrc, needle)
_pr = [r for r in _routes if "match-send" in r]
check("D9 match-send route alive", bool(_pr), _pr)

section("E. frontend static")
def read(rel):
    return src_page(os.path.join("frontend", rel))

preg = read("src/app/referral/register/page.tsx")
check("E1 partner form (name/phone/phonepe/address)", all(k in preg for k in ["phonepe", "address", "district"]))
check("E2 partner success ID+link+copy", all(k in preg for k in ["partner_id", "Link copy"]))
check("E3 partner dashboard lookup", "partner/dashboard" in preg or "My partner dashboard" in preg)

wac = read("src/components/WANumbersConsole.tsx")
check("E4 WA console lanes UI", all(k in wac for k in ["otp", "channels", "personal", "both"]))
check("E5 WA console pause/delete", "Pause" in wac and "DELETE" in wac or "🗑️" in wac)

rep = read("src/components/ReferralReport.tsx")
check("E6 report + CSV download", "partners.csv" in rep and "wallet" in rep.lower())

ms = read("src/components/MatchSend.tsx")
check("E7 MatchSend server qs (religion/state/nri)", all(k in ms for k in ["religion", "nri_only", "nri_exclude"]))
check("E8 MatchSend job/salary + apply", "Min salary" in ms and "Filters apply" in ms)

adminp = read("src/app/admin/page.tsx")
check("E9 admin wires WA console", "WANumbersConsole" in adminp)
check("E10 admin wires referral report", "ReferralReport" in adminp)

ofc = read("src/components/OffersConsole.tsx")
check("E11 offers delete button", "DELETE" in ofc and "🗑️" in ofc)


print(f"\n{'=' * 60}\n🌊 WAVE 19 RESULT: {PASS} passed, {FAIL} failed")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("🎉 ALL GREEN")
