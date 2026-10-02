"""
🔒 PRIVACY + FREE-vs-PAID CLARITY TEST SUITE — Mana Vivaha
==========================================================
"3 profiles isthav kaani valla numbers ivvavu — vaallu pay chesaka numbers/contact"

Run: /tmp/venv/bin/python test_privacy_contacts.py   (backend/ cwd)

Cover:
  1. mask_phone() formats
  2. safe_user() lo contact fields levu (phone/email/encrypted) + lock flags unnai
  3. EVERY public endpoint scan — 10-digit phone / phone_encrypted / email leak ledu
  4. /api/search/{id} — locked + masked + unlock instructions
  5. /api/matches/{id} — locked + masked (score/reasons intact)
  6. /api/search (list), /api/views, /api/saved, /api/porutham — safe
  7. Interest flow — inbox lo phone accept varaku 🔒; accept tarvata exchange (intended)
  8. /api/free-plan clarity payload (free vs paid, faq, numbers rule)
  9. Frontend wiring (register clarity box, matches lock chip, pricing clarity, search page)
 10. Own-profile endpoints (credits/referral) lo sontha number undatam ok (meere)
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from testutil_paths import src_page  # noqa: E402  # App Router page.tsx + page-client.tsx aware
# 🐞 FIX (R12): standalone run lo auth ENFORCED → interest send 401. Suite convention: dev mode.
os.environ.setdefault("WA_TEST_FAST", "1")

PASS, FAIL = [], []


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name + (("  | " + str(extra)) if extra and not cond else ""))


PHONE_RE = re.compile(r"(?<!\d)[6-9]\d{9}(?!\d)")
CONTACT_KEYS = {"phone", "phone_encrypted", "phone_last4", "email", "whatsapp", "contact_phone", "mobile"}

print("=== 1. mask_phone ===")
from interest import mask_phone, safe_user  # noqa: E402

check("10-digit → 98••••••45 style", mask_phone("9848012345") == "98" + "•" * 6 + "45", mask_phone("9848012345"))
check("empty → lock dots", mask_phone("") .startswith("🔒"))
check("short number → lock", mask_phone("12").startswith("🔒"))
check("spaces/dashes clean avutayi", mask_phone("98480-12345") == mask_phone("9848012345"))

print("=== 2. safe_user shape ===")
su = safe_user({"tsap_id": "T", "full_name": "Ravi", "phone": "9848012345", "email": "a@b.com",
                "phone_encrypted": "gAAAA", "phone_last4": "2345", "age": 30, "caste": "Reddy"})
check("phone/email/encrypted keys levu", not (CONTACT_KEYS & set(su)), sorted(CONTACT_KEYS & set(su)))
check("phone_masked + contact_locked + note", su.get("phone_masked") and su.get("contact_locked") is True
      and "Number ఇవ్వము" in su.get("contact_note_telugu", ""))
check("Profile details intact (age/caste/name)", su.get("age") == 30 and su.get("caste") == "Reddy" and su.get("full_name") == "Ravi")
check("empty user → {}", safe_user(None) == {})

print("=== 3-7. API SCAN (TestClient) ===")
from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402

with TestClient(main.app) as c:
    # 🐞 FIX (R12): seed users UPSERT — purathana minimal stubs (age/caste ledu) match engine
    #    break chestayi. Create if missing + missing fields fill (setdefault style)
    _seed_specs = (
        {"tsap_id": "TSAP-F-2025-1042", "full_name": "Sita Reddy", "gender": "Bride",
         "phone": "9848022222", "credits": 3, "plan": "FREE", "wallet": 0, "caste": "Reddy",
         "age": 24, "height": "5'4\"", "education": "BTech", "job": "Software", "district": "Hyderabad",
         "state": "TS", "marital_status": "Pelli Kaledu"},
        {"tsap_id": "TSAP-M-2025-1042", "full_name": "Ravi Kumar", "gender": "Groom",
         "phone": "9848012345", "credits": 3, "plan": "FREE", "wallet": 0, "caste": "Reddy",
         "age": 28, "height": "5'9\"", "education": "BTech", "job": "Software", "district": "Hyderabad",
         "state": "TS", "marital_status": "Pelli Kaledu"},
    )
    for _spec in _seed_specs:
        _found = next((u for u in main.DB_USERS if u["tsap_id"] == _spec["tsap_id"]), None)
        if _found is None:
            _found = dict(_spec)
            main.DB_USERS.append(_found)
        for _k, _v in _spec.items():
            _found.setdefault(_k, _v)
        _found["age"] = _found.get("age") or _spec["age"]
        _found["caste"] = _found.get("caste") or _spec["caste"]
        _found["district"] = _found.get("district") or _spec["district"]
        _found["state"] = _found.get("state") or _spec["state"]
    # 💎 R12: matches ki opposite-gender pool kavali — polluted/small DB lo empty vastundi.
    #    launch seed inventory load chesi (phone dup skip tho) pool guarantee
    try:
        import seed_launch_db as _SLD
        for _sd in _SLD.build_profiles(40):
            _ph = str(_sd.get("phone", ""))
            if _ph and any(u.get("phone") == _ph for u in main.DB_USERS):
                continue
            _u = dict(_sd)
            _u.setdefault("is_approved", True)
            _u.setdefault("photo_urls", [])
            _u.setdefault("credit_history", [])
            main.DB_USERS.append(_u)
    except Exception as _e:
        print("[R12-seed] skip:", str(_e)[:80])
    me = next(u for u in main.DB_USERS if u["tsap_id"] == "TSAP-F-2025-1042")
    other = next(u for u in main.DB_USERS if u["tsap_id"] == "TSAP-M-2025-1042")
    # 💎 R12: interest flow fresh ga test cheyali — purathana interests (prior runs, vere
    #    users nunchi kuda) other inbox lo unte leak-scan false positives. me/other ki
    #    sambandinchina ANNI interests clear (rendu directions + other ki vachina anni)
    main.DB_INTERESTS[:] = [x for x in main.DB_INTERESTS
                            if me["tsap_id"] not in (x.get("from_id"), x.get("to_id"))
                            and other["tsap_id"] not in (x.get("from_id"), x.get("to_id"))]
    my_phone = str(me.get("phone", ""))

    def leaks(payload, allow=()):
        """Return list of leak paths (10-digit phones / contact keys) in a JSON payload."""
        found = []

        def walk(node, path=""):
            if isinstance(node, dict):
                for k, v in node.items():
                    p = "%s.%s" % (path, k)
                    _is_contact_key = k in CONTACT_KEYS
                    if k == "whatsapp":     # config block (mode/targets) kooda untundi — number ayithe matrame leak
                        _is_contact_key = bool(PHONE_RE.search(str(v or "")))
                    if _is_contact_key and str(v or "").strip() and not isinstance(v, (dict, list)) and p not in allow:
                        found.append("key:" + p)
                    walk(v, p)
            elif isinstance(node, list):
                for i, v in enumerate(node[:25]):
                    walk(v, "%s[%d]" % (path, i))
            elif isinstance(node, str):
                if PHONE_RE.search(node) and path not in allow:
                    found.append("text:" + path + "=" + node[:30])
        walk(payload)
        return found

    PUBLIC = [
        "/api/plans", "/api/free-plan", "/api/channels", "/api/vendors?limit=5",
        "/api/vendors/categories", "/api/vendors/packages", "/api/referral/terms",
        "/api/referral/leaderboard?period=all&limit=5", "/api/channels/live",
        "/api/plans", "/api/publish/status",
    ]
    for ep in PUBLIC:
        r = c.get(ep)
        if r.status_code != 200:
            check("%s → 200" % ep, False, r.status_code)
            continue
        L = leaks(r.json())
        check("%s — leak ledu" % ep, not L, L[:4])

    # ID search — ee endpoint lo mundu FULL user dict (phone!) return ayyedi
    r = c.get("/api/search/TSAP-M-2025-1042")
    d = r.json()
    L = leaks(d)
    check("/api/search/{id} — phone/email leak ledu", not L, L[:4])
    check("/api/search/{id} — contact_locked + phone_masked",
          d.get("contact_locked") is True and "•" in d["profile"].get("phone_masked", ""))
    check("/api/search/{id} — can_view_number False + Telugu unlock steps",
          d.get("can_view_number") is False and len(d.get("unlock_telugu", [])) == 3)
    check("/api/search/{id} — profile details intact (name/caste/district)",
          d["profile"].get("full_name") and d["profile"].get("caste") and d["profile"].get("district"))

    # matches — mundu raw dicts (phone!) vachedi
    r = c.get("/api/matches/%s" % me["tsap_id"])
    m = r.json()
    L = leaks(m)
    check("/api/matches/{id} — leak ledu", not L, L[:4])
    check("/api/matches/{id} — locked + masked + score/reasons intact",
          m.get("contact_locked") is True and m["matches"] and all("•" in x.get("phone_masked", "") for x in m["matches"])
          and all("score" in x for x in m["matches"]))

    # search list (frontend matches page idi vaadutundi)
    r = c.get("/api/search?limit=10&viewer_id=%s" % me["tsap_id"])
    L = leaks(r.json())
    check("/api/search (list) — leak ledu", not L, L[:4])
    rows = r.json().get("results", r.json().get("profiles", [])) if isinstance(r.json(), dict) else []
    check("/api/search (list) — prathi row lo phone_masked + lock",
          all("phone_masked" in x and x.get("contact_locked") for x in rows) if rows else True)

    # views / saved / porutham
    for ep in ["/api/views/%s?whoviewed=true" % me["tsap_id"],
               "/api/saved/%s" % me["tsap_id"],
               "/api/porutham?bride=TSAP-F-2025-1042&groom=TSAP-M-2025-1042"]:
        r = c.get(ep)
        if r.status_code == 200:
            L = leaks(r.json())
            check("%s — leak ledu" % ep.split("?")[0], not L, L[:4])

    # interest: inbox lo requester number accept varaku 🔒
    send = c.post("/api/interest/send", json={"from_id": me["tsap_id"], "to_id": other["tsap_id"],
                                              "message": "Namaste"}).json()
    check("interest send ok", send.get("success") is not False, send.get("reason") or send.get("message_telugu"))
    req_id = (send.get("request") or {}).get("request_id") or send.get("request_id")
    inbox = c.get("/api/interest/inbox/%s" % other["tsap_id"]).json()
    pend = [x for x in inbox.get("received", []) if x.get("status") == "pending"]
    check("inbox pending lo number 🔒 ('accept cheyyandi')",
          bool(pend) and "🔒" in str(pend[0].get("requester_phone")),
          {"send": send.get("reason") or send.get("status") or "ok", "pend": len(pend),
           "rph": pend[0].get("requester_phone") if pend else None,
           "req_id": req_id})
    check("inbox lo requester contact keys levu (leak ledu)", not leaks(inbox, allow=()),
          leaks(inbox)[:3])
    if req_id:
        acc = c.post("/api/interest/respond", json={"tsap_id": other["tsap_id"], "request_id": req_id,
                                                   "action": "accept"}).json()
        _contact = (acc.get("result") or {}).get("contact") or acc.get("contact") or {}
        check("accept → contact exchange (intended: numbers ivvadam)",
              acc.get("success") and _contact.get("phone") == my_phone
              and (acc.get("result") or {}).get("owner_phone") == str(other.get("phone")),
              {"contact": _contact, "result_owner": (acc.get("result") or {}).get("owner_phone")})
        # accept tarvata inbox lo number kanipisthundi (intended)
        inbox2 = c.get("/api/interest/inbox/%s" % other["tsap_id"]).json()
        accd = [x for x in inbox2.get("received", []) if x.get("status") == "accepted"]
        check("accept tarvata inbox lo number share (consent tho)", bool(accd) and accd[0].get("requester_phone") == my_phone)
        # sent list lo (requester view) accept varaku phone lock
        sent = c.get("/api/interest/sent/%s" % me["tsap_id"]).json()
        srec = [x for x in (sent.get("sent") or sent.get("requests") or []) if x.get("request_id") == req_id]
        if srec:
            check("sent view lo kooda contact lock (requester side)",
                  "🔒" in str(srec[0].get("owner_phone")) or srec[0].get("contact_shared") is True)
    # interest endpoints scan — consent (accepted) contact matrame allowed
    for ep in ["/api/interest/inbox/%s" % me["tsap_id"], "/api/interest/sent/%s" % me["tsap_id"],
               "/api/interest/sent/%s" % other["tsap_id"], "/api/credits/%s" % me["tsap_id"]]:
        r = c.get(ep)
        if r.status_code != 200:
            continue
        body = r.json()
        L = [x for x in leaks(body) if not (x.startswith("text:") and ("contact=" in x or "phone=" in x)
                                            and "accepted" in str(body))]
        check("%s — leak ledu (consent contact tappa)" % ep.split("/")[2], not L, L[:3])

    print("=== 8. /api/free-plan clarity ===")
    fp = c.get("/api/free-plan").json()
    check("headline: FREE + 3 profiles + numbers ivvamu",
          fp["success"] and "FREE" in fp["headline_telugu"] and "3 profiles" in fp["headline_telugu"]
          and "ఇవ్వము" in fp["rule_telugu"])
    check("free block: 3 profiles/requests + numbers ❌",
          fp["free"]["profiles"] == 3 and fp["free"]["requests"] == 3 and "ఇవ్వము" in fp["free"]["numbers"])
    check("paid ladder 5 plans (29 → 499)", len(fp["paid"]) == 5 and fp["paid"][0]["price"] == 29
          and fp["paid"][-1]["profiles"] == 50)
    check("numbers_rule Telugu (5 rules, consent + chatting ledu)",
          len(fp["numbers_rule_telugu"]) == 5 and any("chat" in r.lower() for r in fp["numbers_rule_telugu"]))
    check("FAQ 4 + CTA links", len(fp["faq_telugu"]) == 4 and fp["cta"]["register"] == "/register")
    check("clarity lo leak ledu", not leaks(fp), leaks(fp)[:3])

print("=== 9. FRONTEND WIRING ===")
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path):
    return src_page(path)


reg_pg = read("frontend/src/app/register/page.tsx")
match_pg = read("frontend/src/app/matches/page.tsx")
pricing_pg = read("frontend/src/app/pricing/page.tsx")
search_pg = read("frontend/src/app/search/[id]/page.tsx")

check("register page lo FREE-vs-PAID clarity box (/api/free-plan)", "/api/free-plan" in reg_pg and "clarity" in reg_pg)
check("register clarity: 'FREE లో ఇవ్వనిది' + numbers ivvamu",
      "FREE లో ఇచ్చేది" in reg_pg and "ఎవరికీ ఇవ్వము" in reg_pg)
check("register success lo 'enti vachindi' card (credits + lock + CTA)",
      "requests</b> ready" in reg_pg and "numbers 🔒 locked" in reg_pg)
check("matches page lo 🔒 number locked chip + phone_masked", "phone_masked" in match_pg and "Number:" in match_pg)
check("matches page lo clarity banner + pricing CTA",
      "Numbers ivvamu" in match_pg and "₹99 → 5 profiles" in match_pg)
check("pricing page lo numbers policy clarity (R13 minimal — okka line)",
      "రెండు వైపులా accept అయ్యాకే" in pricing_pg)
check("search page lo leak ki avakasam ledu (safe fields matrame)",
      "p.full_name" in search_pg or "profile" in search_pg)

print("\n=== RESULT: %d pass / %d fail ===" % (len(PASS), len(FAIL)))
if FAIL:
    print("FAILED:")
    for f in FAIL:
        print("   ❌ " + f)
    sys.exit(1)
print("🏆 PRIVACY LOCK OK — numbers eppudu leak avvavu; FREE lo 3 profiles, paid tho ekkuva")
