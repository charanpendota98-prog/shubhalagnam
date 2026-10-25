"""Focused production regressions for the registration trust boundary.

This suite intentionally exercises the state transitions rather than only checking
that route names exist: lost-response recovery, media ownership, privacy/card
lifecycle, referral replay resistance, and trusted proxy identity handling.
Run from backend/ with the repository's isolated test Python.
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

os.environ.setdefault("OTP_DEV_MODE", "true")
os.environ["WA_ENABLED"] = "false"
os.environ["WHATSAPP_MODE"] = "off"
os.environ["PUBLISH_DRY_RUN"] = "true"
os.environ["AUTO_POST_ON_APPROVAL"] = "false"
os.environ["AUTO_POST_ON_REGISTER"] = "false"
os.environ["OTP_CHANNELS"] = "none"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("registration-security-deep")

from testutil_client import TestClient  # noqa: E402
import hardening as H  # noqa: E402
import main as M  # noqa: E402
import referral as REFERRAL  # noqa: E402


client = TestClient(M.app, raise_server_exceptions=False)
ADMIN = {"X-Admin-Key": H.ADMIN_KEY}


def register(phone: str, key: str, name: str, *, private: bool = False):
    return client.post(
        "/api/register",
        data={
            "gender": "male",
            "dob": "1992-02-02",
            "marital_status": "Pelli Kaledu",
            "caste": "Reddy",
            "religion": "Hindu",
            "education": "BTech",
            "job": "Software",
            "state": "TS",
            "district": "Hyderabad",
            "phone": phone,
            "full_name": name,
            "password": "registration-password",
            "consent_confirmed": "true",
            "photo_consent_confirmed": "true",
            "photo_private": "true" if private else "false",
            "registration_key": key,
        },
    )


passed = 0
failed = 0
failures: list[str] = []


def check(label: str, condition: bool, detail: object = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"PASS {label}")
    else:
        failed += 1
        failures.append(label)
        print(f"FAIL {label}: {str(detail)[:260]}")


# 1. A lost response can be replayed, but a key is not enough to bypass the
# password binding and it never leaks from the owner profile response.
first = register("9819900001", "retry-key-00000001", "Retry Owner")
check("initial registration commits", first.status_code == 200, first.text[:200])
first_json = first.json() if first.headers.get("content-type", "").startswith("application/json") else {}
retry_id = first_json.get("tsap_id", "")
count_after_first = sum(1 for u in M.DB_USERS if u.get("phone") == "9819900001")
replayed = register("9819900001", "retry-key-00000001", "Retry Owner")
check("same registration key recovers the original response", replayed.status_code == 200
      and replayed.json().get("tsap_id") == retry_id, replayed.text[:250])
check("same-key recovery does not duplicate the member",
      sum(1 for u in M.DB_USERS if u.get("phone") == "9819900001") == count_after_first)
recovered_without_upload = client.request("POST", "/api/register", data={
    "gender": "male", "caste": "Reddy", "phone": "9819900001",
    "password": "registration-password", "registration_key": "retry-key-00000001",
})
check("lost-response recovery does not require the File object again",
      recovered_without_upload.status_code == 200 and recovered_without_upload.json().get("tsap_id") == retry_id,
      recovered_without_upload.text[:220])
wrong_password = client.post("/api/register", data={
    "gender": "male", "dob": "1992-02-02", "marital_status": "Pelli Kaledu", "caste": "Reddy",
    "religion": "Hindu", "education": "BTech", "job": "Software", "state": "TS", "district": "Hyderabad",
    "phone": "9819900001", "full_name": "Retry Owner", "password": "different-password",
    "consent_confirmed": "true", "photo_consent_confirmed": "true", "registration_key": "retry-key-00000001",
})
check("same key cannot recover with a different password", wrong_password.status_code == 409, wrong_password.text[:200])
different_phone_same_key = register("9819900099", "retry-key-00000001", "Other Retry Owner")
check("same key cannot bind a second phone/profile", different_phone_same_key.status_code == 409,
      different_phone_same_key.text[:220])
check("raw retry key is not stored or returned",
      "retry-key-00000001" not in str(M.DB_USERS) and "registration_key_hash" not in str(first_json),
      first_json)
check("bearer auth tokens are not persisted in profile state",
      bool(first_json.get("auth_token")) and first_json["auth_token"] not in str(M.DB_USERS),
      first_json)

# 2. The generic profile editor cannot be used as a media-reference write path;
# privacy is a strict boolean and its legacy mode stays synchronized.
second = register("9819900002", "retry-key-00000002", "Media Owner", private=True)
check("second registration commits", second.status_code == 200, second.text[:200])
second_id = second.json().get("tsap_id", "") if second.status_code == 200 else ""
first_user = next((u for u in M.DB_USERS if u.get("tsap_id") == retry_id), {})
second_user = next((u for u in M.DB_USERS if u.get("tsap_id") == second_id), {})
first_photo = first_user.get("photo_url", "")
update_media = client.post(
    "/api/profile/update",
    json={"tsap_id": second_id, "photo_url": first_photo, "photo_urls": [first_photo]},
    headers={"X-TSAP-Token": H.sign_token(second_id)},
)
second_user = next((u for u in M.DB_USERS if u.get("tsap_id") == second_id), {})
check("owner update cannot claim another profile's media",
      update_media.status_code == 200 and second_user.get("photo_url") != first_photo
      and first_photo not in (second_user.get("photo_urls") or []), update_media.text[:300])
privacy_public = client.post(
    "/api/profile/update",
    json={"tsap_id": second_id, "photo_private": "false"},
    headers={"X-TSAP-Token": H.sign_token(second_id)},
)
second_user = next((u for u in M.DB_USERS if u.get("tsap_id") == second_id), {})
check("photo_private false is normalized and synced", privacy_public.status_code == 200
      and second_user.get("photo_private") is False and second_user.get("privacy_mode") == "public",
      privacy_public.text[:300])
privacy_bad = client.post(
    "/api/profile/update",
    json={"tsap_id": second_id, "photo_private": "definitely-not-a-boolean"},
    headers={"X-TSAP-Token": H.sign_token(second_id)},
)
check("invalid privacy boolean is rejected", privacy_bad.status_code == 400, privacy_bad.text[:250])

# 3. Pending media remains non-public and the card changes only after both photo
# moderation and profile approval. The durable user never receives a filesystem path.
third = register("9819900003", "retry-key-00000003", "Card Owner", private=False)
check("card lifecycle registration commits", third.status_code == 200, third.text[:200])
third_id = third.json().get("tsap_id", "") if third.status_code == 200 else ""
third_user = next((u for u in M.DB_USERS if u.get("tsap_id") == third_id), {})
card_path = Path(M.CARD_MEDIA_DIR) / f"{third_id}.png"
initial_card = card_path.read_bytes() if card_path.is_file() else b""
check("pending registration has a guarded monogram card", bool(initial_card)
      and third_user.get("photo_status") == "pending"
      and not any(str(root) in str(v) for root in (M.PHOTO_MEDIA_DIR, M.CARD_MEDIA_DIR) for v in third_user.values() if isinstance(v, str)),
      {"card": len(initial_card), "user": third_user.get("card_url")})
check("pending card is not public", client.get(f"/cards/{third_id}.png").status_code == 404)
review = client.post(
    "/api/admin/photos/review",
    json={"tsap_id": third_id, "kind": "photo", "decision": "approved"},
    headers=ADMIN,
)
check("photo approval is durable", review.status_code == 200, review.text[:250])
pre_profile_approval = card_path.read_bytes() if card_path.is_file() else b""
check("photo approval alone does not publish the card", client.get(f"/cards/{third_id}.png").status_code == 404)
approved = client.post(f"/api/admin/approve/{third_id}", headers=ADMIN)
final_card = card_path.read_bytes() if card_path.is_file() else b""
third_user = next((u for u in M.DB_USERS if u.get("tsap_id") == third_id), {})
check("profile approval regenerates the reviewed-photo card",
      approved.status_code == 200 and final_card and final_card != pre_profile_approval
      and client.get(f"/cards/{third_id}.png").status_code == 200, approved.text[:300])
check("card generation never persists an internal photo path",
      "photo_path" not in third_user and not any(str(root) in str(v) for root in (M.PHOTO_MEDIA_DIR, M.CARD_MEDIA_DIR) for v in third_user.values() if isinstance(v, str)),
      third_user)

# 4. Known referral clicks are counted once per short request identity window;
# arbitrary codes are not written, and forwarding headers cannot rotate a direct
# client's rate-limit identity.
# Referral landing/clicks are a public publication surface; promote this
# isolated fixture before exercising deduplication.
first_user["is_approved"] = True
first_user["status"] = "approved"
first_user["is_active"] = True
ref_code = first_user.get("referral_code", "")
before_clicks = sum(1 for row in REFERRAL.CLICKS if row.get("code") == ref_code)
click_a = client.post(f"/api/referral/click/{ref_code}?source=link", headers={
    "User-Agent": "registration-security-test", "X-Forwarded-For": "198.51.100.10",
})
click_b = client.post(f"/api/referral/click/{ref_code}?source=link", headers={
    "User-Agent": "registration-security-test", "X-Forwarded-For": "198.51.100.11",
})
after_clicks = sum(1 for row in REFERRAL.CLICKS if row.get("code") == ref_code)
check("referral click replay is deduplicated", click_a.status_code == 200 and click_b.status_code == 200
      and after_clicks == before_clicks + 1 and click_b.json().get("duplicate") is True,
      (click_a.text[:180], click_b.text[:180], before_clicks, after_clicks))
unknown_before = len(REFERRAL.CLICKS)
unknown = client.post("/api/referral/click/NOT-A-REAL-CODE?source=<script>garbage</script>")
check("unknown referral code does not create an analytics row",
      unknown.status_code == 200 and unknown.json().get("valid_code") is False and len(REFERRAL.CLICKS) == unknown_before,
      unknown.text[:220])

# The immediate peer in a direct deployment wins over attacker-controlled XFF.
fake_request = SimpleNamespace(
    client=SimpleNamespace(host="203.0.113.5"),
    headers={"x-forwarded-for": "10.10.10.10"},
)
check("direct client IP ignores spoofed forwarding headers", H.client_ip(fake_request) == "203.0.113.5", H.client_ip(fake_request))

# 5. OTP delivery and verification are not acknowledged when their durable
# checkpoint fails; a valid code remains retryable rather than half-consumed.
otp_phone = "9819900010"
with patch.object(M, "otp_channel_send", return_value={"ok": True, "channel": "test_stub"}), \
     patch.object(M, "_persist_core_state", return_value=False):
    otp_send_failed = client.post("/api/otp/send", json={"phone": otp_phone})
check("OTP send fails closed when its durable checkpoint fails",
      otp_send_failed.status_code == 503 and otp_phone not in M.DB_OTPS, otp_send_failed.text[:220])
M.DB_OTPS[otp_phone] = {
    "code_hash": M._otp_digest("1234"),
    "expires": (datetime.utcnow() + timedelta(minutes=10)).isoformat(),
    "tries": 0,
    "sent_at": datetime.utcnow().isoformat(),
    "purpose": "login",
    "history": [],
}
with patch.object(M, "_persist_core_state", return_value=False):
    otp_verify_failed = client.post("/api/otp/verify", json={"phone": otp_phone, "code": "1234"})
check("OTP verify rolls back when its durable checkpoint fails",
      otp_verify_failed.status_code == 503 and otp_phone in M.DB_OTPS
      and otp_phone not in M.VERIFIED_PHONES and M.DB_OTPS[otp_phone].get("tries") == 0,
      {"response": otp_verify_failed.text[:220], "record": M.DB_OTPS.get(otp_phone), "verified": otp_phone in M.VERIFIED_PHONES})

print(f"RESULT: {passed} passed / {failed} failed")
if failures:
    print("FAILED:", failures)
    raise SystemExit(1)
