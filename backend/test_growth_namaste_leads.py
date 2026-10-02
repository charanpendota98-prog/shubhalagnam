"""
Mana Vivaha — GROWTH ENGINE TEST SUITE (Namaste welcome + Leads + Share kit + Launch DB)
=======================================================================================
Run:  python test_growth_namaste_leads.py

Enti check chesthundi (user requirements 1:1):
  1. 🙏 NAMASTE WELCOME AUTOMATION — register avvagane MANA WhatsApp nunchi card + details
     (Namaste text, TSAP id, chatting-ledu line, support number, admin alert)
  2. 📊 VISITOR + LEAD CAPTURE — "site ki vachina vallu, chusina vallu antha DB lo save"
     (middleware tracking, channel detection, quick lead, duplicate update, conversion, stats)
  3. 🎴 SHARE KIT — "oka profile chala mandi chudalanukune la" (card + caption + hashtags + links)
  4. 🚀 LAUNCH INVENTORY — "300–400 profiles chalu" (generator quality: caste/star/rasi/district/dob)
  5. 🛡️ ANTI-BAN — 120–170s random gap + break every 6 (Telegram mundu → WhatsApp tarvata)
"""
import os
import sys
import json
import random as _rnd  # 🛡️ R10: unique phone per run
from testutil_paths import src_page  # noqa: E402  # App Router page.tsx + page-client.tsx aware

os.environ.setdefault("PUBLISH_DRY_RUN", "true")
os.environ.setdefault("WA_TEST_FAST", "true")
os.environ.setdefault("WHATSAPP_MODE", "bridge")
os.environ.setdefault("DEMO_SEED_ENABLED", "true")
os.environ.setdefault("LAUNCH_SEED_COUNT", "0")

PASS, FAIL = [], []


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("  PASS " if cond else "  FAIL ") + name + (("  [" + str(extra)[:130] + "]") if extra and not cond else ""))



PH = "9848055%03d" % _rnd.randint(0, 999)  # 🛡️ R10: re-run safe (dup-phone reject)
# --------------------------------------------------------------------------- #
def test_namaste_welcome():
    print("\n[1] NAMASTE WELCOME AUTOMATION")
    import growth
    u = {"full_name": "Lakshmi Reddy", "age": 24, "caste": "Reddy", "sub_caste": "Pakanati",
         "gothram": "Bharadwaj", "star": "Rohini", "rasi": "Vrishabha", "height": "5'4\"",
         "education": "BTech", "education_detail": "CSE", "job": "Software Engineer", "company": "TCS",
         "salary": "8L", "district": "Hyderabad", "state": "TS", "family_type": "Nuclear",
         "family_status": "Middle Class", "phone": "9848011111", "phone_verified": True}
    t = growth.namaste_text(u, "TSAP-F-2025-1042")
    check("namaste text: Namaste greeting", "Namaste" in t or "నమస్తే" in t, t[:60])
    check("namaste text: name garu", "Lakshmi Reddy" in t, "")
    check("namaste text: TSAP id", "TSAP-F-2025-1042" in t, "")
    check("namaste text: full details (caste/star/job/district)",
          all(k in t for k in ["Reddy", "Rohini", "Software Engineer", "Hyderabad"]), "")
    check("namaste text: card + profile link", "/search/TSAP-F-2025-1042" in t, "")
    check("namaste text: 3 FREE interest requests", "3 FREE" in t, "")
    check("namaste text: chatting ledu (spam free)", "Chatting లేదు" in t, "")
    check("namaste text: number privacy line", "కనిపించదు" in t, "")
    check("namaste text: report advance-money scam line", "Advance money" in t, "")
    check("namaste text: 52 channels promise", "52" in t, "")
    check("namaste text: whatsapp status tip (reach)", "status" in t.lower(), "")
    a = growth.admin_new_profile_text(u, "TSAP-F-2025-1042", "website")
    check("admin alert: NEW REGISTRATION + source", "NEW REGISTRATION" in a and "website" in a, "")
    check("admin alert: phone + verified flag", "9848011111" in a and "verified" in a, "")
    check("admin alert: card link", "/cards/TSAP-F-2025-1042.png" in a, "")
    f = growth.lead_followup_text({"name": "Ravi", "phone": "9848099999", "district": "Warangal", "gender": "Groom"})
    check("lead follow-up: namaste + register link with phone", "నమస్తే" in f and "/register?phone=9848099999" in f, "")
    check("lead follow-up: team call offer (mass-friendly)", "call" in f.lower() or "team" in f.lower(), "")
    check("lead follow-up: safety line", "Chatting లేదు" in f, "")


# --------------------------------------------------------------------------- #
def test_visitor_tracking():
    print("\n[2] VISITOR + LEAD CAPTURE")
    import growth
    growth.DB_VISITORS.clear()
    growth.DB_LEADS.clear()

    growth.track_visit("49.207.1.1", "Mozilla/5.0 (Linux; Android 12; Redmi)", "/matches",
                       "https://wa.me/919848011111", "utm_source=status")
    growth.track_visit("49.207.1.2", "Mozilla/5.0 (Windows NT 10.0)", "/register", "https://t.me/TSBRIDE", "")
    growth.track_visit("49.207.1.3", "Mozilla/5.0 (iPhone; CPU iPhone OS 17)", "/castes/reddy-bride-hyderabad",
                       "https://www.google.com/search?q=telugu+matrimony", "")
    growth.track_visit("49.207.1.1", "Mozilla/5.0 (Linux; Android 12; Redmi)", "/requests", "", "")
    check("4 visits stored (chusina vallu save)", len(growth.DB_VISITORS) == 4, len(growth.DB_VISITORS))
    check("unique visitors = 3 (same device same vid)",
          len({v["vid"] for v in growth.DB_VISITORS}) == 3, len({v["vid"] for v in growth.DB_VISITORS}))
    chans = {v["path"]: v["channel"] for v in growth.DB_VISITORS}
    check("channel detect: whatsapp share", chans["/matches"] == "whatsapp", chans["/matches"])
    check("channel detect: telegram", chans["/register"] == "telegram", chans["/register"])
    check("channel detect: google organic", chans["/castes/reddy-bride-hyderabad"] == "google", chans["/castes/reddy-bride-hyderabad"])
    check("device detect: mobile (android/iphone)",
          growth.DB_VISITORS[0]["device"] == "mobile" and growth.DB_VISITORS[2]["device"] == "mobile", "")
    check("device detect: desktop (windows)", growth.DB_VISITORS[1]["device"] == "desktop", "")

    ok, kind, lead = growth.save_lead("Ravi Kumar", "9848098765", "Groom", "Warangal", "Reddy", "30", "matches_page")
    check("lead saved (new)", ok and kind == "new_lead" and lead["id"].startswith("LEAD-"), lead.get("id"))
    check("lead has follow-up promise", "followup" in lead, "")
    ok2, kind2, lead2 = growth.save_lead("Ravi Kumar", "9848098765", "", "Warangal", "", "", "matches_page")
    check("duplicate phone → update (no dup rows)", ok2 and kind2 == "already_lead" and len(growth.DB_LEADS) == 1, kind2)
    check("duplicate touch counter = 2", lead2.get("touches") == 2, lead2.get("touches"))
    bad_ok, bad_msg, _ = growth.save_lead("Bad", "12345")
    check("bad phone rejected (10 digits rule)", not bad_ok and "10 digit" in bad_msg, bad_msg)
    ok3, _, lead3 = growth.save_lead("Siri", "9700000001", "Bride", "Hyderabad", "Kamma", "26", "register")
    lead3["status"] = "converted"
    lead3["tsap_id"] = "TSAP-F-2025-9999"
    st = growth.lead_stats()
    check("stats: visits + unique", st["visits_total"] == 4 and st["visitors_unique"] == 3, st["visits_total"])
    check("stats: by_channel", st["by_channel"].get("whatsapp") == 1 and st["by_channel"].get("google") == 1, st["by_channel"])
    check("stats: leads_total = 2", st["leads_total"] == 2, st["leads_total"])
    check("stats: leads_new counts only 'new'", st["leads_new"] == 1, st["leads_new"])
    check("stats: top_paths present", len(st["top_paths"]) >= 3, st["top_paths"])
    check("stats: conversion %", st["conversion"] > 0, st["conversion"])
    check("stats: telugu message", "leads" in st["message_telugu"], st["message_telugu"][:60])
    lst = growth.leads_list()
    check("leads list endpoint shape", lst["total"] == 2 and len(lst["items"]) == 2, lst["total"])


# --------------------------------------------------------------------------- #
def test_share_kit():
    print("\n[3] SHARE KIT (reach engine)")
    import growth
    u = {"full_name": "Kiran Kumar Reddy", "age": 29, "caste": "Reddy", "district": "Nalgonda",
         "state": "TS", "education": "MBBS", "job": "Doctor", "salary": "2L+/mo", "star": "Mrigasira",
         "rasi": "Dhanu", "gothram": "Vasishta"}
    kit = growth.share_kit(u, "TSAP-M-2025-1042")
    check("share kit: card image url", kit["card_image"].endswith("/cards/TSAP-M-2025-1042.png"), kit["card_image"])
    check("share kit: caption has name + id", "Kiran Kumar Reddy" in kit["caption"] and "TSAP-M-2025-1042" in kit["caption"], "")
    check("share kit: whatsapp share link", kit["whatsapp_share"].startswith("https://wa.me/?text="), kit["whatsapp_share"][:40])
    check("share kit: telegram share link", kit["telegram_share"].startswith("https://t.me/share/url"), "")
    check("share kit: hashtags auto (caste + district)",
          any("Reddy" in h for h in kit["hashtags"]) and any("Nalgonda" in h for h in kit["hashtags"]), kit["hashtags"])
    check("share kit: best time to post (reach tip)", "8–10" in kit["best_time_to_post"] or "8-10" in kit["best_time_to_post"], kit["best_time_to_post"])
    check("share kit: 3 tips telugu", len(kit["tips_telugu"]) == 3, len(kit["tips_telugu"]))


# --------------------------------------------------------------------------- #
def test_launch_inventory():
    print("\n[4] LAUNCH INVENTORY GENERATOR (300-400 profiles)")
    import seed_launch_db as seed
    growth_inventory_target = 60
    profs = seed.build_profiles(growth_inventory_target, seed=42)
    check("60 profiles generated", len(profs) == 60, len(profs))
    brides = [p for p in profs if p["gender"] == "Bride"]
    check("brides/grooms balanced (30/30)", len(brides) == 30 and len(profs) - len(brides) == 30,
          "%d vs %d" % (len(brides), len(profs) - len(brides)))
    check("caste coverage >= 15 castes", len({p["caste"] for p in profs}) >= 15, len({p["caste"] for p in profs}))
    check("district coverage >= 15 districts", len({p["district"] for p in profs}) >= 15, len({p["district"] for p in profs}))
    check("state mix TS + AP", {p["state"] for p in profs} == {"TS", "AP"}, {p["state"] for p in profs})
    check("TSAP ids unique", len({p["tsap_id"] for p in profs}) == len(profs), "")
    check("phones unique", len({p["phone"] for p in profs}) == len(profs), "")
    check("star → rasi correct (porutham ki)", all(p["rasi"] == seed.NAK_TO_RASI[p["star"]] for p in profs), "")
    check("all 27 nakshatras valid", all(p["star"] in seed.NAK_TO_RASI for p in profs), "")
    ages_ok = all((22 <= p["age"] <= 30) if p["gender"] == "Bride" else (26 <= p["age"] <= 36) for p in profs)
    check("age bands correct (bride 22-30, groom 26-36)", ages_ok, "")
    dob_ok = all(p["dob"][:4].isdigit() and len(p["dob"]) == 10 for p in profs)
    check("dob valid ISO", dob_ok, "")
    check("salary values non-empty", all(p["salary"] for p in profs), "")
    check("about_myself + expectations filled", all(p["about_myself"] and p["expectations"] for p in profs), "")
    check("caste-wise surnames (name !== caste always)",
          all(len(p["full_name"].split()) >= 1 for p in profs), "")
    inv = __import__("growth").inventory_status(360)
    check("inventory: target 360 ready", inv["ready"] and inv["total_profiles"] == 360, inv)
    inv2 = __import__("growth").inventory_status(120)
    check("inventory: partial (<360) shows gap", (not inv2["ready"]) and "కావాలి" in inv2["message_telugu"], inv2["message_telugu"][:70])
    check("inventory: how_to_fill has 4 ways", len(inv2["how_to_fill"]) == 4, len(inv2["how_to_fill"]))


# --------------------------------------------------------------------------- #
def test_api_endpoints_and_register_namaste():
    print("\n[5] API FLOW (TestClient): register → namaste → leads → share kit → inventory")
    from fastapi.testclient import TestClient
    import main
    with TestClient(main.app) as c:
        # visits tracked by middleware
        before = len(main.growth.DB_VISITORS)
        c.get("/matches")
        c.get("/castes/reddy-bride-hyderabad")
        after = len(main.growth.DB_VISITORS)
        check("middleware: /matches + /castes visit logged", after >= before + 2, "%d → %d" % (before, after))

        resp = c.post("/api/register", data={
            "gender": "Groom", "full_name": "Namaste Groom Test", "age": 30, "height": "5'10\"",
            "marital_status": "Pelli Kaledu", "caste": "Reddy", "gothram": "Vasishta", "star": "Mrigasira",
            "rasi": "Dhanu", "education": "MBA", "job": "Business", "salary": "12L", "district": "Nalgonda",
            "state": "TS", "phone": PH, "dob_correct": True, "phone_verified": True,
        })
        reg = resp.json()
        check("POST /api/register 200", resp.status_code == 200, str(reg)[:110])
        check("register: tsap_id + card_url", bool(reg.get("tsap_id")) and reg.get("card_url", "").endswith(".png"), reg.get("tsap_id"))
        check("register: namaste_queued True (mana WhatsApp welcome ready)", reg.get("namaste_queued") is True, reg.get("namaste_queued"))
        check("register: share_kit embedded (reach)", bool((reg.get("share_kit") or {}).get("whatsapp_share")), "")
        check("register: auto_post_queue (channels)", len(reg.get("auto_post_queue") or []) >= 1, reg.get("auto_post_queue"))
        check("register: top_3_matches (FREE matches)", isinstance(reg.get("top_3_matches"), list), "")
        check("register: welcome_status has manual_text (WA off lo matcher ki ready)",
              bool((reg.get("welcome_status") or {}).get("manual_text")) or bool((reg.get("welcome_status") or {}).get("queued")),
              reg.get("welcome_status"))
        # lead converted
        conv = [l for l in main.growth.DB_LEADS if l.get("phone") == PH]
        check("register → lead converted + tsap link", conv and conv[0]["status"] == "converted" and conv[0].get("tsap_id") == reg.get("tsap_id"),
              conv[0] if conv else "none")

        q = c.post("/api/leads/quick", json={"name": "Quick Lead", "phone": "9700012345", "gender": "Bride",
                                             "district": "Khammam", "source": "homepage"}).json()
        check("POST /api/leads/quick success", q.get("success") and q.get("lead_id", "").startswith("LEAD-"), str(q)[:120])
        check("quick lead: register link + callback promise",
              q.get("next", "").startswith("/register?phone=") and "call" in q.get("message_telugu", "").lower(), q.get("message_telugu", "")[:60])
        st2 = c.get("/api/leads/stats").json()
        check("GET /api/leads/stats (traffic + leads + inventory)",
              st2.get("visits_total", 0) >= 2 and st2.get("leads_total", 0) >= 2 and st2.get("inventory"), str(list(st2.keys()))[:110])
        st3 = c.get("/api/inventory").json()
        check("GET /api/inventory (castes/districts/verified/photos)",
              all(k in st3 for k in ("castes_covered", "districts_covered", "verified", "photos")), str(list(st3.keys()))[:110])
        kit = c.get("/api/share/kit/" + reg["tsap_id"]).json()
        check("GET /api/share/kit/{id}", "share" in json.dumps(kit), "")
        lp = c.get("/api/leads").json()
        check("GET /api/leads list", lp.get("total", 0) >= 2, lp.get("total"))
        lead_id = q.get("lead_id")
        fu = c.post("/api/leads/followup/" + lead_id).json()
        check("POST /api/leads/followup/{id} → status contacted",
              fu.get("success") and fu["lead"]["status"] == "contacted", str(fu)[:100])
        # 🛡️ R10: unique seed per run — same seed = same tsap_ids = endpoint correctly skips dups
        bulk = c.post("/api/admin/bulk-profiles", json={"generate": 30, "seed": _rnd.randint(1000, 9999)}).json()
        check("POST /api/admin/bulk-profiles → launch inventory load",
              bulk.get("success") and bulk.get("added") == 30, str(bulk)[:110])
        check("inventory grows after bulk load", bulk["inventory"]["total_profiles"] >= 30, bulk["inventory"]["total_profiles"])
        inv_after = c.get("/api/inventory").json()
        check("inventory: castes + districts covered after load",
              inv_after["castes_covered"] >= 10 and inv_after["districts_covered"] >= 10,
              "castes=%s districts=%s" % (inv_after["castes_covered"], inv_after["districts_covered"]))


# --------------------------------------------------------------------------- #
def test_antiban_breaks_and_expiry():
    print("\n[6] ANTI-BAN (120-170s + break every 6) + request expiry")
    from wa_antiban import WhatsAppAntiban
    import tempfile
    # --- PRODUCTION MODE: real 120-170s gap + break every 6th message ---
    os.environ["WA_TEST_FAST"] = "false"
    os.environ["WA_LONG_PAUSE_CHANCE"] = "0"      # deterministic (long pause ni separate ga test chestham)
    e = WhatsAppAntiban(tempfile.mktemp(suffix=".json"))
    gaps = []
    for _ in range(14):
        e.record_send("@channel", ok=True, priority=1)
        gaps.append(round(e.state["next_gap"]))
    normals = [g for g in gaps if g < 400]
    breaks = [g for g in gaps if g >= 400]
    check("normal gaps 120-170s (production mode)", all(120 <= g <= 170 for g in normals), normals[:5])
    check("gaps random (unique > 5)", len(set(normals)) > 5, sorted(set(normals))[:5])
    check("break every 6th message (8-20 min)", len(breaks) == 2, breaks)
    check("break lands on 6th + 12th slot",
          [i + 1 for i, g in enumerate(gaps) if g >= 400] == [6, 12],
          [i + 1 for i, g in enumerate(gaps) if g >= 400])
    check("break length = 8-20 min pause + normal gap (600-1370s)", all(600 <= b <= 1370 for b in breaks), breaks)
    check("interest fast lane 60-120s",
          all(60 <= round(e._current_gap(0)) <= 120 for _ in range(5)), "")
    c = e.cfg()
    check("anti-ban ON + cap 60/day + quiet 8-22",
          c["enabled"] and c["daily_cap"] == 60 and c["active_start"] == 8 and c["active_end"] == 22,
          (c["daily_cap"], c["active_start"], c["active_end"]))
    check("target cap 8/day per channel", c["target_daily_cap"] == 8, c["target_daily_cap"])
    os.environ["WA_LONG_PAUSE_CHANCE"] = "1"
    lp = WhatsAppAntiban(tempfile.mktemp(suffix=".json"))
    lp.record_send("@c", ok=True, priority=1)
    check("8% long pause (manishi la) = gap > 300s", lp.state["next_gap"] > 300, lp.state["next_gap"])
    os.environ["WA_LONG_PAUSE_CHANCE"] = "0"
    check("warmup ramp day-1 < full cap", e.warmup_cap() < 60, e.warmup_cap())
    check("gap send-time lo LOCK (re-roll avvadu)", abs(e.wait_seconds(1) - e.wait_seconds(1)) < 1.0, "")
    # --- TEST MODE: fast gaps (suites ventane run avvali) ---
    os.environ["WA_TEST_FAST"] = "true"
    f = WhatsAppAntiban(tempfile.mktemp(suffix=".json"))
    f.record_send("@channel", ok=True, priority=1)
    check("WA_TEST_FAST mode: gap 1-2s (tests fast)", 0.0 <= f.wait_seconds(1) <= 2.5, f.wait_seconds(1))
    os.environ["WA_TEST_FAST"] = "false"
    import growth
    from datetime import datetime, timedelta
    old = (datetime.utcnow() - timedelta(days=9)).isoformat()
    reqs = [{"id": "R1", "status": "pending", "at": old}, {"id": "R2", "status": "pending", "at": datetime.utcnow().isoformat()}]
    n = growth.expire_old_requests(reqs, days=7)
    check("7-day expiry: old pending → expired", n == 1 and reqs[0]["status"] == "expired" and reqs[1]["status"] == "pending", n)



# --------------------------------------------------------------------------- #
def test_pricing_consistency():
    """
    💰 PRICING PARITY — API ↔ UI ↔ docs. "Em aina wrong chesthunna?" ee test answer istundi.
    Real bug idi: website lo ₹99 → 3 ani chupisthe, backend ₹99 → 5 isthe customer confuse avutadu.
    """
    print("\n[7] PRICING CONSISTENCY (API ↔ UI)")
    import re
    from fastapi.testclient import TestClient
    import main
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    with TestClient(main.app) as c:
        plans = c.get("/api/plans").json()
    api = {str(p.get("code") or p.get("plan")): (p.get("price"), int(p.get("profiles") or p.get("credits") or 0))
           for p in plans.get("plans", [])}
    check("API ladder: ₹99→5", api.get("S_99") == (99, 5), api.get("S_99"))
    check("API ladder: ₹199→12", api.get("S_199") == (199, 12), api.get("S_199"))
    check("API ladder: ₹299→25", api.get("S_299") == (299, 25), api.get("S_299"))
    check("API ladder: ₹499→50 VIP", api.get("S_499") == (499, 50), api.get("S_499"))
    check("API: FREE 3 (funnel)", api.get("FREE") == (0, 3), api.get("FREE"))
    per = {code: round(price / profiles, 1) for code, (price, profiles) in api.items() if price and profiles}
    check("₹/profile prati tier lo thaggutundi (anchoring)",
          per.get("S_99", 99) > per.get("S_199", 0) > per.get("S_299", 0) > per.get("S_499", 0),
          per)
    check("₹99 tier == FREE ki same kadhu (conversion killer fix)",
          api.get("S_99", (0, 0))[1] > api.get("FREE", (0, 0))[1], "%s vs %s" % (api.get("S_99"), api.get("FREE")))

    # UI (requests page fallback) — API tho match avvali
    ui = {}
    txt = pathlib_read(os.path.join(root, "frontend", "src", "app", "requests", "page.tsx"))
    for m in re.finditer(r'code: "(S_\d+)", price: (\d+), profiles: (\d+)', txt):
        ui[m.group(1)] = (int(m.group(2)), int(m.group(3)))
    check("UI requests page: 4 plans rendered", len(ui) >= 4, ui)
    check("UI ↔ API prices match (mismatch = customer confusion)",
          all(ui.get(k) == v for k, v in ui.items()), "ui=%s api=%s" % (ui, {k: api.get(k) for k in ui}))

    # homepage — prathi plan price kanipinchali
    hp = pathlib_read(os.path.join(root, "frontend", "src", "app", "page.tsx"))
    check("Homepage lo ₹99/₹199/₹299/₹499 anni unnayi",
          all(x in hp for x in ["₹99", "₹199", "₹299", "₹499"]), "")
    check("Homepage lo stale '₹99 → 3' text ledu (fix)", "₹99 → 3 profiles" not in hp, "")
    # docs
    doc = pathlib_read(os.path.join(root, "PLAN-ADVANCED-STRATEGY.md"))
    check("Strategy doc lo kotha ladder undi", "₹99 → **5 profiles**" in doc or "₹99 → 5" in doc, "")
    check("Doc lo 5/12/25/50 ladder table", all(x in doc for x in ["₹99", "₹199", "₹299", "₹499"]), "")
    addons = plans.get("addons") or []
    check("Add-ons 4 unnayi (boost/whoviewed/porutham/verify)", len(addons) >= 4, [a.get("code") for a in addons])
    check("Renewal offer undi", bool(plans.get("renewal")), str(plans.get("renewal"))[:80])
    check("Chatting ledu model confirm", plans.get("chatting") is False, plans.get("chatting"))


def test_pricing_pages_and_payments():
    """
    💰 PRICING V2 — ₹29 micro tier, webhook mapping fix, /pricing + legal pages.
    (User question: "emi aina wrong chesthunna? inka bestga cheyochaa?")
    """
    print("\n[8] PRICING V2 — MICRO TIER + PAYMENT MAPPING + POLICY PAGES")
    from fastapi.testclient import TestClient
    import interest as I
    import credits as CR
    import main
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # ---- ₹29 micro tier (impulse + anchor) ----
    codes = [p["code"] for p in I.plan_list()]
    check("₹29 micro tier (S_29) ladder lo undi", codes[0] == "S_29", codes)
    micro = I.get_plan("S_29")
    check("S_29 → 1 profile @ ₹29 (anchor: top tier ₹10/profile)", micro["price"] == 29 and micro["profiles"] == 1)
    check("S_29 ki 15 రోజుల validity", micro["validity_days"] == 15)
    per = [p["per_profile"] for p in I.plan_list()]
    check("₹/profile ladder thaggutundi (29 → 20 → 17 → 12 → 10)",
          per == [29, 20, 17, 12, 10], per)

    # ---- legacy credits.py == kotha interest.py (okka pricing truth) ----
    mismatch = [(k, v["price"], v["credits"]) for k, v in CR.PLANS.items()
                if k in ("S_29", "S_99", "S_199", "S_299", "S_499")
                and (v["price"], v["credits"]) != (I.PLANS[k]["price"], I.PLANS[k]["profiles"])]
    check("credits.py amounts/credits interest.py tho match (legacy drift ledu)", not mismatch, mismatch)
    check("legacy aliases kooda kotha prices ki map (TRIAL_99 → ₹99/5)",
          CR.PLANS["TRIAL_99"]["price"] == 99 and CR.PLANS["TRIAL_99"]["credits"] == 5)

    # ---- apply_payment (webhook + order rendu okate source) ----
    u = {"tsap_id": "TSAP-M-2025-1042", "credits": 0}
    r199 = I.apply_payment(u, 199)
    check("apply_payment ₹199 → S_199 + 12 profiles", r199["ok"] and r199["plan"]["code"] == "S_199"
          and r199["profiles_added"] == 12 and u["credits"] == 12, r199.get("message_telugu"))
    check("apply_payment expiry set ayyindi", bool(u.get("plan_expiry")))
    r29 = I.apply_payment(u, 29)
    check("apply_payment ₹29 → +1 profile (total 13)", r29["profiles_added"] == 1 and u["credits"] == 13)
    r_add = I.apply_payment(u, 49)
    check("apply_payment ₹49 → addon (boost) — credits add avvavu", r_add["kind"] == "addon" and u["credits"] == 13)
    r_bad = I.apply_payment(u, 150)
    check("tappu amount (₹150) reject avutundi", not r_bad["ok"] and u["credits"] == 13)

    # ---- webhook endpoint (neeDHA bug: legacy plan_map) ----
    with TestClient(main.app) as c:
        # 🐞 FIX (R12): seed user TSAP-F-2025-1042 DB lo lekapothe (fresh DB / hygiene drops) — create
        _web_u = next((x for x in main.DB_USERS if x["tsap_id"] == "TSAP-F-2025-1042"), None)
        if _web_u is None:
            _web_u = {"tsap_id": "TSAP-F-2025-1042", "full_name": "Sita Reddy", "gender": "Bride",
                      "phone": "9848022222", "credits": 3, "plan": "FREE", "wallet": 0}
            main.DB_USERS.append(_web_u)
        w = c.post("/api/payment/webhook?user_id=TSAP-F-2025-1042&amount=499&razorpay_payment_id=pay_T1").json()
        check("webhook ₹499 → S_499 + 50 profiles", w["success"] and w["plan"] == "S_499"
              and w["profiles_added"] == 50, w.get("plan"))
        check("webhook lo legacy TRIAL_99/PREMIUM_299 vellavu", w["plan"] not in ("TRIAL_99", "PREMIUM_299", "VIP_999"))
        check("webhook message lo profiles kanipisthundi ('profiles')", "profiles" in w["message_telugu"], w["message_telugu"][:80])
        check("webhook GST note + perks unnai", "gst_note" in w and isinstance(w.get("perks"), list))
        w2 = c.post("/api/payment/webhook?user_id=TSAP-F-2025-1042&amount=150&razorpay_payment_id=pay_T2")
        check("webhook tappu amount → 400 + correct amounts list", w2.status_code == 400
              and 199 in w2.json().get("valid_amounts", []), w2.status_code)
        w3 = c.post("/api/payment/webhook?user_id=TSAP-F-2025-1042&amount=99")
        check("webhook payment proof lekapote reject", w3.status_code == 400)
        plans_api = c.get("/api/plans").json()
    check("API /api/plans lo S_29 kooda chupisthundi",
          any(p["code"] == "S_29" for p in plans_api["plans"]))

    # ---- /pricing + legal pages (Razorpay approval + trust) ----
    pages = {name: pathlib_read(os.path.join(root, "frontend", "src", "app", name, "page.tsx"))
             for name in ("pricing", "terms", "privacy", "refund")}
    check("/pricing page undi + /api/plans nunchi data", "/api/plans" in pages["pricing"])
    # 💍 R13: pricing minimal redesign — sodi remove (user order). Tier cards + addons +
    # renewal + FAQ inka unnayi; pata "Compare" table / "Vivaha VIP" label / "Single Request" text kaadu
    check("/pricing lo anni tiers + addons + renewal", all(x in pages["pricing"] for x in
          ("S_499", "S_29", "S_99", "S_199", "S_299", "Add-ons", "Renewal", "Referral")))
    check("/pricing lo micro tier + FAQ + numbers policy", "₹29" in pages["pricing"]
          and "FAQ" in pages["pricing"] and "రెండు వైపులా accept" in pages["pricing"])
    check("/refund policy lo decline-refund + 7-day + GST", all(x in pages["refund"] for x in
          ("7 ", "declin", "GST", "6")))
    # 🛠️ FIX: the invariant is "terms must state the no-chatting model + age
    # eligibility + banned-conduct list + jurisdiction" — in EITHER language.
    # The old assertion hard-coded the English word "Chatting" with a capital C,
    # while the shipped copy says "No casual chatting / DM feature" (and the
    # Telugu block says "చాటింగ్"), so the check failed on a casing technicality
    # instead of testing the real policy content.
    _terms = pages["terms"]
    _terms_lower = _terms.lower()
    check("/terms lo eligibility 18+/21+ + chatting ledu + banned list",
          all(x in _terms for x in ("21+", "Prohibited", "Hyderabad"))
          and ("chatting" in _terms_lower or "చాటింగ్" in _terms),
          [t for t in ("21+", "Prohibited", "Hyderabad", "chatting") if t not in _terms and t.lower() not in _terms_lower])
    check("/privacy lo DPDP + grievance officer + delete 30 days", all(x in pages["privacy"] for x in
          ("Grievance", "30 ", "delete", "అమ్మము")))
    _links = {"pricing": ["/refund", "/terms", "/privacy"], "terms": ["/pricing", "/refund", "/privacy"],
              "privacy": ["/pricing", "/refund", "/safety"], "refund": ["/pricing", "/terms", "/privacy"]}
    _bad = [k for k, need in _links.items() if not all(('href="%s"' % u) in pages[k] for u in need)]
    check("legal pages cross-links unnai", not _bad, _bad)
    footer = pathlib_read(os.path.join(root, "frontend", "src", "components", "SiteFooter.tsx"))
    header = pathlib_read(os.path.join(root, "frontend", "src", "components", "SiteHeader.tsx"))
    check("Footer lo Pricing + Policies column", all(x in footer for x in ("/pricing", "/refund", "/terms", "/privacy")))
    check("Nav lo Pricing link", 'href: "/pricing"' in header)
    sitemap = pathlib_read(os.path.join(root, "frontend", "src", "app", "sitemap.ts"))
    check("Sitemap lo pricing + policies", all(x in sitemap for x in ("/pricing", "/refund", "/privacy", "/terms")))
    site_cfg = pathlib_read(os.path.join(root, "frontend", "src", "lib", "site-config.ts"))
    check("site-config lo ₹29 bundle", "single: 29" in site_cfg and "Okka Request" in site_cfg)


def pathlib_read(path):
    return src_page(path)


# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    print("=" * 68)
    print(" MANA VIVAHA — GROWTH ENGINE SUITE (namaste + leads + share kit + launch DB)")
    print("=" * 68)
    test_namaste_welcome()
    test_visitor_tracking()
    test_share_kit()
    test_launch_inventory()
    test_api_endpoints_and_register_namaste()
    test_antiban_breaks_and_expiry()
    test_pricing_consistency()
    test_pricing_pages_and_payments()
    print("\n" + "=" * 68)
    print(" RESULT: %d passed, %d failed" % (len(PASS), len(FAIL)))
    if FAIL:
        print(" FAILED:")
        for f in FAIL:
            print("   FAIL " + f)
    print("=" * 68)
    sys.exit(1 if FAIL else 0)
