"""
MANA VIVAHA — TRUST & SAFETY + OG PREVIEW TEST SUITE 🛡️🖼️
==========================================================
Run:  /tmp/venv/bin/python test_safety_preview.py   (backend/ cwd nunchi)

Cover: report categories/severity, duplicate reports, auto-flag (profile hide),
moderation queue ordering + suggested action, resolve actions (verify/warn/hide/ban/dismiss)
+ audit, block/unblock both directions, search + interest respect blocks,
verification levels/badges, safety tips, API endpoints, OG PNG generation.
"""
import os
import sys

os.environ.setdefault("WA_TEST_FAST", "1")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import safety  # noqa: E402
import preview  # noqa: E402

PASS = []
FAIL = []


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name + (("  | " + str(extra)) if extra else ""))


def U(tsap, **kw):
    d = dict(tsap_id=tsap, full_name="User " + tsap[-4:], gender="Bride", age=25, caste="Reddy",
             district="Hyderabad", state="TS", is_approved=True, phone="9848000000")
    d.update(kw)
    return d


print("=== 1. REPORT CATEGORIES ===")
check("7 categories (fake/advance/harassment/photo/married/spam/other)", len(safety.REPORT_CATEGORIES) == 7)
check("prathi category ki Telugu + severity + desc",
      all({"te", "severity", "desc"} <= set(v.keys()) for v in safety.REPORT_CATEGORIES.values()))
check("scam (advance_money) + harassment high severity",
      safety.REPORT_CATEGORIES["advance_money"]["severity"] == "high"
      and safety.REPORT_CATEGORIES["harassment"]["severity"] == "high")

print("=== 2. SUBMIT + DUPLICATE + AUTO-FLAG ===")
reports, users = [], [U("TSAP-F-1001"), U("TSAP-F-1002"), U("TSAP-F-1003"), U("TSAP-M-2001")]
ok, kind, rec = safety.submit_report("TSAP-F-1001", "TSAP-M-2001", "fake_profile", "photos vere vaalla vi", reports, users)
check("report create avutundi", ok and kind == "new_report" and rec["id"].startswith("REP-"), rec.get("id"))
check("severity high set ayindi", rec["severity"] == "high")
check("tappu category reject", safety.submit_report("TSAP-F-1001", "TSAP-M-2001", "bogus", "", reports, users)[0] is False)
check("tana meeda tana report reject", safety.submit_report("TSAP-M-2001", "TSAP-M-2001", "spam", "", reports, users)[0] is False)
ok2, kind2, rec2 = safety.submit_report("TSAP-F-1001", "TSAP-M-2001", "fake_profile", "inka proof", reports, users)
check("duplicate report = update (kotha record kaadu)", ok2 and kind2 == "report_updated" and rec2["repeat_count"] == 2 and len(reports) == 1)

ok3, _, rec3 = safety.submit_report("TSAP-F-1002", "TSAP-M-2001", "advance_money", "₹5000 adigaru", reports, users)
check("rendo high report → AUTO-FLAG (profile hide)", rec3["auto_flagged"] is True and rec3.get("auto_action") == "profile_hidden_for_review")
tgt = next(u for u in users if u["tsap_id"] == "TSAP-M-2001")
check("auto-flag target is_approved False + reason", tgt["is_approved"] is False and "auto_flag" in tgt.get("hidden_reason", ""))
check("report ack Telugu text", "Report" in safety.report_ack_text() and "24" in safety.report_ack_text())

print("=== 3. STATS + MODERATION QUEUE ===")
st = safety.report_stats(reports)
check("stats total/open/high/by_category", st["total"] == 2 and st["open"] == 2 and st["high"] == 2
      and st["by_category"].get("fake_profile") == 1 and st["auto_flagged"] == 1)
check("stats Telugu message", "open reports" in st["message_telugu"])
q = safety.moderation_queue(reports, users)
check("queue open count + items", q["open"] == 2 and len(q["items"]) == 2)
check("high severity mundu vachhindi", q["items"][0]["severity"] == "high")
check("queue item lo target profile info", q["items"][0]["target"]["tsap_id"] == "TSAP-M-2001"
      and q["items"][0]["target"]["verification"] in safety.VERIFY_LEVELS)
check("same target reports count", q["items"][0]["reports_on_target"] == 2)
check("suggested action (2 high → ban)", q["items"][0]["suggested_action"] == "ban", q["items"][0]["suggested_action"])
check("actions list telugu explained", set(q["actions"]) == set(safety.ACTION_RULES.keys()))

print("=== 4. RESOLVE (admin actions) ===")
rid = reports[0]["id"]
check("tappu action reject", safety.resolve_report(rid, "delete_everything", "", reports, users)[0] is False)
check("tappu report id reject", safety.resolve_report("REP-NOPE", "warn", "", reports, users)[0] is False)
ok, act, _ = safety.resolve_report(rid, "verify", "certificates chusanu", reports, users)
check("verify action + badge level set", ok and act == "verify" and users[3]["verification_level"] in ("photo", "id"),
      users[3].get("verification_level"))
check("same target migilina reports bulk close", all(r["status"] == "resolved" for r in reports if r["target_id"] == "TSAP-M-2001"))
check("audit note save ayindi", reports[0]["admin_note"] == "certificates chusanu" and reports[0]["action_telugu"])

warn_u = U("TSAP-M-3001")
safety.submit_report("TSAP-F-1003", "TSAP-M-3001", "spam", "", reports, users + [warn_u])
safety.resolve_report(reports[-1]["id"], "warn", "modati warning", reports, users + [warn_u])
check("warn action → warning count +1", warn_u.get("warnings") == 1, warn_u.get("warnings"))

ban_u = U("TSAP-M-3002")
safety.submit_report("TSAP-F-1003", "TSAP-M-3002", "harassment", "threats", reports, users + [ban_u])
safety.resolve_report(reports[-1]["id"], "ban", "police complaint kooda", reports, users + [ban_u])
check("ban action → is_banned + not approved", ban_u.get("is_banned") is True and ban_u["is_approved"] is False)

print("=== 5. BLOCK / UNBLOCK ===")
blocks = []
check("block create", safety.block_user("TSAP-F-1001", "TSAP-M-2001", "fake", blocks)[0] and len(blocks) == 1)
check("duplicate block idempotent", safety.block_user("TSAP-F-1001", "TSAP-M-2001", "fake", blocks)[1] == "already_blocked" and len(blocks) == 1)
check("self block reject", safety.block_user("TSAP-F-1001", "TSAP-F-1001", "", blocks)[0] is False)
check("is_blocked direct", safety.is_blocked("TSAP-F-1001", "TSAP-M-2001", blocks) is True)
check("is_blocked reverse direction kooda", safety.is_blocked("TSAP-M-2001", "TSAP-F-1001", blocks) is True)
check("block_list only owner", len(safety.block_list("TSAP-F-1001", blocks)) == 1 and len(safety.block_list("TSAP-M-2001", blocks)) == 0)
check("unblock works", safety.unblock_user("TSAP-F-1001", "TSAP-M-2001", blocks)[0] and safety.is_blocked("TSAP-F-1001", "TSAP-M-2001", blocks) is False)
check("unblock non-existent → not_blocked", safety.unblock_user("TSAP-F-1001", "TSAP-M-2001", blocks) == (False, "not_blocked"))

print("=== 6. VERIFICATION LEVELS ===")
u = U("TSAP-F-5001")
b0 = safety.verification_badge(u)
check("default verification status is none with no trust score", b0["level"] == "none" and "trust_score" not in b0 and "stars" not in b0)
check("badge Telugu + next step", bool(b0["telugu"]) and "OTP" in b0["next_step_telugu"])
safety.set_verification(u, "id")
check("id verify → recorded ID level only", u["verification_level"] == "id" and safety.verification_badge(u)["level"] == "id" and "trust_score" not in safety.verification_badge(u))
safety.set_verification(u, "phone")
check("level DOWNGRADE avvadu (id ne untundi)", u["verification_level"] == "id")
check("tappu kind reject", safety.set_verification(u, "aadhaar_only")[0] is False)
u2 = U("TSAP-F-5002", phone_verified=True)
check("phone_verified flag tho badge phone level", safety.verification_badge(u2)["level"] == "phone")
check("4 verify levels + Telugu names", len(safety.VERIFY_LEVELS) == 4 and len(safety.VERIFY_TELUGU) == 4)

print("=== 7. SAFETY TIPS ===")
tips = safety.safety_tips()
check("6 tips (advance money, video verify, public place, OTP, certificates, no-chat)", len(tips) == 6, len(tips))
check("prathi tip ki icon + Telugu", all(t["icon"] and len(t["telugu"]) > 30 for t in tips))
check("advance money tip lo 'scam' warning", any("scam" in t["telugu"].lower() for t in tips))
check("chatting-ledu line kooda undi", any("chatting" in t["title"].lower() or "chatting" in t["telugu"].lower() for t in tips))

print("=== 8. OG PREVIEW IMAGES (Pillow) ===")
prof = dict(tsap_id="TSAP-F-7777", full_name="Sri Lakshmi Reddy", age=24, gender="Bride", caste="Reddy",
            sub_caste="Pakanati", education="BTech", education_detail="CSE", job="Software Engineer",
            company="TCS", salary="8L", district="Hyderabad", state="TS", star="Rohini", rasi="Vrishabha",
            family_type="Nuclear", family_status="Middle Class", is_verified=True)
p1 = preview.og_profile_png(prof, "/tmp/previews/test-profile.png")
check("profile OG generate", bool(p1) and os.path.exists(p1))
with open(p1, "rb") as f:
    sig = f.read(8)
check("PNG file signature", sig == b"\x89PNG\r\n\x1a\n")
try:
    from PIL import Image
    im = Image.open(p1)
    check("profile OG 1200x630 (WhatsApp/FB standard)", im.size == (1200, 630), im.size)
except Exception as e:
    check("PIL open", False, repr(e))
p2 = preview.og_porutham_png(prof, dict(prof, tsap_id="TSAP-M-7777", gender="Groom", full_name="Ravi Kumar"),
                            {"available": True, "passed_checks": 1, "total_checks": 2, "items": [
                                {"no": 1, "name": "Rasi Porutham", "pass": True}, {"no": 5, "name": "Rajju Porutham", "pass": False}]},
                            "/tmp/previews/test-porutham.png")
check("porutham OG generate", bool(p2) and os.path.exists(p2))
check("porutham OG size", Image.open(p2).size == (1200, 630))
p3 = preview.og_generic_png("Reddy Bride Hyderabad", "24 profiles • 3 FREE requests", "/tmp/previews/test-site.png", "sitepage")
check("generic OG generate", bool(p3) and os.path.exists(p3))

print("=== 9. API ENDPOINTS (TestClient) ===")
try:
    from fastapi.testclient import TestClient
    import main

    with TestClient(main.app) as c:
        r = c.get("/api/safety/tips")
        d = r.json()
        check("GET /api/safety/tips 200", r.status_code == 200 and len(d["tips"]) == 6)
        check("tips lo verify_levels + report_categories", len(d["verify_levels"]) == 4 and len(d["report_categories"]) == 7)

        brides = [u for u in main.DB_USERS if u.get("gender") == "Bride"]
        grooms = [u for u in main.DB_USERS if u.get("gender") == "Groom"]
        b, g = brides[0], grooms[0]

        r = c.post("/api/report", json={"reporter_id": b["tsap_id"], "target_id": g["tsap_id"],
                                        "category": "advance_money", "detail": "₹3000 adigaru"})
        check("POST /api/report 200 + ack", r.status_code == 200 and r.json()["success"] and r.json()["ack_telugu"], r.status_code)
        check("report stats API lo kanipisthundi", r.json()["stats"]["open"] >= 1)
        check("tappu category → 400", c.post("/api/report", json={"reporter_id": b["tsap_id"], "target_id": g["tsap_id"],
                                                                "category": "nope"}).status_code == 400)

        rq = c.get("/api/moderation/queue").json()
        check("GET /api/moderation/queue 200", rq["open"] >= 1 and len(rq["items"]) >= 1)
        rid = rq["items"][0]["report_id"]
        r = c.post("/api/moderation/resolve/%s" % rid, json={"action": "warn", "note": "modati warning"})
        check("POST /api/moderation/resolve 200", r.status_code == 200 and r.json()["success"], r.status_code)
        check("tappu action resolve → 400", c.post("/api/moderation/resolve/%s" % rid, json={"action": "zzz"}).status_code == 400)

        r = c.post("/api/block", json={"owner": b["tsap_id"], "blocked": g["tsap_id"], "reason": "test"})
        check("POST /api/block 200 + Telugu msg", r.status_code == 200 and "Block" in r.json()["message_telugu"])
        r = c.get("/api/blocks/%s" % b["tsap_id"]).json()
        check("GET /api/blocks/{id} lo undi", r["count"] == 1 and r["items"][0]["blocked"] == g["tsap_id"])

        s = c.get("/api/search", params={"viewer_id": b["tsap_id"], "limit": 50}).json()
        ids = [x.get("tsap_id") for x in (s.get("items") or [])]
        check("blocked user search lo kanipinchadu", g["tsap_id"] not in ids, len(ids))

        ir = c.post("/api/interest/send", json={"from_id": b["tsap_id"], "to_id": g["tsap_id"]})
        check("blocked user ki interest 400", ir.status_code == 400, ir.status_code)

        r = c.post("/api/unblock", json={"owner": b["tsap_id"], "blocked": g["tsap_id"]})
        check("POST /api/unblock 200", r.status_code == 200 and r.json()["success"])

        r = c.post("/api/verify/request", json={"tsap_id": b["tsap_id"], "kind": "photo"})
        check("POST /api/verify/request 200", r.status_code == 200 and r.json()["verification"]["level"] in ("photo", "id"))
        rv = c.get("/api/verification/%s" % b["tsap_id"]).json()
        check("GET /api/verification/{id} exposes recorded level only", rv["level"] in ("photo", "id") and "trust_score" not in rv and "stars" not in rv)
        check("tappu kind → 400", c.post("/api/verify/request", json={"tsap_id": b["tsap_id"], "kind": "nope"}).status_code == 400)

        og = c.get("/api/og/profile/%s.png" % b["tsap_id"])
        check("GET /api/og/profile/{id}.png 200", og.status_code == 200 and og.content[:4] == b"\x89PNG", og.status_code)
        check("OG cache header (WhatsApp crawler friendly)", "max-age" in (og.headers.get("cache-control") or ""))
        ogp = c.get("/api/og/porutham/%s/%s.png" % (b["tsap_id"], g["tsap_id"]))
        check("GET /api/og/porutham/{b}/{g}.png 200", ogp.status_code == 200 and ogp.content[:4] == b"\x89PNG", ogp.status_code)
except Exception as e:  # pragma: no cover
    check("TestClient suite", False, repr(e))

print("\n=== RESULT: %d pass / %d fail ===" % (len(PASS), len(FAIL)))
if FAIL:
    print("FAILED:", FAIL)
    sys.exit(1)
print("🏆 TRUST & SAFETY + OG PREVIEWS — ANNI TESTS PASS")
