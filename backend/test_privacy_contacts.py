"""Privacy/contact-consent contract checks using isolated, approved test-only profiles.

Run from the repository root with the backend dependencies installed:
    python backend/test_privacy_contacts.py

The fixtures are created here and never loaded by production code. Synthetic-profile
protection remains enabled and is tested rather than bypassed.
"""
from __future__ import annotations

import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

BACKEND_DIR = Path(__file__).resolve().parent
ROOT = BACKEND_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

# This standalone script uses the backend's documented development test mode and
# disables all external messaging. Use temporary stores before importing app modules.
os.environ["WA_TEST_FAST"] = "1"
os.environ["TSAP_AUTH_MODE"] = "dev"
os.environ["WHATSAPP_MODE"] = "off"
from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("privacy-contacts")
from testutil_paths import src_page  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from interest import mask_phone, safe_user  # noqa: E402
import main  # noqa: E402

PASS: list[str] = []
FAIL: list[str] = []


def check(name: str, condition: bool, detail: object = "") -> None:
    (PASS if condition else FAIL).append(name)
    print(("  ✅ " if condition else "  ❌ ") + name + (("  | " + str(detail)) if detail and not condition else ""))


PHONE_RE = re.compile(r"(?<!\d)(?:\+?91[\s().-]*)?[6-9](?:[\s().-]*\d){9}(?!\d)")
EMAIL_RE = re.compile(r"(?<![\w.+-])[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}(?![\w-])", re.IGNORECASE)
CONTACT_KEYS = {"phone", "phone_encrypted", "phone_last4", "email", "contact_phone", "mobile"}


def leaks(payload: object) -> list[str]:
    """Find raw phone/email values in a JSON-like public response."""
    found: list[str] = []

    def walk(node: object, path: str = "") -> None:
        if isinstance(node, dict):
            for key, value in node.items():
                here = f"{path}.{key}" if path else str(key)
                if key in CONTACT_KEYS and isinstance(value, (str, int, float)) and str(value).strip():
                    found.append(f"contact-key:{here}")
                if key == "whatsapp" and isinstance(value, str) and PHONE_RE.search(value):
                    found.append(f"contact-key:{here}")
                walk(value, here)
        elif isinstance(node, (list, tuple)):
            for index, value in enumerate(node):
                walk(value, f"{path}[{index}]")
        elif isinstance(node, str):
            if PHONE_RE.search(node):
                found.append(f"phone-text:{path}")
            if EMAIL_RE.search(node):
                found.append(f"email-text:{path}")

    walk(payload)
    return found


BRIDE_ID = "PRIVACY-BRIDE-001"
GROOM_ID = "PRIVACY-GROOM-001"
HIDDEN_ID = "PRIVACY-HIDDEN-001"
SYNTH_ID = "PRIVACY-SYNTH-001"
BRIDE_PHONE = "9123456789"
GROOM_PHONE = "9876543210"
HIDDEN_PHONE = "9988776655"


def profile(tsap_id: str, full_name: str, gender: str, phone: str, *, district: str,
            caste: str, marital_status: str = "Never Married") -> dict:
    return {
        "tsap_id": tsap_id,
        "full_name": full_name,
        "gender": gender,
        "age": 27 if gender == "Bride" else 29,
        "phone": phone,
        "email": f"{tsap_id.lower()}@test.invalid",
        "status": "approved",
        "is_approved": True,
        "is_active": True,
        "is_banned": False,
        "credits": 3,
        "plan": "FREE",
        "wallet": 0,
        "caste": caste,
        "sub_caste": "",
        "district": district,
        "state": "TS",
        "education": "Member-entered test education; email private@example.test.",
        "education_detail": "",
        "job": f"Member-entered test occupation; call {phone}",
        "company": f"Test employer; call {phone}",
        "salary": "Member-entered range",
        "height": "5'6\"",
        "marital_status": marital_status,
        "star": "Rohini" if gender == "Groom" else "Mrigasira",
        "rasi": "Taurus",
        "about_myself": f"A member-entered test introduction. Call {phone} or email private@example.test for details.",
        "family_details": f"Test-only family note containing {phone} and private@example.test.",
        "photo_url": "/photos/privacy-test-member.jpg",
        "photo_urls": ["/photos/privacy-test-member.jpg"],
        "photo_status": "approved",
        "photo_private": gender == "Bride",
        "privacy_mode": "private" if gender == "Bride" else "public",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


BRIDE = profile(BRIDE_ID, "Privacy Test Bride", "Bride", BRIDE_PHONE,
                district="Hyderabad", caste="Reddy", marital_status="Divorced")
GROOM = profile(GROOM_ID, "Privacy Test Groom", "Groom", GROOM_PHONE,
                district="Vijayawada", caste="Kamma")
HIDDEN = profile(HIDDEN_ID, "Hidden Test Profile", "Bride", HIDDEN_PHONE,
                 district="Hyderabad", caste="Reddy", marital_status="Divorced")
HIDDEN.update({"status": "deleted", "is_approved": False, "is_active": False})
SYNTHETIC = profile(SYNTH_ID, "Synthetic Test Profile", "Bride", "9000012345",
                    district="Hyderabad", caste="Reddy")
SYNTHETIC["demo"] = True


print("=== 1. Contact mask + public serializer ===")
masked = safe_user({
    "tsap_id": "TEST-MEMBER-001", "full_name": "Public Test Name", "phone": BRIDE_PHONE,
    "email": "private@example.test", "phone_encrypted": "ciphertext", "phone_last4": "6789",
    "age": 30, "caste": "Reddy", "company": f"Work number {BRIDE_PHONE}",
})
check("10-digit phone is masked", mask_phone("9848012345") == "98" + "•" * 6 + "45")
check("spaces/dashes normalize before masking", mask_phone("98480-12345") == mask_phone("9848012345"))
check("short/empty values fail closed", mask_phone("12").startswith("🔒") and mask_phone("").startswith("🔒"))
check("public serializer has no structured contact fields", not (CONTACT_KEYS & set(masked)))
check("public serializer masks phone/email accidentally embedded in text",
      "9876543210" not in str(masked) and "private@example.test" not in str(masked)
      and "[contact hidden]" in masked.get("company", ""))
check("public serializer locks contact and describes acceptance policy",
      masked.get("contact_locked") is True and "accepted-request" in masked.get("contact_note_telugu", "")
      and "consent" in masked.get("contact_note_telugu", "").lower())
check("review state is not a public field", "photo_status" not in masked)
check("profile basics remain present", masked.get("age") == 30 and masked.get("caste") == "Reddy"
      and masked.get("full_name") == "Public Test Name")
check("empty user serializes safely", safe_user(None) == {})
check("clean test-only member is not classified as synthetic",
      not main._is_synthetic_profile(BRIDE) and main._is_synthetic_profile(SYNTHETIC))

print("=== 2–7. Public profiles, aggregates, access, and consent flow ===")
with TestClient(main.app, raise_server_exceptions=False) as client:
    # TestClient startup may load the isolated empty store. Install only explicit test records.
    main.DB_USERS[:] = [BRIDE, GROOM, HIDDEN, SYNTHETIC]
    main.DB_INTERESTS[:] = []
    main.DB_VIEWS[:] = [{
        "tsap_id": GROOM_ID, "viewer_id": BRIDE_ID,
        "at": datetime.now(timezone.utc).isoformat(),
    }]
    main.DB_SAVES[:] = [{
        "tsap_id": GROOM_ID, "saved_id": BRIDE_ID,
        "at": datetime.now(timezone.utc).isoformat(),
    }]
    main.CONSENT_LEDGER[:] = []
    main.WA_QUEUE.clear()
    main._reindex_users()

    public_endpoints = [
        "/api/plans", "/api/free-plan", "/api/channels", "/api/channels/routing-eligible",
        "/api/channels/join", "/api/vendors?limit=5", "/api/vendors/categories",
        "/api/vendors/packages", "/api/referral/terms", "/api/referral/leaderboard?period=all&limit=5",
        "/api/publish/status", "/api/stats", "/api/platform/stats", "/api/meta/home-stats",
        "/api/digest/preview", "/api/inventory", "/api/districts/stats", "/api/castes", "/api/home/teasers",
        "/api/second-marriage/profiles?gender=Bride", "/api/search?limit=100",
        f"/api/top-matches/{GROOM_ID}?limit=10", f"/api/bot/matches?tsap_id={GROOM_ID}&limit=3",
        f"/api/assistant/briefing/{GROOM_ID}", f"/api/assistant/tips/{GROOM_ID}",
        f"/api/assistant/digest/{GROOM_ID}",
        f"/api/match/score?a={GROOM_ID}&b={BRIDE_ID}",
    ]
    endpoint_payloads: dict[str, object] = {}
    for endpoint in public_endpoints:
        response = client.get(endpoint)
        check(f"{endpoint} responds successfully", response.status_code == 200,
              f"HTTP {response.status_code}: {response.text[:120]}")
        if response.status_code == 200:
            body = response.json()
            endpoint_payloads[endpoint] = body
            found = leaks(body)
            check(f"{endpoint} contains no raw member contact strings", not found, found[:4])

    # Public channel directory and aggregates must omit the operator-only entries.
    hidden_channel_keys = {
        "c_others_st", "bureau_network", "differently_abled", "doctors_teachers",
        "fraud_alerts", "govt_jobs", "second_marriage", "software_it",
        "success_stories", "hindu", "official",
    }
    channel_data = endpoint_payloads.get("/api/channels", {})
    visible_channel_rows = [
        row for group in (channel_data.get("channels_by_tier", {}) or {}).values()
        for row in group
    ] if isinstance(channel_data, dict) else []
    visible_channel_keys = {str(row.get("key", "")) for row in visible_channel_rows}
    routed_channel_keys = {
        str(row.get("key", ""))
        for row in (channel_data.get("routing_eligible", []) or [])
        if isinstance(row, dict)
    } if isinstance(channel_data, dict) else set()
    check("11 operator-only channel entries stay out of public directory",
          not (hidden_channel_keys & visible_channel_keys), sorted(hidden_channel_keys & visible_channel_keys))
    check("operator-only channels stay out of public routing list",
          not (hidden_channel_keys & routed_channel_keys), sorted(hidden_channel_keys & routed_channel_keys))
    channel_stats = channel_data.get("stats", {}) if isinstance(channel_data, dict) else {}
    check("public channel aggregate matches the visible directory",
          int(channel_stats.get("total", -1)) == len(visible_channel_rows), channel_stats)

    search_response = client.get(f"/api/search/{GROOM_ID}")
    groom_data = search_response.json()
    groom_profile = groom_data.get("profile", {})
    check("direct-ID search returns current public member shape", search_response.status_code == 200
          and groom_profile.get("tsap_id") == GROOM_ID)
    check("direct-ID profile has contact lock and masked phone",
          groom_data.get("contact_locked") is True and groom_profile.get("contact_locked") is True
          and "•" in groom_profile.get("phone_masked", ""))
    check("direct-ID profile strips embedded phone/email text",
          GROOM_PHONE not in str(groom_data) and "private@example.test" not in str(groom_data)
          and "[contact hidden]" in groom_profile.get("about_myself", ""),
          {"about": groom_profile.get("about_myself"), "family": groom_profile.get("family_details")})
    check("direct-ID profile never exposes moderation state", "photo_status" not in groom_profile)
    check("direct-ID public payload has no raw contact fields", not leaks(groom_data), leaks(groom_data)[:4])

    hidden_search = client.get(f"/api/search/{HIDDEN_ID}")
    synthetic_search = client.get(f"/api/search/{SYNTH_ID}")
    check("deactivated profile is unavailable by guessed public ID", hidden_search.status_code == 404)
    check("synthetic profile guard remains active for direct-ID search", synthetic_search.status_code == 404)

    search_list = client.get("/api/search?limit=100").json()
    listed_ids = {row.get("tsap_id") for row in search_list.get("results", [])}
    check("public search list contains only active approved real profiles",
          listed_ids == {BRIDE_ID, GROOM_ID}, listed_ids)
    check("public search rows have locked contacts and no raw contact fields",
          all(row.get("contact_locked") is True and "phone_masked" in row
              and not leaks(row) for row in search_list.get("results", [])))
    check("public search omits private photo and private moderation state",
          (lambda row: row.get("photo_url") == "" and row.get("photo_urls", []) == []
           and "photo_status" not in row)(next(row for row in search_list["results"] if row.get("tsap_id") == BRIDE_ID)))

    teasers = endpoint_payloads.get("/api/home/teasers", {}).get("teasers", [])
    remarriage = endpoint_payloads.get("/api/second-marriage/profiles?gender=Bride", {}).get("profiles", [])
    inventory = endpoint_payloads.get("/api/inventory", {})
    stats = endpoint_payloads.get("/api/stats", {})
    district_counts = endpoint_payloads.get("/api/districts/stats", {}).get("counts", {})
    caste_counts = endpoint_payloads.get("/api/castes", {}).get("counts", {})
    check("homepage teasers exclude hidden and synthetic accounts",
          {row.get("tsap_id") for row in teasers} <= {BRIDE_ID, GROOM_ID})
    check("second-marriage list excludes deactivated profiles", BRIDE_ID in {row.get("tsap_id") for row in remarriage}
          and HIDDEN_ID not in {row.get("tsap_id") for row in remarriage})
    check("platform stats count only active approved profiles", stats.get("profiles_count") == 2,
          stats.get("profiles_count"))
    check("inventory counts omit deactivated and synthetic profiles", inventory.get("total_profiles") == 2
          and inventory.get("approved_profiles") == 2 and inventory.get("pending_profiles") == 0, inventory)
    check("district/caste aggregates omit hidden test member", district_counts.get("Hyderabad") == 1
          and caste_counts.get("Reddy") == 1, {"districts": district_counts, "castes": caste_counts})

    print("=== Credits: owner-only balances and purchase authorization ===")
    with patch("hardening.auth_enforced", return_value=True):
        no_token = client.get(f"/api/credits/{GROOM_ID}")
        wrong_owner = client.get(f"/api/credits/{GROOM_ID}",
                                 headers={"X-Tsap-Token": main.sign_token(BRIDE_ID)})
        owner_credits = client.get(f"/api/credits/{GROOM_ID}",
                                   headers={"X-Tsap-Token": main.sign_token(GROOM_ID)})
        wrong_owner_buy = client.post("/api/credits/buy",
                                      headers={"X-Tsap-Token": main.sign_token(BRIDE_ID)},
                                      json={"tsap_id": GROOM_ID, "plan": "S_99"})
    check("credits balance rejects unauthenticated and cross-account reads",
          no_token.status_code == 401 and wrong_owner.status_code == 401,
          {"no_token": no_token.status_code, "wrong_owner": wrong_owner.status_code})
    credits_body = owner_credits.json()
    check("credits endpoint returns only the authenticated owner's plan and counters",
          owner_credits.status_code == 200 and credits_body.get("tsap_id") == GROOM_ID
          and credits_body.get("credits") == GROOM.get("credits")
          and credits_body.get("plan") == GROOM.get("plan")
          and credits_body.get("requests_sent") == 0 and not leaks(credits_body),
          {"status": owner_credits.status_code, "keys": sorted(credits_body) if isinstance(credits_body, dict) else []})
    check("cross-account credit purchase is rejected before payment mutation",
          wrong_owner_buy.status_code == 401 and not main.DB_PAYMENTS,
          {"status": wrong_owner_buy.status_code, "payments": len(main.DB_PAYMENTS)})

    for endpoint in (
        f"/api/matches/{GROOM_ID}", f"/api/views/{GROOM_ID}?whoviewed=true",
        f"/api/saved/{GROOM_ID}", f"/api/porutham?bride={BRIDE_ID}&groom={GROOM_ID}",
        f"/api/astro/chart/{GROOM_ID}", f"/api/astro/dosha/{GROOM_ID}",
    ):
        response = client.get(endpoint)
        check(f"{endpoint.split('?')[0]} current shape is available", response.status_code == 200,
              f"HTTP {response.status_code}: {response.text[:120]}")
        if response.status_code == 200:
            found = leaks(response.json())
            check(f"{endpoint.split('?')[0]} does not expose raw contacts", not found, found[:4])

    match_payload = client.get(f"/api/matches/{GROOM_ID}").json()
    check("matches preserve explicit contact lock and no compatibility score",
          match_payload.get("contact_locked") is True
          and match_payload.get("compatibility_score_calculated") is False
          and all("score" not in row and row.get("contact_locked") is True
                  for row in match_payload.get("matches", [])))

    print("=== 3. Interest: locked before acceptance, account access after acceptance ===")
    send_response = client.post("/api/interest/send", json={
        "from_id": GROOM_ID, "to_id": BRIDE_ID, "note": "Namaste; family would like to connect.",
    })
    send = send_response.json()
    request_id = str(send.get("request_id", ""))
    check("interest send creates one request", send_response.status_code == 200 and send.get("success") is True
          and bool(request_id), send.get("reason") or send.get("message_telugu"))
    check("pre-accept response does not expose either phone or an owner WhatsApp link",
          GROOM_PHONE not in str(send) and BRIDE_PHONE not in str(send)
          and (send.get("whatsapp") or {}).get("owner_link_manual") == ""
          and not leaks(send), leaks(send)[:4])
    check("disabled WhatsApp mode is reported as queue-off, not delivered",
          send.get("whatsapp", {}).get("owner_queued") is False
          and (send.get("whatsapp", {}).get("mode") == "off"))

    pending_inbox = client.get(f"/api/interest/inbox/{BRIDE_ID}").json()
    pending_request = next((row for row in pending_inbox.get("received", [])
                            if row.get("request_id") == request_id), {})
    pending_sent = client.get(f"/api/interest/sent/{GROOM_ID}").json()
    pending_out = next((row for row in pending_sent.get("sent", [])
                        if row.get("request_id") == request_id), {})
    check("recipient inbox stays locked before owner acceptance",
          pending_request.get("status") == "pending"
          and pending_request.get("requester_phone") == "🔒 accept చెయ్యండి"
          and not leaks(pending_inbox), leaks(pending_inbox)[:4])
    check("requester sent view stays locked before owner acceptance",
          pending_out.get("contact") == "🔒 accept అయ్యాక" and not leaks(pending_sent), leaks(pending_sent)[:4])

    status_pending = client.get(f"/api/interest/status/{request_id}").json()
    check("notification queue state is distinct from delivery confirmation",
          status_pending.get("notification_queue", {}).get("delivery_confirmed") is False
          and "does not confirm" in status_pending.get("note", "").lower(), status_pending)

    accepted_response = client.post("/api/interest/respond", json={
        "tsap_id": BRIDE_ID, "request_id": request_id, "action": "accept",
    })
    accepted = accepted_response.json()
    result = accepted.get("result") or {}
    contact = result.get("contact") or {}
    check("accept grants contact access to the owner-side response",
          accepted_response.status_code == 200 and accepted.get("success") is True
          and contact.get("phone") == GROOM_PHONE and result.get("owner_phone") == BRIDE_PHONE)
    check("accept notification queue is not represented as delivery proof",
          (accepted.get("whatsapp") or {}).get("delivery_confirmed") is False)

    accepted_inbox = client.get(f"/api/interest/inbox/{BRIDE_ID}").json()
    accepted_row = next((row for row in accepted_inbox.get("received", [])
                         if row.get("request_id") == request_id), {})
    accepted_sent = client.get(f"/api/interest/sent/{GROOM_ID}").json()
    accepted_out = next((row for row in accepted_sent.get("sent", [])
                         if row.get("request_id") == request_id), {})
    check("accepted recipient inbox shows the consented requester contact",
          accepted_row.get("status") == "accepted" and accepted_row.get("requester_phone") == GROOM_PHONE)
    check("accepted requester view shows the consented owner contact",
          accepted_out.get("status") == "accepted" and accepted_out.get("contact") == BRIDE_PHONE)

    consent = client.get(f"/api/consent/log/{BRIDE_ID}").json()
    check("consent ledger records acceptance, not notification delivery",
          consent.get("count", 0) >= 1
          and any(row.get("action") == "interest_accepted" and row.get("contact_access_granted") is True
                  for row in consent.get("consents", []))
          and "whatsapp delivery proof" in consent.get("policy_telugu", "").lower(), consent.get("policy_telugu"))
    status_accepted = client.get(f"/api/interest/status/{request_id}").json()
    check("request status separately reports access granted and delivery unconfirmed",
          status_accepted.get("request", {}).get("contact_shared") is True
          and status_accepted.get("notification_queue", {}).get("delivery_confirmed") is False)

    hidden_send = client.post("/api/interest/send", json={
        "from_id": GROOM_ID, "to_id": HIDDEN_ID, "note": "Do not route to a hidden profile.",
    })
    check("guessed hidden IDs cannot receive new interest requests", hidden_send.status_code == 404)

    print("=== 4. Decline credit policy ===")
    bride_credits_before = int(BRIDE.get("credits", 0))
    declined_send = client.post("/api/interest/send", json={
        "from_id": BRIDE_ID, "to_id": GROOM_ID, "note": "A second explicit test request.",
    })
    declined_request_id = str(declined_send.json().get("request_id", ""))
    check("reverse interest request is created for decline-path test",
          declined_send.status_code == 200 and bool(declined_request_id))
    declined_response = client.post("/api/interest/respond", json={
        "tsap_id": GROOM_ID, "request_id": declined_request_id, "action": "decline",
    })
    declined = declined_response.json()
    refunded = bool((declined.get("request") or {}).get("credit_refunded"))
    expected_refund = bool(main.INTEREST_REFUND_ON_DECLINE)
    check("decline credit return matches configured account policy",
          refunded is expected_refund
          and int(BRIDE.get("credits", 0)) == bride_credits_before - 1 + int(expected_refund),
          {"policy": expected_refund, "refunded": refunded, "credits": BRIDE.get("credits")})

    print("=== 5. Free-plan response contract ===")
    free_plan = client.get("/api/free-plan").json()
    check("headline explains three free interest requests and consent gating",
          free_plan.get("success") is True and "3 interest requests" in free_plan.get("headline_telugu", "")
          and "acceptance" in free_plan.get("rule_telugu", "")
          and "bypass" in free_plan.get("rule_telugu", ""))
    check("free tier does not promise phone numbers", free_plan.get("free", {}).get("profiles") == 3
          and free_plan.get("free", {}).get("requests") == 3
          and "ఇవ్వము" in free_plan.get("free", {}).get("numbers", ""))
    paid = free_plan.get("paid", [])
    check("paid consumer ladder starts at ₹99 and ends at ₹499",
          len(paid) == 4 and paid[0].get("price") == 99 and paid[-1].get("price") == 499
          and all(int(item.get("price", 0)) >= 99 for item in paid))
    check("free-plan policy lists five consent/notification/decline rules",
          len(free_plan.get("numbers_rule_telugu", [])) == 5
          and any("chat" in row.lower() for row in free_plan.get("numbers_rule_telugu", [])))
    check("free-plan FAQ and CTA shape are current",
          len(free_plan.get("faq_telugu", [])) == 4
          and free_plan.get("cta", {}).get("register") == "/register")
    check("free-plan payload contains no member contact values", not leaks(free_plan), leaks(free_plan)[:4])

print("=== 6. Frontend wiring ===")
register_page = src_page("frontend/src/app/register/page.tsx")
matches_page = src_page("frontend/src/app/matches/page-client.tsx")
quick_unlock = src_page("frontend/src/components/QuickUnlockModal.tsx")
pricing_page = src_page("frontend/src/app/pricing/page-client.tsx")
profile_view = src_page("frontend/src/app/search/[id]/ProfileView.tsx")
check("registration explains FREE vs paid using current policy", "/api/free-plan" in register_page
      and "clarity" in register_page and "FREE లో ఇచ్చేది" in register_page
      and "accepted-request account views" in register_page)
check("matches UI renders masked contact and a request-credit action",
      "phone_masked" in matches_page and "Contact:" in matches_page
      and "setUnlockTarget(row)" in matches_page and 'price: 99' in quick_unlock and 'credits: 5' in quick_unlock)
check("pricing explains owner acceptance and notification uncertainty",
      "Owner acceptance grants contact access in accepted-request account views" in pricing_page
      and "notification delivery is not guaranteed" in pricing_page)
check("profile view renders a locked/masked contact state",
      "••••••••••" in profile_view and "Protected & Locked" in profile_view
      and "gated by profile-owner acceptance" in profile_view)

print(f"\n=== RESULT: {len(PASS)} pass / {len(FAIL)} fail ===")
if FAIL:
    print("FAILED:")
    for name in FAIL:
        print("   ❌ " + name)
    raise SystemExit(1)
print("✅ Privacy, active-listing, contact-consent, queue-state, and pricing contracts passed.")
