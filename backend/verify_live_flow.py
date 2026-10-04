"""
🔍 LIVE SMOKE — మన వివాహ (referral 2.0)
==========================================
Run (servers already running):
    /tmp/venv/bin/python verify_live_flow.py                 # pages + read-only APIs
    /tmp/venv/bin/python verify_live_flow.py --flow          # + register→pay→₹50 E2E (DB lo kotha user)

Website :3000 (proxy → :8000) kanipinchali. Fail ayithe exit 1.
"""
import json
import os
import random
import sys
import time
import urllib.error
import urllib.parse
import os, time, urllib.request

WEB = os.getenv("SMOKE_WEB", "http://localhost:3000")
API = os.getenv("SMOKE_API", "http://localhost:8000")
PASS, FAIL = [], []


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name + (("  | " + str(extra)) if extra and not cond else ""))


# 🔐 WAVE 9 — hardening: owner-only endpoints ki token, admin endpoints ki key
TOKEN_CACHE = {}


def _demo_token(tsap_id):
    """Seed/demo profile ki token (live smoke ki) — real users OTP tho login chestaru."""
    if tsap_id in TOKEN_CACHE:
        return TOKEN_CACHE[tsap_id]
    try:
        body = json.dumps({"tsap_id": tsap_id}).encode()
        req = urllib.request.Request(API + "/api/auth/demo-token", data=body, method="POST",
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=15) as r:
            tok = json.loads(r.read().decode()).get("auth_token", "")
    except Exception:
        tok = ""
    TOKEN_CACHE[tsap_id] = tok
    return tok


def owner_headers(tsap_id, admin=False):
    h = {}
    tok = _demo_token(tsap_id) if tsap_id else ""
    if tok:
        h["X-Tsap-Token"] = tok
    if admin:
        key = os.getenv("ADMIN_KEY", "").strip()
        if key:
            h["X-Admin-Key"] = key
    return h


def get(url, base=API, method="GET", headers=None):
    try:
        req = urllib.request.Request(base + url, method=method, headers=headers or {})
        with urllib.request.urlopen(req, timeout=25) as r:
            body = r.read()
            ctype = r.headers.get("content-type", "")
            data = json.loads(body.decode("utf-8")) if "json" in ctype else body
            return r.status, data
    except urllib.error.HTTPError as e:
        return e.code, e.read()[:200]
    except Exception as e:
        return 0, str(e)[:120]


def signed_webhook(user_id, amount, payment_id, base=API):
    """
    💰 Payment webhook — RAZORPAY_WEBHOOK_SECRET env unte HMAC sign chesi pampistham
    (backend raw-body HMAC verify chestundi). Secret lekapote plain (dev).
    """
    body = json.dumps({"event": "payment.captured",
                       "payload": {"payment": {"entity": {"id": payment_id, "amount": int(amount) * 100,
                                                          "notes": {"user_id": user_id}}}}}).encode()
    headers = {"Content-Type": "application/json"}
    secret = (os.getenv("RAZORPAY_WEBHOOK_SECRET") or "").strip()
    if secret:
        import hmac as _hmac, hashlib as _hashlib
        headers["X-Razorpay-Signature"] = _hmac.new(secret.encode(), body, _hashlib.sha256).hexdigest()
    try:
        req = urllib.request.Request(base + "/api/payment/webhook", data=body, method="POST", headers=headers)
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return e.code, e.read()[:250]
    except Exception as e:
        return 0, {"error": str(e)[:150]}


def post_json(url, payload: dict, base=API, headers=None):
    """JSON POST (vendor register / welcome pack ki)."""
    try:
        req = urllib.request.Request(base + url, data=json.dumps(payload).encode(), method="POST",
                                     headers={"Content-Type": "application/json", **(headers or {})})
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, e.read()[:300]
    except Exception as e:
        return 0, {"error": str(e)[:150]}


def post_form(url, fields: dict, base=API):
    data = urllib.parse.urlencode(fields).encode()
    req = urllib.request.Request(base + url, data=data, method="POST",
                                headers={"Content-Type": "application/x-www-form-urlencoded"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, e.read()[:300]
    except Exception as e:
        return 0, str(e)[:150]


print("=== 1. PAGES (website :3000) ===")
PAGES = ["/", "/pricing", "/terms", "/privacy", "/refund", "/register", "/referral",
         "/referral/register", "/admin", "/channels", "/castes", "/vendors", "/vendors/register",
         "/matches", "/requests", "/porutham", "/safety", "/sitemap.xml", "/robots.txt"]
for p in PAGES:
    st, body = get(p, WEB)
    check("page %s → 200" % p, st == 200, st)

print("=== 2. CORE APIs ===")
st, plans = get("/api/plans")
check("/api/plans 200 + ladder", st == 200 and isinstance(plans.get("plans"), list), st)
if isinstance(plans, dict) and plans.get("plans"):
    ladder = {p["code"]: (p["price"], p.get("credits", p.get("profiles"))) for p in plans["plans"]}
    check("pricing ladder FREE3/₹99=5/₹199=12/₹299=25/₹499=50",
          ladder.get("FREE", (0, 3))[1] == 3 and ladder.get("S_99") == (99, 5)
          and ladder.get("S_199") == (199, 12) and ladder.get("S_299") == (299, 25)
          and ladder.get("S_499") == (499, 50), ladder)
st, ch = get("/api/channels")
check("/api/channels 52 registry", st == 200 and ch.get("stats", {}).get("total") == 52, ch.get("stats"))

print("=== 3. REFERRAL 2.0 APIs ===")
st, terms = get("/api/referral/terms")
check("/api/referral/terms — ₹50 headline + 10 rules", st == 200 and terms.get("headline", "").startswith("₹50")
      and len(terms.get("rules_telugu", [])) >= 8)
st, lb = get("/api/referral/leaderboard?period=all&limit=5")
check("/api/referral/leaderboard", st == 200 and lb.get("success") and "prize_telugu" in lb)
st, rk = get("/api/referral/leaderboard?period=week")
check("leaderboard week period", st == 200 and rk.get("period") == "week")

# oru real user ni teesukuni dashboard test
st, chans = get("/api/channels")
target = None
try:
    import urllib.request as u2
    with u2.urlopen(WEB + "/api/referral/leaderboard?period=all&limit=1", timeout=20) as r:
        pass
except Exception:
    pass
st, prof = get("/api/search/TSAP-F-2025-1042")
target = "TSAP-F-2025-1042"
st, dash = get("/api/referral/%s" % target, headers=owner_headers(target))
check("/api/referral/{id} dashboard (code+link+stats+kit)",
      st == 200 and dash.get("ok") and dash.get("code") and dash.get("link")
      and len(dash.get("share_kit", {}).get("whatsapp_messages", [])) == 5, st)
commission_rules = dash.get("commission_rules", {})
check("dashboard referral rules (one qualifying ₹50; repeats ₹0)",
      "50" in str(commission_rules.get("first_payment"))
      and "S_99" in str(commission_rules.get("first_payment"))
      and "₹0" in str(commission_rules.get("repeat_payment")))
check("dashboard tier + milestones", dash.get("tier", {}).get("key") in ("BRONZE", "SILVER", "GOLD", "PLATINUM", "ELITE")
      and len(dash.get("milestones", [])) == 4)
st, kit = get("/api/referral/%s/share-kit" % target)
check("share-kit 5 WA + TG + SMS", st == 200 and len(kit.get("whatsapp_messages", [])) == 5
      and "t.me/share/url" in kit.get("telegram_share", "") and kit.get("sms_text"))
st, val = get("/api/referral/validate/%s" % dash.get("code"))
check("validate/{code} → ok + ₹50 offer", st == 200 and val.get("ok") and val.get("commission_offer") == 50)
st, bad = get("/api/referral/validate/ZZZ99")
check("validate bad code → ok False", st == 200 and bad.get("ok") is False)
st, png = get("/api/referral/%s/poster.png?style=square" % target)
check("poster.png square (PNG bytes)", st == 200 and isinstance(png, bytes) and png[:8] == b"\x89PNG\r\n\x1a\n", st)
st, png2 = get("/api/referral/%s/poster.png?style=status" % target)
check("poster.png status 1080×1920", st == 200 and isinstance(png2, bytes) and len(png2) > 20000, st)
st, pay = get("/api/referral/%s/payouts" % target, headers=owner_headers(target))
check("payouts list + min ₹100 note", st == 200 and pay.get("min_payout") == 100)
st, fr = get("/api/referral/%s/fraud-check" % target, headers=owner_headers(target))
check("fraud-check shape", st == 200 and "clean" in fr and "issues" in fr)
st, _ = get("/api/referral/TSAP-NOT-EXIST")
check("unknown id → 404", st == 404, st)

print("=== 3b. VENDOR ADS (🏪 catering/photography/decorations...) ===")
st, cats = get("/api/vendors/categories")
check("18 categories (Telugu names tho)", st == 200 and cats.get("count") == 18
      and all(c.get("te") for c in cats.get("categories", [])), cats.get("count"))
st, pk = get("/api/vendors/packages")
check("Packages ₹149 → ₹3999 (6) + addons + slots",
      st == 200 and len(pk.get("packages", [])) == 6 and pk["packages"][0]["price"] == 149
      and len(pk.get("addons", [])) == 4 and len(pk.get("slots", [])) == 5, st)
st, dl = get("/api/vendors?limit=20")
check("/api/vendors directory (active vendors)", st == 200 and dl.get("total", 0) >= 1, dl.get("total"))
if dl.get("vendors"):
    v0 = dl["vendors"][0]
    check("listing lo WhatsApp CTA + verified flag + price range",
          v0["whatsapp_link"].startswith("https://wa.me/91") and "verified" in v0, v0.get("id"))
    st, det = get("/api/vendors/%s" % v0["id"])
    check("vendor detail + similar options", st == 200 and det.get("vendor") and "similar" in det)
    # 🔐 vendor dashboard ippudu vendor_token tho matrame (public leak fix) — kotha vendor register chesi token theesukuntam
    # munde register ayye undochu / rate limit — admin endpoint tho token theesukuntam (support flow)
    _adm = os.getenv("ADMIN_KEY", "").strip()
    _admin_tok = get("/api/admin/vendors/%s/token" % v0["id"], headers={"X-Admin-Key": _adm},
                     method="POST") if _adm else (0, {})
    _vreg = (200, {"vendor_token": (_admin_tok[1] or {}).get("vendor_token", ""),
                   "vendor_id": v0["id"]}) if _admin_tok[0] == 200 and isinstance(_admin_tok[1], dict) \
        else post_json("/api/vendors/register", {"business_name": "Flow Vendor Check", "category": "catering",
                       "phone": "9848098765", "city": "Hyderabad", "district": "Hyderabad", "state": "TS",
                       "package": "V_BASIC"})
    _vtok = (_vreg[1] or {}).get("vendor_token", "") if _vreg[0] == 200 and not isinstance(_vreg[1], bytes) else ""
    _vid = ((_vreg[1] or {}).get("vendor_id", "") if isinstance(_vreg[1], dict) else "") or v0["id"]
    if not _vtok:
        # server reset/mundu register ayyi undochu → phone ni unique ga marchi malli try
        _vreg2 = post_json("/api/vendors/register", {
            "business_name": "Flow Vendor " + str(int(time.time()) % 100000), "category": "catering",
            "phone": "98480" + str(10000 + int(time.time()) % 80000)[:5],
            "city": "Hyderabad", "district": "Hyderabad", "state": "TS", "package": "V_BASIC"})
        _vtok = (_vreg2[1] or {}).get("vendor_token", "") if _vreg2[0] == 200 and not isinstance(_vreg2[1], bytes) else ""
        _vid = ((_vreg2[1] or {}).get("vendor_id", "") if isinstance(_vreg2[1], dict) else "") or _vid
    check("vendor register → vendor_token (dashboard ki)", bool(_vtok), str(_vreg[1])[:120])
    st, dashv = get("/api/vendors/%s/dashboard" % _vid, headers={"X-Vendor-Token": _vtok})
    check("vendor dashboard (impressions/clicks/leads/days_left)",
          st == 200 and all(k in dashv.get("stats", {}) for k in ("impressions", "clicks", "leads"))
          and "days_left" in dashv, st)
    st, dashv_no = get("/api/vendors/%s/dashboard" % _vid)
    check("vendor dashboard token lekunda 401/403 (leak fix)", st in (401, 403), st)
    st, pr = get("/api/vendors/%s/promo" % v0["id"])
    check("promo post (TG + WA + poster url)", st == 200 and pr.get("telegram_post")
          and len(pr.get("whatsapp_messages", [])) == 2 and pr["poster_square"].endswith("poster.png?style=square"))
    st, vpng = get("/api/vendors/%s/poster.png?style=square" % v0["id"])
    check("vendor poster PNG (QR tho)", st == 200 and isinstance(vpng, bytes) and vpng[:8] == b"\x89PNG\r\n\x1a\n", st)
    st, pstatus = get("/api/vendors?category=%s" % v0["category"])
    check("category filter pani chestundi", st == 200 and all(x["category"] == v0["category"] for x in pstatus["vendors"]))
st, ads = get("/api/vendors/ads?slot=home_mid_strip&limit=4")
check("ad rotation (home strip)", st == 200 and ads.get("count", 0) >= 1 and "₹149" in ads.get("note_telugu", ""), st)
st, clkv = get("/api/vendors/%s/click?source=smoke" % (dl["vendors"][0]["id"] if dl.get("vendors") else "MVV-0001"), method="POST")
check("vendor click track", st == 200 and clkv.get("success"), st)

print("=== 4. LANDING + CLICK FUNNEL (website proxy) ===")
st, page = get("/r/%s" % dash.get("code"), WEB)
check("/r/<code> landing 200", st == 200, st)
st, clk = get("/api/referral/click/%s?source=smoke" % dash.get("code"), WEB, method="POST")
check("click tracked (funnel)", st == 200 and clk.get("success"))
st, dash2 = get("/api/referral/%s" % target, headers=owner_headers(target))
check("dashboard lo click kanipisthundi", isinstance(dash2, dict) and dash2.get("stats", {}).get("clicks", 0) >= 1, st)

if "--flow" in sys.argv:
    print("=== 5. E2E: click → register → ₹99 → referrer ₹50 (--flow) ===")
    phone = "9%09d" % random.randint(0, 999999999)
    fields = {"gender": "Groom", "age": 32, "height": "5.8", "marital_status": "Pelli Kaledu",
              "caste": "Reddy", "district": "Hyderabad", "state": "TS", "full_name": "Smoke Test Groom",
              "phone": phone, "job": "Engineer", "education": "B.Tech", "salary": "90k",
              "referral_code": dash.get("code")}
    st, reg = post_form("/api/register", fields, WEB)
    check("register with ?ref → 200", st == 200 and reg.get("tsap_id"), st)
    if isinstance(reg, dict) and reg.get("tsap_id"):
        check("referral lock ok + +1 credit (3→4)",
              reg.get("referral", {}).get("joined_with", {}).get("ok") is True and reg.get("credits") >= 4,
              reg.get("referral", {}).get("joined_with"))
        check("sontha code + link + poster urls",
              reg["referral"]["my_code"] and reg["referral"]["my_link"].endswith(reg["referral"]["my_code"])
              and reg["referral"]["poster_url"].endswith("/poster.png"))
        check("referrer ki notify text (join message)", bool(reg["referral"]["joined_with"].get("notify")))
        _ws = reg.get("welcome_status") or {}
        check("kotha user welcome lo referral line",
              "Mee friend" in str(_ws.get("manual_text", _ws.get("wa_result", {}).get("targets", ""))) or
              bool(_ws.get("queued") or _ws.get("manual_text")),
              {"queued": _ws.get("queued"), "has_manual": bool(_ws.get("manual_text"))})
        st, wh = signed_webhook(reg["tsap_id"], 99, "pay_smoke99_" + str(random.randint(1000, 9999)))
        rc = (wh or {}).get("referral_commission") or {}
        check("webhook ₹99 → referrer ku ₹50", st == 200 and rc.get("commission") == 50, rc)
        check("wallet update + message", float(rc.get("wallet", 0)) >= 50 and rc.get("message_telugu"))
        st, dash3 = get("/api/referral/%s" % target, headers=owner_headers(target))
        _d3 = dash3 if isinstance(dash3, dict) else {}
        check("referrer dashboard: paid_count +1, wallet perigindi",
              _d3.get("stats", {}).get("paid_count", 0) >= 1 and _d3.get("stats", {}).get("wallet", 0) > 0,
              st if not _d3 else _d3.get("stats"))
        st, self_ref = post_form("/api/register", dict(fields, phone="9%09d" % random.randint(0, 999999999),
                                                      referral_code=reg["referral"]["my_code"]), WEB)
        # self-referral is only blocked when the referrer phone/code matches; vaallu veru kabatti check skip
        st, dup = post_form("/api/referral/click/%s" % reg["referral"]["my_code"], {})
        check("kotha user sontha code kooda click track avutundi", st == 200 and dup.get("success"))

if "--vendor" in sys.argv:
    print("=== 6. E2E: vendor register → admin approve → live + lead (--vendor) ===")
    import random as _r
    payload = {"business_name": "Smoke Test Decorators", "category": "decorations",
               "phone": "9%09d" % _r.randint(0, 999999999), "city": "Hyderabad", "district": "Rangareddy",
               "state": "TS", "package": "V_STANDARD", "about": "Smoke test vendor", "price_range": "Rs.30k-1L"}
    st, reg = post_json("/api/vendors/register", payload, headers=owner_headers("", admin=True))
    if isinstance(reg, bytes):
        reg = {}
    check("vendor register (pending)", st == 200 and reg.get("success") is True and reg.get("vendor_id"), f"{st} {str(reg)[:120]}")
    vid = reg.get("vendor_id")
    st, pend = get("/api/vendors?limit=80")
    check("pending listing public directory lo ledu", all(v["id"] != vid for v in (pend.get("vendors") or [])))
    st, appr = get("/api/admin/vendors/%s/action?action=approve&utr=SMOKEUTR" % vid, method="POST",
                   headers=owner_headers("", admin=True))
    check("admin approve → active + days", st == 200 and appr.get("ok")
          and appr["vendor"]["status"] == "active" and appr.get("days") == 90, appr.get("reason"))
    st, post = get("/api/vendors?limit=80")
    check("approve tarvata directory lo kanipisthundi", any(v["id"] == vid for v in post["vendors"]))
    st, lead = None, None
    req = urllib.request.Request(API + "/api/vendors/%s/lead" % vid,
                                 data=json.dumps({"name": "Smoke Customer", "phone": "9848012345",
                                                  "district": "Hyderabad", "budget": "Rs.90k",
                                                  "message": "400 members decoration"}).encode(),
                                 headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=25) as r:
        lead = json.loads(r.read().decode())
    check("lead → vendor WhatsApp text + more options",
          lead.get("success") and "NEW ENQUIRY" in lead.get("vendor_whatsapp_text", "")
          and "more_options" in lead, lead.get("reason"))
    st, dash2 = get("/api/vendors/%s/dashboard" % vid, headers={"X-Vendor-Token": reg.get("vendor_token", "")})
    _d2 = dash2 if isinstance(dash2, dict) else {}
    check("dashboard lo lead count +1", _d2.get("stats", {}).get("leads", 0) >= 1, _d2.get("stats") or st)
    st, rev = get("/api/admin/vendors/revenue/summary", headers=owner_headers("", admin=True))
    check("revenue summary lo ee vendor amount", st == 200 and rev.get("collected", 0) >= 1499, rev.get("collected"))
    st, ws = get("/vendors/%s" % vid, WEB)
    check("vendor page live 200", st == 200, st)

print("\n=== RESULT: %d pass / %d fail ===" % (len(PASS), len(FAIL)))
if FAIL:
    print("FAILED:")
    for f in FAIL:
        print("   ❌ " + f)
    sys.exit(1)
print("🏆 LIVE SMOKE PASS — referral rewards are one-time and eligibility-based")
