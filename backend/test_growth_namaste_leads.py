"""
Mana Vivaha — GROWTH SAFETY TESTS (welcome copy, consented leads, share links, pricing)
=====================================================================================
Run from the repository root: python backend/test_growth_namaste_leads.py

Coverage:
  1. Welcome text is prepared truthfully; queue status is not inferred from copy.
  2. Visitor analytics and lead contact consent are tested with isolated stores.
  3. Share links do not promise audience/reach or reconstruct disabled destinations.
  4. Synthetic profiles stay in a test-only fixture; no API seed path is used.
  5. WhatsApp tests are offline/mocked; no external message is sent.
"""

import os
import sys
import json
import random as _rnd
from testutil_paths import src_page  # noqa: E402
from test_storage import isolate_test_stores  # noqa: E402

# Every integration test writes to a disposable directory; never touch live stores.
_TEST_STORE = isolate_test_stores("growth-namaste-leads")
for _name in (
    "BOT_TOKEN", "BOT_TOKEN_BACKUP", "BOT_TOKEN_ALERT", "BOT_POOL_JSON",
    "WHATSAPP_TOKEN", "WHATSAPP_PHONE_ID", "WHATSAPP_BRIDGE_URL",
    "WHATSAPP_TO", "WHATSAPP_BRIDGE_TARGETS", "ADMIN_WHATSAPP_NUMBER",
    "DATABASE_URL", "TELEGRAM_CHANNEL_DESTINATIONS_JSON",
):
    os.environ.pop(_name, None)
os.environ.update({
    "APP_ENV": "test", "ENV": "test", "TSAP_AUTH_MODE": "off",
    "PUBLISH_DRY_RUN": "true", "AUTO_POST_ON_REGISTER": "false",
    "AUTO_POST_ON_APPROVAL": "false", "WHATSAPP_MODE": "off",
    "WA_ENABLED": "false", "WA_TEST_FAST": "true",
    "DEMO_SEED_ENABLED": "false", "LAUNCH_SEED_COUNT": "0",
})

PASS, FAIL = [], []


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("  PASS " if cond else "  FAIL ") + name + (("  [" + str(extra)[:130] + "]") if extra and not cond else ""))



PH = "9848055%03d" % _rnd.randint(0, 999)  # 🛡️ R10: re-run safe (dup-phone reject)
# --------------------------------------------------------------------------- #
def test_namaste_welcome():
    print("\n[1] WELCOME COPY + FOLLOW-UP SCOPE")
    import growth
    u = {"full_name": "Lakshmi Reddy", "age": 24, "caste": "Reddy", "sub_caste": "Pakanati",
         "gothram": "Bharadwaj", "star": "Rohini", "rasi": "Vrishabha", "height": "5'4\"",
         "education": "BTech", "education_detail": "CSE", "job": "Software Engineer", "company": "TCS",
         "salary": "8L", "district": "Hyderabad", "state": "TS", "family_type": "Nuclear",
         "family_status": "Middle Class", "phone": "9848011111", "phone_verified": True}
    t = growth.namaste_text(u, "TSAP-F-2025-1042")
    check("welcome text: greeting + member name", ("Namaste" in t or "నమస్తే" in t) and "Lakshmi Reddy" in t, "")
    check("welcome text: profile ID and first-party profile link",
          "TSAP-F-2025-1042" in t and "/search/TSAP-F-2025-1042" in t, "")
    check("welcome text: profile facts are based on supplied member data",
          all(k in t for k in ["Reddy", "Rohini", "Software Engineer", "Hyderabad"]), "")
    check("welcome text: no channel-count, reach, delivery, or callback promise",
          not any(k in t.lower() for k in ("52 channels", "views ఎక్కువ", "callback", "within 24 hours")), "")
    check("welcome text: safety and consent limitations present",
          "consent" in t.lower() and "independently verify" in t.lower(), "")
    a = growth.admin_new_profile_text(u, "TSAP-F-2025-1042", "website")
    check("admin alert identifies source and recorded phone-OTP status",
          "NEW REGISTRATION" in a and "website" in a and "Phone OTP recorded" in a, "")
    check("admin alert links the profile card without promising a call",
          "/cards/TSAP-F-2025-1042.png" in a and "welcome call" not in a.lower(), "")
    f = growth.lead_followup_text({"name": "Ravi", "phone": "9848099999", "district": "Warangal", "gender": "Groom"})
    check("lead follow-up is purpose-limited and has no phone in URL",
          "registration assistance" in f.lower() and "/register" in f and "9848099999" not in f, "")
    check("lead follow-up makes no callback promise and clearly disclaims delivery",
          "callback" not in f.lower() and "within 24" not in f.lower()
          and "delivery హామీ లేదు" in f, "")


# --------------------------------------------------------------------------- #
def test_visitor_tracking():
    print("\n[2] VISITOR ANALYTICS + LEAD CONSENT DEFAULT")
    import growth
    growth.DB_VISITORS.clear()
    growth.DB_LEADS.clear()

    growth.track_visit("49.207.1.1", "Mozilla/5.0 (Linux; Android 12; Redmi)", "/matches",
                       "https://wa.me/919848011111", "utm_source=status",
                       extra={"screen": "390x844", "lang": "te", "seconds": 12,
                              "visitor_id": "untrusted", "ip": "untrusted", "ua": "untrusted"})
    growth.track_visit("49.207.1.2", "Mozilla/5.0 (Windows NT 10.0)", "/register", "https://t.me/TSBRIDE", "")
    growth.track_visit("49.207.1.3", "Mozilla/5.0 (iPhone; CPU iPhone OS 17)", "/castes/reddy-bride-hyderabad",
                       "https://www.google.com/search?q=telugu+matrimony", "")
    growth.track_visit("49.207.1.1", "Mozilla/5.0 (Linux; Android 12; Redmi)", "/requests", "", "")
    check("four page visits stored; unique device IDs remain stable", len(growth.DB_VISITORS) == 4
          and len({v["vid"] for v in growth.DB_VISITORS}) == 3, len(growth.DB_VISITORS))
    chans = {v["path"]: v["channel"] for v in growth.DB_VISITORS}
    check("referrer classification is analytics only", chans["/matches"] == "whatsapp"
          and chans["/register"] == "telegram" and chans["/castes/reddy-bride-hyderabad"] == "google", chans)
    check("device classification records mobile and desktop", growth.DB_VISITORS[0]["device"] == "mobile"
          and growth.DB_VISITORS[1]["device"] == "desktop" and growth.DB_VISITORS[2]["device"] == "mobile", "")
    first_event = growth.DB_VISITORS[0]
    check("visitor events omit client IDs/raw IP/user-agent and reduce referrers to origin",
          all(key not in first_event for key in ("ip", "ua", "visitor_id"))
          and first_event["ref"] == "https://wa.me" and first_event["utm"] == "utm_source=status"
          and first_event.get("screen") == "390x844" and first_event.get("lang") == "te"
          and first_event.get("seconds") == 12)
    check("campaign analytics discard free-form query and contact-like values",
          growth._safe_utm("utm_source=whatsapp&email=member%40example.test&utm_campaign=1234567890")
          == "utm_source=whatsapp")

    from datetime import datetime, timedelta
    initial_events = list(growth.DB_VISITORS)
    growth.DB_VISITORS[:] = [{"vid": "old", "at": (datetime.utcnow() - timedelta(days=31)).isoformat()}]
    growth._LAST_VISITOR_PRUNE_AT = datetime.utcnow() - timedelta(seconds=growth.VISITOR_PRUNE_INTERVAL_SECONDS + 1)
    growth.track_visit("fixture-ip", "fixture-agent", "/fresh", "", "")
    check("visitor analytics expire events older than the retention window",
          len(growth.DB_VISITORS) == 1 and growth.DB_VISITORS[0]["path"] == "/fresh")
    old_limit = growth.MAX_VISITOR_EVENTS
    growth.MAX_VISITOR_EVENTS = 3
    growth._LAST_VISITOR_PRUNE_AT = datetime.utcnow() - timedelta(seconds=growth.VISITOR_PRUNE_INTERVAL_SECONDS + 1)
    for idx in range(5):
        growth.track_visit(f"fixture-ip-{idx}", "fixture-agent", f"/bounded/{idx}")
    check("visitor analytics stay under the configured event cap",
          len(growth.DB_VISITORS) == 3 and growth.DB_VISITORS[-1]["path"] == "/bounded/4")
    growth.MAX_VISITOR_EVENTS = old_limit
    growth.DB_VISITORS[:] = initial_events

    ok, kind, lead = growth.save_lead("Ravi Kumar", "9848098765", "Groom", "Warangal", "Reddy", "30", "matches_page")
    check("new lead defaults to no contact consent and no follow-up", ok and kind == "new_lead"
          and lead["contact_consent"] is False and lead["followup"] == "not_queued", lead)
    ok2, kind2, lead2 = growth.save_lead("Ravi Kumar", "9848098765", "", "Warangal", "", "", "matches_page")
    check("duplicate phone updates the existing lead without duplicate row", ok2 and kind2 == "already_lead"
          and len(growth.DB_LEADS) == 1 and lead2.get("touches") == 2, kind2)
    bad_ok, bad_msg, _ = growth.save_lead("Bad", "12345")
    check("invalid phone rejected", not bad_ok and "10 digit" in bad_msg, bad_msg)
    ok3, _, lead3 = growth.save_lead("Siri", "9700000001", "Bride", "Hyderabad", "Kamma", "26", "register")
    lead3["status"] = "converted"
    lead3["tsap_id"] = "TSAP-F-2025-9999"
    st = growth.lead_stats()
    check("analytics counts actual visits and unique devices", st["visits_total"] == 4 and st["visitors_unique"] == 3, st)
    check("analytics records source counts and paths", st["by_channel"].get("whatsapp") == 1
          and st["by_channel"].get("google") == 1 and len(st["top_paths"]) >= 3, st["by_channel"])
    check("lead stats count only new status as new", st["leads_total"] == 2 and st["leads_new"] == 1, st)
    check("lead stats message is based on stored rows", "leads" in st["message_telugu"], st["message_telugu"])
    lst = growth.leads_list()
    check("admin list shape reflects actual stored test leads", lst["total"] == 2 and len(lst["items"]) == 2, lst["total"])


# --------------------------------------------------------------------------- #
def test_share_kit():
    print("\n[3] MEMBER-DIRECTED SHARE KIT")
    import growth
    u = {"full_name": "Kiran Kumar Reddy", "age": 29, "caste": "Reddy", "district": "Nalgonda",
         "state": "TS", "education": "MBBS", "job": "Doctor", "salary": "2L+/mo", "star": "Mrigasira",
         "rasi": "Dhanu", "gothram": "Vasishta"}
    kit = growth.share_kit(u, "TSAP-M-2025-1042")
    check("share kit: card URL has exact member ID", kit["card_image"].endswith("/cards/TSAP-M-2025-1042.png"), kit["card_image"])
    check("share kit: caption has member-provided name + ID", "Kiran Kumar Reddy" in kit["caption"]
          and "TSAP-M-2025-1042" in kit["caption"], "")
    check("share sheet links have no recipient phone number",
          kit["whatsapp_share"].startswith("https://wa.me/?text=")
          and kit["telegram_share"].startswith("https://t.me/share/url"), "")
    check("share kit: hashtags derive from member-provided caste/district",
          any("Reddy" in h for h in kit["hashtags"]) and any("Nalgonda" in h for h in kit["hashtags"]), kit["hashtags"])
    check("share kit: no unsupported posting-time or reach claim",
          "best_time_to_post" not in kit and "views ఎక్కువ" not in json.dumps(kit, ensure_ascii=False), "")
    check("share kit tips include consent and audience variability", len(kit["tips_telugu"]) == 3
          and "consent" in kit["tips_telugu"][1].lower() and "reach/views" in kit["tips_telugu"][0].lower(), "")


def test_isolated_test_fixture():
    print("\n[4] TEST-ONLY PROFILE FIXTURE ISOLATION")
    from test_fixtures import seed_launch_profiles as seed
    import main
    before = len(main.DB_USERS)
    profs = seed.build_profiles(60, seed=42)
    check("fixture generator returns disposable test records only", len(profs) == 60
          and all(p.get("seed_source") or p.get("demo") or p.get("is_demo") for p in profs), "")
    check("fixture profile IDs and phones are unique", len({p["tsap_id"] for p in profs}) == len(profs)
          and len({p["phone"] for p in profs}) == len(profs), "")
    check("fixture records never enter application member store", len(main.DB_USERS) == before, len(main.DB_USERS))
    inv = main.api_inventory()
    check("live inventory contains only real stored member records; no launch target", "ready" not in inv
          and "target_profiles" not in inv and inv.get("total_profiles") == before, inv)


# --------------------------------------------------------------------------- #
def test_api_endpoints_and_register_namaste():
    print("\n[5] API FLOW (isolated registration → consented lead → owner share kit)")
    from testutil_client import TestClient
    import main
    with TestClient(main.app) as c:
        before = len(main.growth.DB_VISITORS)
        c.get("/matches")
        c.get("/castes/reddy-bride-hyderabad")
        after = len(main.growth.DB_VISITORS)
        check("middleware visit tracking records actual requests", after >= before + 2, "%d → %d" % (before, after))

        resp = c.post("/api/register", data={
            "gender": "Groom", "full_name": "Namaste Groom Test", "dob": "1996-04-15", "height": "5'10\"",
            "marital_status": "Pelli Kaledu", "religion": "Hindu", "caste": "Reddy", "gothram": "Vasishta", "star": "Mrigasira",
            "rasi": "Dhanu", "education": "MBA", "job": "Business", "salary": "12L", "district": "Nalgonda",
            "state": "TS", "phone": PH, "password": "test-pass-123",
            "consent_confirmed": True, "dob_correct": True, "phone_verified": True,
        })
        reg = resp.json()
        registration_ok = resp.status_code == 200 and bool(reg.get("tsap_id")) and bool(reg.get("auth_token"))
        check("POST /api/register succeeds with a profile ID and owner token", registration_ok, str(reg)[:180])
        if not registration_ok:
            print("  SKIP registration-dependent assertions: registration response did not contain an ID and owner token")
            return
        check("registration returns a card URL", reg.get("card_url", "").endswith(".png"), reg.get("card_url"))
        check("prepared welcome text is not reported as queued when WhatsApp is off",
              reg.get("namaste_queued") is False and not (reg.get("welcome_status") or {}).get("queued"), reg.get("welcome_status"))
        check("share kit is member-directed with no timing claim", bool((reg.get("share_kit") or {}).get("whatsapp_share"))
              and "best_time_to_post" not in (reg.get("share_kit") or {}), "")
        check("auto-post candidates are empty while no exact routes are configured",
              reg.get("auto_post_queue") == [] and reg.get("publish_queued") is False, reg.get("auto_post_queue"))
        check("welcome text remains available without claiming delivery",
              bool((reg.get("welcome_status") or {}).get("manual_text"))
              and "not queued" in (reg.get("welcome_status") or {}).get("note", "").lower(), reg.get("welcome_status"))
        pack_queue = (reg.get("welcome_pack") or {}).get("queue") or {}
        check("welcome pack is not reported as sent when WhatsApp is off",
              pack_queue.get("queued") is False and "delivery జరగలేదు" in pack_queue.get("note_telugu", ""), pack_queue)
        conv = [l for l in main.growth.DB_LEADS if l.get("phone") == PH]
        check("registration conversion creates an internal lead without contact consent",
              bool(conv) and conv[0].get("status") == "converted" and conv[0].get("contact_consent") is False
              and conv[0].get("tsap_id") == reg.get("tsap_id"), conv[0] if conv else "none")

        lead_payload = {"name": "Quick Lead", "phone": "9700012345", "gender": "Bride",
                        "district": "Khammam", "source": "homepage"}
        no_consent = c.post("/api/leads/quick", json=lead_payload)
        check("quick lead API rejects missing consent", no_consent.status_code == 400, no_consent.status_code)
        q_resp = c.post("/api/leads/quick", json={**lead_payload, "contact_consent": True})
        q = q_resp.json()
        check("quick lead API records only explicit opt-in", q_resp.status_code == 200
              and q.get("success") and q.get("lead_id", "").startswith("LEAD-"), q)
        check("quick lead response contains no phone-bearing URL or fabricated callback time",
              not any(k in q for k in ("phone", "next", "whatsapp_url", "register_url"))
              and "call" not in q.get("message_en", "").lower(), q)
        check("WhatsApp-off mode does not claim an automatic follow-up", q.get("followup_queued") is False
              and "not guaranteed" in q.get("message_en", "").lower(), q)
        st2 = c.get("/api/leads/stats").json()
        check("admin lead stats reflect stored traffic and persisted-only inventory",
              st2.get("visits_total", 0) >= 2 and st2.get("leads_total", 0) >= 2
              and st2.get("inventory", {}).get("total_profiles") == len(main.DB_USERS), list(st2.keys()))
        st3 = c.get("/api/inventory").json()
        check("public inventory reports actual aggregate fields only",
              all(k in st3 for k in ("total_profiles", "approved_profiles", "pending_profiles",
                                     "castes_covered", "districts_covered", "recorded_checks", "photos"))
              and "verified" not in st3 and "target_profiles" not in st3, list(st3.keys()))

        # The share-kit route includes member-submitted fields, so check its auth gate explicitly.
        previous_auth_mode = os.environ.get("TSAP_AUTH_MODE")
        previous_fast_mode = os.environ.get("WA_TEST_FAST")
        os.environ["TSAP_AUTH_MODE"] = "enforce"
        os.environ["WA_TEST_FAST"] = "false"
        unauth = c.get("/api/share/kit/" + reg["tsap_id"])
        owner = c.get("/api/share/kit/" + reg["tsap_id"], headers={"Authorization": "Bearer " + reg["auth_token"]})
        if previous_auth_mode is None:
            os.environ.pop("TSAP_AUTH_MODE", None)
        else:
            os.environ["TSAP_AUTH_MODE"] = previous_auth_mode
        if previous_fast_mode is None:
            os.environ.pop("WA_TEST_FAST", None)
        else:
            os.environ["WA_TEST_FAST"] = previous_fast_mode
        check("share-kit API rejects unauthenticated profile data access", unauth.status_code == 401, unauth.status_code)
        check("share-kit API permits the profile owner", owner.status_code == 200
              and owner.json().get("tsap_id") == reg["tsap_id"], owner.status_code)

        lp = c.get("/api/leads").json()
        check("admin leads list contains only actual persisted leads", lp.get("total", 0) >= 2
              and any(item.get("contact_consent") is True for item in lp.get("items", [])), lp.get("total"))
        lead_id = q.get("lead_id")
        consented_lead = next((l for l in main.growth.DB_LEADS if l.get("id") == lead_id), None)
        # A real follow-up is mocked; this test never sends an external message.
        old_config, old_enqueue = main.publish_config, main.enqueue_whatsapp
        main.publish_config = lambda: {"wa_mode": "bridge"}
        main.enqueue_whatsapp = lambda *args, **kwargs: {"queued": True, "dry_run": True}
        fu = c.post("/api/leads/followup/" + lead_id)
        fu2 = c.post("/api/leads/followup/" + lead_id)
        main.publish_config, main.enqueue_whatsapp = old_config, old_enqueue
        check("opted-in admin follow-up is queued once and explicitly marked queued",
              fu.status_code == 200 and fu.json().get("success") is True
              and "delivery is not confirmed" in fu.json().get("message_en", "").lower(), fu.json())
        check("duplicate admin follow-up is rejected", fu2.status_code == 409, fu2.status_code)
        check("lead status only advances after a successful queue result",
              consented_lead and consented_lead.get("status") == "contacted"
              and consented_lead.get("followup_queued_at"), consented_lead)

        # Retired endpoint is a tombstone: it must not seed the live member store.
        member_count = len(main.DB_USERS)
        retired = c.post("/api/admin/bulk-profiles", json={"generate": 30, "seed": 1234})
        check("synthetic profile import endpoint is retired", retired.status_code == 410, retired.status_code)
        check("retired seed endpoint leaves member inventory unchanged", len(main.DB_USERS) == member_count, len(main.DB_USERS))


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
    check("WhatsApp remains disabled by default with bounded caps and active hours",
          c["enabled"] is False and c["daily_cap"] == 60
          and c["active_start"] == 8 and c["active_end"] == 22,
          {"enabled": c["enabled"], "daily_cap": c["daily_cap"],
           "active_start": c["active_start"], "active_end": c["active_end"]})
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
    from testutil_client import TestClient
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
    txt = pathlib_read(os.path.join(root, "frontend", "src", "app", "requests", "page-client.tsx"))
    for m in re.finditer(r'code: "(S_\d+)", price: (\d+), profiles: (\d+)', txt):
        ui[m.group(1)] = (int(m.group(2)), int(m.group(3)))
    check("UI requests page: 4 plans rendered", len(ui) >= 4, ui)
    check("UI ↔ API prices match (mismatch = customer confusion)",
          all(api.get(k) == v for k, v in ui.items()), "ui=%s api=%s" % (ui, {k: api.get(k) for k in ui}))

    # Homepage uses the live home-stats response for its compact paid-plan cards.
    hp = pathlib_read(os.path.join(root, "frontend", "src", "app", "page.tsx"))
    check("Homepage maps the four paid plans from live pricing data",
          all(code in hp for code in ("S_99", "S_199", "S_299", "S_499"))
          and 'apiGet<{ free_first?: unknown; plans?: unknown }>("/api/meta/home-stats")' in hp
          and "₹{plan.price}" in hp and "{plan.credits}" in hp, "")
    check("Homepage has no stale '₹99 → 3 profiles' claim", "₹99 → 3 profiles" not in hp, "")
    # Read the canonical pricing reference linked by PLAN-ADVANCED-STRATEGY.md.
    pricing_doc = pathlib_read(os.path.join(root, "PRICING-AUDIT-TELUGU.md"))
    check("Pricing reference documents the active ₹99 → 5-request plan",
          "`S_99` | ₹99 | 5 |" in pricing_doc and "interest-request credits" in pricing_doc.lower(), "")
    check("Pricing reference documents the complete 5/12/25/50 ladder",
          all(f"₹{price}" in pricing_doc for price in (99, 199, 299, 499))
          and all(f"| {credits} |" in pricing_doc for credits in (5, 12, 25, 50)), "")
    addons = plans.get("addons") or []
    check("Three implemented add-ons remain available", {a.get("code") for a in addons} == {"BOOST_49", "WHOVIEWED_49", "VERIFY_199"}, [a.get("code") for a in addons])
    check("Renewal offer undi", bool(plans.get("renewal")), str(plans.get("renewal"))[:80])
    check("Chatting ledu model confirm", plans.get("chatting") is False, plans.get("chatting"))


def test_pricing_pages_and_payments():
    """
    💰 PRICING CONSISTENCY — ₹99 floor, retired-code rejection, webhook mapping, /pricing + legal pages.
    (User question: "emi aina wrong chesthunna? inka bestga cheyochaa?")
    """
    print("\n[8] PRICING CONSISTENCY — ₹99 FLOOR + PAYMENT MAPPING + POLICY PAGES")
    from testutil_client import TestClient
    import interest as I
    import credits as CR
    import main
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    # ---- ₹99 is the lowest paid public plan; the retired code cannot buy credits. ----
    codes = [p["code"] for p in I.plan_list()]
    check("Paid ladder starts at S_99", codes == ["S_99", "S_199", "S_299", "S_499"], codes)
    check("Retired S_29 resolves to FREE, not a paid plan", I.get_plan("S_29")["code"] == "FREE")
    check("₹/request ladder matches the four active plans",
          [p["per_profile"] for p in I.plan_list()] == [20, 17, 12, 10],
          [p["per_profile"] for p in I.plan_list()])

    # ---- legacy credits.py == interest.py for public paid plans ----
    mismatch = [(k, v["price"], v["credits"]) for k, v in CR.PLANS.items()
                if k in ("S_99", "S_199", "S_299", "S_499")
                and (v["price"], v["credits"]) != (I.PLANS[k]["price"], I.PLANS[k]["profiles"])]
    check("credits.py amounts/credits interest.py tho match (legacy drift ledu)", not mismatch, mismatch)
    u_unknown = {"credits": 7}
    unknown_add = CR.add_credits(u_unknown, "S_29")
    check("Retired S_29 cannot grant fallback FREE credits", not unknown_add["success"] and u_unknown["credits"] == 7, unknown_add)
    check("legacy aliases kooda kotha prices ki map (TRIAL_99 → ₹99/5)",
          CR.PLANS["TRIAL_99"]["price"] == 99 and CR.PLANS["TRIAL_99"]["credits"] == 5)

    # ---- apply_payment (webhook + order rendu okate source) ----
    u = {"tsap_id": "TSAP-M-2025-1042", "credits": 0}
    r199 = I.apply_payment(u, 199)
    check("apply_payment ₹199 → S_199 + 12 profiles", r199["ok"] and r199["plan"]["code"] == "S_199"
          and r199["profiles_added"] == 12 and u["credits"] == 12, r199.get("message_telugu"))
    check("apply_payment expiry set ayyindi", bool(u.get("plan_expiry")))
    retired_amount = I.apply_payment(u, 29)
    retired_code = I.apply_payment(u, 99, "S_29")
    check("apply_payment ₹29 rejected; no credit added", not retired_amount["ok"] and u["credits"] == 12, retired_amount)
    check("retired code with a valid amount fails closed", not retired_code["ok"] and u["credits"] == 12, retired_code)
    r_add = I.apply_payment(u, 49, "BOOST_49")
    check("apply_payment ₹49 → implemented boost add-on; no credits", r_add["kind"] == "addon" and u["credits"] == 12)
    r_bad = I.apply_payment(u, 150)
    check("invalid amount ₹150 rejected", not r_bad["ok"] and u["credits"] == 12)

    # ---- legacy webhook retirement boundary ----
    with TestClient(main.app) as c:
        _web_u = next((x for x in main.DB_USERS if x["tsap_id"] == "TSAP-F-2025-1042"), None)
        if _web_u is None:
            _web_u = {"tsap_id": "TSAP-F-2025-1042", "full_name": "Sita Reddy", "gender": "Bride",
                      "phone": "9848022222", "credits": 3, "plan": "FREE", "wallet": 0}
            main.DB_USERS.append(_web_u)
        credits_before = _web_u.get("credits", 0)
        legacy = c.post("/api/payment/webhook?user_id=TSAP-F-2025-1042&amount=499&razorpay_payment_id=pay_T1")
        check("legacy payment callback is retired with 410", legacy.status_code == 410, legacy.status_code)
        check("retired callback cannot mutate the member", _web_u.get("credits", 0) == credits_before)
        check("retired callback points to signed PayPro webhook",
              legacy.json().get("replacement") == "/api/pay/webhook")
        plans_api = c.get("/api/plans").json()
    check("API /api/plans has no retired S_29/₹29 tier",
          all(p.get("code") != "S_29" and p.get("price") != 29 for p in plans_api["plans"]))
    from paypro import _expected_amount
    check("payment order validation rejects S_29", not _expected_amount("credits", "S_29")["ok"])

    # ---- /pricing + legal pages (Razorpay approval + trust) ----
    pages = {name: pathlib_read(os.path.join(root, "frontend", "src", "app", name, "page.tsx"))
             for name in ("pricing", "terms", "privacy", "refund")}
    pricing_client = pathlib_read(os.path.join(root, "frontend", "src", "app", "pricing", "page-client.tsx"))
    check("/pricing page metadata and client fetch are wired", "PricingPageClient" in pages["pricing"] and "/api/plans" in pricing_client)
    # 💍 R13: pricing minimal redesign — sodi remove (user order). Tier cards + addons +
    # renewal + FAQ inka unnayi; pata "Compare" table / "Vivaha VIP" label / "Single Request" text kaadu
    check("/pricing has all four paid tiers and current add-ons", all(x in pricing_client for x in
          ("S_99", "S_199", "S_299", "S_499", "Add-ons", "Renewal", "Referral")))
    check("/pricing states the ₹99 floor and consent-based contact sharing", "₹99" in pricing_client
          and "Owner acceptance grants contact access" in pricing_client
          and "accepted-request account views" in pricing_client and "₹29 →" not in pricing_client)
    check("/refund policy lo decline-refund + 7-day + GST", all(x in pages["refund"] for x in
          ("7 ", "declin", "GST", "6")))
    # The terms must state legal-age eligibility, the no-chat model, prohibited conduct,
    # and governing law without asserting an unsupported city-specific court venue.
    _terms = pages["terms"]
    _terms_lower = _terms.lower()
    check("/terms states age eligibility, no-chat model, prohibited conduct, and Indian law",
          all(x in _terms for x in ("21+", "Prohibited", "Indian law"))
          and ("casual chat" in _terms_lower or "chatting" in _terms_lower),
          [t for t in ("21+", "Prohibited", "Indian law", "casual chat") if t.lower() not in _terms_lower])
    privacy_client = pathlib_read(os.path.join(root, "frontend", "src", "app", "privacy", "page-client.tsx"))
    check("/privacy explains the real hide/erasure process, grievance contact and bilingual data-use summary",
          all(x in privacy_client for x in ("grievance contact", "privacy contact", "erasure request", "అమ్మము")))
    check("/privacy avoids unsupported breach, deletion, inactivity, analytics and retention promises",
          not any(x in privacy_client.casefold() for x in
                  ("within 72 hours", "72 గంటల్లో", "within 30 days", "30 రోజుల్లో",
                   "12 months", "8 years", "never traced personally", "personally గా trace చెయ్యము"))
          and "from profile creation" in privacy_client and "not anonymous" in privacy_client)
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
    check("site-config has no ₹29 paid bundle", "single: 29" not in site_cfg and "Okka Request" not in site_cfg)


def pathlib_read(path):
    return src_page(path)


# --------------------------------------------------------------------------- #
if __name__ == "__main__":
    print("=" * 68)
    print(" MANA VIVAHA — GROWTH SAFETY SUITE (welcome + consent + share links + pricing)")
    print("=" * 68)
    test_namaste_welcome()
    test_visitor_tracking()
    test_share_kit()
    test_isolated_test_fixture()
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
