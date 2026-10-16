"""The "share your story" nudge.

Members only see an invite to publish a story when their own record can justify
it: enough time on the service, or an interest that was accepted on both sides.
Covering:

  • an anonymous caller and a caller holding another member's token both get
    401 — the endpoint is owner-only like every other private member route;
  • a brand-new member is told nothing (no card, no invented encouragement);
  • a long-standing member, and a member with an accepted interest, are invited;
  • a member whose story is in review, or already published, is told that
    instead of being asked again;
  • an unknown registration date is reported as unknown, never as time served;
  • the payload never claims verification and never promises publication.

Run with ``python test_story_nudge.py`` (no pytest needed).
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("ENV", "test")
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ.setdefault("TSAP_AUTH_SECRET", "story-nudge-test-secret")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("story-nudge")

import advanced11 as A11  # noqa: E402
import hardening as H  # noqa: E402
import main  # noqa: E402
from testutil_client import TestClient  # noqa: E402

client = TestClient(main.app, raise_server_exceptions=False)

PASSED: list[str] = []
FAILED: list[str] = []


def check(name: str, condition: bool, detail: object = "") -> None:
    if condition:
        PASSED.append(name)
        print(f"  ✅ {name}")
    else:
        FAILED.append(name)
        print(f"  ❌ {name}  | {detail}")


def headers_for(tsap_id: str) -> dict:
    token = H.sign_token(tsap_id)
    return {"Authorization": f"Bearer {token}", "X-TSAP-Token": token}


def make_member(tsap_id: str, days_ago: int | None, accepted: int = 0) -> dict:
    created = ""
    if days_ago is not None:
        created = (datetime.utcnow() - timedelta(days=days_ago)).isoformat()
    user = {
        "tsap_id": tsap_id,
        "full_name": f"Test Member {tsap_id}",
        "name": f"Test Member {tsap_id}",
        "gender": "Bride",
        "status": "approved",
        "is_approved": True,
        "created_at": created,
        "phone": "9000000000",
        "district": "Warangal",
        "state": "TS",
    }
    main.DB_USERS.append(user)
    for index in range(accepted):
        main.DB_INTERESTS.append({
            "from_id": tsap_id,
            "to_id": f"TSAP-OTHER-{index}",
            "status": "accepted",
            "created_at": datetime.utcnow().isoformat(),
        })
    return user


def prompt(tsap_id: str, headers: dict | None = None):
    return client.get(f"/api/stories/prompt?tsap_id={tsap_id}", headers=headers or {})


print("\n=== 1. ACCESS ===")
new_member = make_member("TSAP-NUDGE-NEW", days_ago=2)
anon = client.get(f"/api/stories/prompt?tsap_id={new_member['tsap_id']}")
check("anonymous caller is refused", anon.status_code == 401, anon.status_code)

other = client.get(
    f"/api/stories/prompt?tsap_id={new_member['tsap_id']}",
    headers=headers_for("TSAP-NUDGE-INTRUDER"),
)
check("another member's token is refused", other.status_code == 401, other.status_code)

missing = prompt("TSAP-NUDGE-GHOST", headers_for("TSAP-NUDGE-GHOST"))
check("an unknown profile is a 404, not a fabricated nudge", missing.status_code == 404,
      missing.status_code)

print("\n=== 2. NOTHING TO INVITE YET ===")
fresh = prompt(new_member["tsap_id"], headers_for(new_member["tsap_id"])).json()
check("a brand-new member gets no invitation",
      fresh.get("success") is True and fresh.get("reason") == "not_yet"
      and fresh.get("can_submit") is False, fresh)
check("the new-member response still reports the real numbers",
      fresh.get("member_days") == 2 and fresh.get("accepted_interests") == 0, fresh)

unknown_date = make_member("TSAP-NUDGE-NODATE", days_ago=None)
nodate = prompt(unknown_date["tsap_id"], headers_for(unknown_date["tsap_id"])).json()
check("an unknown registration date is reported as unknown",
      nodate.get("days_known") is False and nodate.get("member_days") is None, nodate)
check("an unknown date never counts as time served",
      nodate.get("reason") == "not_yet" and nodate.get("can_submit") is False, nodate)

print("\n=== 3. REAL REASONS TO INVITE ===")
long_member = make_member("TSAP-NUDGE-OLD", days_ago=main.STORY_PROMPT_MIN_DAYS + 5)
old = prompt(long_member["tsap_id"], headers_for(long_member["tsap_id"])).json()
check("a long-standing member is invited",
      old.get("can_submit") is True and old.get("reason") == "member_long_enough", old)
check("the invite states the threshold it used",
      old.get("min_days") == main.STORY_PROMPT_MIN_DAYS and old.get("member_days", 0) >= main.STORY_PROMPT_MIN_DAYS,
      old)

connected = make_member("TSAP-NUDGE-ACCEPTED", days_ago=3, accepted=1)
acc = prompt(connected["tsap_id"], headers_for(connected["tsap_id"])).json()
check("a member with an accepted interest is invited even when new",
      acc.get("can_submit") is True and acc.get("reason") == "accepted_interest"
      and acc.get("accepted_interests") == 1, acc)
check("the interest copy does not claim a wedding happened",
      "marriage" not in str(acc.get("note_en", "")).lower(), acc.get("note_en"))

print("\n=== 4. ALREADY SHARED ===")
A11.submit_story(
    tsap_id=connected["tsap_id"],
    text="We spoke for two months with our families present and it worked out well for both sides.",
    couple_names="Test Couple",
    district="Warangal",
)
pending = prompt(connected["tsap_id"], headers_for(connected["tsap_id"])).json()
check("a story in review is reported instead of a second invite",
      pending.get("reason") == "already_pending" and pending.get("can_submit") is False, pending)
check("the review message promises no publication",
      "not guaranteed" in str(pending.get("note_en", "")).lower(), pending.get("note_en"))
check("the summary counts the pending story",
      (pending.get("stories") or {}).get("pending") == 1, pending.get("stories"))

story_id = next(s["story_id"] for s in A11.STORIES if s.get("tsap_id") == connected["tsap_id"])
A11.review_story(story_id, "approve", "Reviewed in the nudge test.")
approved = prompt(connected["tsap_id"], headers_for(connected["tsap_id"])).json()
check("an approved story is reported as published",
      approved.get("reason") == "already_approved" and approved.get("can_submit") is False, approved)
check("the summary counts the approved story",
      (approved.get("stories") or {}).get("approved") == 1, approved.get("stories"))

print("\n=== 5. NO INVENTED ASSURANCE ===")
for label, row in (("member_long_enough", old), ("accepted_interest", acc),
                   ("already_pending", pending), ("already_approved", approved)):
    check(f"{label} never claims verification", row.get("verified_claim") is False, row)
    check(f"{label} never claims an external check", row.get("external_status_checked") is False, row)
    check(f"{label} still carries the submitter id it was asked about only",
          row.get("tsap_id", "").startswith("TSAP-NUDGE-"), row.get("tsap_id"))

print(f"\n=== RESULT: {len(PASSED)} pass / {len(FAILED)} fail ===")
if FAILED:
    print("FAILED:", FAILED)
    sys.exit(1)
print("💑 STORY NUDGE (owner-only, nothing invented, no publication promise) — executed tests pass")
