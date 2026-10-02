"""
🏪 VENDOR ADS TEST SUITE — "pelli sambandham related vaallaki promotions"
=========================================================================
Run: /tmp/venv/bin/python test_vendors_ads.py    (backend/ cwd)

Cover:
  1. Categories (18, Telugu names, pelli-related) + lookup
  2. Packages (₹149 → ₹3999 ladder, days, perks, popular flag)
  3. Register (validation, duplicate, ID gen, UPI/PhonePe link, steps)
  4. Activate / reject / expire (+ verified badge from package)
  5. Directory (category / district / city / search / paid-first order / counts)
  6. Ad rotation (slots, weights, impression tracking, house note)
  7. Leads (validation, vendor WhatsApp text, lead count, more options)
  8. Promo content (3 TG variants + WA messages, no leftover placeholders)
  9. Poster PNG (square 1080×1080 / status 1080×1920, ASCII-safe)
 10. Vendor dashboard (stats, CTR, days left, renewals) + revenue summary
 11. API endpoints (TestClient) incl. admin guard + 404s
 12. Frontend wiring (/vendors, /vendors/register, /vendors/[id], home strip, admin tab)
"""
import os
import shutil
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from testutil_paths import src_page  # noqa: E402  # App Router page.tsx + page-client.tsx aware

import vendors as V  # noqa: E402

PASS, FAIL = [], []


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name + (("  | " + str(extra)) if extra and not cond else ""))


V.VENDORS.clear()
V.LEADS.clear()

print("=== 1. CATEGORIES ===")
check("18 vendor categories", len(V.CATEGORIES) == 18, len(V.CATEGORIES))
keys = {c["key"] for c in V.CATEGORIES}
for need in ("catering", "photography", "decorations", "banquet_hall", "tent_house", "pandit",
             "jewellery", "bridal_wear", "makeup", "mehendi", "music_dj", "invitations",
             "cars_travel", "wedding_planner", "bakery_cake", "gifts_hampers", "honeymoon_travel", "videography"):
    check("category present: %s" % need, need in keys)
check("Anni categories ki Telugu name + icon",
      all(c.get("te") and c.get("icon") and c.get("en") for c in V.CATEGORIES))
check("Category keywords (search ki)", all(c.get("kw") for c in V.CATEGORIES))
check("category_label() lookup", V.category_label("catering")["en"] == "Catering"
      and V.category_label("unknown_thing")["icon"] == "🏪")

print("=== 2. PACKAGES ===")
codes = [p["code"] for p in V.PACKAGES]
check("Package ladder ₹149 → ₹3999 (ascending display)", [p["price"] for p in V.PACKAGES] == sorted(p["price"] for p in V.PACKAGES)
      and V.PACKAGE_MAP["V_SINGLE_POST"]["price"] == 149 and V.PACKAGE_MAP["V_PREMIUM"]["price"] == 3999)
check("6 packages", len(V.PACKAGES) == 6, codes)
check("Prathi package ki days + perks + telugu",
      all(p["days"] > 0 and p["perks"] and p["telugu"] for p in V.PACKAGES))
check("Standard package popular flag", V.PACKAGE_MAP["V_STANDARD"].get("popular") is True)
check("package codes uppercase V_", all(c.startswith("V_") for c in codes))
check("Add-ons 4 (photo/reel/interview/bride-mail)", len(V.ADDONS_VENDOR) == 4)
check("5 ad slots", len(V.SLOTS) == 5 and "home_top_banner" in V.SLOTS)
pub = V.packages_public()
check("public packages lo how-it-works + why + renewal discount",
      len(pub["how_it_works_telugu"]) >= 4 and len(pub["why_telugu"]) >= 4 and pub["renewal_discount_pct"] == 15)

print("=== 3. REGISTER ===")
base = {"business_name": "Sri Lakshmi Catering", "category": "catering", "phone": "9848012345",
        "city": "Warangal", "district": "Warangal", "state": "TS", "package": "V_STANDARD",
        "about": "Traditional Telugu vindu, 30 years", "price_range": "₹250-450 per plate",
        "experience_years": "30", "service_areas": "Warangal, Hanamkonda"}
bad = V.register_vendor({"business_name": "ab", "category": "nope", "phone": "123", "city": ""})
check("Validation: short name/category/phone/city reject", not bad["ok"] and len(bad["problems"]) >= 4, bad.get("problems"))
check("Validation problem messages Telugu", "⚠️" in bad["message_telugu"])
r1 = V.register_vendor(dict(base))
check("Valid register → MVV id + pending", r1["ok"] and r1["vendor_id"].startswith("MVV-")
      and r1["vendor"]["status"] == "pending", r1.get("vendor_id"))
check("Amount = package price (₹1499)", r1["amount"] == 1499 and r1["package"]["code"] == "V_STANDARD")
check("PhonePe deep link + steps Telugu", "phonepe://pay" in r1["phonepe_link"] and len(r1["steps_telugu"]) == 4)
check("Message Telugu lo package + amount", "₹1499" in r1["message_telugu"] or "1499" in r1["message_telugu"])
dup = V.register_vendor(dict(base))
check("Duplicate (same phone+category) block", dup["reason"] == "duplicate" and dup["vendor_id"] == r1["vendor_id"])
r2 = V.register_vendor(dict(base, business_name="Sri Balaji Photography", category="photography",
                            phone="9848099999", package="V_PREMIUM"))
check("Different category ok", r2["ok"])
check("Unknown package reject", V.register_vendor(dict(base, phone="9848088888", package="V_FAKE"))["reason"] == "invalid")

print("=== 4. ACTIVATE / REJECT / EXPIRE ===")
act = V.activate_vendor(r1["vendor_id"], utr="UTR123")
check("Activate → status active + expires_at", act["ok"] and act["vendor"]["status"] == "active"
      and act["vendor"]["expires_at"].startswith(str(__import__("datetime").datetime.now().year)))
check("Standard package → verified badge", act["vendor"]["verified"] is True)
check("Expiry = package days (90)", act["days"] == 90)
V.activate_vendor(r2["vendor_id"], utr="UTR999")
check("Unknown vendor activate → not_found", V.activate_vendor("MVV-9999")["reason"] == "not_found")
check("Bad package activate → bad_package", V.activate_vendor(r1["vendor_id"], package="V_NOPE")["reason"] == "bad_package")
r3 = V.register_vendor(dict(base, business_name="Ravi DJ Band", category="music_dj", phone="9848077777", package="V_BASIC"))
rej = V.reject_vendor(r3["vendor_id"], "details verify avvaledu")
check("Reject → status + Telugu message", rej["ok"] and rej["vendor"]["status"] == "rejected" and "❌" in rej["message_telugu"])
# expire
v1 = next(v for v in V.VENDORS if v["id"] == r1["vendor_id"])
v1["expires_at"] = "2020-01-01T00:00:00"
ex = V.expire_due_vendors()
check("Kalam ayyina listing auto-expire", ex["expired"] == 1 and v1["status"] == "expired", ex)
V.activate_vendor(r1["vendor_id"], utr="UTR124")   # back to active for rest of tests

print("=== 5. DIRECTORY ===")
d = V.vendors_directory()
check("Directory lo active vendors matrame (demo + tests)", d["total"] >= 2
      and all(v["status"] == "active" for v in d["vendors"]))
check("Categories + counts API shape", any(c["count"] >= 1 for c in d["categories"]))
check("Category filter (catering)", all(v["category"] == "catering"
                                       for v in V.vendors_directory(category="catering")["vendors"]))
check("Multi-category filter (comma)", V.vendors_directory(category="catering,photography")["total"] >= 2)
check("District filter", V.vendors_directory(district="Warangal")["total"] >= 1)
check("District filter ga wrong → 0", V.vendors_directory(district="Ladakh")["total"] == 0)
check("City filter", V.vendors_directory(city="warangal")["total"] >= 1)
check("Search q", V.vendors_directory(q="catering")["total"] >= 1)
check("Paid-first order (PREMIUM mundu)", V.vendors_directory()["vendors"][0]["package"] in ("V_PREMIUM", "V_SPOTLIGHT"))
sample = V.vendors_directory()["vendors"][0]
check("Listing lo WhatsApp + call link + verified flag",
      sample["whatsapp_link"].startswith("https://wa.me/91") and sample["call_link"].startswith("tel:+91")
      and "verified" in sample)
check("include_inactive tho kalupudu", V.vendors_directory(include_inactive=True)["total"] >= d["total"])

print("=== 6. AD ROTATION ===")
rot = V.ad_rotation("home_top_banner", limit=2)
check("Ads return + slot name", rot["count"] >= 1 and rot["slot"] == "home_top_banner")
check("Ad card: CTA + detail url + icon", all(a["detail_url"].startswith("/vendors/") and a["icon"] for a in rot["ads"]))
check("House note Telugu (₹149 nunchi)", "₹149" in rot["note_telugu"])
imp_before = V.VENDORS[0]["impressions"]
V.ad_rotation("home_top_banner", limit=5)
check("Impressions track avutunnayi", V.VENDORS[0]["impressions"] > imp_before)
check("Bad slot → default", V.ad_rotation("nonsense_slot", limit=1)["slot"] == "home_top_banner")
check("track=False lo impression penchadu", (lambda: (
    V.ad_rotation("vendors_top", limit=1, track=False),
    V.VENDORS[0]["impressions"]))()[1] == V.VENDORS[0]["impressions"])
clk = V.track_vendor_click(r1["vendor_id"], source="test")
check("Click track", clk["ok"] and clk["clicks"] >= 1)
check("Unknown vendor click → not_found", V.track_vendor_click("MVV-9999")["ok"] is False)

print("=== 7. LEADS ===")
lead_bad = V.vendor_lead(r1["vendor_id"], {"name": "R", "phone": "123"})
check("Lead validation (name/phone)", not lead_bad["ok"] and len(lead_bad["problems"]) == 2)
lead = V.vendor_lead(r1["vendor_id"], {"name": "Ravi Kumar", "phone": "9848011111", "district": "Warangal",
                                       "event_date": "2026-11-22", "budget": "₹1,20,000",
                                       "message": "300 members ki lunch"})
check("Valid lead → id + vendor details", lead["ok"] and lead["lead"]["id"].startswith("VL-"))
check("Vendor WhatsApp text lo customer number + requirement",
      "9848011111" in lead["vendor_whatsapp_text"] and "300 members" in lead["vendor_whatsapp_text"]
      and "NEW ENQUIRY" in lead["vendor_whatsapp_text"])
check("Customer confirmation Telugu + 3 more options mention",
      "enquiry" in lead["customer_text_telugu"] and "3 more" in lead["customer_text_telugu"])
check("Lead count vendor meeda perigindi", any(v["leads"] >= 1 for v in V.VENDORS))
check("leads_for() vendor filter", len(V.leads_for(r1["vendor_id"])) >= 1)
check("Unknown vendor lead → not_found", V.vendor_lead("MVV-9999", {"name": "A", "phone": "9848000000"})["reason"] == "not_found")

print("=== 8. PROMO CONTENT ===")
vendor_obj = next(v for v in V.VENDORS if v["id"] == r1["vendor_id"])
for i in range(3):
    pp = V.promo_post(vendor_obj, variant=i)
    check("Promo variant %d: TG post + 2 WA + poster text" % i,
          len(pp["telegram_post"]) > 120 and len(pp["whatsapp_messages"]) == 2 and pp["poster_text"])
tg = V.promo_post(vendor_obj)["telegram_post"]
check("Promo lo business peru + category + phone", "sri lakshmi catering" in tg.lower()
      and "9848012345" in tg and "catering" in tg.lower())
check("Promo lo manavivaha.in/vendors link", "manavivaha.in/vendors" in tg)
check("Placeholder leftover ledu (%s / {name})", "%s" not in tg and "{name}" not in tg)
check("me link (vendor ki direct chat)", V.promo_post(vendor_obj)["share_me"].startswith("https://wa.me/91"))

print("=== 9. POSTER ===")
tmpd = tempfile.mkdtemp()
try:
    import vendor_kit
    sq = vendor_kit.vendor_poster(vendor_obj, style="square", out_path=os.path.join(tmpd, "s.png"))
    st = vendor_kit.vendor_poster(vendor_obj, style="status", out_path=os.path.join(tmpd, "st.png"))
    from PIL import Image
    check("Square poster 1080×1080", Image.open(sq).size == (1080, 1080))
    check("Status poster 1080×1920", Image.open(st).size == (1080, 1920))
    check("PNG signature", open(sq, "rb").read(8) == b"\x89PNG\r\n\x1a\n")
    check("ASCII-safe text helper (Telugu/emoji → English, tofu ledu)",
          vendor_kit._txt("విందు భోజనం (Catering)") == "Catering"
          and "Rs." in vendor_kit._txt("₹250-450 per plate"))
finally:
    shutil.rmtree(tmpd, ignore_errors=True)

print("=== 10. DASHBOARD + REVENUE ===")
dash = V.vendor_dashboard(r1["vendor_id"])
check("Dashboard: stats + package + days_left", dash["ok"] and "impressions" in dash["stats"] and "days_left" in dash
      and dash["package"]["code"] == "V_STANDARD")
check("Dashboard: leads + upsell Telugu", dash["recent_leads"] and ("renew" in dash["upsell_telugu"].lower()
                                                                   or "days" in dash["upsell_telugu"]))
check("Dashboard: competition note", "active vendors" in dash["competition"]["message_telugu"])
check("Unknown vendor dashboard → not ok", V.vendor_dashboard("MVV-9999")["ok"] is False)
rev = V.vendor_revenue()
check("Revenue: active count + collected + pipeline", rev["active"] >= 1 and rev["collected"] >= 1499 and "pipeline" in rev)
check("Revenue: by_package breakdown", isinstance(rev["by_package"], dict) and rev["by_package"])
check("Revenue Telugu summary", "vendors" in rev["message_telugu"] and "leads" in rev["message_telugu"])
check("vendor_stats shape", V.vendor_stats()["categories"] == 18 and "by_category" in V.vendor_stats())

print("=== 11. STATE + API ===")
sv = V.save_state()
check("State save (vendor_state.json)", sv["ok"] and sv["vendors"] >= 1)
check("State file path name", sv["path"].endswith("vendor_state.json"))

from fastapi.testclient import TestClient  # noqa: E402
import os as _os
_os.environ.setdefault("TSAP_AUTH_MODE", "test")  # 🛡️ R10: vendor dashboard token skip in tests
import main  # noqa: E402

with TestClient(main.app) as c:
    check("GET /api/vendors/categories", c.get("/api/vendors/categories").json()["count"] == 18)
    check("GET /api/vendors/packages (6 + addons + slots)",
          len(c.get("/api/vendors/packages").json()["packages"]) == 6
          and len(c.get("/api/vendors/packages").json()["slots"]) == 5)
    dl = c.get("/api/vendors?limit=5").json()
    check("GET /api/vendors directory", dl["success"] and "categories" in dl)
    check("GET /api/vendors?category=photography filter",
          all(v["category"] == "photography" for v in c.get("/api/vendors?category=photography").json()["vendors"]))
    ads = c.get("/api/vendors/ads?slot=home_mid_strip&limit=3").json()
    check("GET /api/vendors/ads", ads["success"] and ads["slot"] == "home_mid_strip")
    reg = c.post("/api/vendors/register", json=dict(base, business_name="API Test Decorations",
                                                    category="decorations", phone="9848055555",
                                                    package="V_SPOTLIGHT")).json()
    check("POST /api/vendors/register", reg["success"] and reg["vendor_id"], reg.get("reason"))
    vid = reg["vendor_id"]
    check("Register lo admin alert text (WhatsApp mode off lo manual)",
          reg.get("admin_notified") or reg.get("admin_alert_text"))
    check("Pending listing directory lo kanipinchadu (default)",
          all(v["id"] != vid for v in c.get("/api/vendors?limit=50").json()["vendors"]))
    check("Bad body → 400", c.post("/api/vendors/register", json={"business_name": "x"}).status_code == 400)
    check("GET /api/vendors/{id} detail + package",
          c.get("/api/vendors/%s" % vid).json()["vendor"]["business_name"] == "API Test Decorations")
    check("GET unknown vendor → 404", c.get("/api/vendors/MVV-0000").status_code == 404)
    dash_api = c.get("/api/vendors/%s/dashboard" % vid).json()
    check("GET dashboard API", dash_api["success"] and "stats" in dash_api)
    promo_api = c.get("/api/vendors/%s/promo?variant=1" % vid).json()
    check("GET promo API (poster urls tho)", promo_api["success"] and promo_api["poster_square"].endswith("poster.png?style=square"))
    poster = c.get("/api/vendors/%s/poster.png?style=square" % vid)
    check("GET poster.png 200 PNG", poster.status_code == 200 and poster.content[:8] == b"\x89PNG\r\n\x1a\n")
    check("POST lead API", c.post("/api/vendors/%s/lead" % vid,
                                  json={"name": "Sita", "phone": "9848044444", "district": "Vijayawada"}).json()["success"])
    check("Lead API invalid → 400", c.post("/api/vendors/%s/lead" % vid, json={"name": "S"}).status_code == 400)
    check("POST click API", c.post("/api/vendors/%s/click?source=api" % vid).json()["success"])
    check("Admin queue pending lo undi", any(v["id"] == vid for v in c.get("/api/admin/vendors?status=pending").json()["items"]))
    check("Admin approve → active + promo ready",
          c.post("/api/admin/vendors/%s/action?action=approve&utr=APIUTR" % vid).json()["success"])
    check("Activate tarvata directory lo kanipisthundi",
          any(v["id"] == vid for v in c.get("/api/vendors?limit=50").json()["vendors"]))
    check("Admin reject (veru vendor)", c.post("/api/admin/vendors/MVV-0009/action?action=reject&reason=x").status_code in (200, 400, 404))
    check("Admin revenue summary", c.get("/api/admin/vendors/revenue/summary").json()["success"])
    os.environ["ADMIN_TOKEN"] = "vsecret"
    check("ADMIN_TOKEN tho guard 401", c.get("/api/admin/vendors").status_code == 401)
    check("ADMIN_TOKEN correct → 200", c.get("/api/admin/vendors?token=vsecret").status_code == 200)
    os.environ.pop("ADMIN_TOKEN", None)

print("=== 12. FRONTEND WIRING ===")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path):
    return src_page(path)


dir_pg = read("frontend/src/app/vendors/page.tsx")
reg_pg = read("frontend/src/app/vendors/register/page.tsx")
det_pg = read("frontend/src/app/vendors/[id]/page.tsx")
home_pg = read("frontend/src/app/page.tsx")
admin_pg = read("frontend/src/app/admin/page.tsx")
header = read("frontend/src/components/SiteHeader.tsx")
footer = read("frontend/src/components/SiteFooter.tsx")
sitemap = read("frontend/src/app/sitemap.ts")

check("/vendors page live API (categories + directory + ads)", "/api/vendors?" in dir_pg and "/api/vendors/packages" in dir_pg)
check("/vendors lo WhatsApp CTA + click track", "whatsapp_link" in dir_pg and "/click?source=directory" in dir_pg)
check("/vendors lo packages section (₹149 → ₹3999)", "Ad Packages" in dir_pg and "v_package" not in dir_pg.lower())
check("/vendors/register form → POST /api/vendors/register", "/api/vendors/register" in reg_pg
      and "method: \"POST\"" in reg_pg)
check("/vendors/register success lo payment + steps + PhonePe", "phonepe_link" in reg_pg and "steps_telugu" in reg_pg)
check("/vendors/[id] customer view: enquiry form + similar",
      "/lead" in det_pg and "more_options" in det_pg and "similar" in det_pg)
check("/vendors/[id] owner dashboard tab (impressions/clicks/leads)",
      "shows vendor dashboard" in det_pg.lower() or "Vendor dashboard" in det_pg)
check("Home page lo vendor ad strip", "VendorStrip" in home_pg and "/api/vendors/ads" in home_pg)
check("Home strip lo 'me business kooda' CTA", "Advertise " in home_pg)
check("Admin lo vendor tab (approve/reject/revenue)", "Vendor Ads (live)" in admin_pg
      and "/api/admin/vendors" in admin_pg and "vRevenue" in admin_pg)
check("Header lo Vendors link", "/vendors" in header)
check("Footer lo vendors + advertise links", "/vendors/register" in footer and "Advertise your business" in footer)
check("Sitemap lo /vendors + /vendors/register", '"/vendors"' in sitemap and '"/vendors/register"' in sitemap)

print("\n=== RESULT: %d pass / %d fail ===" % (len(PASS), len(FAIL)))
if FAIL:
    print("FAILED:")
    for f in FAIL:
        print("   ❌ " + f)
    sys.exit(1)
print("🏆 VENDOR ADS — ANNI TESTS PASS (18 categories, ₹149→₹3999, leads, posters, dashboard)")
