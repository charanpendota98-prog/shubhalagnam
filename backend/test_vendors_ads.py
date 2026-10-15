"""
🏪 VENDOR ADS TEST SUITE — "pelli sambandham related vaallaki promotions"
=========================================================================
Run: /tmp/mv-backend-test/bin/python test_vendors_ads.py    (backend/ cwd)

Cover:
  1. Categories (18, Telugu names, pelli-related) + lookup
  2. Packages (₹149 → ₹3999 ladder, days, truthful availability metadata)
  3. Register (validation, duplicate, ID gen, configured checkout only, safe steps)
  4. Activate / reject / expire (paid package does not grant verification)
  5. Directory (category / district / city / search / paid-first order / counts)
  6. Ad rotation (slots, weights, impression tracking, house note)
  7. Leads (consent, validation, conditional notification, lead count, more options)
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
import secrets
from contextlib import contextmanager
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402
_test_store = isolate_test_stores("vendors")
os.environ["VENDOR_POSTER_DIR"] = os.path.join(_test_store, "vendor-posters")
# This test verifies the safe default: checkout destinations are absent unless a
# real merchant UPI is configured. Never require or fabricate one in fixtures.
for _key in ("VENDOR_UPI_ID", "PAYMENT_UPI_ID", "PAY_UPI_ID"):
    os.environ.pop(_key, None)
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
check("V_SINGLE_POST is one-day private kit; other kit is one-time; neither is a listing",
      V.PACKAGE_MAP["V_SINGLE_POST"]["days"] == 1
      and any("one day after approval" in perk for perk in V.PACKAGE_MAP["V_SINGLE_POST"]["perks"])
      and V.PACKAGE_MAP["V_STATUS_BLAST"]["days"] == 0
      and all((p["days"] > 0 if p["code"] == "V_SINGLE_POST" or p["code"] not in V.SHARE_KIT_CODES
               else p["days"] == 0) and p["perks"] and p["telugu"] for p in V.PACKAGES)
      and V.PACKAGE_MAP["V_BASIC"]["price"] == 499
      and V.PACKAGE_MAP["V_SPOTLIGHT"]["price"] == 999
      and "one-day private share-ready promo kit" in V.packages_public()["headline_en"].lower()
      and "₹149" in V.packages_public()["headline_en"]
      and "₹499" in V.packages_public()["headline_en"])
check("vendor packages publish no unsupported popularity flag", all("popular" not in p for p in V.PACKAGES))
check("package codes uppercase V_", all(c.startswith("V_") for c in codes))
check("Add-ons 4 (photo/reel/interview/bride-mail)", len(V.ADDONS_VENDOR) == 4)
check("5 ad slots", len(V.SLOTS) == 5 and "home_top_banner" in V.SLOTS)
pub = V.packages_public()
check("public package copy describes review and no external delivery guarantee",
      len(pub["how_it_works_telugu"]) >= 4 and len(pub["why_telugu"]) >= 4
      and pub["external_distribution_promised"] is False
      and all(addon.get("available") is False for addon in pub["addons"]))
check("vendor sales WhatsApp stays hidden without explicit real configuration", not pub["contact_whatsapp"])

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
check("Pending listing cannot be clicked or receive leads through service helpers",
      V.track_vendor_click(r1["vendor_id"])["reason"] == "not_active"
      and V.vendor_lead(r1["vendor_id"], {"name": "Ravi Kumar", "phone": "9848011111", "consent": True})["reason"] == "not_active")
check("No checkout destination invented when merchant UPI is unconfigured",
      not r1["checkout_available"] and not r1["upi_id"] and not r1["phonepe_link"]
      and len(r1["steps_telugu"]) == 2 and "డబ్బు పంపవద్దు" in r1["steps_telugu"][-1])
check("Message Telugu lo package + amount", "₹1499" in r1["message_telugu"] or "1499" in r1["message_telugu"])
dup = V.register_vendor(dict(base))
check("Duplicate (same phone+category) block", dup["reason"] == "duplicate" and dup["vendor_id"] == r1["vendor_id"])
r2 = V.register_vendor(dict(base, business_name="Sri Balaji Photography", category="photography",
                            phone="9848099999", whatsapp="9848089999", package="V_PREMIUM"))
check("Different category ok", r2["ok"])
check("Unknown package reject", V.register_vendor(dict(base, phone="9848088888", package="V_FAKE"))["reason"] == "invalid")

print("=== 4. ACTIVATE / REJECT / EXPIRE ===")
act = V.activate_vendor(r1["vendor_id"], utr="TEST-ONLY-UTR-123")
expiry_at = datetime.fromisoformat(act["vendor"]["expires_at"])
check("Activate → status active + future expires_at", act["ok"] and act["vendor"]["status"] == "active"
      and expiry_at > datetime.now())
check("Payment activation does not fabricate a listing-details review", not act["vendor"].get("manual_verified", False))
check("Expiry = package days (90)", act["days"] == 90)
V.activate_vendor(r2["vendor_id"], utr="TEST-ONLY-UTR-999")
check("Unknown vendor activate → not_found", V.activate_vendor("MVV-9999")["reason"] == "not_found")
check("Bad package activate → bad_package", V.activate_vendor(r1["vendor_id"], package="V_NOPE")["reason"] == "bad_package")
rkit = V.register_vendor(dict(base, business_name="Share Kit Catering", category="catering", phone="9848071111",
                              whatsapp="9848072222", package="V_SINGLE_POST"))
kit_activation = V.activate_vendor(rkit["vendor_id"], utr="TEST-ONLY-KIT-UTR")
kit_vendor = next(v for v in V.VENDORS if v["id"] == rkit["vendor_id"])
kit_expires = datetime.fromisoformat(kit_vendor["expires_at"])
kit_activation_time = datetime.fromisoformat(kit_vendor["activated_at"])
kit_expected_expiry = kit_activation_time + timedelta(days=1)
check("V_SINGLE_POST activation gives exactly one day of private access, never a listing",
      kit_activation["ok"] and kit_activation["kit_ready"] and not kit_activation["listing_active"]
      and kit_activation["days"] == 1 and kit_vendor["package_days"] == 1
      and kit_vendor["status"] == "kit_ready" and abs((kit_expires - kit_expected_expiry).total_seconds()) < 1
      and V.is_ready_share_kit(kit_vendor) and not V.is_active_listing(kit_vendor)
      and "ఒకరోజు" in kit_activation["message_telugu"] and "directory listing" in kit_activation["message_telugu"]
      and "1-day private-kit access" in rkit["message_telugu"])
expired_kit = dict(kit_vendor, expires_at=(datetime.now() - timedelta(seconds=1)).isoformat())
check("Expired V_SINGLE_POST private access fails closed", not V.is_ready_share_kit(expired_kit))
check("Share-kit promo copy omits a non-existent public vendor page",
      "No public directory listing" in V.promo_post(kit_vendor)["telegram_post"]
      and "/vendors/%s" % rkit["vendor_id"] not in V.promo_post(kit_vendor)["telegram_post"])
check("Share-kit WhatsApp contact uses the explicitly supplied, valid destination",
      V.public_vendor(kit_vendor)["whatsapp_link"].startswith("https://wa.me/919848072222"))
r3 = V.register_vendor(dict(base, business_name="Ravi DJ Band", category="music_dj", phone="9848077777", package="V_BASIC"))
rej = V.reject_vendor(r3["vendor_id"], "details verify avvaledu")
check("Reject → status + Telugu message", rej["ok"] and rej["vendor"]["status"] == "rejected" and "❌" in rej["message_telugu"])
# expire
v1 = next(v for v in V.VENDORS if v["id"] == r1["vendor_id"])
v1["expires_at"] = "2020-01-01T00:00:00"
ex = V.expire_due_vendors()
check("Kalam ayyina listing auto-expire", ex["expired"] == 1 and v1["status"] == "expired", ex)
V.activate_vendor(r1["vendor_id"], utr="TEST-ONLY-UTR-124")   # back to active for rest of tests

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
check("Call number is not presumed to be WhatsApp", "whatsapp_link" not in V.public_vendor(v1)
      and V.public_vendor(v1)["call_link"].startswith("tel:+91"))
check("WhatsApp CTA uses only separately provided vendor number",
      sample.get("whatsapp_link", "").startswith("https://wa.me/919848089999")
      and sample["call_link"].startswith("tel:+91") and "listing_details_reviewed" in sample
      and "verified" not in sample)
check("include_inactive tho kalupudu", V.vendors_directory(include_inactive=True)["total"] >= d["total"])

print("=== 6. AD ROTATION ===")
rot = V.ad_rotation("home_top_banner", limit=2)
check("Ads return + slot name", rot["count"] >= 1 and rot["slot"] == "home_top_banner")
check("Ad card: CTA + detail url + icon", all(a["detail_url"].startswith("/vendors/") and a["icon"] for a in rot["ads"]))
check("Ad-slot note distinguishes share kits from directory listing price", "₹149" in rot["note_telugu"]
      and "₹499" in rot["note_telugu"] and "listing" in rot["note_telugu"].lower())
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
lead_no_consent = V.vendor_lead(r1["vendor_id"], {"name": "Ravi Kumar", "phone": "9848011111"})
check("Lead requires explicit consent before saving PII", not lead_no_consent["ok"]
      and "consent" in " ".join(lead_no_consent["problems"]).lower())
lead_bad = V.vendor_lead(r1["vendor_id"], {"name": "R", "phone": "123", "consent": True})
check("Lead validation (name/phone)", not lead_bad["ok"] and len(lead_bad["problems"]) == 2)
lead = V.vendor_lead(r1["vendor_id"], {"name": "Ravi Kumar", "phone": "9848011111", "district": "Warangal",
                                       "event_date": "2026-11-22", "budget": "₹1,20,000",
                                       "message": "300 members ki lunch", "consent": True})
check("Valid lead → id + vendor details", lead["ok"] and lead["lead"]["id"].startswith("VL-"))
check("Vendor WhatsApp text lo customer number + requirement",
      "9848011111" in lead["vendor_whatsapp_text"] and "300 members" in lead["vendor_whatsapp_text"]
      and "NEW ENQUIRY" in lead["vendor_whatsapp_text"])
check("Customer confirmation avoids delivery and response-time guarantee",
      "submit" in lead["customer_text_telugu"].lower() and "స్పందించే సమయం మారవచ్చు" in lead["customer_text_telugu"])
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
check("No WhatsApp share link when the vendor supplied no WhatsApp number", not V.promo_post(vendor_obj)["share_me"])
check("Explicit WhatsApp listing yields WhatsApp share link",
      V.promo_post(next(v for v in V.VENDORS if v["id"] == r2["vendor_id"]))["share_me"].startswith("https://wa.me/919848089999"))

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
check("Dashboard competition copy uses active listings and no guaranteed rank",
      "active listings" in dash["competition"]["message_telugu"]
      and "top position" in dash["competition"]["message_telugu"])
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

# Exercise real owner/vendor authorization instead of the dev-mode bypass. All
# secrets and integrations are local-only; no network sender or startup worker is enabled.
os.environ["APP_ENV"] = "test"
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ["TSAP_AUTH_ENFORCE"] = "1"
os.environ["WA_TEST_FAST"] = "0"
os.environ["TSAP_RATE_LIMIT"] = "0"
os.environ["TSAP_AUTH_SECRET"] = "test-only-" + secrets.token_urlsafe(48)
os.environ["ADMIN_KEY"] = "test-only-" + secrets.token_urlsafe(32)
os.environ["PUBLISH_DRY_RUN"] = "true"
os.environ["WHATSAPP_MODE"] = "off"
os.environ["AUTO_POST_ON_APPROVAL"] = "false"
os.environ["AUTO_POST_ON_REGISTER"] = "false"
for _key in ("BOT_TOKEN", "TELEGRAM_BOT_TOKEN", "TSAP_API_KEY", "WHATSAPP_TOKEN",
             "WHATSAPP_PHONE_ID", "WHATSAPP_TO", "WA_INSTANCES", "WHATSAPP_BRIDGE_URL",
             "ADMIN_WHATSAPP_NUMBER"):
    os.environ.pop(_key, None)
import main  # noqa: E402

@contextmanager
def test_client_without_startup(app):
    """Avoid workers, restore jobs, and repository backups in a route-only test."""
    startup = list(app.router.on_startup)
    shutdown = list(app.router.on_shutdown)
    app.router.on_startup.clear()
    app.router.on_shutdown.clear()
    try:
        with TestClient(app) as client:
            yield client
    finally:
        app.router.on_startup[:] = startup
        app.router.on_shutdown[:] = shutdown


with test_client_without_startup(main.app) as c:
    check("GET /api/vendors/categories", c.get("/api/vendors/categories").json()["count"] == 18)
    package_payload = c.get("/api/vendors/packages").json()
    check("GET /api/vendors/packages (6 + addons + slots)",
          len(package_payload["packages"]) == 6 and len(package_payload["slots"]) == 5)
    check("Public package copy separates the one-day kit from directory listings",
          "one-day private share-ready promo kit" in package_payload["headline_en"].lower()
          and "₹149" in package_payload["headline_en"] and "₹499" in package_payload["headline_en"]
          and "no external post or reach is guaranteed" in package_payload["headline_en"].lower())
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
    check("Register exposes notification-queued status, not delivery claim",
          "admin_notification_queued" in reg and "admin_notified" not in reg)
    check("Pending listing directory lo kanipinchadu (default)",
          all(v["id"] != vid for v in c.get("/api/vendors?limit=50").json()["vendors"]))
    check("Bad body → 400", c.post("/api/vendors/register", json={"business_name": "x"}).status_code == 400)
    vendor_access_token = reg.get("vendor_token", "")
    check("Register issues vendor-specific access token", bool(vendor_access_token))
    check("Pending vendor public detail is hidden", c.get("/api/vendors/%s" % vid).status_code == 404)
    check("Pending vendor promo is hidden", c.get("/api/vendors/%s/promo" % vid).status_code == 404)
    check("Pending vendor poster is hidden", c.get("/api/vendors/%s/poster.png" % vid).status_code == 404)
    before_pending_leads = len(V.LEADS)
    check("Pending vendor lead is rejected without saving contact data",
          c.post("/api/vendors/%s/lead" % vid,
                 json={"name": "Sita", "phone": "9848044444", "consent": True}).status_code == 404
          and len(V.LEADS) == before_pending_leads)
    check("Pending vendor click tracking is rejected", c.post("/api/vendors/%s/click" % vid).status_code == 404)
    check("Private vendor dashboard rejects missing token",
          c.get("/api/vendors/%s/dashboard" % vid).status_code == 401)
    dash_response = c.get("/api/vendors/%s/dashboard" % vid, headers={"X-Vendor-Token": vendor_access_token})
    check("Vendor token opens only that vendor dashboard",
          dash_response.status_code == 200 and dash_response.json().get("success")
          and "stats" in dash_response.json())
    check("GET unknown vendor → 404", c.get("/api/vendors/MVV-0000").status_code == 404)
    # Activate only this isolated fixture, then test public listing routes.
    activated_api_vendor = V.activate_vendor(vid, utr="TEST-ONLY-UTR-API")
    check("Isolated test vendor activation", activated_api_vendor.get("ok"))
    check("GET /api/vendors/{id} active detail + package",
          c.get("/api/vendors/%s" % vid).status_code == 200
          and c.get("/api/vendors/%s" % vid).json()["vendor"]["business_name"] == "API Test Decorations")
    detail_before_track = next(v for v in V.VENDORS if v["id"] == vid)["clicks"]
    check("Detail tracking increments only an active listing",
          c.get("/api/vendors/%s?track=true" % vid).status_code == 200
          and next(v for v in V.VENDORS if v["id"] == vid)["clicks"] == detail_before_track + 1)
    promo_api = c.get("/api/vendors/%s/promo?variant=1" % vid).json()
    check("GET promo API (poster urls tho)", promo_api["success"] and promo_api["poster_square"].endswith("poster.png?style=square"))
    poster = c.get("/api/vendors/%s/poster.png?style=square" % vid)
    check("GET poster.png 200 PNG", poster.status_code == 200 and poster.content[:8] == b"\x89PNG\r\n\x1a\n")
    check("POST lead API", c.post("/api/vendors/%s/lead" % vid,
                                  json={"name": "Sita", "phone": "9848044444", "district": "Vijayawada", "consent": True}).json()["success"])
    check("Lead API invalid → 400", c.post("/api/vendors/%s/lead" % vid, json={"name": "S"}).status_code == 400)
    check("POST click API", c.post("/api/vendors/%s/click?source=api" % vid).json()["success"])
    check("Legacy vendor-review queue requires owner session", c.get("/api/admin/vendors?status=pending").status_code == 401)
    check("Legacy vendor-review mutation requires owner session + CSRF",
          c.post("/api/admin/vendors/%s/action?action=approve&utr=TEST-ONLY-UTR" % vid).status_code == 401)
    check("Activate tarvata directory lo kanipisthundi",
          any(v["id"] == vid for v in c.get("/api/vendors?limit=50").json()["vendors"]))

    kit_reg_api = c.post("/api/vendors/register", json=dict(base, business_name="API Share Kit Vendor",
                                                            category="gifts_hampers", phone="9848073333",
                                                            whatsapp="9848074444", package="V_SINGLE_POST")).json()
    kit_vid_api = kit_reg_api.get("vendor_id", "")
    kit_token_api = kit_reg_api.get("vendor_token", "")
    check("Pending share kit remains private and is not listed",
          bool(kit_vid_api and kit_token_api)
          and c.get("/api/vendors/%s/kit" % kit_vid_api).status_code == 401
          and c.get("/api/vendors/%s/kit" % kit_vid_api,
                    headers={"X-Vendor-Token": kit_token_api}).status_code == 409
          and c.get("/api/vendors/%s" % kit_vid_api).status_code == 404
          and all(v["id"] != kit_vid_api for v in c.get("/api/vendors?limit=50").json()["vendors"]))
    api_kit_activation = V.activate_vendor(kit_vid_api, utr="TEST-ONLY-KIT-UTR-API")
    kit_api_response = c.get("/api/vendors/%s/kit" % kit_vid_api,
                             headers={"X-Vendor-Token": kit_token_api})
    check("Approved one-day share kit requires owner token and exposes its expiry",
          api_kit_activation.get("kit_ready") and kit_api_response.status_code == 200
          and kit_api_response.json().get("kit_ready")
          and kit_api_response.json().get("expires_at") == api_kit_activation.get("expires_at")
          and "No public directory listing" in kit_api_response.json().get("telegram_post", ""))
    api_kit_vendor = next(v for v in V.VENDORS if v["id"] == kit_vid_api)
    valid_api_kit_expiry = api_kit_vendor["expires_at"]
    api_kit_vendor["expires_at"] = (datetime.now() - timedelta(seconds=1)).isoformat()
    expired_kit_response = c.get("/api/vendors/%s/kit" % kit_vid_api,
                                 headers={"X-Vendor-Token": kit_token_api})
    expired_poster_response = c.get("/api/vendors/%s/kit/poster.png" % kit_vid_api,
                                    headers={"X-Vendor-Token": kit_token_api})
    check("Expired one-day kit blocks copy and poster APIs",
          expired_kit_response.status_code == 410 and expired_poster_response.status_code == 410)
    api_kit_vendor["expires_at"] = valid_api_kit_expiry
    check("Private kit poster requires token and returns a PNG",
          c.get("/api/vendors/%s/kit/poster.png" % kit_vid_api).status_code == 401
          and (lambda response: response.status_code == 200
               and response.content[:8] == b"\x89PNG\r\n\x1a\n")(
                   c.get("/api/vendors/%s/kit/poster.png?style=square" % kit_vid_api,
                         headers={"X-Vendor-Token": kit_token_api})))
    check("Control kit_ready status filter is available",
          c.get("/api/control/vendors?status=kit_ready").status_code == 401)
    check("Legacy admin vendor review alias requires an owner session", c.post("/api/admin/vendors/MVV-0009/action?action=reject&reason=x").status_code in (401, 403))
    check("Legacy vendor revenue route requires owner session", c.get("/api/admin/vendors/revenue/summary").status_code == 401)

    # The control dashboard must use the owner session routes, not a public admin key.
    check("Control vendor queue is private", c.get("/api/control/vendors").status_code == 401)
    check("Control vendor revenue is private", c.get("/api/control/vendors/revenue").status_code == 401)
    control_reg = c.post("/api/vendors/register", json=dict(base, business_name="Control Test Vendor",
                                                            category="bakery_cake", phone="9848066666",
                                                            package="V_BASIC")).json()
    control_vid = control_reg.get("vendor_id", "")
    import time
    control_sid, control_csrf = "vendor-test-owner-session", "vendor-test-csrf-token"
    main.CONTROL_AUTH._SESSIONS[control_sid] = {
        "role": "owner", "username": "vendor-test-owner", "created": int(time.time()),
        "expires": int(time.time()) + 3600, "csrf": control_csrf, "last_seen": int(time.time()),
    }
    c.cookies.set(main.CONTROL_AUTH.COOKIE_NAME, control_sid)
    owner_headers = {"X-Control-CSRF": control_csrf}
    worker_sid = "vendor-test-worker-session"
    main.CONTROL_AUTH._SESSIONS[worker_sid] = {
        "role": "worker", "username": "vendor-test-worker", "created": int(time.time()),
        "expires": int(time.time()) + 3600, "csrf": "worker-test-csrf", "last_seen": int(time.time()),
    }
    c.cookies.set(main.CONTROL_AUTH.COOKIE_NAME, worker_sid)
    check("Control vendor queue remains owner-only", c.get("/api/control/vendors").status_code == 403)
    check("API-key-only access cannot bypass owner-session vendor review",
          c.get("/api/control/vendors", headers={"X-Admin-Key": main.TSAP_ADMIN_KEY or "test-key"}).status_code in (401, 403))
    c.cookies.set(main.CONTROL_AUTH.COOKIE_NAME, control_sid)
    control_queue = c.get("/api/control/vendors?status=pending")
    check("Owner queue includes pending fixture and excludes active listing", control_queue.status_code == 200
          and any(v["id"] == control_vid for v in control_queue.json().get("items", []))
          and all(v["id"] != vid for v in control_queue.json().get("items", [])))
    check("Owner-session legacy queue alias remains available", c.get("/api/admin/vendors?status=pending").status_code == 200)
    check("Owner vendor revenue summary", c.get("/api/control/vendors/revenue").json().get("success"))
    check("Control vendor approve rejects malformed reference",
          c.post("/api/control/vendors/%s/action" % control_vid,
                 json={"action": "approve", "utr": "fake"}, headers=owner_headers).status_code == 400)
    control_approved = c.post("/api/control/vendors/%s/action" % control_vid,
                              json={"action": "approve", "utr": "TEST-ONLY-UTR"}, headers=owner_headers).json()
    check("Owner can approve with isolated test-only payment-reference fixture",
          control_approved.get("success") and control_approved["vendor"]["status"] == "active"
          and control_approved["vendor"]["payment_ref"] == "TEST-ONLY-UTR")
    check("Control route prevents repeated approval", c.post(
        "/api/control/vendors/%s/action" % control_vid,
        json={"action": "approve", "utr": "TEST-ONLY-UTR-SECOND"}, headers=owner_headers
    ).status_code == 409)
    c.cookies.delete(main.CONTROL_AUTH.COOKIE_NAME)
    main.CONTROL_AUTH._SESSIONS.pop(control_sid, None)
    main.CONTROL_AUTH._SESSIONS.pop(worker_sid, None)

    os.environ["ADMIN_TOKEN"] = "vsecret"
    check("ADMIN_TOKEN alone cannot access vendor-review queue", c.get("/api/admin/vendors?token=vsecret").status_code == 401)
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
control_dashboard = read("frontend/src/components/control/Dashboard.tsx")
header = read("frontend/src/components/SiteHeader.tsx")
footer = read("frontend/src/components/SiteFooter.tsx")
sitemap = read("frontend/src/app/sitemap.ts")

check("/vendors page live API (categories + directory + ads)", "/api/vendors?" in dir_pg and "/api/vendors/packages" in dir_pg)
check("Vendor copy distinguishes share kits, listings and external delivery", "promotion kits and listing packages are different" in dir_pg.lower()
      and "external posting or reach is not guaranteed" in dir_pg.lower()
      and "52 channels" not in dir_pg.lower())
check("/vendors lo WhatsApp CTA + click track", "whatsapp_link" in dir_pg and "/click?source=directory" in dir_pg)
check("/vendors packages show promo kits separate from listing terms", "Promotion Kits & Listing Packages" in dir_pg
      and "one-time kit" in dir_pg and "v_package" not in dir_pg.lower())
check("/vendors/register form → POST /api/vendors/register", "/api/vendors/register" in reg_pg
      and "method: \"POST\"" in reg_pg)
check("/vendors/register success gates payment on configured checkout", "checkout_available" in reg_pg
      and "do not pay yet" in reg_pg.lower() and "steps_telugu" in reg_pg)
check("/vendors/register does not infer WhatsApp from call number", "f.whatsapp || f.phone" not in reg_pg
      and "whatsapp_explicit" not in reg_pg)
check("/vendors/[id] customer view: enquiry form + similar",
      "/lead" in det_pg and "more_options" in det_pg and "similar" in det_pg)
check("/vendors/[id] private owner dashboard supports access code without auth bypass",
      "Vendor dashboard" in det_pg and "X-Vendor-Token" in det_pg and "connectOwnerDashboard" in det_pg)
check("/vendors/[id] enquiry includes explicit consent", "leadConsent" in det_pg and "consent: leadConsent" in det_pg)
home_vendors = read("frontend/src/components/HomeVendorsShowcase.tsx")
check("Home page lo live vendor directory", "HomeVendorsShowcase" in home_pg
      and "/api/vendors?limit=12" in home_vendors)
check("Home vendor showcase separates the ₹149 one-day kit from ₹499 Basic listing",
      "one-day private share-ready promo kit, not a directory listing" in home_vendors.lower()
      and "first directory-listing plan is Basic at ₹499" in home_vendors
      and "No external post or reach is guaranteed" in home_vendors
      and "Explore promotion options" in home_vendors
      and 'href="/vendors/campaign"' in home_vendors)
check("Private share-kit page requires the owner token and discloses one-day expiry",
      "X-Vendor-Token" in read("frontend/src/app/vendors/kit/kit-client.tsx")
      and "does not select any Telegram/WhatsApp destination" in read("frontend/src/app/vendors/kit/kit-client.tsx")
      and "One-day kit access ends" in read("frontend/src/app/vendors/kit/kit-client.tsx")
      and "index: false" in read("frontend/src/app/vendors/kit/page.tsx"))
check("Vendor WhatsApp hrefs are canonicalized instead of trusting API hrefs",
      "safeWhatsAppPhoneLink" in dir_pg
      and "safeWhatsAppPhoneLink" in read("frontend/src/components/HomeVendorsShowcase.tsx")
      and "href={v.whatsapp_link}" not in det_pg)
check("Owner control panel lo live vendor queue + approve/reject/revenue",
      "/api/control/vendors?status=" in control_dashboard and "handleVendorAction" in control_dashboard
      and "vendorRevenue" in control_dashboard and "X-Control-CSRF" in control_dashboard)
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
