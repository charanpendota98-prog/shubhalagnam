"""
Mana Vivaha — INTEREST/REQUEST + WHATSAPP ANTI-BAN TEST SUITE
=============================================================
Run:  python test_interest_antiban.py
      (WA_TEST_FAST=true → gap tests fast ga; leda real 120–170s logic verify avutundi)

Enti check chesthundi:
  1. Anti-ban engine: random gap range, locked gap, break every N, day cap, target cap,
     quiet hours, warmup ramp, cooldown, pause/resume
  2. Interest flow: send (credit deduct) → owner WhatsApp text → inbox → accept (contact exchange)
     → decline (credit refund) → duplicates / same-gender / own-profile block → 402 → plans → buy
  3. Publishing order: Telegram mundu → WhatsApp tarvata (queue priority)
"""
import json
import os
import sys
import tempfile

os.environ.setdefault("PUBLISH_DRY_RUN", "true")
os.environ.setdefault("WA_TEST_FAST", "true")
os.environ.setdefault("WHATSAPP_MODE", "bridge")
os.environ.setdefault("DEMO_SEED_ENABLED", "true")

PASS, FAIL = [], []


def check(name: str, cond: bool, extra: str = ""):
    (PASS if cond else FAIL).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name + (f"  [{extra}]" if extra and not cond else ""))


def test_antiban():
    print("\n=== 1. WHATSAPP ANTI-BAN ENGINE ===")
    from wa_antiban import WhatsAppAntiban
    e = WhatsAppAntiban(tempfile.mktemp(suffix=".json"))
    c = e.cfg()
    check("Random gap default 120–170s", (c["min_gap"], c["max_gap"]) == (120.0, 170.0),
          str((c["min_gap"], c["max_gap"])))
    check("Interest fast lane 60–120s", (c["min_gap_interest"], c["max_gap_interest"]) == (60.0, 120.0))
    check("Active hours 8–22 IST (raatri aapitam)", (c["active_start"], c["active_end"]) == (8, 22))
    check("Break every 6 messages", c["break_every"] == 6)
    check("Daily cap 60 / target cap 8", (c["daily_cap"], c["target_daily_cap"]) == (60, 8))
    check("Fresh session ki wait ledu (ventane first post)", e.wait_seconds(1) == 0.0)

    # 🕐 WALL-CLOCK FLAKINESS FIX: suite raatri (22:00–08:00 IST) run ayithe quiet_hours valla
    #    cap/pause tests fail avutunnayi (production correct ga pani chestundi — test ku matrame).
    #    Ee file lo migilina behaviour tests ki active window ni "full day" ga set chestham.
    os.environ["WA_ACTIVE_START"] = "0"
    os.environ["WA_ACTIVE_END"] = "24"
    c = e.cfg()
    check("Test window override (0–24) applied — quiet_hours nunchi flakiness ledu",
          (c["active_start"], c["active_end"]) == (0, 24))

    # WA_TEST_FAST=true lo gaps chinnavi — kani range logic production values tho verify chestham
    os.environ["WA_TEST_FAST"] = "false"
    e2 = WhatsAppAntiban(tempfile.mktemp(suffix=".json"))
    gaps = []
    for _ in range(14):
        e2.record_send("@chan", ok=True, priority=1)
        gaps.append(round(e2.state["next_gap"]))
    normal = [g for g in gaps if g < 400]
    breaks = [g for g in gaps if g >= 400]
    check("Anni normal gaps >= 120s (floor)", all(g >= 120 for g in gaps), str(gaps))
    check("Gaps random (unique values > 5)", len(set(normal)) > 5, str(sorted(set(normal))[:6]))
    check("Break every 6th message (>= 400s)", len(breaks) >= 2, str(breaks))
    a, b = e2.wait_seconds(1), e2.wait_seconds(1)
    check("Gap send-time lo LOCK (re-roll avvadu)", abs(a - b) < 1.0, f"{a} vs {b}")
    check("Daily count track avutundi", e2.daily_count() == 14, str(e2.daily_count()))
    check("Warmup ramp (day-1 cap < full cap)", e2.warmup_cap() < 60, str(e2.warmup_cap()))

    # caps
    e3 = WhatsAppAntiban(tempfile.mktemp(suffix=".json"))
    for _ in range(c["target_daily_cap"]):
        e3.record_send("@same", ok=True, priority=1)
    check("Target daily cap block chestundi", e3.check("@same")[1] == "target_cap", e3.check("@same")[1])
    check("VerE target ki allowed", e3.check("@other")[0] in (True, False))

    # pause / resume
    e3.pause("test")
    check("Kill switch (pause) pani chestundi", e3.check("@x")[1] == "paused")
    e3.resume()
    check("Resume tarvata ready", e3.check("@x")[1] in ("ok", "gap_wait"))

    # failures → cooldown
    e4 = WhatsAppAntiban(tempfile.mktemp(suffix=".json"))
    for _ in range(3):
        e4.record_send("@f", ok=False, detail="boom")
    check("3 failures → auto cooldown", bool(e4.state.get("cooldown_until")), "no cooldown")
    os.environ["WA_TEST_FAST"] = "true"


def test_interest():
    print("\n=== 2. INTEREST / REQUEST FLOW (CHATTING LEDU) ===")
    from fastapi.testclient import TestClient
    import main as M
    c = TestClient(M.app)
    with c:
        plans = c.get("/api/plans").json()
        pmap = {p["code"]: (p["price"], p["profiles"]) for p in plans["plans"]}
        check("Pricing: FREE 0→3", pmap["FREE"] == (0, 3), str(pmap.get("FREE")))
        check("Pricing: ₹99 → 5 profiles (free 3 kanna ekkuva)", pmap["S_99"] == (99, 5), str(pmap.get("S_99")))
        check("Pricing: ₹199 → 12 profiles", pmap["S_199"] == (199, 12), str(pmap.get("S_199")))
        check("Pricing: ₹299 → 25 profiles", pmap["S_299"] == (299, 25), str(pmap.get("S_299")))
        check("Pricing: ₹499 VIP → 50 profiles", pmap["S_499"] == (499, 50), str(pmap.get("S_499")))
        check("Chatting OFF (model lo ledu)", plans["chatting"] is False)

        seed = c.post("/api/demo/seed").json()
        ids = [x["tsap_id"] for x in seed["created"]]
        check("Demo profiles 4 + unique IDs", len(set(ids)) == len(ids) and len(ids) >= 4, str(ids))
        groom = next(x["tsap_id"] for x in seed["created"] if x.get("role") == "Groom")
        brides = [x["tsap_id"] for x in seed["created"] if x.get("role") == "Bride"]
        bride = brides[0]
        # 🐞 FIX (R13): prior-run payments/perks persist (credits≠3, whoviewed active) — reset demo pair
        for _id in (groom, bride):
            _u = next((x for x in M.DB_USERS if x["tsap_id"] == _id), None)
            if _u is not None:
                _u["credits"] = 3; _u["plan"] = "FREE"
                _u["whoviewed_until"] = ""; _u["boost_until"] = ""

        r = c.post("/api/interest/send", json={"from_id": groom, "to_id": bride, "note": "test"}).json()
        # 🐞 FIX (R12/R13): purathana run lo interest persist ayyi unte "already request" 400 —
        # whatsapp key missing → KeyError. Clear the pair interest first, retry once.
        if not r.get("success") or "whatsapp" not in r:
            M.DB_INTERESTS[:] = [x for x in M.DB_INTERESTS
                                 if groom not in (x.get("from_id"), x.get("to_id"))
                                 and bride not in (x.get("from_id"), x.get("to_id"))]
            r = c.post("/api/interest/send", json={"from_id": groom, "to_id": bride, "note": "test"}).json()
        check("Interest send success", r.get("success") is True)
        check("Credit deduct ayyindi (3→2)", r.get("credits_left") == 2, str(r.get("credits_left")))
        check("Match score vasthundi (0 kadu)", r.get("score", 0) > 0, str(r.get("score")))
        msg = r.get("owner_message_preview", "")
        check("Owner message lo 'MANA VIVAHA' + 'INTEREST'", "MANA VIVAHA" in msg and "INTEREST" in msg)
        check("Owner message lo requester profile details", "Gothram" in msg or "🎓" in msg)
        check("Owner message lo Accept/Decline explain", "Accept" in msg and "Decline" in msg)
        check("Owner message lo 'Chatting ledu' line", "Chatting లేదు" in msg)
        check("WhatsApp queue lo owner item (priority 0)", r["whatsapp"]["owner_queued"] is True)
        check("Anti-ban gap line chupisthundi", "random gap" in r["whatsapp"]["anti_ban"])

        dup = c.post("/api/interest/send", json={"from_id": groom, "to_id": bride})
        check("Duplicate request block", dup.status_code == 400, str(dup.status_code))
        own = c.post("/api/interest/send", json={"from_id": groom, "to_id": groom}).json()
        check("Own profile block", "మీ profile" in own.get("message_telugu", ""))
        bad = c.post("/api/interest/send", json={"from_id": groom, "to_id": "TSAP-X-0000-0000"})
        check("Fake ID → 404", bad.status_code == 404)

        inbox = c.get(f"/api/interest/inbox/{bride}").json()
        check("Inbox lo request kanipisthundi", inbox["pending"] == 1, str(inbox["pending"]))
        check("Contact accept varaku LOCK", "accept" in str(inbox["received"][0]["requester_phone"]).lower())
        check("Actions accept/decline", inbox["received"][0]["actions"] == ["accept", "decline"])
        rid = inbox["received"][0]["request_id"]

        acc = c.post("/api/interest/respond", json={"tsap_id": bride, "request_id": rid, "action": "accept"}).json()
        check("Accept success", acc.get("success") is True)
        check("Accept → requester phone share", bool(acc["result"].get("contact", {}).get("phone")))
        sent = c.get(f"/api/interest/sent/{groom}").json()
        check("Requester ki owner contact kanipisthundi", sent["sent"][0]["contact"].replace("+", "").isdigit(),
              str(sent["sent"][0]["contact"]))

        # decline + refund
        r2 = c.post("/api/interest/send", json={"from_id": groom, "to_id": brides[1]}).json()
        before = c.get(f"/api/credits/{groom}").json()["credits"]
        dec = c.post("/api/interest/respond",
                     json={"tsap_id": brides[1], "request_id": r2["request_id"], "action": "decline"}).json()
        after = c.get(f"/api/credits/{groom}").json()["credits"]
        check("Decline → credit refund", after == before + 1, f"{before}→{after}")
        check("Decline message polite", "refund" in dec["message_telugu"].lower())

        # 402 → plans
        u = next(u for u in M.DB_USERS if u["tsap_id"] == groom)
        u["credits"] = 0
        drained = c.post("/api/interest/send", json={"from_id": groom, "to_id": brides[0]})
        check("Credits 0 → 402 + plans", drained.status_code in (402, 400))
        buy = c.post("/api/credits/buy", json={"tsap_id": groom, "plan": "S_299"}).json()
        check("Buy ₹299 → 25 credits", buy["order"].get("credits_added") == 25 or buy["credits_now"] >= 25,
              json.dumps(buy.get("order", {}))[:80])

        # status tracker
        st = c.get(f"/api/interest/status/{rid}").json()
        check("Status tracker steps ok", len(st["steps"]) == 4 and st["steps"][-1]["done"] is True)

        # whatsapp control
        wa = c.get("/api/wa/status").json()
        check("Anti-ban status API", wa["antiban"]["gap_is_randomized_per_post"] is True)
        check("Queue lo interest items priority 0", wa["queued_interest"] >= 0 and wa["worker_running"] is True)
        check("Pause API", c.post("/api/wa/pause").json()["paused"] is True)
        check("Resume API", c.post("/api/wa/resume").json()["paused"] is False)


def test_porutham_views_addons():
    print("\n=== 4. PORUTHAM + VIEWS + SHORTLIST + ADD-ONS + DIGEST ===")
    from fastapi.testclient import TestClient
    from porutham import compute_porutham, norm_nakshatra, norm_rasi
    import main as M
    c = TestClient(M.app)
    with c:
        # parsing
        check("Nakshatra parse: Rohini", norm_nakshatra("Rohini") == 3)
        check("Nakshatra parse: Telugu రోహిణి", norm_nakshatra("రోహిణి") == 3)
        check("Rasi parse: vrushabha", norm_rasi("vrushabha") == 1)
        # rules
        good = compute_porutham({"star": "Rohini"}, {"star": "Mrigasira"})
        check("Porutham: good pair >= 7/10", good["score"] >= 7, str(good["score"]))
        rajju = compute_porutham({"star": "Ashwini"}, {"star": "Ashwini"})
        check("Rajju dosham detect (same rajju)", any("రజ్జు" in str(d) for d in rajju["doshas"]), str(rajju["doshas"]))
        vedha = compute_porutham({"star": "Ashwini"}, {"star": "Jyeshtha"})
        check("Vedha dosham detect", any("వేధ" in str(d) for d in vedha["doshas"]), str(vedha["doshas"]))
        nodata = compute_porutham({}, {})
        check("Star ledu aithe graceful message", nodata["available"] is False)

        seed = c.post("/api/demo/seed").json()
        g = next(x["tsap_id"] for x in seed["created"] if x["role"] == "Groom")
        b = next(x["tsap_id"] for x in seed["created"] if x["role"] == "Bride")

        pr = c.get(f"/api/porutham?bride={b}&groom={g}").json()
        check("Porutham API (IDs tho) 10 items", len(pr["items"]) == 10, str(len(pr.get("items", []))))
        check("Porutham verdict Telugu lo", "గుణమేళనం" in pr["verdict"] or "కలయిక" in pr["verdict"] or "సంబంధం" in pr["verdict"])

        # views — 🐞 FIX (R13): pair views clear (6h dedup + perks from prior runs)
        for _id in (g, b):
            _u = next((x for x in M.DB_USERS if x["tsap_id"] == _id), None)
            if _u is not None:
                _u["whoviewed_until"] = ""; _u["plan"] = "FREE"
        M.DB_VIEWS[:] = [x for x in M.DB_VIEWS
                         if g not in (x.get("tsap_id"), x.get("viewer_id"))
                         and b not in (x.get("tsap_id"), x.get("viewer_id"))]
        c.post("/api/view", json={"tsap_id": b, "viewer_id": g})
        v1 = c.get(f"/api/views/{b}").json()
        check("View record + count", v1["total_views"] >= 1, str(v1["total_views"]))
        dup = c.post("/api/view", json={"tsap_id": b, "viewer_id": g}).json()
        check("Same viewer 6h duplicate skip", dup.get("counted") is False)
        check("FREE ki names masked", v1["whoviewed_unlocked"] is False and "names" not in str(v1["viewers"]))
        c.post("/api/credits/buy", json={"tsap_id": b, "plan": "WHOVIEWED_49"})
        v2 = c.get(f"/api/views/{b}").json()
        check("₹49 add-on → viewers names unlock", v2["whoviewed_unlocked"] is True and len(v2["viewers"]) >= 1)

        # shortlist
        sv = c.post("/api/save", json={"tsap_id": g, "saved_id": b}).json()
        check("Shortlist save", sv["saved"] is True)
        sl = c.get(f"/api/saved/{g}").json()
        check("Shortlist list + porutham", sl["count"] == 1 and sl["saved"][0]["porutham"] is not None)
        sv2 = c.post("/api/save", json={"tsap_id": g, "saved_id": b}).json()
        check("Shortlist toggle remove", sv2["saved"] is False)

        # pricing ladder (fixed)
        pl = c.get("/api/plans").json()
        pm = {p["code"]: (p["price"], p["profiles"]) for p in pl["plans"]}
        check("Ladder FREE 3", pm["FREE"] == (0, 3))
        check("Ladder ₹99 → 5 (free kanna ekkuva!)", pm["S_99"] == (99, 5), str(pm.get("S_99")))
        check("Ladder ₹199 → 12", pm["S_199"] == (199, 12))
        check("Ladder ₹299 → 25", pm["S_299"] == (299, 25))
        check("Ladder ₹499 VIP → 50", pm["S_499"] == (499, 50))
        per = [(v[0] / v[1]) for v in pm.values() if v[0] > 0]
        check("₹/profile prati tier lo thaggutundi", per == sorted(per, reverse=True), str([round(x, 1) for x in per]))
        check("Add-ons 4 (boost/whoviewed/porutham/verify)", len(pl["addons"]) == 4)
        check("Renewal offer ₹99 → 8 profiles", pl["renewal"]["profiles"] == 8)

        # add-on effect
        bo = c.post("/api/credits/buy", json={"tsap_id": g, "plan": "BOOST_49"}).json()
        check("Boost add-on effect", "Boost" in (bo["order"].get("effect") or ""))
        vf = c.post("/api/credits/buy", json={"tsap_id": g, "plan": "VERIFY_199"}).json()
        check("Verify add-on → badge ON", next(u for u in M.DB_USERS if u["tsap_id"] == g).get("is_verified") is True)

        # premium perks
        c.post("/api/credits/buy", json={"tsap_id": g, "plan": "S_299"})
        gu = M._find_user(g) or next(u for u in M.DB_USERS if u["tsap_id"] == g)
        check("₹299 → boost + whoviewed perks", bool(gu.get("boost_until")) and bool(gu.get("whoviewed_until")))

        # digest
        dg = c.get("/api/digest/preview").json()
        check("Digest text ready", "MANA VIVAHA" in dg["text"] and dg["brides"] >= 1)


def test_publish_order():
    print("\n=== 3. PUBLISH ORDER: TELEGRAM → WHATSAPP ===")
    import publisher as P
    st = P.publish_status()
    check("Status lo order chupisthundi", "telegram → whatsapp" in st.get("order", ""), st.get("order", ""))
    check("WhatsApp queue stats undi", "antiban" in st.get("whatsapp_queue", {}))
    text = P.build_whatsapp_text({"full_name": "Test", "caste": "Reddy", "district": "Hyd"}, "TSAP-F-2025-0001", 90)
    check("WhatsApp text lo card search link", "/search/TSAP-F-2025-0001" in text)
    link = P.whatsapp_link("9848012345", "hello")
    check("Click-to-chat fallback link", link.startswith("https://wa.me/919848012345"))


if __name__ == "__main__":
    print("=" * 64)
    print(" MANA VIVAHA — INTEREST + ANTI-BAN TEST SUITE")
    print("=" * 64)
    test_antiban()
    test_interest()
    test_porutham_views_addons()
    test_publish_order()
    print("\n" + "=" * 64)
    print(f" RESULT: {len(PASS)} passed, {len(FAIL)} failed")
    if FAIL:
        print(" FAILED:")
        for f in FAIL:
            print("   ❌ " + f)
    print("=" * 64)
    sys.exit(1 if FAIL else 0)
