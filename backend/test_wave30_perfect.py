"""
WAVE 30 PERFECT — live home numbers (no dummy) + Telugu/English toggle + copy-truth sweeps.
Run: WA_TEST_FAST=1 python3 test_wave30_perfect.py (backend/ nunchi)
"""
import os
import re
import subprocess
import sys

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

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
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

try:
    section("P1 /api/meta/home-stats = single live truth")
    r = c.get("/api/meta/home-stats")
    check("P1.1 200 + success", r.status_code == 200 and r.json().get("success"),
          (r.status_code, r.text[:150]))
    d = r.json()
    check("P1.2 channels 52/live 2 or 52", d.get("channels_total") == 52 and d.get("channels_live") in (2, 52),
          (d.get("channels_total"), d.get("channels_live")))
    check("P1.3 tiers sum to total", sum((d.get("channels_by_tier") or {}).values()) == 52,
          d.get("channels_by_tier"))
    mc = c.get("/api/meta/castes?religion=Hindu").json()
    check("P1.4 castes match meta", d.get("castes_covered") == len(mc.get("castes", [])),
          (d.get("castes_covered"), len(mc.get("castes", []))))
    plans = {p["code"]: (p["price"], p["profiles"]) for p in d.get("plans", [])}
    check("P1.5 plan truth", plans.get("S_99") == (99, 5) and plans.get("S_199") == (199, 12)
          and plans.get("S_299") == (299, 25) and plans.get("S_499") == (499, 50), plans)
    pl = c.get("/api/plans").json()
    lp = {p["code"]: (p["price"], p["profiles"]) for p in pl.get("plans", [])}
    check("P1.6 matches /api/plans", all(plans.get(k) == v for k, v in lp.items()
          if k in plans), (plans, lp))
    check("P1.7 referral flat-50", d.get("referral", {}).get("per_pay") == 50,
          d.get("referral"))
    ms = d.get("referral", {}).get("milestones", [])
    check("P1.8 milestones are badges (no +₹500)", any(m.get("paid") == 25 for m in ms)
          and "500" not in str(ms), ms)
    b0 = (d.get("bureau") or [{}])[0]
    check("P1.9 bureau starter 999/25", b0.get("price") == 999 and b0.get("profiles") == 25, b0)
    check("P1.10 renewal 99/8", (d.get("renewal") or {}).get("profiles") == 8, d.get("renewal"))

    section("P2 frontend: no stale/dummy content")
    src = os.path.join(ROOT, "frontend", "src")

    def grep_count(pat):
        out = subprocess.run(["grep", "-rn", pat, src], capture_output=True, text=True).stdout
        return [l for l in out.splitlines() if "test_" not in l]

    bad_prices = grep_count("₹99→3\\|₹199→10\\|₹299→20\\|199--10\\|299--20\\|Region + Region")
    check("P2.1 no stale prices/dupes", not bad_prices, bad_prices[:3])
    plus500 = [l for l in grep_count("+₹500") if "site-config" not in l and "referral" not in l.lower()]
    check("P2.2 no +₹500 milestone money on home", not [l for l in plus500 if "app/page" in l],
          plus500[:3])
    demo = grep_count("Demo testimonial")
    check("P2.3 no demo testimonials", not demo, demo[:3])
    amma = grep_count("amma channels")
    check("P2.4 no 'amma channels'", not amma, amma[:2])
    home_src = open(os.path.join(src, "app", "page.tsx"), encoding="utf-8").read()
    check("P2.5 home fetches home-stats", "/api/meta/home-stats" in home_src)
    check("P2.6 home uses lang", "useLang" in home_src and "TEXT[lang" in home_src)

    section("P3 Telugu/English toggle system")
    lang_src = open(os.path.join(src, "lib", "lang.tsx"), encoding="utf-8").read()
    check("P3.1 LangProvider + toggle + persist", "LangProvider" in lang_src
          and "LangToggle" in lang_src and "tsap_lang" in lang_src)
    duo_src = open(os.path.join(src, "lib", "duo.ts"), encoding="utf-8").read()
    check("P3.2 duo toggle-aware (no concat)", "getLang()" in duo_src and "• ${te}" not in duo_src,
          duo_src[:200])
    header_src = open(os.path.join(src, "components", "SiteHeader.tsx"), encoding="utf-8").read()
    check("P3.3 header has toggle", "LangToggle" in header_src)
    layout_src = open(os.path.join(src, "app", "layout.tsx"), encoding="utf-8").read()
    check("P3.4 provider in layout", "LangProvider" in layout_src)
    # home TEXT dict: te/en key parity (function-name scan)
    # 🐞 FIX (R12): TEXT dict tarvata helper functions (StatValue — R11) vachay kabatti
    # "};\n\nexport default" split marker fail — column-0 "};" tho split (robust)
    te_keys = set(re.findall(r"    (\w+):", home_src.split("  en: {")[0].split("const TEXT = {")[1]))
    _en_block = home_src.split("  en: {")[1]
    en_keys = set(re.findall(r"    (\w+):", re.split(r"\n\};", _en_block)[0]))
    check("P3.5 home te/en key parity", te_keys == en_keys,
          (te_keys ^ en_keys) if te_keys != en_keys else f"{len(te_keys)} keys")
    for pg in ("pricing/page.tsx", "login/page.tsx", "register/page.tsx"):
        psrc = open(os.path.join(src, "app", pg), encoding="utf-8").read()
        check(f"P3.6 {pg} lang-aware", "useLang" in psrc, pg)
finally:
    pass

print(f"\n{'=' * 60}\n🌊 WAVE 30 PERFECT: {PASS} passed, {FAIL} failed")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("🎉 ALL GREEN")
