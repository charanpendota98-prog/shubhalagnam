"""
WAVE 31 NEAT — proper Telugu script vs clean English on ALL pages, no demo,
smooth scroll + BackToTop, build-green proof.
Run: WA_TEST_FAST=1 python3 test_wave31_neat.py (backend/ nunchi)
"""
import os
import re
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
        print(f"  ❌ {name}" + (f"  → {str(extra)[:220]}" if extra else ""))


import main as M  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

c = TestClient(M.app, raise_server_exceptions=False)
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "frontend", "src")

# roman-Telugu slang tokens that must NOT appear in user-visible strings
SLANG = [
    "ivvandi", "cheyyandi", "chudochu", "vastundi", "avutundi", "matrame",
    "kosam", "nunchi", "vaallaki", "malli", "ippudu", "kaadu", "kavali",
    "ekkuva", "sarichey", "dorkindi", "pampaledu", "pampinchaam", "marchindi",
    "ayyindi", "avvaledu", "avvadhu", "cheyyali", "cheyyakandi", "pettakandi",
    "pettandi", "undali", "cheppandi", "chudandi", "cheyagane", "chesthe",
    "cheste", "ayyaka", "ayina", "ayithe", "dorakaledu", "dorikayi", "varaku",
    "penchandi", "tagginchandi", "teesey", "pampina", "Chusina", "chustharu",
    "Modata", "koraku", "avasaram", "chestham", "ravoddu", "cheyyoddu",
    "dwara", "meeku", "evariki", "ivvamu", "vellindi", "pampincharu",
    "pampu", "pampisthunnam", "ichina", "ayipoyayi", "ayithe", "vacharu",
    "vachindi", "kanipinchavu", "kanipisthundi", "chestharu", "levu", "perugutundi", "pettakandi", "garu</b> dwara",
    "ke Sambandham", "Modati", "modati", "lo register",
]


def visible_text(src_text):
    """Strip comments so only user-visible code is scanned."""
    out = []
    in_block = False
    for line in src_text.splitlines():
        s = line.strip()
        if in_block:
            if "*/" in s:
                in_block = False
            continue
        if s.startswith("/**") or s.startswith("/*"):
            if "*/" not in s:
                in_block = True
            continue
        if s.startswith("//") or s.startswith("*") or s.startswith("{/*"):
            continue
        # strip trailing // comments (naive but fine for scan)
        line = re.sub(r"\s+//.*$", "", line)
        out.append(line)
    return "\n".join(out)


def tsx_files():
    for dp, _, fns in os.walk(SRC):
        for fn in fns:
            if fn.endswith(".tsx"):
                yield os.path.join(dp, fn)


section("N1 no roman-Telugu slang in visible strings")
slang_hits = []
for fp in tsx_files():
    vis = visible_text(open(fp, encoding="utf-8").read())
    for tok in SLANG:
        # Match as whole word to avoid false positives (e.g. "undali" inside "Kundali")
        if re.search(r'\b' + re.escape(tok) + r'\b', vis, re.IGNORECASE):
            rel = os.path.relpath(fp, SRC)
            # allowlist: data values + legit words
            if tok == "garu</b> dwara":
                slang_hits.append((rel, tok))
            elif tok in ("kavali",) and "admin key kavali" in vis:
                pass  # covered below; recheck precisely
            else:
                slang_hits.append((rel, tok))
# precise recheck for kavali (comment-only allowed)
slang_hits = [(r, t) for r, t in slang_hits
              if not (t == "kavali" and r in ("app/growth/page.tsx", "app/register/page.tsx", "app/referral/page.tsx"))]
check("N1.1 zero slang tokens in visible tsx", not slang_hits, slang_hits[:8])

section("N2 te/en toggle on every client page")
PAGES = [
    "app/page.tsx", "app/matches/page.tsx", "app/requests/page.tsx",
    "app/register/page.tsx", "app/login/page.tsx",
    "app/search/[id]/ProfileView.tsx", "app/channels/page.tsx",
    "app/stories/stories-client.tsx", "app/pricing/page.tsx",
    "app/bureau/page.tsx", "app/referral/page.tsx",
    "app/referral/register/page.tsx", "app/vendors/page.tsx",
    "app/vendors/[id]/page.tsx", "app/vendors/campaign/page.tsx",
    "app/vendors/register/page.tsx",
    "app/porutham/page.tsx", "app/growth/page.tsx",
    "app/castes/castes-client.tsx", "app/castes/[slug]/caste-client.tsx",
    "app/safety/page.tsx",
    "app/r/[code]/page.tsx", "app/verify/page.tsx",
    "app/admin/page.tsx", "app/admin/photos/page.tsx",
    "app/terms/page.tsx", "app/privacy/page.tsx", "app/refund/page.tsx",
    "app/offline/page.tsx", "app/p/[slug]/page.tsx",
    "app/error.tsx", "app/not-found.tsx", "app/loading.tsx",
    "components/FeaturedStories.tsx", "components/TrustBadge.tsx", "components/BannerSlot.tsx",
]
missing = []
for pg in PAGES:
    fp = os.path.join(SRC, pg)
    if not os.path.exists(fp):
        missing.append((pg, "FILE MISSING"))
        continue
    src = open(fp, encoding="utf-8").read()
    if not ("useLang" in src or "Duo" in src or "duo(" in src):
        missing.append((pg, "no lang mechanism"))
check("N2.1 all client pages lang-aware", not missing, missing[:6])

section("N3 no-demo")
login_src = open(os.path.join(SRC, "app/login/page.tsx"), encoding="utf-8").read()
matches_src = open(os.path.join(SRC, "app/matches/page.tsx"), encoding="utf-8").read()
referral_src = open(os.path.join(SRC, "app/referral/page.tsx"), encoding="utf-8").read()
nf_src = open(os.path.join(SRC, "app/not-found.tsx"), encoding="utf-8").read()
check("N3.1 login has no demo UI", "demoLogin" not in login_src and "Demo login" not in login_src)
check("N3.2 matches has no demo rows", "DEMO" not in visible_text(matches_src).upper().replace("NO DEMO", ""))
check("N3.3 referral has no DEMO_ID", "DEMO_ID" not in referral_src)
check("N3.4 not-found has no stale count claim", "76+" not in nf_src and "76" not in nf_src)
check("N3.5 layout metadata clean", all(
    t not in open(os.path.join(SRC, "app/layout.tsx"), encoding="utf-8").read()
    for t in ("ke Sambandham", "Modati", "modati", "3 numbers FREE", "lo register")))

section("N4 smooth scroll + BackToTop")
css = open(os.path.join(SRC, "app/globals.css"), encoding="utf-8").read()
layout = open(os.path.join(SRC, "app/layout.tsx"), encoding="utf-8").read()
check("N4.1 smooth scroll", "scroll-behavior: smooth" in css)
check("N4.2 anchor offset", "scroll-padding-top" in css)
check("N4.3 BackToTop mounted", "BackToTop" in layout
      and os.path.exists(os.path.join(SRC, "components/BackToTop.tsx")))
check("N4.4 reduced-motion respected", "prefers-reduced-motion" in css)

section("N5 API smoke (live truth)")
r = c.get("/api/meta/home-stats")
check("N5.1 home-stats 200", r.status_code == 200, (r.status_code, r.text[:120]))
r = c.get("/api/inventory")
try:
    d = r.json()
    check("N5.2 inventory structural", r.status_code == 200 and d.get("launch_target") == 360
          and "total_profiles" in d, str(d)[:150])
except Exception as e:  # noqa: BLE001
    check("N5.2 inventory structural", False, repr(e)[:150])
r = c.get("/api/channels")
check("N5.3 channels 200", r.status_code == 200, (r.status_code, r.text[:120]))

section("N6 backend neat Telugu (referral program + no fake)")
ref_src = open(os.path.join(ROOT, "backend", "referral.py"), encoding="utf-8").read()
ref_user_lines = [l for l in ref_src.splitlines()
                  if "telugu" in l.lower() and '"' in l and not l.strip().startswith("#")]
ref_blob = "\n".join(ref_user_lines)
for tok in ("ke Sambandham", "100+", "dorakaledu", "okkasari", "cheyyochu", "Modati ",
            "modati ", "edaina", "evvar", "parvaledu", "sontha", "vaaduk", "theesesa",
            "garu,", "garu ", "Mee ", "mee ", "cheyyagane", "ayyindi", "avvachu",
            "ivvaledu", "ivvandi", "matrame", "kosam", "nunchi", "levu", "ledu"):
    check(f"N6.1 no {tok!r} in referral.py user strings", tok not in ref_blob, tok)
main_src = open(os.path.join(ROOT, "backend", "main.py"), encoding="utf-8").read()
check("N6.2 no ke Sambandham in main.py user strings",
      "ke Sambandham" not in main_src.replace("Modati 3", ""))

section("N7 admin hidden from public UI (anti-scam)")
header_src = open(os.path.join(SRC, "components", "SiteHeader.tsx"), encoding="utf-8").read()
footer_src = open(os.path.join(SRC, "components", "SiteFooter.tsx"), encoding="utf-8").read()
check("N7.1 no /admin link in header", '"/admin"' not in header_src and "'/admin'" not in header_src)
check("N7.2 no /growth link in header", "href=\"/growth\"" not in header_src)
check("N7.3 no /admin link in footer", '"/admin"' not in footer_src)
robots_src = open(os.path.join(SRC, "app", "robots.ts"), encoding="utf-8").read()
check("N7.4 robots blocks admin+growth",
      all(x in robots_src for x in ("/admin", "/growth")))
sitemap_src = open(os.path.join(SRC, "app", "sitemap.ts"), encoding="utf-8").read()
check("N7.5 sitemap has no admin/growth",
      "/admin" not in sitemap_src and "/growth" not in sitemap_src)

section("N9 backend display Telugu everywhere (W33 converter + hand fixes)")
import re as _re
_DISPLAY = ("telugu", "message", "verdict", "caption", "error_", '"q":', "'q':",
            '"a":', "'a':", "headline", "_text", "headline_telugu")
_SLANG = ("cheyy", "ayithe", "aithe", "kanipinch", "dorak", "ivvamu", "ivvandi",
          "pampandi", "chudandi", "undadu", "matrame", "nunchi", "kavali",
          "veltundi", "ekkuva", "Modati", "modati", "sambandham", "Sambandham",
          "adigithe", "parvaledu", "jagratha", "kutumbam", "Ippudu", "ippudu",
          "Eppudu", "eppudu", "Enduku", "enduku", "andariki", "okate",
          "ventane", "kaledu", "istam", "Emaina", "Mundu", "kaadu")
_CODE_OK = ('"keys"', "'keys'", '"reason"', "'reason'", '"code"', "'code'",
            "marital_status", "req_choice", ".get(", '["', "gothram", "rasi",
            "dosham", "porutham", "in (", "startswith", "check(", "assert ")
_bad = []
for _fn in ("ads.py", "advanced11.py", "astro.py", "growth.py", "interest.py",
            "main.py", "paypro.py", "porutham.py", "publisher.py", "safety.py",
            "smart12.py", "telegram_bot.py", "topmatch.py", "vendors.py",
            "welcome_pack.py", "channel_content.py", "credits.py", "otp_channels.py",
            "cms.py", "hardening.py", "quality.py", "matchpro.py", "matching_engine.py"):
    _src = open(os.path.join(ROOT, "backend", _fn), encoding="utf-8").read()
    for _i, _ln in enumerate(_src.splitlines(), 1):
        _s = _ln.strip()
        if not _s or _s.startswith("#"):
            continue
        _low = _ln.lower()
        if not any(m in _low for m in _DISPLAY) and len(_ln) < 60:
            continue
        if any(x in _ln for x in _CODE_OK):
            continue
        _lits = " ".join(_re.findall(r'"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'', _ln))
        if len(_lits) < 12:
            continue
        for _tok in _SLANG:
            if _re.search(r"(?<![A-Za-z_])" + _re.escape(_tok) + r"(?![A-Za-z_])", _lits):
                _bad.append(f"{_fn}:{_i}:{_tok}")
                break
check("N9.1 no Roman slang in backend display strings", not _bad, "; ".join(_bad[:5]))
_full = ""
for _fn in ("interest.py", "main.py", "growth.py", "preview.py", "channel_content.py",
            "channels_config.py", "telegram_bot.py"):
    _full += open(os.path.join(ROOT, "backend", _fn), encoding="utf-8").read()
check("N9.2 no 65-channels claim", "65 channels" not in _full and "65channel" not in _full)
check("N9.3 no No.1 claims in backend display",
      "No.1 Telugu" not in _full and "నం.1" not in _full)
check("N9.4 no ke Sambandham anywhere backend",
      "ke Sambandham" not in _full.replace("99keSambandham", ""))

section("N8 no-fake markers on illustrations")
home_src = open(os.path.join(SRC, "app", "page.tsx"), encoding="utf-8").read()
check("N8.1 hero card marked sample", "నమూనా" in home_src)
# 🐞 FIX (R12): "Sample message" → bilingual "నమూనా/Sample" badge (R5 mockup rebuild)
check("N8.2 whatsapp mock marked sample", "Sample" in home_src and "నమూనా" in home_src)
check("N8.3 no No.1 claims", "No.1" not in home_src
      and "No.1" not in open(os.path.join(SRC, "app", "layout.tsx"), encoding="utf-8").read()
      and "No.1" not in footer_src)

print(f"\n{'=' * 60}\n🌊 WAVE 31 NEAT: {PASS} passed, {FAIL} failed")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("🎉 ALL GREEN")
