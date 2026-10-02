"""
🌊 WAVE 15 TEST SUITE — DUO BILINGUAL + CMS + CHANNEL MAPPER + SMART POSTER
=============================================================================
  A. CMS pure (pages/stories/banners CRUD + guards + seed)
  B. CMS API (public/admin + 403/404)
  C. chanmap pure (effective/links/import/coverage)
  D. chanmap API + public links
  E. smart poster API (gaps/pause/resume + bounds)
  F. Duo bilingual static (lib + CSS + page coverage)
  G. WIRING AUDIT (frontend /api calls ⊆ backend routes · links ⊆ pages)
  H. regression guards (old stories + wa status intact)

Run:  WA_TEST_FAST=1 python3 test_wave15_full.py   (backend/ nunchi)
"""
import os
import re
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
import hardening as H
import main
import cms as CMS
import chanmap as CHAN
from testutil_paths import src_page  # noqa: E402  # App Router page.tsx + page-client.tsx aware

client = TestClient(main.app, raise_server_exceptions=False)
HDR_ADMIN = {"X-Admin-Key": H.ADMIN_KEY}

CMS.PAGES.clear(); CMS.STORIES.clear(); CMS.BANNERS.clear()
try:
    os.remove(CMS.PERSIST_FILE)
except OSError:
    pass

# ═══════════════════════════════════════════════════════════════════════════
section("A. CMS PURE")
# ═══════════════════════════════════════════════════════════════════════════
r = CMS.upsert_page("about-test", "About EN", "గురించి", "Body EN", "బాడీ TE",
                    photos=["/x.jpg", "bad", "https://a/b.png"], tags="Info, TRUST, info")
check("A1 page create + photo/tag clean", r["success"] and r["page"]["photos"] == ["/x.jpg", "https://a/b.png"]
      and r["page"]["tags"] == ["info", "trust"], r.get("page"))
r = CMS.upsert_page("Bad Slug!", "T", "")
check("A2 bad slug reject", r["success"] is False, r)
r = CMS.upsert_page("about-test", "About EN2", "", published=False)
check("A3 same slug update + unpublish", r["success"] and CMS.get_page("about-test")["title_en"] == "About EN2"
      and CMS.list_pages(True) == [], r)
s = CMS.upsert_story("", "GroomA", "BrideB", "/couple.jpg", "EN story", "TE story", "Hyd", "2026-01-01",
                     tags=["hyd"])
check("A4 story create ST-id", s["success"] and s["story"]["id"].startswith("ST-"), s)
s2 = CMS.upsert_story("", "", "BrideB")
check("A5 story names required", s2["success"] is False, s2)
check("A6 stories tag filter", len(CMS.list_stories("hyd")) == 1 and CMS.list_stories("zzz") == [])
b = CMS.upsert_banner("", "Offer EN", "ఆఫర్", "/pricing", ["home", "pricing"])
check("A7 banner create BN-id", b["success"] and b["banner"]["id"].startswith("BN-"), b)
check("A8 banners page filter", len(CMS.list_banners("home")) == 1 and CMS.list_banners("matches") == [])
d = CMS.delete_item("page", "about-test")
check("A9 delete page", d["success"] and CMS.get_page("about-test") is None, d)
d = CMS.delete_item("page", "nope")
check("A10 delete missing fail", d["success"] is False, d)
sd = CMS.seed_cms()
check("A11 seed pages+stories", sd["success"] and CMS.get_page("about-us") is not None
      and len(CMS.STORIES) >= 1, sd)
check("A12 tags + stats", "info" in CMS.all_tags() and CMS.cms_stats()["pages"] >= 2, CMS.cms_stats())

# ═══════════════════════════════════════════════════════════════════════════
section("B. CMS API")
# ═══════════════════════════════════════════════════════════════════════════
p = client.get("/api/cms/pages").json()
check("B1 public pages (published only)", p["success"] and all(x["published"] for x in p["pages"]), p)
p404 = client.get("/api/cms/pages/no-such-page")
check("B2 missing page 404", p404.status_code == 404, p404.status_code)
st_api = client.get("/api/cms/stories?tag=hyd").json()
check("B3 public stories tag", st_api["success"] and len(st_api["stories"]) >= 1, st_api)
bn_api = client.get("/api/cms/banners?page=pricing").json()
check("B4 public banners", bn_api["success"] and len(bn_api["banners"]) >= 1, bn_api)
tg_api = client.get("/api/cms/tags").json()
check("B5 public tags", tg_api["success"] and "hyd" in tg_api["tags"], tg_api)
cp = client.post("/api/admin/cms/pages", json={"slug": "w15-test", "title_en": "W15", "title_te": "టెస్ట్",
                                               "body_te": "ok"}, headers=HDR_ADMIN).json()
check("B6 admin page create", cp["success"] and cp["page"]["slug"] == "w15-test", cp)
cp2 = client.post("/api/admin/cms/pages", json={"slug": "bad slug", "title_en": "x"}, headers=HDR_ADMIN)
check("B7 admin bad slug 400", cp2.status_code == 400, cp2.status_code)
cs = client.post("/api/admin/cms/stories", json={"groom": "A", "bride": "B"}, headers=HDR_ADMIN).json()
check("B8 admin story create", cs["success"], cs)
cb = client.post("/api/admin/cms/banners", json={"text_en": "Hi", "pages": ["home"]}, headers=HDR_ADMIN).json()
check("B9 admin banner create", cb["success"], cb)
cd = client.post("/api/admin/cms/delete", json={"kind": "page", "id": "w15-test"}, headers=HDR_ADMIN).json()
check("B10 admin delete", cd["success"], cd)
_saved = os.environ.pop("WA_TEST_FAST", None)
na = client.get("/api/admin/cms")
check("B11 no key 403", na.status_code == 403, na.status_code)
if _saved is not None:
    os.environ["WA_TEST_FAST"] = _saved
full = client.get("/api/admin/cms", headers=HDR_ADMIN).json()
check("B12 admin full dump + stats", full["success"] and full["stats"]["stories"] >= 2, full.get("stats"))

# ═══════════════════════════════════════════════════════════════════════════
section("C. CHANMAP PURE")
# ═══════════════════════════════════════════════════════════════════════════
eff = CHAN.effective()
check("C1 effective 52", len(eff) == 52, len(eff))
check("C2 default t.me guess", next(e for e in eff if e["key"] == "ts_bride")["telegram"] == "https://t.me/TSBRIDE")
sl = CHAN.set_link("ts_bride", "https://t.me/TSBRIDE", "https://whatsapp.com/channel/xyz123", True, "owner gave")
check("C3 set_link ok", sl["success"] and CHAN.public_links()["ts_bride"]["whatsapp"].endswith("xyz123"), sl)
sl = CHAN.set_link("ts_bride", "not-a-url")
check("C4 bad URL reject", sl["success"] is False, sl)
sl = CHAN.set_link("nope_key", "https://t.me/x")
check("C5 bad key reject", sl["success"] is False, sl)
imp = CHAN.import_bulk("TS Brides | https://t.me/TSBRIDE | https://whatsapp.com/channel/aaa\n"
                       "ZZZ Unknown 12345 | https://t.me/zzzunknown", auto_apply=False)
check("C6 import 1 match + 1 manual",
      imp["success"] and len(imp["matched"]) == 1 and imp["matched"][0]["key"] == "ts_bride"
      and len(imp["unmatched"]) == 1, imp)
imp2 = CHAN.import_bulk("Reddy Brides | https://t.me/credbride", auto_apply=True)
check("C7 import auto-apply saves",
      imp2["success"] and imp2["applied"] == ["c_reddy_bride"]
      and CHAN.public_links()["c_reddy_bride"]["telegram"] == "https://t.me/credbride", imp2)
imp3 = CHAN.import_bulk("")
check("C8 empty import fail", imp3["success"] is False, imp3)
cov = CHAN.coverage()
check("C9 coverage shape", cov["success"] and cov["total"] == 52 and "L3_CASTE" in cov["by_tier"]
      and isinstance(cov["critical_gaps"], list), cov)

# ═══════════════════════════════════════════════════════════════════════════
section("D. CHANMAP API")
# ═══════════════════════════════════════════════════════════════════════════
mp = client.get("/api/admin/channels/map?q=ts_bride", headers=HDR_ADMIN).json()
check("D1 map search", mp["success"] and mp["count"] >= 1 and mp["channels"][0]["key"] == "ts_bride", mp)
lk = client.post("/api/admin/channels/link", json={"key": "ap_bride", "telegram": "https://t.me/APBRIDE",
                                                   "whatsapp": "https://whatsapp.com/channel/bbb"},
                 headers=HDR_ADMIN).json()
check("D2 link save API", lk["success"], lk)
pub = client.get("/api/channels/join").json()
check("D3 public links has mapped", pub["success"] and "ap_bride" in pub["links"], list(pub["links"])[:5])
im = client.post("/api/admin/channels/import", json={"text": "AP Grooms | https://t.me/APGROOM",
                                                     "auto_apply": True}, headers=HDR_ADMIN).json()
check("D4 import API apply", im["success"] and im["applied"] == ["ap_groom"], im)
cv = client.get("/api/admin/channels/coverage", headers=HDR_ADMIN).json()
check("D5 coverage API", cv["success"] and cv["total"] == 52, cv)
_saved = os.environ.pop("WA_TEST_FAST", None)
na = client.post("/api/admin/channels/link", json={"key": "x"})
check("D6 no key 403", na.status_code == 403, na.status_code)
if _saved is not None:
    os.environ["WA_TEST_FAST"] = _saved

# ═══════════════════════════════════════════════════════════════════════════
section("E. SMART POSTER API")
# ═══════════════════════════════════════════════════════════════════════════
ps = client.get("/api/admin/poster", headers=HDR_ADMIN).json()
check("E1 poster status + gaps", ps["success"] and "min_gap" in ps.get("gaps", {})
      and "paused" in ps, ps.get("gaps"))
gp = client.post("/api/admin/poster/gaps", json={"min_gap": 90, "max_gap": 200}, headers=HDR_ADMIN).json()
check("E2 gaps set", gp["success"] and gp["gaps"] == {"min_gap": 90, "max_gap": 200}, gp)
gp = client.post("/api/admin/poster/gaps", json={"min_gap": 1, "max_gap": 99999}, headers=HDR_ADMIN).json()
check("E3 gaps clamped safe", gp["success"] and gp["gaps"]["min_gap"] == 30 and gp["gaps"]["max_gap"] == 1800, gp)
gp = client.post("/api/admin/poster/gaps", json={"min_gap": "abc"}, headers=HDR_ADMIN)
check("E4 gaps junk 400", gp.status_code == 400, gp.status_code)
client.post("/api/admin/poster/gaps", json={"min_gap": 120, "max_gap": 170}, headers=HDR_ADMIN)
pp = client.post("/api/wa/pause?reason=w15test", headers=HDR_ADMIN).json()
check("E5 pause ok", pp.get("ok"), pp)
ps2 = client.get("/api/admin/poster", headers=HDR_ADMIN).json()
check("E6 paused reflected", ps2.get("paused") is True, ps2.get("paused"))
client.post("/api/wa/resume", headers=HDR_ADMIN)

# ═══════════════════════════════════════════════════════════════════════════
section("F. DUO BILINGUAL STATIC")
# ═══════════════════════════════════════════════════════════════════════════
duo_p = os.path.join(ROOT, "frontend", "src", "lib", "duo.ts")
check("F1 duo.ts exists", os.path.exists(duo_p))
css = src_page("frontend/src/app/globals.css")
check("F2 .duo-te CSS", ".duo-te" in css)
n_duo = 0
for root, _, files in os.walk(os.path.join(ROOT, "frontend", "src")):
    for f in files:
        if f.endswith((".tsx", ".ts")) and f != "duo.ts":
            t = open(os.path.join(root, f), encoding="utf-8").read()
            if "from \"@/lib/duo\"" in t or "from '@/lib/duo'" in t:
                n_duo += 1
check("F3 duo used in 15+ files", n_duo >= 15, n_duo)
# ═══════════════════════════════════════════════════════════════════════════
section("G. WIRING AUDIT (deep check — permanent)")
# ═══════════════════════════════════════════════════════════════════════════
broutes = set()
for _f in os.listdir(os.path.dirname(os.path.abspath(__file__))):
    if _f.endswith(".py"):
        _t = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), _f), encoding="utf-8").read()
        for _m in re.finditer(r'@app\.(get|post|put|delete|patch)\("([^"]+)"', _t):
            broutes.add(_m.group(2))


def _rok(path):
    for _r in broutes:
        _rx = "^" + re.sub(r"\{[^}]+\}", "[^/]+", _r) + "$"
        if re.match(_rx, path):
            return True
        if _r.startswith(path + "/"):
            return True
    return False


_fecalls = {}
for _root, _, _files in os.walk(os.path.join(ROOT, "frontend", "src")):
    for _f in _files:
        if _f.endswith((".tsx", ".ts")):
            _p = os.path.join(_root, _f)
            _t = open(_p, encoding="utf-8").read()
            for _m in re.finditer(r'["\'`](\/api\/[^"\'`\s$?]*)', _t):
                _u = _m.group(1).rstrip("/") or "/"
                _fecalls.setdefault(_u, []).append(os.path.relpath(_p, ROOT))
_missing = sorted([_u for _u in _fecalls if not _rok(_u)])
check("G1 every frontend /api call has backend route", not _missing, _missing[:5])
_pages = set()
for _root, _, _files in os.walk(os.path.join(ROOT, "frontend", "src", "app")):
    if "page.tsx" in _files:
        _d = os.path.relpath(_root, os.path.join(ROOT, "frontend", "src", "app"))
        _r = "/" + _d if _d != "." else "/"
        _r = re.sub(r"\[[^\]]+\]", "*", _r)
        _pages.add(_r)
_links = {}
for _root, _, _files in os.walk(os.path.join(ROOT, "frontend", "src")):
    for _f in _files:
        if _f.endswith((".tsx", ".ts")):
            _p = os.path.join(_root, _f)
            _t = open(_p, encoding="utf-8").read()
            for _m in re.finditer(r'(?:href|push|replace|pathname|redirect\()=?"(\/(?!api\/)[A-Za-z0-9_\-\/\[\]]*)"', _t):
                _u = _m.group(1).split("#")[0].split("?")[0]
                if _u and "." not in _u.split("/")[-1]:
                    _links.setdefault(_u, []).append(os.path.relpath(_p, ROOT))


def _pok(u):
    if u in _pages:
        return True
    for _pg in _pages:
        if "*" in _pg and re.match("^" + _pg.replace("*", "[^/]+") + "$", u):
            return True
    return False


_bad = sorted([_u for _u in _links if not _pok(_u)])
check("G2 every internal link has a page", not _bad, _bad[:5])
check("G3 /p/[slug] route exists", "/p/*" in _pages, sorted(_pages)[:8])

# ═══════════════════════════════════════════════════════════════════════════
section("H. REGRESSION GUARDS")
# ═══════════════════════════════════════════════════════════════════════════
old_st = client.get("/api/stories?limit=5").json()
check("H1 old community stories intact", "stories" in old_st, list(old_st.keys())[:5])
wa = client.get("/api/wa/status").json()
check("H2 wa status intact", wa.get("ok") is True, list(wa.keys())[:6])
kit = client.get("/api/channels/ts_bride/kit").json()
check("H3 channel kit intact", "link" in str(kit) or "name" in str(kit), str(kit)[:120])

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
