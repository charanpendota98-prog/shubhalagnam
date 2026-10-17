"""Local-only welcome-pack and public channel-directory regressions.

Fixtures and every persistence path are isolated. WhatsApp/Telegram delivery is
explicitly disabled; configured invite URLs are inspected but never contacted.
Run: backend/.venv/bin/python backend/test_wave10_welcome_pack.py
"""
from __future__ import annotations

import json
import os
import re
import sys
from unittest.mock import patch

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BACKEND_DIR)

# Fail closed for integrations and keep every write in a disposable test store.
os.environ.update({
    "APP_ENV": "test",
    "ENV": "test",
    "WA_TEST_FAST": "1",
    "TSAP_AUTH_MODE": "test",
    "TSAP_AUTH_ENFORCE": "0",
    "OTP_DEV_MODE": "true",
    "WA_LONG_PAUSE_CHANCE": "0",
    "WHATSAPP_MODE": "off",
    "WA_ENABLED": "false",
    "PUBLISH_DRY_RUN": "true",
    "AUTO_POST_ON_REGISTER": "false",
    "TELEGRAM_CHANNEL_DESTINATIONS_JSON": "",
})
for _key in (
    "BOT_TOKEN", "BOT_TOKEN_BACKUP", "BOT_TOKEN_ALERT", "BOT_TOKEN_2", "BOT_TOKEN_3",
    "BOT_POOL_JSON", "TSAP_API_KEY", "ADMIN_CHAT_ID", "DATABASE_URL", "PAY_UPI_ID",
    "SUPPORT_CALL_NUMBER", "SUPPORT_WHATSAPP", "SUPPORT_WHATSAPP_NUMBER",
    "WA_CHANNEL_LINKS", "WA_OFFICIAL_CHANNEL", "TELEGRAM_CHANNEL_LINKS",
):
    os.environ.pop(_key, None)
for _key in list(os.environ):
    if _key.startswith(("TELEGRAM_CHANNEL_", "WA_CHANNEL_")):
        os.environ.pop(_key, None)
os.environ["TELEGRAM_CHANNEL_DESTINATIONS_JSON"] = ""

from test_storage import isolate_test_stores  # noqa: E402
_TEST_STORE = isolate_test_stores("wave10-welcome-pack")

import channels_config as CC  # noqa: E402
import main  # noqa: E402
import welcome_pack as WP  # noqa: E402
from testutil_client import TestClient  # noqa: E402

client = TestClient(main.app, raise_server_exceptions=False)
PASS, FAIL, FAILED = 0, 0, []
PHONE_RE = re.compile(r"(?<![\d•])[6-9]\d{9}(?!\d)")
# One fewer than the original eleven: the ST Others community was published, so
# "c_others_st" is no longer held back from the public directory.
EXCLUDED = {
    "official", "hindu", "bureau_network", "differently_abled",
    "doctors_teachers", "fraud_alerts", "govt_jobs", "second_marriage",
    "software_it", "success_stories",
}


def check(name: str, condition: bool, extra=None) -> None:
    global PASS, FAIL
    if condition:
        PASS += 1
        print(f"  ✅ {name}")
    else:
        FAIL += 1
        FAILED.append(name)
        print(f"  ❌ {name}" + (f" | {str(extra)[:220]}" if extra is not None else ""))


def section(title: str) -> None:
    print(f"\n=== {title} ===")


def has_telugu(text: str) -> bool:
    return any("\u0c00" <= ch <= "\u0c7f" for ch in str(text))


section("A. Public directory exclusions preserve the private operator registry")
check("A1 exactly the requested 10 categories are excluded",
      CC.PUBLIC_DIRECTORY_EXCLUDED_KEYS == EXCLUDED, sorted(CC.PUBLIC_DIRECTORY_EXCLUDED_KEYS))
check("A2 excluded rows remain internal but are not public",
      all(key in CC.CHANNELS and not CC.is_public_channel(key) for key in EXCLUDED))
_public = CC.public_channels()
_public_keys = {row["key"] for row in _public}
check("A3 public listing/stats agree and omit all excluded keys",
      len(_public) == CC.public_channel_stats()["total"]
      and not (EXCLUDED & _public_keys)
      and CC.channel_stats()["total"] == len(CC.CHANNELS),
      (len(_public), CC.public_channel_stats(), len(CC.CHANNELS)))
check("A4 routing remains disabled unless explicitly configured",
      CC.public_channel_stats()["routing_eligible"] == 0
      and not any(row.get("routing_eligible") for row in _public))
check("A5 no WhatsApp URL is fabricated for an unknown channel",
      CC.wa_channel_link("not_configured") == "", CC.wa_channel_link("not_configured"))
check("A6 configured invite URL is preserved exactly (syntax only; no live request)",
      CC.channel_links("c_reddy_bride")["whatsapp"] == CC.DEFAULT_WA_LINKS["c_reddy_bride"]
      and CC.channel_links("c_reddy_bride")["external_status_checked"] is False)

BRIDE_REDDY = {
    "gender": "Bride", "caste": "Reddy", "sub_caste": "Pakanati Reddy",
    "state": "TS", "district": "Hyderabad", "religion": "Hindu",
}
_directory = main._public_channel_links()
_reddy_links = CC.caste_channel_links(BRIDE_REDDY, limit=10, directory_links=_directory)
_reddy_keys = [row["key"] for row in _reddy_links]
check("A7 Reddy links lead with its configured public entry",
      bool(_reddy_keys) and _reddy_keys[0] == "c_reddy_bride", _reddy_keys)
check("A8 recommendation contains no excluded/private channel keys",
      not (EXCLUDED & set(_reddy_keys)), _reddy_keys)
check("A9 link rows use the configured directory map, not inferred fallbacks",
      all(row["telegram"] == _directory.get(row["key"], {}).get("telegram", "")
          and row["whatsapp"] == _directory.get(row["key"], {}).get("whatsapp", "")
          for row in _reddy_links), _reddy_links)


section("B. Welcome-pack builder is factual, masked, and current on pricing")
USER = {
    "tsap_id": "W10-LOCAL-OWNER", "full_name": "Local Fixture Bride", "gender": "Bride",
    "caste": "Reddy", "sub_caste": "Pakanati Reddy", "state": "TS", "district": "Hyderabad",
    "religion": "Hindu", "phone": "9999999999",
}
PROFILES = [
    {"tsap_id": "W10-LOCAL-GROOM-1", "full_name": "Fixture Groom One", "age": 29,
     "gender": "Groom", "caste": "Reddy", "district": "Nalgonda", "education": "MBBS",
     "job": "Doctor", "phone": "9000000001"},
    {"tsap_id": "W10-LOCAL-GROOM-2", "full_name": "Fixture Groom Two", "age": 31,
     "gender": "Groom", "caste": "Kamma", "district": "Guntur", "education": "MBA",
     "job": "Manager", "phone": "9000000002"},
    {"tsap_id": "W10-LOCAL-GROOM-3", "full_name": "Fixture Groom Three", "age": 28,
     "gender": "Groom", "caste": "Kapu", "district": "Visakhapatnam", "education": "BTech",
     "job": "Engineer", "phone": "9000000003"},
]
MATCHES = [{"profile": profile} for profile in PROFILES]
pack = WP.build_welcome_pack(USER, USER["tsap_id"], MATCHES, directory_links=_directory)
check("B1 up to three candidate summaries are shown",
      len(pack["profiles"]) == 3, len(pack["profiles"]))
check("B2 profiles link to their website pages without scoring fields",
      all(row.get("link", "").endswith("/search/" + row.get("tsap_id", ""))
          and not ({"score", "match_score", "compatibility_score", "trust_score", "reason", "reasons"} & set(row))
          for row in pack["profiles"]), pack["profiles"])
check("B3 summary excludes raw phone numbers and surnames",
      not PHONE_RE.findall(json.dumps(pack))
      and all(row["name"] == "Fixture" for row in pack["profiles"]), pack["profiles"])
check("B4 copy states owner-consent/privacy controls and ₹99 interest-request pricing",
      "owner acceptance" in pack["message_text"].lower()
      and "₹99" in pack["message_text"]
      and "interest requests" in pack["message_text"].lower(), pack["message_text"][-700:])
check("B5 delivery limits are explicit; no popularity or synthetic-score claim",
      ("హామీ కాదు" in pack["message_text"] or "not guaranteed" in pack["message_text"].lower())
      and not any(token in pack["message_text"].lower() for token in ("compatibility score", "trust score", "52 channels")),
      pack["message_text"][-650:])
check("B6 message retains Telugu and lists only public channel entries",
      has_telugu(pack["message_text"]) and not (EXCLUDED & {row["key"] for row in pack["channels"]}),
      [row["key"] for row in pack["channels"]])
check("B7 public API view omits internal-only has_numbers flag",
      "has_numbers" not in WP.pack_public(pack))
_count = WP.channels_count(directory_links=_directory)
check("B8 URL statistics are public-only and say external status is unchecked",
      _count["channels"] == len(_public)
      and _count["telegram_links_configured"] == sum(bool(row.get("telegram")) for row in _directory.values())
      and _count["whatsapp_links_configured"] == sum(bool(row.get("whatsapp")) for row in _directory.values())
      and _count["external_status_checked"] is False, _count)


section("C. Public channel links API")
response = client.get("/api/channels/links?caste=Reddy&gender=Bride&state=TS")
api_body = response.json()
api_keys = [row["key"] for row in api_body.get("channels", [])]
check("C1 HTTP 200 and Reddy public entry first",
      response.status_code == 200 and api_keys and api_keys[0] == "c_reddy_bride", api_body)
check("C2 public endpoint does not return excluded rows or contact numbers",
      not (EXCLUDED & set(api_keys)) and not PHONE_RE.findall(json.dumps(api_body)), api_keys)
check("C3 counts describe visible entries only; availability is not implied",
      api_body.get("stats", {}).get("channels") == len(_public)
      and api_body.get("external_status_checked") is False, api_body.get("stats"))
check("C4 links exactly match the configured public map",
      all(row.get("telegram", "") == _directory.get(row["key"], {}).get("telegram", "")
          and row.get("whatsapp", "") == _directory.get(row["key"], {}).get("whatsapp", "")
          for row in api_body.get("channels", [])), api_body.get("channels"))


section("D. Registration + owner welcome-pack APIs (all local; WhatsApp stays off)")
def _profile(tsap_id: str, name: str, gender: str, phone: str, caste: str, created_at: str) -> dict:
    return {
        "tsap_id": tsap_id, "full_name": name, "gender": gender, "phone": phone,
        "age": 27, "height": "5'6\"", "marital_status": "Pelli Kaledu", "caste": caste,
        "sub_caste": "", "religion": "Hindu", "education": "BTech", "job": "Engineer",
        "state": "TS", "district": "Hyderabad", "status": "approved", "is_approved": True,
        "is_active": True, "photo_private": True, "privacy_mode": "private", "credits": 3,
        "created_at": created_at,
    }

# Distinct, disposable test-only identities; no production/demo-seed endpoint is used.
main.DB_USERS.clear()
main.DB_INTERESTS.clear()
main.DB_PAYMENTS.clear()
main.DB_BLOCKS.clear()
main.WA_QUEUE.clear()
main.DB_USERS.extend([
    _profile("W10-LOCAL-GROOM-1", "Fixture Groom One", "Groom", "9000000001", "Reddy", "2026-10-06T12:00:00"),
    _profile("W10-LOCAL-GROOM-2", "Fixture Groom Two", "Groom", "9000000002", "Kamma", "2026-10-06T11:00:00"),
    _profile("W10-LOCAL-GROOM-3", "Fixture Groom Three", "Groom", "9000000003", "Kapu", "2026-10-06T10:00:00"),
])
main._reindex_users()

registration = {
    "gender": "Bride", "height": "5'4\"", "marital_status": "Pelli Kaledu",
    "caste": "Reddy", "sub_caste": "Pakanati Reddy", "education": "BTech",
    "job": "Software", "state": "TS", "district": "Hyderabad", "phone": "9999999999",
    "full_name": "Local Fixture Bride", "dob": "1998-10-06", "password": "Local-test-pass-42",
    "religion": "Hindu", "consent_confirmed": "true", "photo_private": "true",
}
# Assert that a WhatsApp queue call cannot occur with delivery explicitly disabled.
with patch.object(main, "create_pro_card", None), \
     patch.object(main, "enqueue_whatsapp", side_effect=AssertionError("WhatsApp must remain off")):
    registered = client.post("/api/register", data=registration)
reg_body = registered.json()
welcome = reg_body.get("welcome_pack") or {}
reg_id = str(reg_body.get("tsap_id") or "")
check("D1 registration accepts explicit consent and returns a welcome pack",
      registered.status_code == 200 and bool(reg_id) and isinstance(welcome, dict), reg_body)
check("D2 local matching returns at most three real test fixtures without scores",
      1 <= len(welcome.get("profiles", [])) <= 3
      and all(row.get("gender") == "Groom"
              and not ({"score", "match_score", "compatibility_score", "trust_score", "reasons", "reason"} & set(row))
              for row in welcome.get("profiles", [])), welcome.get("profiles"))
check("D3 response has no other-member phone numbers and does not claim queued delivery",
      not {"9000000001", "9000000002", "9000000003"}.intersection(PHONE_RE.findall(json.dumps(reg_body)))
      and welcome.get("queue", {}).get("queued") is False
      and not PHONE_RE.findall(json.dumps(welcome)), welcome.get("queue"))
check("D4 registration welcome-pack channels exclude private categories",
      not (EXCLUDED & {row["key"] for row in welcome.get("channels", [])}),
      [row.get("key") for row in welcome.get("channels", [])])

owner_pack = client.get(f"/api/welcome-pack/{reg_id}")
owner_body = owner_pack.json()
check("D5 owner pack route returns consent-safe summaries",
      owner_pack.status_code == 200 and owner_body.get("success") is True
      and not PHONE_RE.findall(json.dumps(owner_body)), owner_body)
check("D6 unknown profile ID is rejected",
      client.get("/api/welcome-pack/W10-LOCAL-MISSING").status_code == 404)

with patch.object(main, "enqueue_whatsapp", side_effect=AssertionError("WhatsApp must remain off")):
    resent = client.post(f"/api/welcome-pack/{reg_id}/resend")
resent_body = resent.json()
check("D7 resend stays an offline preview and never queues/sends",
      resent.status_code == 200 and resent_body.get("queued") is False
      and not main.WA_QUEUE and not PHONE_RE.findall(json.dumps(resent_body)), resent_body)
check("D8 no production/demo seed path was used or created",
      not any(user.get("demo") or user.get("seed_source") for user in main.DB_USERS)
      and len(main.DB_USERS) == 4, len(main.DB_USERS))

print(f"\nRESULT: {PASS} pass / {FAIL} fail")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("✅ All welcome-pack checks passed; no external messaging or channel requests were made.")
