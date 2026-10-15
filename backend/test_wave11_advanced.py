"""
🚀 WAVE 11 TEST SUITE — ULTRA ADVANCED (top sites kanna ekkuva)
===============================================================
Cover:
  A. gothram guard (pure engine)
  B. consented registration + factual comparison + owner-only top-matches + public-safe gothram check
  C. success stories (submit → approve → list + like + share)
  D. support FAQ (list + search)
  E. daily streak (claim + double-guard + gap-reset + milestones)
  F. web push (subscribe + notify + unsubscribe + admin queue)
  G. voice intro (validate + upload + get + serve)
  H. profile complete bonus (gamification)
  I. boost packs (buy + rank + extend)
  J. telegram bot perfect (import-safe + helpers + handlers)
  K. privacy (stories/push lo numbers eppudu ledu)

Run:  WA_TEST_FAST=1 /home/user/venv/bin/python test_wave11_advanced.py
"""
import os
import sys
import re

os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ.setdefault("WA_LONG_PAUSE_CHANCE", "0")
os.environ.setdefault("WHATSAPP_MODE", "off")
os.environ.setdefault("PUBLISH_DRY_RUN", "true")
os.environ.setdefault("WA_ENABLED", "false")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("wave11-advanced")

PASS, FAIL, FAILED = 0, 0, []
PHONE_RE = re.compile(r"(?<![\d•])[6-9]\d{9}(?!\d)")


def check(name, cond, extra=None):
    global PASS, FAIL
    if cond:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  ❌ {name}" + (f"  | {str(extra)[:200]}" if extra is not None else ""))


def section(t):
    print(f"\n{'=' * 76}\n{t}\n{'=' * 76}")


import advanced11 as A11

# deterministic: state files reset
for _f in (A11.STORIES_FILE, A11.PUSH_FILE):
    try:
        os.remove(_f)
    except OSError:
        pass
A11.STORIES.clear()
A11.PUSH_SUBS.clear()
A11.PUSH_QUEUE.clear()

from testutil_client import TestClient
import hardening as H
import main

client = TestClient(main.app, raise_server_exceptions=False)
HDR_ADMIN = {"X-Admin-Key": H.ADMIN_KEY}

# ═══════════════════════════════════════════════════════════════════════════
section("A. GOTHRAM GUARD (pure engine)")
# ═══════════════════════════════════════════════════════════════════════════
a = {"gothram": "Bharadwaj"}
b_same = {"gothram": "  bharadwaj "}
b_diff = {"gothram": "Koundinya"}
b_none: dict = {}
check("A1 same member-entered gothram text is informational, not a block",
      A11.gothram_check(a, b_same)["same"] is True and A11.gothram_check(a, b_same)["blocked"] is False)
check("A2 note clearly says text comparison, not a marriage decision",
      "text comparison మాత్రమే" in A11.gothram_check(a, b_same)["note_telugu"]
      and "వివాహ నిర్ణయం కాదు" in A11.gothram_check(a, b_same)["note_telugu"])
check("A3 reason same_text", A11.gothram_check(a, b_same)["reason"] == "same_text")
check("A4 different text is informational, not an approval verdict",
      A11.gothram_check(a, b_diff)["same"] is False
      and A11.gothram_check(a, b_diff)["blocked"] is False
      and "తీర్పు కాదు" in A11.gothram_check(a, b_diff)["note_telugu"])
check("A5 missing member-entered text is reported as unavailable, not blocked",
      A11.gothram_check(a, b_none)["same"] is None
      and A11.gothram_check(a, b_none)["blocked"] is False
      and A11.gothram_check(a, b_none)["reason"] == "details_unavailable")
check("A6 'Bharadwaja Gothram' suffix normalize → same",
      A11.norm_gothram("Bharadwaja Gothram") == A11.norm_gothram("bharadwaj"), A11.norm_gothram("Bharadwaja Gothram"))
f = A11.filter_same_gothram(a, [{"tsap_id": "X1", "gothram": "Bharadwaj"},
                              {"tsap_id": "X2", "gothram": "Kasyapa"},
                              {"tsap_id": "X3"}])
check("A7 legacy filter keeps all profiles and skips none",
      f["skipped_count"] == 0 and len(f["kept"]) == 3)
check("A8 no member is filtered by a gothram text comparison", f["skipped_ids"] == [])

# ═══════════════════════════════════════════════════════════════════════════
section("B. INTEREST POLICY + FACTUAL COMPARISON + OWNER-ONLY TOP-MATCHES")
# ═══════════════════════════════════════════════════════════════════════════
import random as _r11
_PH = lambda: "9911%06d" % _r11.randint(0, 999999)
BB = {"gender": "Bride", "age": "25", "dob": "2001-04-03", "password": "Wave11-test-only-password-2026!",
      "consent_confirmed": "true", "height": "5'4\"", "marital_status": "Pelli Kaledu", "caste": "Reddy",
      "sub_caste": "Pakanati Reddy", "education": "BTech", "job": "Software", "salary": "60k",
      "state": "TS", "district": "Hyderabad", "phone": _PH(), "full_name": "Wave Eleven Bride",
      "gothram": "Bharadwaj", "star": "Rohini", "religion": "Hindu"}
BG_SAME = dict(BB, gender="Groom", age="29", dob="1997-04-03", phone=_PH(),
               full_name="Wave Eleven Groom Same", gothram="bharadwaj", height="5'9\"")
BG_DIFF = dict(BB, gender="Groom", age="30", dob="1996-04-03", phone=_PH(),
               full_name="Wave Eleven Groom Diff", gothram="Koundinya", height="5'10\"")
bride_resp = client.post("/api/register", data=BB)
same_resp = client.post("/api/register", data=BG_SAME)
diff_resp = client.post("/api/register", data=BG_DIFF)
bride, g_same, g_diff = (r.json() if r.status_code == 200 else {}
                         for r in (bride_resp, same_resp, diff_resp))
BID, BTOK = bride.get("tsap_id", ""), bride.get("auth_token", "")
G1, G1TOK = g_same.get("tsap_id", ""), g_same.get("auth_token", "")
G2 = g_diff.get("tsap_id", "")
check("B0 3 consented test profiles register", all(r.status_code == 200 for r in (bride_resp, same_resp, diff_resp))
      and all([BID, G1, G2]), [(r.status_code, r.text[:80]) for r in (bride_resp, same_resp, diff_resp)])
_pending_gothram = client.get(f"/api/gothram/check?a={BID}&b={G1}")
check("B0a unapproved profiles cannot be probed for gothram", _pending_gothram.status_code == 404)
_approval_results = [client.post(f"/api/admin/approve/{profile_id}", headers=HDR_ADMIN)
                     for profile_id in (BID, G1, G2)]
check("B0b profiles explicitly approved through owner route",
      all(response.status_code == 200 for response in _approval_results),
      [response.status_code for response in _approval_results])

r = client.post("/api/interest/send", json={"from_id": BID, "to_id": G1},
                headers={"X-Tsap-Token": BTOK})
check("B1 same-gothram text alone does not block an interest",
      r.status_code == 200 and r.json().get("success") is True, (r.status_code, r.text[:160]))

r = client.post("/api/interest/send", json={"from_id": BID, "to_id": G2},
                headers={"X-Tsap-Token": BTOK})
check("B2 different-gothram interest is also accepted when other rules pass",
      r.status_code == 200 and r.json().get("success") is True, (r.status_code, r.text[:160]))

r = client.get(f"/api/gothram/check?a={BID}&b={G1}")
check("B3 same text is reported informationally, without raw gothram values",
      r.status_code == 200 and r.json().get("same") is True
      and r.json().get("blocked") is False and "a_gothram" not in r.json()
      and "b_gothram" not in r.json() and "వివాహ నిర్ణయం కాదు" in r.json().get("note_telugu", ""), r.json())
r = client.get(f"/api/gothram/check?a={BID}&b={G2}")
check("B4 different text stays informational", r.json().get("same") is False and r.json().get("blocked") is False, r.json())
r = client.get("/api/gothram/check?a=NOPE&b=NOPE2")
check("B5 unknown IDs → 404", r.status_code == 404, r.status_code)

r = client.get(f"/api/match/score?a={BID}&b={G1}", headers={"X-Tsap-Token": BTOK})
match_json = r.json()
check("B6 legacy match route returns factual observations, not a compatibility score",
      r.status_code == 200 and match_json.get("compatibility_score_calculated") is False
      and "observations" in match_json and "score" not in match_json
      and "match_score" not in match_json and "compatibility_score" not in match_json, match_json)

r = client.get(f"/api/top-matches/{BID}?limit=30&min_score=0", headers={"X-Tsap-Token": BTOK})
tj = r.json()
ids = [x.get("tsap_id") for x in tj.get("results", [])]
check("B7 owner top-matches returns IDs and does not filter same gothram",
      r.status_code == 200 and G1 in ids and G2 in ids
      and tj.get("compatibility_score_calculated") is False
      and tj.get("min_score_ignored") is True, (r.status_code, ids, tj.get("message_telugu")))
r2 = client.get(f"/api/top-matches/{BID}?limit=30&min_score=0&include_same_gothram=0",
                headers={"X-Tsap-Token": BTOK})
ids2 = [x.get("tsap_id") for x in r2.json().get("results", [])]
check("B8 legacy gothram exclusion flag cannot change eligibility", G1 in ids2 and G1 in ids)
check("B9 top-matches rows contain real IDs and no synthetic score/reasons",
      bool(tj.get("results")) and all(row.get("tsap_id") in {G1, G2}
      and not any(key in row for key in ("score", "match_score", "trust_score", "compatibility_score", "reasons"))
      for row in tj.get("results", [])), tj.get("results"))

# ═══════════════════════════════════════════════════════════════════════════
section("C. SUCCESS STORIES")
# ═══════════════════════════════════════════════════════════════════════════
r = client.post("/api/stories/submit",
                json={"tsap_id": BID, "text": "short"},
                headers={"X-Tsap-Token": BTOK})
check("C1 chinna story (<20) → 400/422", r.status_code in (400, 422), r.status_code)
STORY_TXT = "Mana Vivaha lo kalisam — families matladukuni 3 months lo pelli chesukunnam. Chala happy ga unnam!"
r = client.post("/api/stories/submit",
                json={"tsap_id": BID, "text": STORY_TXT, "partner_id": G2,
                      "couple_names": "W11 Bride ❤️ W11 Groom"},
                headers={"X-Tsap-Token": BTOK})
check("C2 submit 200 + pending", r.status_code == 200 and r.json()["story"]["status"] == "pending", r.status_code)
SID = r.json()["story"]["story_id"]
r = client.post("/api/stories/submit",
                json={"tsap_id": BID, "text": STORY_TXT + " again"},
                headers={"X-Tsap-Token": BTOK})
check("C3 duplicate pending → 400", r.status_code == 400, r.status_code)
r = client.get("/api/stories")
check("C4 approve mundu public list lo ledu", SID not in [s["story_id"] for s in r.json().get("stories", [])])
r = client.post("/api/admin/stories/STORY-9999/action", json={"action": "approve"},
                headers={"X-Admin-Key": "wrong"})
check("C5 wrong admin key → 403 (enforce) leda 400/404 (dev bypass + validation)",
      r.status_code in (403, 400, 404), r.status_code)  # W35: unknown story → 404
r = client.post(f"/api/admin/stories/{SID}/action", json={"action": "approve"}, headers=HDR_ADMIN)
check("C6 admin approve 200 + share_text", r.status_code == 200 and "share_text" in r.json(), r.status_code)
check("C7 share_text lo manavivaha.in + numbers ledu",
      "manavivaha.in" in r.json()["share_text"] and not PHONE_RE.findall(r.json()["share_text"]))
r = client.get("/api/stories")
check("C8 approve tarvata public list lo undi", SID in [s["story_id"] for s in r.json().get("stories", [])])
r = client.post(f"/api/stories/{SID}/like")
check("C9 like → likes 1", r.json().get("likes") == 1, r.json())
r = client.post("/api/stories/STORY-9999/like")
check("C10 fake story like → 400", r.status_code == 400, r.status_code)
r = client.post(f"/api/admin/stories/{SID}/action", json={"action": "bogus"}, headers=HDR_ADMIN)
check("C11 bogus action → 400", r.status_code == 400, r.status_code)

# ═══════════════════════════════════════════════════════════════════════════
section("D. SUPPORT FAQ")
# ═══════════════════════════════════════════════════════════════════════════
r = client.get("/api/support/faq")
check("D1 list 200 + >=5 faqs", r.status_code == 200 and len(r.json().get("faqs", [])) >= 5, r.status_code)
r = client.get("/api/support/faq", params={"q": "99 price free"})
check("D2 'price' search → price answer first", r.json()["faqs"][0]["id"] == "price",
      [f["id"] for f in r.json()["faqs"]])
r = client.get("/api/support/faq", params={"q": "gothram same"})
check("D3 'gothram' search → gothram answer", any(f["id"] == "gothram" for f in r.json()["faqs"]))
r = client.get("/api/support/faq", params={"q": "xyzabcnope"})
check("D4 teliyani q → human support fallback",
      r.json()["faqs"][0]["id"] == "support_human", r.json()["faqs"][0]["id"])
_faqs12 = client.get("/api/support/faq?limit=12").json()["faqs"]
_TELUGU_WORDS = ("మీ", "కావాలి", "చెయ్యండి", "వస్తుంది", "మాత్రమే", "అయితే", "లేదా",
                 "కూడా", "చూడండి", "పంపండి", "ఇస్తుంది", "ఉంటుంది", "అవతలి", "రండి")
_tel = sum(1 for f in _faqs12 if any(w in f["a"].lower() for w in _TELUGU_WORDS))
check("D5 answers anni Telugu flavor (Telugu script)", _tel == len(_faqs12), _tel)

# ═══════════════════════════════════════════════════════════════════════════
section("E. DAILY STREAK")
# ═══════════════════════════════════════════════════════════════════════════
r = client.post("/api/streak/claim", json={"tsap_id": BID}, headers={"X-Tsap-Token": BTOK})
check("E1 first claim success + bonus>=1",
      r.status_code == 200 and r.json().get("success") and r.json().get("bonus", 0) >= 1, r.json())
check("E2 count 1 + 🔥 telugu", r.json().get("count") == 1 and "🔥" in r.json().get("message_telugu", ""))
cr_before = next(u for u in main.DB_USERS if u["tsap_id"] == BID).get("credits", 0)
r = client.post("/api/streak/claim", json={"tsap_id": BID}, headers={"X-Tsap-Token": BTOK})
cr_after = next(u for u in main.DB_USERS if u["tsap_id"] == BID).get("credits", 0)
check("E3 rendu sari claim → already (credits peragavu)",
      r.json().get("already") is True and cr_after == cr_before, r.json())
r = client.get(f"/api/streak/{BID}", headers={"X-Tsap-Token": BTOK})
check("E4 status claimed_today True + next_bonus",
      r.json().get("claimed_today") is True and r.json().get("next_bonus", 0) >= 1, r.json())
# pure: consecutive + gap reset + milestone
u = {"credits": 0}
A11.claim_daily(u, today="2026-09-10")
A11.claim_daily(u, today="2026-09-11")
check("E5 consecutive → count 2", u["streak_count"] == 2, u)
A11.claim_daily(u, today="2026-09-13")
check("E6 gap (12th miss) → reset 1", u["streak_count"] == 1, u)
check("E7 milestone bonus table (7→5, 14→8, 30→15)",
      (A11.streak_bonus_for(7), A11.streak_bonus_for(14), A11.streak_bonus_for(30)) == (5, 8, 15))
u7 = {"credits": 0, "streak_count": 6, "streak_last": "2026-09-10"}
res7 = A11.claim_daily(u7, today="2026-09-11")
check("E8 day-7 milestone flag + msg", res7.get("milestone") is True and "7 days" in res7["message_telugu"], res7)

# ═══════════════════════════════════════════════════════════════════════════
section("F. WEB PUSH")
# ═══════════════════════════════════════════════════════════════════════════
r = client.get("/api/push/vapid")
check("F1 vapid endpoint 200 + preview mode (keys levu)",
      r.status_code == 200 and r.json().get("mode") == "preview", r.json())
EP = "https://fcm.googleapis.com/fcm/send/w11-test-endpoint-001"
r = client.post("/api/push/subscribe",
                json={"tsap_id": BID, "endpoint": EP,
                      "keys": {"p256dh": "k1", "auth": "a1"}, "ua": "test"},
                headers={"X-Tsap-Token": BTOK})
check("F2 subscribe success + sub_id", r.status_code == 200 and r.json().get("sub_id", "").startswith("PUSH-"), r.json())
r = client.post("/api/push/subscribe",
                json={"tsap_id": BID, "endpoint": EP, "keys": {}}, headers={"X-Tsap-Token": BTOK})
check("F3 same endpoint → renewed (duplicate kadu)", r.json().get("renewed") is True
      and len(A11.PUSH_SUBS) == 1, (r.json(), len(A11.PUSH_SUBS)))
r = client.post(f"/api/push/notify/{BID}",
                json={"title": "💍 2 kotha matches!", "body": "92% match vachindi — chudandi", "url": "/matches"},
                headers={"X-Tsap-Token": BTOK})
check("F4 notify queued 1 + preview", r.json().get("queued") == 1 and r.json().get("mode") == "preview", r.json())
check("F5 payload lo icon + url", r.json()["payload_preview"].get("icon") == "/icons/icon-192.png"
      and r.json()["payload_preview"].get("url") == "/matches")
r = client.post(f"/api/push/notify/{G2}", json={"title": "t", "body": "b"}, headers=HDR_ADMIN)
check("F6 subscription leni user → no_subscription", r.json().get("reason") == "no_subscription", r.json())
r = client.get("/api/admin/push/queue", headers=HDR_ADMIN)
check("F7 admin queue: subs 1 + queue 1", r.json().get("subs") == 1 and len(r.json().get("queue", [])) == 1, r.json())
r = client.get("/api/admin/push/queue")
check("F8 admin queue key lekunda → 403 (enforce) leda dev-bypass 200",
      r.status_code == 403 or (r.status_code == 200 and "subs" in r.json()), r.status_code)
r = client.post("/api/push/unsubscribe", json={"tsap_id": BID}, headers={"X-Tsap-Token": BTOK})
check("F9 unsubscribe removed 1", r.json().get("removed") == 1, r.json())

# ═══════════════════════════════════════════════════════════════════════════
section("G. VOICE INTRO")
# ═══════════════════════════════════════════════════════════════════════════
check("G1 validate mp3 ok", A11.voice_validate("a.mp3", 50000)["ok"] is True)
check("G2 validate exe reject", A11.voice_validate("a.exe", 50000)["ok"] is False)
check("G3 validate 5MB reject", A11.voice_validate("a.mp3", 5 * 1024 * 1024)["ok"] is False)
check("G4 validate 10 bytes reject", A11.voice_validate("a.mp3", 10)["ok"] is False)
FAKE_MP3 = b"ID3" + b"\x00" * 8000
r = client.post("/api/voice/upload", files={"file": ("intro.exe", FAKE_MP3, "application/octet-stream")},
                data={"tsap_id": BID})
check("G5 upload .exe → 400 telugu", r.status_code == 400, r.status_code)
r = client.post("/api/voice/upload", files={"file": ("intro.mp3", FAKE_MP3, "audio/mpeg")},
                data={"tsap_id": BID})
check("G6 upload mp3 200 + /voice/ url", r.status_code == 200 and r.json()["url"].startswith("/voice/"), r.json())
VURL = r.json().get("url", "")
r = client.get(f"/api/voice/{BID}")
check("G7 /api/voice/{id} has_voice True", r.json().get("has_voice") is True and r.json().get("voice_url") == VURL, r.json())
r = client.get(VURL)
check("G8 static serve /voice/... 200 audio bytes", r.status_code == 200 and len(r.content) > 1000,
      (r.status_code, len(r.content)))

# ═══════════════════════════════════════════════════════════════════════════
section("H. PROFILE COMPLETE BONUS")
# ═══════════════════════════════════════════════════════════════════════════
r = client.post(f"/api/profile/complete-bonus/{BID}", headers={"X-Tsap-Token": BTOK})
check("H1 low profile → success False + need_more",
      r.json().get("success") is False and r.json().get("need_more", 0) > 0, r.json())
rich = next(u for u in main.DB_USERS if u["tsap_id"] == BID)
rich.update({"photo_urls": ["x"], "phone_verified": True, "dob": "2000-01-01", "college": "JNTU",
             "company": "TCS", "work_location": "Hyd", "father_name": "F", "mother_name": "M",
             "father_occupation": "Farmer", "mother_occupation": "Home", "brothers": "1", "sisters": "1",
             "native_place": "Nalgonda", "about_myself": "x" * 40, "about_family": "good family",
             "expectations": "kind partner", "current_city": "Hyderabad", "email": "a@b.com",
             "weight": "60", "sub_caste": "Pakanati", "rasi": "Vrishabha"})
r = client.post(f"/api/profile/complete-bonus/{BID}", headers={"X-Tsap-Token": BTOK})
check("H2 90%+ → +2 credits", r.json().get("success") is True and r.json().get("bonus") == 2, r.json())
r = client.post(f"/api/profile/complete-bonus/{BID}", headers={"X-Tsap-Token": BTOK})
check("H3 malli claim → already", r.json().get("already") is True, r.json())

# ═══════════════════════════════════════════════════════════════════════════
section("I. BOOST PACKS")
# ═══════════════════════════════════════════════════════════════════════════
r = client.get("/api/boost/packs")
packs = {p["code"]: p for p in r.json().get("packs", [])}
check("I1 3 packs (B_1/B_3/B_7)", set(packs) == {"B_1", "B_3", "B_7"}, list(packs))
check("I2 prices 49/99/199", [packs[k]["price"] for k in ("B_1", "B_3", "B_7")] == [49, 99, 199], packs)
r = client.post("/api/boost/buy", json={"tsap_id": G2, "pack": "BOGUS"}, headers=HDR_ADMIN)
check("I3 bogus pack → 400/401", r.status_code in (400, 401), r.status_code)
r = client.post("/api/boost/buy", json={"tsap_id": G2, "pack": "B_1"})
check("I4 explicit isolated-test payment fixture is marked and boosts the profile",
      r.json().get("order", {}).get("status") == "paid"
      and r.json().get("order", {}).get("development_fixture") is True
      and r.json().get("boosted") is True, r.json())
until1 = r.json().get("boost_until", "")
r = client.post("/api/boost/buy", json={"tsap_id": G2, "pack": "B_3"})
check("I5 extend: boost_until perugutundi", r.json().get("boost_until", "") > until1, r.json().get("boost_until"))
r = client.get(f"/api/top-matches/{BID}?limit=30&min_score=0")
rows = r.json().get("results", [])
g2row = next((x for x in rows if x.get("tsap_id") == G2), None)
check("I6 boosted profile lo boosted True", bool(g2row) and g2row.get("boosted") is True, g2row)
if rows:
    first_boost = [x.get("boosted") for x in rows]
    check("I7 boosted rows anni non-boosted kanna mundu",
          first_boost == sorted(first_boost, reverse=True), first_boost)

# ═══════════════════════════════════════════════════════════════════════════
section("J. TELEGRAM BOT PERFECT")
# ═══════════════════════════════════════════════════════════════════════════
import telegram_bot as TB

check("J1 import-safe (token lekunda kooda import)", TB is not None)
check("J2 bot_status configured False + telugu note (token ledu)",
      TB.bot_status()["configured"] is False and "TOKEN" in TB.bot_status()["note_telugu"], TB.bot_status())
check("J3 parse channel ref", TB.parse_start_ref("/start ch_reddy") == {"raw": "ch_reddy", "kind": "channel", "value": "reddy"},
      TB.parse_start_ref("/start ch_reddy"))
check("J4 parse referral ref", TB.parse_start_ref("/start ref_1042")["kind"] == "referral")
check("J5 parse profile ref (TSAP-)", TB.parse_start_ref("/start TSAP-F-1042")["kind"] == "profile")
check("J6 parse plain /start", TB.parse_start_ref("/start")["kind"] == "plain")
_bot_help = TB.help_text()
check("J7 help text has commands, Telugu, and safe current-pricing/payment guidance",
      "/search" in _bot_help and "/myid" in _bot_help
      and any("\u0c00" <= char <= "\u0c7f" for char in _bot_help)
      and "current prices/terms" in _bot_help
      and "payment references" in _bot_help.lower())
card = TB.format_id_search({"tsap_id": "TSAP-F-1", "full_name": "T", "gender": "Bride", "age": 24,
                            "caste": "Reddy", "education": "BTech", "job": "SW", "district": "Hyd",
                            "state": "TS", "star": "Rohini", "gothram": "Bharadwaj",
                            "phone": "9848012345"})
check("J8 ID card lo number leak ledu", "9848012345" not in card and "TSAP-F-1" in card, card[:120])
check("J9 retired local registration exposes no approve/auto-post keyboard", not hasattr(TB, "get_approve_kb"))
check("J10 bot does not retain locally submitted/demo profiles", not hasattr(TB, "user_profiles"))
n_handlers = len(TB.dp.message.handlers) + len(TB.dp.callback_query.handlers)
check("J11 handlers >= 10 (start/help/myid/cancel/search/photo/contact/caste+callbacks)", n_handlers >= 10, n_handlers)

# ═══════════════════════════════════════════════════════════════════════════
section("K. PRIVACY — stories/push/voice lo numbers eppudu ledu")
# ═══════════════════════════════════════════════════════════════════════════
r = client.get("/api/stories")
check("K1 public stories lo 10-digit numbers ledu", not PHONE_RE.findall(r.text), PHONE_RE.findall(r.text)[:3])
r = client.get("/api/support/faq?limit=12")
check("K2 FAQ lo numbers ledu", not PHONE_RE.findall(r.text))
r = client.get("/api/boost/packs")
check("K3 boost packs lo numbers ledu", not PHONE_RE.findall(r.text))
r = client.get(f"/api/voice/{BID}")
check("K4 voice meta lo numbers ledu", not PHONE_RE.findall(r.text), r.text[:150])

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
