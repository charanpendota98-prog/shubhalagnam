"""
Wave 12 current-contract regression suite — isolated, local-only fixtures.

Covers public masking; accepted-interest contact reveal; the fact that credits and
paid assisted shortlists never bypass owner consent; disabled/unconfigured bot and
payment contacts; public API privacy; and the retired demo-seed route. All data and
persistence paths are temporary. No Telegram, WhatsApp, UPI, or production store is used.

Run: backend/.venv/bin/python backend/test_wave12_smart.py
"""
import os
import re
import sys
from unittest.mock import patch

os.environ["WA_TEST_FAST"] = "1"
os.environ["TSAP_AUTH_MODE"] = "test"
os.environ["TSAP_AUTH_ENFORCE"] = "0"
os.environ["APP_ENV"] = "test"
os.environ["ENV"] = "test"
os.environ["OTP_DEV_MODE"] = "true"
os.environ["WA_LONG_PAUSE_CHANCE"] = "0"
os.environ["WHATSAPP_MODE"] = "off"
os.environ["PUBLISH_DRY_RUN"] = "true"
os.environ["AUTO_POST_ON_REGISTER"] = "false"
for _key in ("BOT_TOKEN", "BOT_TOKEN_BACKUP", "BOT_TOKEN_ALERT", "BOT_TOKEN_2", "BOT_TOKEN_3",
             "BOT_POOL_JSON", "TSAP_API_KEY", "PAY_UPI_ID", "SUPPORT_CALL_NUMBER"):
    os.environ.pop(_key, None)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores
_TEST_STORE = isolate_test_stores("wave12-smart")

PASS, FAIL, FAILED = 0, 0, []
PHONE_RE = re.compile(r"(?<![\d•])[6-9]\d{9}(?!\d)")


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
        print(f"  ❌ {name} :: {str(extra)[:220]}")


from fastapi.testclient import TestClient
import hardening as H
import main
import smart12 as S12
import channels_config as CC
import publisher as PUB
import telegram_bot as TB

client = TestClient(main.app, raise_server_exceptions=False)
HDR_ADMIN = {"X-Admin-Key": H.ADMIN_KEY}

# fresh state (S12 stores matrame clear — vere suites ki touch kadu)
S12.UNLOCKS.clear()
S12.ORDERS.clear()
S12.REVEAL_LOG.clear()

# ═══════════════════════════════════════════════════════════════════════════
section("A. MASKING (pure)")
# ═══════════════════════════════════════════════════════════════════════════
check("A1 mask_name: full+surname rendu mask", S12.mask_name("Lakshmi Reddy") == "L•••••i R•••y",
      S12.mask_name("Lakshmi Reddy"))
check("A2 mask lo original words ledu",
      "Lakshmi" not in S12.mask_name("Lakshmi Reddy") and "Reddy" not in S12.mask_name("Lakshmi Reddy"))
check("A3 single word kooda mask", S12.mask_name("Sravani") == "S•••••i", S12.mask_name("Sravani"))
check("A4 short name as-is (T)", S12.mask_name("T") == "T")
check("A5 empty → —", S12.mask_name("") == "—")
check("A6 mask_phone format", S12.mask_phone("9848012345") == "98••••••45", S12.mask_phone("9848012345"))
check("A7 short phone lock", S12.mask_phone("12") == "🔒 •••••")
check("A8 first_masked paid-format", S12.first_masked("Lakshmi Reddy") == "Lakshmi R.",
      S12.first_masked("Lakshmi Reddy"))
check("A9 assert_no_leak ok", S12.assert_no_leak("hello 98••••••45 world")["ok"] is True)
check("A10 assert_no_leak catches", S12.assert_no_leak("call 9848012345")["ok"] is False)

# ═══════════════════════════════════════════════════════════════════════════
section("B. MASKED CHANNEL CAPTIONS (rewired, old asserts intact)")
# ═══════════════════════════════════════════════════════════════════════════
prof = {"full_name": "Lakshmi Reddy", "gender": "Bride", "age": 24, "height": "5'4\"",
        "caste": "Reddy", "education": "BTech", "job": "Software", "district": "Hyderabad",
        "state": "TS", "gothram": "Bharadwaj", "star": "Rohini", "phone": "9848012345"}
cap = CC.build_caption(prof, "TSAP-F-2025-5775", 92)
check("B1 caption: full name ledu", "Lakshmi Reddy" not in cap)
check("B2 caption: FIRST NAME visible (W13)", "\U0001F470 Lakshmi \u2022" in cap, cap[:200])
check("B3 caption: surname name-line lo ledu", "Lakshmi R" not in cap, cap.split(chr(10))[1])
check("B4 caption: full-name string ekkada ledu", "Lakshmi" in cap and "Lakshmi Reddy" not in cap)
check("B5 caption: number ledu", not PHONE_RE.findall(cap))
check("B6 caption: ID, profile URL, neutral copy, safety; no score/number",
      "TSAP-F-2025-5775" in cap and "92%" not in cap
      and "/search/TSAP-F-2025-5775" in cap and "Contact details are not public" in cap
      and "advance money" in cap.lower())
check("B6a caption has no guessed bot username", not re.search(r"(?:@|t\.me/)[A-Za-z0-9_]*_bot", cap))
check("B7 caption uses the profile page, not a bot unlock CTA",
      "/search/TSAP-F-2025-5775" in cap and "/unlock" not in cap)
wa = PUB.build_whatsapp_text(prof, "TSAP-F-2025-0001", 90)
check("B8 WA text: first name, no surname/number, profile link",
      "Lakshmi Reddy" not in wa and "Lakshmi" in wa and not PHONE_RE.findall(wa)
      and "/search/TSAP-F-2025-0001" in wa, wa[:200])
check("B9 WA text has consent and safety; no unlock CTA",
      "acceptance" in wa.lower() and "advance money" in wa.lower() and "/unlock" not in wa)

# ═══════════════════════════════════════════════════════════════════════════
section("C. UNLOCK ENGINE (pure)")
# ═══════════════════════════════════════════════════════════════════════════
viewer = {"tsap_id": "V1", "credits": 3}
target = {"tsap_id": "T1", "phone": "9848011111"}
r = S12.unlock_number(viewer, target)
check("C1 unaccepted profile blocks reveal without charge",
      not r["success"] and r["reason"] == "consent_required"
      and "phone" not in r and viewer["credits"] == 3, r)
granted = S12.grant_unlock("V1", "T1", via="mutual_consent", consent_granted=True)
check("C2 explicit owner acceptance creates consent entitlement",
      granted["success"] and S12.is_entitled("V1", "T1"), granted)
r = S12.unlock_number(viewer, target, consent_granted=True)
check("C3 accepted interest reveals number without spending credits",
      r["success"] and r["phone"] == "9848011111" and r["charged"] == 0
      and viewer["credits"] == 3, r)
r2 = S12.unlock_number(viewer, target, consent_granted=True)
check("C4 repeat reveal remains free after acceptance",
      r2["success"] and r2["charged"] == 0 and viewer["credits"] == 3, r2)
poor = {"tsap_id": "V2", "credits": 0}
poor_target = {"tsap_id": "T2", "phone": "9848022222"}
r3 = S12.unlock_number(poor, poor_target)
check("C5 zero credits do not bypass missing consent",
      not r3["success"] and r3["reason"] == "consent_required" and "phone" not in r3, r3)
r4 = S12.unlock_number(poor, poor_target, consent_granted=True)
check("C6 accepted contact is not gated on request-credit balance",
      r4["success"] and r4["phone"] == "9848022222" and r4["charged"] == 0
      and poor["credits"] == 0, r4)
me = {"tsap_id": "V3", "credits": 0, "phone": "9848033333"}
r5 = S12.unlock_number(me, dict(me))
check("C7 self unlock free", r5["success"] and r5["phone"] == "9848033333" and r5["charged"] == 0, r5)
check("C8 consent reveal audit is recorded",
      len(S12.REVEAL_LOG) >= 3 and all(row.get("via") == "mutual_consent" for row in S12.REVEAL_LOG[:2]),
      S12.REVEAL_LOG[:3])
admin_grant = S12.grant_unlock("V9", "T9", via="admin_gift")
check("C9 payment/admin grants cannot create contact entitlement",
      not admin_grant["success"] and not S12.is_entitled("V9", "T9"), admin_grant)
lst = S12.my_unlocks("V1", [{"tsap_id": "T1", "full_name": "Lakshmi Reddy", "phone": "9848011111",
                              "age": 24, "caste": "Reddy", "district": "Hyd"}], accepted_targets={"T1"})
check("C10 accepted-contact list remains masked",
      lst["count"] == 1 and not PHONE_RE.findall(str(lst)) and "9848011111" not in str(lst), str(lst)[:200])

# ═══════════════════════════════════════════════════════════════════════════
section("D. ₹500 ORDERS (pure)")
# ═══════════════════════════════════════════════════════════════════════════
o = S12.create_order("VORDER", 500, "isolated test fixture")
check("D1 order create requested at the configured assisted-service price",
      o["status"] == "requested" and o["amount"] == S12.ASSISTED_PRICE == 500, o)
p0 = S12.mark_order_paid(o["id"], "")
check("D2 UTR is required before paid", p0["success"] is False, p0)
a0 = S12.attach_order_profiles(o["id"], ["T1"])
check("D3 shortlist cannot attach before payment", a0["success"] is False, a0)
p1 = S12.mark_order_paid(o["id"], "UTR-TEST-ONLY")
check("D4 explicit reference marks the local test order paid",
      p1["success"] and S12.get_order(o["id"])["status"] == "paid")
a1 = S12.attach_order_profiles(o["id"], ["T1", "T2"])
check("D5 paid order attaches summaries without granting contact access",
      a1["success"] and a1["attached"] == 2
      and a1.get("contact_access") == "owner_acceptance_required"
      and not S12.is_entitled("VORDER", "T1") and not S12.is_entitled("VORDER", "T2"), a1)
cl = S12.build_copy_list({"full_name": "Ravi Kumar"}, [
    {"full_name": "Sravani K", "phone": "9848011111", "tsap_id": "T1", "gender": "Bride",
     "caste": "Kamma", "age": 26, "district": "Vijayawada"}], o["id"])
check("D6 copy-list contains a masked summary and no contact number",
      "Sravani K." in cl and "T1" in cl and "owner must accept" in cl.lower()
      and "9848011111" not in cl and S12.assert_no_leak(cl)["ok"], cl[:250])
pack = S12.build_personal_pack({"full_name": "Ravi Kumar"},
                               [{"full_name": "Lakshmi Reddy", "phone": "9848011111", "tsap_id": "T1",
                                 "gender": "Bride", "age": 24, "caste": "Reddy", "district": "Hyd", "state": "TS"}],
                               o["id"])
check("D7 personal pack confirms service but withholds candidate contact",
      len(pack) == 2 and "₹500" in pack[0] and "T1" in pack[1]
      and "owner acceptance" in pack[1].lower() and "9848011111" not in "\n".join(pack)
      and all(S12.assert_no_leak(message)["ok"] for message in pack), pack[0][:150])

# ═══════════════════════════════════════════════════════════════════════════

section("E. API (interest consent / masked shortlist / isolated fixtures)")
# ═══════════════════════════════════════════════════════════════════════════
seed = client.post("/api/demo/seed", json={})
check("E0 demo seed is retired and creates no profiles",
      seed.status_code == 410 and not main.DB_USERS, seed.status_code)

B1, B2, BUY, ORDER_BUY = "W12-BRIDE-1", "W12-BRIDE-2", "W12-BUYER", "W12-ORDER-BUYER"
_B1PH, _B2PH, _BUY_PH, _ORDER_PH = "9848010001", "9848010002", "9848010003", "9848010004"

def _fixture_user(tsap_id, full_name, gender, phone, caste, credits=0, created_at="2026-10-06T10:00:00"):
    return {"tsap_id": tsap_id, "full_name": full_name, "gender": gender, "phone": phone,
            "age": 26, "height": "5'5\"", "marital_status": "Never Married",
            "caste": caste, "religion": "Hindu", "education": "BTech", "job": "Nurse",
            "salary": "50000", "district": "Hyderabad", "state": "TS", "credits": credits,
            "status": "approved", "is_approved": True, "is_active": True,
            "photo_status": "none", "created_at": created_at}

main.DB_USERS.clear()
main.DB_INTERESTS.clear()
main.DB_PAYMENTS.clear()
main.DB_VIEWS.clear()
main.DB_SAVES.clear()
main.DB_BLOCKS.clear()
main.WA_QUEUE.clear()
main.DB_USERS.extend([
    _fixture_user(B1, "Sravani Bride One", "Bride", _B1PH, "Reddy"),
    _fixture_user(B2, "Kavya Bride Two", "Bride", _B2PH, "Kamma", created_at="2026-10-06T11:00:00"),
    _fixture_user(BUY, "Ravi Requester", "Groom", _BUY_PH, "Reddy", credits=3),
    _fixture_user(ORDER_BUY, "Arun Order Buyer", "Groom", _ORDER_PH, "Kamma"),
])
main._reindex_users()
S12.UNLOCKS.clear()
S12.ORDERS.clear()
S12.REVEAL_LOG.clear()
S12._ORDER_SEQ = 0

lk = client.post("/api/link-telegram", json={"tsap_id": BUY, "chat_id": "TEST-CHAT-1"}).json()
check("E1 test account links without any live Telegram request", lk.get("success") is True, lk)
lk_bad = client.post("/api/link-telegram", json={"tsap_id": "W12-NOT-FOUND", "chat_id": "1"})
check("E2 unknown ID is rejected", lk_bad.status_code == 404, lk_bad.status_code)

with patch.object(main, "enqueue_whatsapp", return_value={"queued": False}), \
     patch.object(main, "start_wa_worker", return_value=None):
    pending_response = client.post("/api/interest/send", json={"from_id": BUY, "to_id": B1,
                                                                "note": "Local consent-flow fixture"})
    pending = pending_response.json()
    check("E3 interest request is created and consumes one request credit",
          pending_response.status_code == 200 and pending.get("status") == "pending"
          and pending.get("credits_left") == 2, pending)
    request_id = pending.get("request_id", "")
    before_accept = client.post("/api/unlock", json={"viewer_id": BUY, "target_id": B1})
    before_json = before_accept.json()
    check("E4 contact stays hidden before owner acceptance",
          before_accept.status_code == 409 and before_json.get("reason") == "consent_required"
          and "phone" not in before_json and _B1PH not in before_accept.text
          and not PHONE_RE.findall(before_accept.text), before_json)
    accept_response = client.post("/api/interest/respond", json={"tsap_id": B1,
                                                                   "request_id": request_id,
                                                                   "action": "accept"})
    accepted = accept_response.json()
    check("E5 only the profile owner can mark this local request accepted",
          accept_response.status_code == 200 and accepted.get("request", {}).get("status") == "accepted",
          accepted)

unlocked = client.post("/api/unlock", json={"viewer_id": BUY, "target_id": B1}).json()
check("E6 accepted interest reveals the target contact with no additional credit charge",
      unlocked.get("success") is True and unlocked.get("phone") == _B1PH
      and unlocked.get("charged") == 0 and unlocked.get("credits_left") == 2, unlocked)
repeat_unlock = client.post("/api/unlock", json={"viewer_id": BUY, "target_id": B1}).json()
check("E7 repeat accepted reveal remains free", repeat_unlock.get("success") is True
      and repeat_unlock.get("charged") == 0, repeat_unlock)
no_consent = client.post("/api/unlock", json={"viewer_id": BUY, "target_id": B2})
check("E8 another profile remains locked until its own acceptance",
      no_consent.status_code == 409 and no_consent.json().get("reason") == "consent_required"
      and _B2PH not in no_consent.text, no_consent.json())
my = client.get(f"/api/unlocks/{BUY}").json()
check("E9 accepted contact list returns masked phone only",
      my.get("count") == 1 and my.get("profiles", [{}])[0].get("tsap_id") == B1
      and "98••••••01" in str(my) and _B1PH not in str(my)
      and not PHONE_RE.findall(str(my)), str(my)[:220])

ms = client.get(f"/api/admin/match-send/{BUY}?limit=20&min_score=0", headers=HDR_ADMIN).json()
_candidate_rows = ms.get("results", [])
check("E10 admin match-send exposes summaries, not candidate phones or invented scores",
      ms.get("buyer", {}).get("tsap_id") == BUY and ms.get("buyer", {}).get("telegram_linked") is True
      and len(_candidate_rows) >= 2
      and all(not row.get("phone") and row.get("contact_access") == "owner_acceptance_required"
              and not any(key in row for key in ("score", "match_score", "trust_score", "compatibility_score"))
              for row in _candidate_rows)
      and _B1PH not in str(_candidate_rows) and _B2PH not in str(_candidate_rows), str(ms)[:300])
ms_bad = client.get("/api/admin/match-send/W12-NOT-FOUND", headers=HDR_ADMIN)
check("E11 admin match-send rejects unknown ID", ms_bad.status_code == 404, ms_bad.status_code)

oc = client.post("/api/admin/assist-orders", json={"buyer_id": ORDER_BUY, "note": "local test fixture"},
                 headers=HDR_ADMIN).json()
OID = (oc.get("order") or {}).get("id", "")
check("E12 assisted order uses its configured ₹500 service amount",
      oc.get("success") is True and OID.startswith("ORD-")
      and (oc.get("order") or {}).get("amount") == 500, oc)
op_bad = client.post(f"/api/admin/assist-orders/{OID}/paid", json={"utr": ""}, headers=HDR_ADMIN)
check("E13 assisted order cannot be marked paid without reference", op_bad.status_code == 400, op_bad.status_code)
op = client.post(f"/api/admin/assist-orders/{OID}/paid", json={"utr": "UTR-TEST-ONLY"}, headers=HDR_ADMIN).json()
check("E14 local reference advances the isolated order", op.get("success") is True, op)
oa = client.post(f"/api/admin/assist-orders/{OID}/profiles", json={"profile_ids": [B1, B2]},
                 headers=HDR_ADMIN).json()
check("E15 paid shortlist attaches without unlocking either contact",
      oa.get("success") is True and oa.get("attached") == 2
      and oa.get("contact_access") == "owner_acceptance_required"
      and not S12.is_entitled(ORDER_BUY, B1) and not S12.is_entitled(ORDER_BUY, B2), oa)

cp = client.get(f"/api/admin/match-send/copy-list?buyer={ORDER_BUY}&ids={B1},{B2}&order_id={OID}",
                headers=HDR_ADMIN).json()
_copy_text = cp.get("text", "")
check("E16 paid copy-list contains profile IDs but no phone numbers",
      cp.get("success") is True and B1 in _copy_text and B2 in _copy_text
      and _B1PH not in _copy_text and _B2PH not in _copy_text
      and cp.get("contact_access") == "owner_acceptance_required"
      and "owner must accept" in _copy_text.lower(), _copy_text[:250])

dl = client.post("/api/admin/match-send/deliver",
                 json={"buyer_id": ORDER_BUY, "profile_ids": [B1, B2], "via": "whatsapp", "order_id": OID},
                 headers=HDR_ADMIN).json()
check("E17 delivery endpoint returns a privacy-safe preview when WhatsApp is off",
      dl.get("success") is True and dl.get("delivery_status") == "preview_or_delivery_unavailable"
      and dl.get("contact_access") == "owner_acceptance_required"
      and _B1PH not in str(dl) and _B2PH not in str(dl)
      and "dry_run_whatsapp_off" == dl.get("whatsapp", {}).get("failed"), str(dl)[:300])
check("E18 offline preview does not falsely mark the order delivered",
      S12.get_order(OID)["status"] == "paid", S12.get_order(OID)["status"])

al = client.post("/api/admin/link-telegram", json={"buyer_id": ORDER_BUY, "chat_id": "TEST-CHAT-2"},
                 headers=HDR_ADMIN).json()
check("E19 admin chat mapping remains test-only and uses the selected buyer",
      al.get("success") and al.get("telegram_chat_id") == "TEST-CHAT-2", al)

# ═══════════════════════════════════════════════════════════════════════════
section("F. BOT (commands + masked card + formatters)")
# ═══════════════════════════════════════════════════════════════════════════
check("F1 import-safe without a configured Telegram token", TB.get_bot() is None and "BOT_TOKEN" in TB.bot_status().get("error", "BOT_TOKEN"))
check("F2 help points to website lookup, current checkout and consent flow",
      all(c in TB.help_text() for c in ("/search", "/unlock", "/mylist", "/balance", "/pay", "/link"))
      and "current prices" in TB.help_text().lower()
      and not re.search(r"(?:@|t\.me/)[A-Za-z0-9_]*_bot", TB.help_text()))
card = TB.format_id_search({"tsap_id": "TSAP-F-1", "full_name": "Lakshmi Reddy", "gender": "Bride",
                            "age": 24, "caste": "Reddy", "education": "BTech", "job": "SW",
                            "district": "Hyd", "state": "TS", "star": "Rohini",
                            "gothram": "Bharadwaj", "phone": "9848012345"})
check("F3 bot search card masks surname/number and directs to the website",
      "Lakshmi" in card and "Lakshmi Reddy" not in card and "9848012345" not in card
      and "TSAP-F-1" in card and "/search/TSAP-F-1" in card and "/unlock" not in card, card[:200])
t_ok = TB.unlock_result_text({"success": True, "phone": "9848012345", "charged": 0,
                              "via": "mutual_consent", "message_telugu": "Accepted"})
check("F4 accepted-contact text formats the returned number",
      "9848012345" in t_ok and "అంగీకారం తర్వాత" in t_ok, t_ok[:150])
t_consent = TB.unlock_result_text({"success": False, "reason": "consent_required",
                                    "message_telugu": "Owner acceptance required"})
check("F5 consent-required text does not offer a payment bypass", "acceptance" in t_consent.lower()
      and "/pay" not in t_consent, t_consent[:150])
t_pay = TB.unlock_result_text({"success": False, "reason": "no_credits", "message_telugu": "Credits ayipoyayi!"})
check("F6 request-credit paywall links only to current checkout", "/pay" in t_pay, t_pay[:150])
t_my = TB.mylist_text({"profiles": [{"name_masked": "L•••••i", "phone_masked": "98••••••45",
                                     "tsap_id": "T1", "caste": "Reddy"}]})
check("F7 mylist text preserves masked contact display", "L•••••i" in t_my and "98••••••45" in t_my, t_my[:200])
t_my0 = TB.mylist_text({"profiles": []})
check("F8 empty mylist explains acceptance; no old assisted-price claim",
      "accept" in t_my0.lower() and "consent" in t_my0.lower() and "₹500" not in t_my0, t_my0[:200])
check("F9 balance copy labels credits as interest requests and includes plan",
      "7" in TB.balance_text(7, "S_99") and "S_99" in TB.balance_text(7, "S_99")
      and "interest-request" in TB.balance_text(7, "S_99"))
check("F10 pay text shows no fabricated merchant UPI/contact when unconfigured",
      "checkout is currently unavailable" in TB.pay_text().lower()
      and "UPI ID" not in TB.pay_text() and "984" not in TB.pay_text(), TB.pay_text()[:200])
n_handlers = len(TB.dp.message.handlers) + len(TB.dp.callback_query.handlers)
check("F11 bot command/callback handlers register", n_handlers >= 15, n_handlers)


# ═══════════════════════════════════════════════════════════════════════════

section("G. PRIVACY REGRESSION (public/shortlists masked; accepted contact is explicit)")
# ═══════════════════════════════════════════════════════════════════════════
r = client.get("/api/search?limit=5")
check("G1 /api/search lo numbers ledu", not PHONE_RE.findall(r.text), PHONE_RE.findall(r.text)[:3])
r = client.get(f"/api/search/{B1}")
check("G2 /api/search/ID lo numbers ledu", not PHONE_RE.findall(r.text), PHONE_RE.findall(r.text)[:3])
r = client.get(f"/api/top-matches/{BUY}?limit=5")
check("G3 /api/top-matches lo numbers ledu", not PHONE_RE.findall(r.text), PHONE_RE.findall(r.text)[:3])
r = client.get("/api/stories")
check("G4 /api/stories lo numbers ledu", not PHONE_RE.findall(r.text))
r = client.get("/api/channels")
check("G5 /api/channels lo numbers ledu", not PHONE_RE.findall(r.text))
r = client.get(f"/api/unlocks/{BUY}")
check("G6 /api/unlocks list lo numbers ledu", not PHONE_RE.findall(r.text), PHONE_RE.findall(r.text)[:3])
r = client.get(f"/api/admin/match-send/copy-list?buyer={BUY}&ids={B1}", headers=HDR_ADMIN)
check("G7 admin copy-list withholds target contact until acceptance",
      _B1PH not in r.text and _B2PH not in r.text
      and "owner_acceptance_required" in r.text, r.text[:150])
r = client.get(f"/api/publish/preview?tsap_id={B1}" if False else "/api/publish/status")
check("G8 publish status reachable", r.status_code == 200, r.status_code)

print(f"\n{'=' * 76}\nRESULT: {PASS} pass / {FAIL} fail")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
