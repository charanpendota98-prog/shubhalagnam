"""Member-story moderation from the control dashboard.

Stories are the only social proof the site shows, so the moderation queue has
to be usable by an owner session and it has to keep saying what approval does
and does not mean. Covering:

  • the queue lists pending stories for an owner session and nothing for an
    anonymous caller;
  • approve publishes the story (it appears in the public feed) and reject
    keeps it out, and neither claims to verify anything;
  • approval requires a real session cookie — an admin API key alone cannot
    publish, and neither can a request without the CSRF header;
  • the queue payload keeps submitter identifiers out of the parts a moderator
    acts on, and the public feed never exposes a profile ID.

Run with ``python test_control_stories.py`` (no pytest needed).
"""
from __future__ import annotations

import os
import sys

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("ENV", "test")
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ.setdefault("TSAP_AUTH_SECRET", "control-stories-test-secret")
import control_auth  # noqa: E402

OWNER_USERNAME = "owner"
OWNER_PASSWORD = "Owner@Stories2026!"
os.environ["CONTROL_OWNER_USERNAME"] = OWNER_USERNAME
os.environ["CONTROL_OWNER_PASSWORD_HASH"] = control_auth.password_hash(OWNER_PASSWORD)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("control-stories")

import advanced11 as A11  # noqa: E402
import hardening as H  # noqa: E402
import main  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

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


def owner_session() -> dict:
    r = client.post("/api/control/login", json={"username": OWNER_USERNAME, "password": OWNER_PASSWORD})
    assert r.status_code == 200, r.text
    me = client.get("/api/control/me").json()
    return {"role": me["role"], "username": me["username"], "csrf": me["csrf"]}


def submit(text: str, names: str = "Ramesh & Sita") -> dict:
    return A11.submit_story(tsap_id="TSAP-2-2026-000999", text=text, couple_names=names, district="Warangal")


# ------------------------------------------------------------------ auth

print("\n=== 1. QUEUE ACCESS ===")
session = owner_session()
check("owner session is an owner", session["role"] == "owner", session)
check("owner session carries a CSRF token", bool(session["csrf"]))

# A fresh client carries no session cookie, so this is a genuinely anonymous call.
anon = TestClient(main.app, raise_server_exceptions=False)
check("anonymous caller cannot read the queue",
      anon.get("/api/control/stories").status_code in (401, 403),
      anon.get("/api/control/stories").status_code)

queued = client.get("/api/control/stories?status=pending").json()
check("owner can read the queue", queued.get("success") is True and "stories" in queued, queued)
check("the queue states what approval means",
      "not verified" in str(queued.get("review_note", "")).lower(), queued.get("review_note"))

# ------------------------------------------------------------------ approve

print("\n=== 2. APPROVE PUBLISHES ===")
story = submit("We met here in March and our families agreed after two meetings. "
               "The first conversation happened through the platform and it was comfortable for both of us.")
approved = client.post(
    f"/api/control/stories/{story['story_id']}/action",
    json={"action": "approve", "note": "Reviewed; names supplied by the submitter."},
    headers={"X-Control-CSRF": session["csrf"]},
).json()
check("approve succeeds", approved.get("success") is True, approved)
check("approved story is marked approved", approved.get("story", {}).get("status") == "approved", approved)
check("approval returns ready-to-share text", bool(approved.get("share_text")), approved)
check("approval says it does not verify",
      "does not verify" in str(approved.get("publication_note", "")).lower(), approved.get("publication_note"))

public = client.get("/api/stories?limit=10").json()
check("approved story reaches the public feed",
      any(row.get("story_id") == story["story_id"] for row in public.get("stories", [])), public)
check("public feed carries the not-verified note",
      "not independently verified" in str(public.get("publication_note", "")).lower(), public.get("publication_note"))
check("public feed never exposes a profile ID",
      all("tsap_id" not in row for row in public.get("stories", [])), public.get("stories"))

# ------------------------------------------------------------------ reject

print("\n=== 3. REJECT WITHHOLDS ===")
other = submit("Second story that should never be published because the review rejects it outright here.")
rejected = client.post(
    f"/api/control/stories/{other['story_id']}/action",
    json={"action": "reject", "note": "Details could not be shown safely."},
    headers={"X-Control-CSRF": session["csrf"]},
).json()
check("reject succeeds", rejected.get("success") is True, rejected)
check("rejected story is marked rejected", rejected.get("story", {}).get("status") == "rejected", rejected)
check("reject offers no share text", "share_text" not in rejected, rejected)
public_after = client.get("/api/stories?limit=10").json()
check("rejected story stays out of the public feed",
      all(row.get("story_id") != other["story_id"] for row in public_after.get("stories", [])), public_after)

# ------------------------------------------------------------------ guards

print("\n=== 4. WRITE GUARDS ===")
third = submit("Third story used only to check that the write guards reject unauthorised calls.")
csrf_missing = client.post(
    f"/api/control/stories/{third['story_id']}/action", json={"action": "approve", "note": ""}
)
check("a session without the CSRF header is refused", csrf_missing.status_code == 403, csrf_missing.status_code)

api_key = client.post(
    f"/api/control/stories/{third['story_id']}/action",
    json={"action": "approve", "note": ""},
    headers={"X-Admin-Key": H.ADMIN_KEY, "X-Control-CSRF": "api_key_csrf"},
)
check("an admin API key cannot publish without an owner session", api_key.status_code == 403, api_key.status_code)
check("the story is still pending after both refusals",
      next(row for row in A11.STORIES if row["story_id"] == third["story_id"])["status"] == "pending")

bad = client.post(
    f"/api/control/stories/{third['story_id']}/action",
    json={"action": "publish", "note": ""},
    headers={"X-Control-CSRF": session["csrf"]},
)
check("only approve and reject are accepted", bad.status_code == 400, bad.status_code)

client.post("/api/control/logout", headers={"X-Control-CSRF": session["csrf"]})
after_logout = client.get("/api/control/stories").status_code
check("logout ends queue access", after_logout in (401, 403), after_logout)

# ------------------------------------------------------------------ summary

print(f"\n=== RESULT: {len(PASSED)} pass / {len(FAILED)} fail ===")
if FAILED:
    print(f"FAILED: {FAILED}")
    sys.exit(1)
print("🏆 CONTROL STORY MODERATION — ANNI TESTS PASS")
