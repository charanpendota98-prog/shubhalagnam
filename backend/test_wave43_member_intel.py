"""
🌊 WAVE 43 — MEMBER INTELLIGENCE SUITE
======================================
Explainable, fact-only, owner-private insight:

  A. verification progress — every recorded check and what it does NOT prove
  B. profile insights      — shared facts, differences, unknowns, saved-search overlap
  C. interest coach        — eligibility and consequences BEFORE a credit is spent
  D. request timeline      — only steps that were really recorded
  E. member activity       — this account's own counts, small samples labelled
  F. routes                — owner-only, honest 404s, nothing invented

Rule this suite enforces: nothing in this feature may invent a compatibility
score, infer a blank field, promise a reply, or call a recorded check "trust".

Run:  python3 test_wave43_member_intel.py   (cwd: backend/)
"""
import json
import os
import sys
from datetime import datetime, timedelta, timezone

os.environ["APP_ENV"] = "test"
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ["TSAP_AUTH_SECRET"] = "wave43-member-intel-secret-not-for-production-2026"
os.environ["ADMIN_KEY"] = "wave43-member-intel-admin-key-not-for-production-2026"
os.environ["PUBLISH_DRY_RUN"] = "true"
os.environ["AUTO_POST_ON_REGISTER"] = "false"
os.environ["WA_ENABLED"] = "false"
os.environ["PAYMENTS_LIVE"] = "false"
os.environ["OTP_DEV_MODE"] = "true"
for _provider_env in ("BOT_TOKEN", "TELEGRAM_BOT_TOKEN", "WA_INSTANCES", "MSG91_KEY"):
    os.environ.pop(_provider_env, None)

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("wave43-member-intel")

import hardening  # noqa: E402
import main as M  # noqa: E402
import member_intel as MI  # noqa: E402
from testutil_client import TestClient  # noqa: E402

PASS, FAIL = [], []


def check(name, cond, extra=""):
    (PASS if cond else FAIL).append(name)
    print(("  ✅ " if cond else "  ❌ ") + name + (("  | " + str(extra)) if extra else ""))


def section(title):
    print("\n=== %s ===" % title)


def iso(hours_ago=0):
    return (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).isoformat()


def member(tsap_id, **over):
    base = {
        "tsap_id": tsap_id, "full_name": "Wave43 %s" % tsap_id, "gender": "Bride",
        "age": 27, "caste": "Reddy", "religion": "Hindu", "state": "TS",
        "district": "Hyderabad", "current_city": "Hyderabad", "job": "Software",
        "education": "BTech", "marital_status": "Never Married",
        "is_approved": True, "status": "approved", "credits": 3, "plan": "FREE",
        "created_at": iso(48),
    }
    base.update(over)
    return base


BRIDE = member("TSAP-F-2026-4301")
GROOM = member("TSAP-M-2026-4302", full_name="Wave43 Groom", gender="Groom", age=30)
OTHER = member("TSAP-F-2026-4303", full_name="Wave43 Other", district="Guntur",
               current_city="Guntur", caste="Kamma", currentcredits=None)
OTHER.pop("currentcredits", None)
M.DB_USERS.extend([dict(BRIDE), dict(GROOM), dict(OTHER)])

client = TestClient(M.app)
anon = TestClient(M.app)  # clean cookie jar — no owner session, so auth is really tested


def headers(tsap_id):
    token = hardening.sign_token(tsap_id)
    return {"Authorization": "Bearer %s" % token, "X-TSAP-Token": token}


BH = headers(BRIDE["tsap_id"])
GH = headers(GROOM["tsap_id"])
OH = headers(OTHER["tsap_id"])

BANNED_PHRASES = ("compatibility score", "match score", "trust score",
                  "guaranteed reply", "will reply", "100% match")

# Honest copy says "not a compatibility score". A phrase is only a false
# promise when the sentence does not deny it — so negated sentences are skipped.
import re as _re  # noqa: E402

_NEGATION = _re.compile(r"\b(not|never|no|cannot|can't|don't|doesn't|isn't|without|instead of)\b"
                        r"|(కాదు|లేదు|ఊహించము)", _re.I)


def honest(text):
    segments = _re.split(r"(?<=[.!?;])\s+|\n", str(text))
    return " ".join(seg for seg in segments if not _NEGATION.search(seg))

print("=" * 72)
print("🌊 WAVE 43 — MEMBER INTELLIGENCE (explainable, fact-only, owner-private)")
print("=" * 72)

# ===========================================================================
section("A. verification progress — recorded checks, never trust")
# ===========================================================================
bare = MI.verification_progress({"tsap_id": "TSAP-F-2026-4399"})
check("A1 three checks are always listed", len(bare["checks"]) == 3, len(bare["checks"]))
check("A2 a member with no checks has zero recorded", bare["recorded_checks"] == 0
      and bare["level"] == "none", bare["level"])
check("A3 every check says what it records AND what it does not",
      all(c["records_en"] and c["does_not_en"] for c in bare["checks"]))
check("A4 every unrecorded check offers the next step",
      all(c["next_step_en"] and c["href"] for c in bare["checks"]))
check("A5 every check is bilingual",
      all(c["label_te"] and c["records_te"] and c["does_not_te"] for c in bare["checks"]))
check("A6 detail counts are labelled as counts, not as quality",
      "not a quality or trust score" in bare["detail_note_en"])

phone = MI.verification_progress({"tsap_id": "X", "phone_verified": True})
check("A7 a phone OTP check records one check at level 'phone'",
      phone["recorded_checks"] == 1 and phone["level"] == "phone", phone["level"])
photo = MI.verification_progress({"tsap_id": "X", "selfie_verified": True})
check("A8 a reviewed photo records the photo check",
      photo["recorded_checks"] == 1 and photo["level"] == "photo", photo["level"])
idp = MI.verification_progress({"tsap_id": "X", "id_verified": True})
check("A9 a reviewed government ID records the ID check",
      idp["recorded_checks"] == 1 and idp["level"] == "id", idp["level"])
approved_photo = MI.verification_progress({"tsap_id": "X", "photo_status": "approved"})
check("A10 an approved photo status counts as the photo check",
      approved_photo["recorded_checks"] == 1, approved_photo["level"])
check("A11 no check text claims trustworthiness",
      not any("trust" in (c["records_en"] + c["does_not_en"]).lower() for c in bare["checks"]))

full = MI.verification_progress(dict(BRIDE, phone_verified=True, id_verified=True))
check("A12 detail counts only count fields the member filled in",
      full["provided_fields"] > 0 and full["provided_fields"] <= full["total_fields"],
      "%s/%s" % (full["provided_fields"], full["total_fields"]))
empty = MI.verification_progress({"tsap_id": "X"})
check("A13 an empty profile reports zero provided fields", empty["provided_fields"] == 0)
check("A14 the disclaimer is attached", "not a compatibility score" in bare["disclaimer_en"])

# ===========================================================================
section("B. profile insights — shared facts, differences, unknowns")
# ===========================================================================
ins = MI.profile_insights(GROOM, BRIDE)
check("B1 insights answer without calculating a score",
      ins["compatibility_score_calculated"] is False
      and ins["ranking_basis"] == "member_entered_facts_only")
check("B2 shared facts are listed", isinstance(ins["shared"], list)
      and len(ins["shared"]) <= 6, len(ins["shared"]))
check("B3 the profiles' shared city/community is reported as a fact",
      any("Hyderabad" in line or "Reddy" in line for line in ins["shared"]),
      ins["shared"][:2])
check("B4 unknowns are listed as unknown, never guessed",
      all(str(row.get("state", "")).startswith(("missing", "unknown", "not_provided"))
          for row in ins["unknown"]),
      [row.get("state") for row in ins["unknown"]][:3])
check("B5 profile detail counts come from the profile being viewed",
      ins["profile_details"]["total"] > 0
      and ins["profile_details"]["provided"] <= ins["profile_details"]["total"],
      "%s/%s" % (ins["profile_details"]["provided"], ins["profile_details"]["total"]))
check("B6 next steps tell the member to decide, not the service",
      all("decide" in step["en"].lower() or "family" in step["en"].lower()
          or "review" in step["en"].lower() for step in ins["next_steps"]))
check("B7 insights are bilingual",
      all(step["te"] for step in ins["next_steps"]) and bool(ins["disclaimer_te"]))

saved = [{"search_id": "S1", "name": "Reddy in Hyderabad",
          "filters": {"caste": "Reddy", "district": "Hyderabad"}},
         {"search_id": "S2", "name": "Kamma in Guntur",
          "filters": {"caste": "Kamma", "district": "Guntur"}}]
overlap = MI.profile_insights(GROOM, BRIDE, saved)
check("B8 saved searches are checked against the profile's own facts",
      overlap["matching_searches"] == ["Reddy in Hyderabad"], overlap["matching_searches"])
check("B9 a saved search that does not fit is reported as not matching",
      [s for s in overlap["saved_searches"] if s["search_id"] == "S2"][0]["matches"] is False)
check("B10 insights never crash on an empty profile",
      MI.profile_insights({}, {})["compatibility_score_calculated"] is False)
detail = overlap["saved_searches"][0]["filter_detail"]
check("B11 a matching search explains which filters fitted",
      [row["key"] for row in detail] == ["caste", "district"]
      and all(row["matched"] for row in detail), detail)
mixed = MI.profile_insights(GROOM, BRIDE, [{"search_id": "S3", "name": "Kamma in Hyderabad",
                                            "filters": {"caste": "Kamma", "district": "Hyderabad"}}])
check("B12 a partially fitting search marks the filter that did not fit",
      [row["matched"] for row in mixed["saved_searches"][0]["filter_detail"]] == [False, True],
      mixed["saved_searches"][0]["filter_detail"])
check("B13 the per-filter answer agrees with the search itself",
      all(row["matched"] == MI.profile_insights(
          GROOM, BRIDE, [{"search_id": "X", "name": "", "filters": {row["key"]: row["value"]}}]
      )["saved_searches"][0]["matches"]
          for row in detail))
check("B14 empty filters produce no fake detail rows",
      MI.profile_insights(GROOM, BRIDE, [{"search_id": "S4", "name": "empty", "filters": {}}]
                          )["saved_searches"] == [])

# ===========================================================================
section("C. interest coach — before the credit is spent")
# ===========================================================================
coach = MI.interest_coach(GROOM, BRIDE, [], daily_limit=20)
check("C1 an eligible member is told they can send", coach["can_send"] is True
      and coach["blockers"] == [], coach["blockers"])
check("C2 credits, cost and daily usage are stated up front",
      coach["credits"] == 3 and coach["credits_needed"] == 1
      and coach["daily_limit"] == 20 and coach["sent_today"] == 0)
check("C3 what the owner receives is listed exactly",
      len(coach["what_owner_receives"]) == 3
      and any("contact" in item["en"].lower() for item in coach["what_owner_receives"]))
check("C4 the sequence of events is honest about silence",
      len(coach["next_steps"]) == 4
      and any("no response" in step["en"].lower() for step in coach["next_steps"])
      and any("not guaranteed" in step["en"].lower() for step in coach["next_steps"]))
check("C5 the delivery note refuses to confirm delivery",
      "never confirmed" in coach["delivery_note_en"])

no_credit = MI.interest_coach(dict(GROOM, credits=0), BRIDE, [])
check("C6 a member with no credits is blocked before paying",
      no_credit["can_send"] is False and "no_credits" in no_credit["blockers"],
      no_credit["blockers"])
check("C7 the no-credits blocker points at the plans",
      no_credit["fix_href"] == "/requests#plans", no_credit["fix_href"])
dup = MI.interest_coach(GROOM, BRIDE, [{"from_id": GROOM["tsap_id"], "to_id": BRIDE["tsap_id"],
                                        "request_id": "REQ-1", "status": "pending",
                                        "created_at": iso(2)}])
check("C8 a duplicate request is named, not silently blocked",
      dup["can_send"] is False and "duplicate_request" in dup["blockers"]
      and dup["duplicate_request"]["request_id"] == "REQ-1", dup["blockers"])
self_send = MI.interest_coach(GROOM, GROOM, [])
check("C9 sending to your own profile is blocked", self_send["can_send"] is False
      and "self_request" in self_send["blockers"], self_send["blockers"])
same_gender = MI.interest_coach(BRIDE, OTHER, [])
check("C10 the gender rule is explained as a rule, not a judgement",
      same_gender["can_send"] is False and "same_gender" in same_gender["blockers"],
      same_gender["blockers"])
blocked_pair = MI.interest_coach(GROOM, BRIDE, [], blocked=True)
check("C11 a blocked pair is told so before spending",
      blocked_pair["can_send"] is False and "blocked" in blocked_pair["blockers"])
today = [{"from_id": GROOM["tsap_id"], "to_id": BRIDE["tsap_id"], "status": "pending",
          "created_at": iso(1)},
         {"from_id": GROOM["tsap_id"], "to_id": OTHER["tsap_id"], "status": "pending",
          "created_at": iso(3)},
         {"from_id": GROOM["tsap_id"], "to_id": OTHER["tsap_id"], "status": "pending",
          "created_at": iso(48 * 30)}]
usage = MI.interest_coach(GROOM, OTHER, today, daily_limit=20)
check("C12 today's usage counts only what was sent today", usage["sent_today"] == 2,
      usage["sent_today"])

notes = MI._suggested_notes(GROOM, BRIDE)
check("C13 suggested notes are built from entered facts",
      len(notes) <= 4 and any(n["id"] == "same_city" for n in notes)
      and any(n["id"] == "education_respect" for n in notes),
      [n["id"] for n in notes])
blank_notes = MI._suggested_notes({"tsap_id": "A"}, {"tsap_id": "B"})
check("C14 a profile with no facts yields no invented details",
      [n["id"] for n in blank_notes] == ["polite_intro", "family_first"],
      [n["id"] for n in blank_notes])
check("C15 every suggested note is bilingual",
      all(n["en"] and n["te"] for n in notes))
check("C16 no suggested note promises anything",
      all(phrase not in n["en"].lower() for n in notes for phrase in BANNED_PHRASES))

# ===========================================================================
section("D. request timeline — only what was recorded")
# ===========================================================================
pending = {"request_id": "REQ-A", "status": "pending", "created_at": iso(5),
           "status_at": iso(5), "expires_at": iso(-24 * 6)}
tl = MI.request_timeline(pending)
check("D1 a pending request shows the recorded step only",
      tl["completed_steps"] == 1 and tl["total_steps"] == 4, tl["completed_steps"])
check("D2 the pending request carries no invented delivery time",
      [s["at"] for s in tl["steps"] if s["key"] == "owner_notification"] == [""])
check("D3 every step carries a label and a note in both languages",
      all(s["label_en"] and s["label_te"] and s["note_en"] and s["note_te"]
          for s in tl["steps"]))
check("D4 the notification step repeats the honest delivery note",
      "never confirmed" in [s for s in tl["steps"]
                            if s["key"] == "owner_notification"][0]["note_en"])
queued = dict(pending, notification_queue={"owner_queued": True, "recorded_at": iso(4)})
tlq = MI.request_timeline(queued)
check("D5 a queued notification is shown with the time it was queued",
      tlq["completed_steps"] == 2
      and [s for s in tlq["steps"] if s["key"] == "owner_notification"][0]["at"] == queued["notification_queue"]["recorded_at"])
accepted = dict(pending, status="accepted", contact_shared=True, status_at=iso(1),
                notification_queue={"owner_queued": True, "recorded_at": iso(4)})
tla = MI.request_timeline(accepted)
check("D6 an accepted request completes every step with real timestamps",
      tla["completed_steps"] == 4
      and all(s["at"] for s in tla["steps"]), tla["completed_steps"])
check("D7 an unknown request still answers four steps, all incomplete",
      MI.request_timeline(None)["completed_steps"] == 0
      and MI.request_timeline(None)["total_steps"] == 4)
check("D8 the timeline keeps the expiry timestamp", tl["expires_at"] == pending["expires_at"])

# ===========================================================================
section("E. member activity — this account's own numbers")
# ===========================================================================
rows = [
    {"from_id": GROOM["tsap_id"], "to_id": BRIDE["tsap_id"], "status": "accepted",
     "created_at": iso(72), "status_at": iso(48)},
    {"from_id": GROOM["tsap_id"], "to_id": OTHER["tsap_id"], "status": "pending",
     "created_at": iso(10), "status_at": iso(10)},
]
act = MI.member_activity(GROOM, rows)
check("E1 sent counts are this account's own", act["sent"]["total"] == 2
      and act["sent"]["accepted"] == 1 and act["sent"]["pending"] == 1, act["sent"])
check("E2 the median response time is computed from real timestamps",
      act["median_response_hours"] == 24.0, act["median_response_hours"])
check("E3 a handful of requests is labelled a small sample",
      act["small_sample"] is True and act["sample_size"] == 2, act["sample_size"])
check("E4 the response rate is a count, never a promise",
      act["response_rate_percent"] == 50.0
      and "not a forecast" in act["note_en"], act["response_rate_percent"])
check("E5 received requests are counted separately",
      MI.member_activity(BRIDE, rows)["received"]["total"] == 1
      and MI.member_activity(BRIDE, rows)["sent"]["total"] == 0)
check("E6 a member with no requests gets zeros, not a guess",
      MI.member_activity(GROOM, [])["sent"]["total"] == 0
      and MI.member_activity(GROOM, [])["median_response_hours"] is None
      and MI.member_activity(GROOM, [])["response_rate_percent"] == 0.0)
check("E7 five or more requests stop being flagged as a small sample",
      MI.member_activity(GROOM, [dict(rows[0], to_id="T%d" % i) for i in range(6)])["small_sample"] is False)
check("E8 activity is bilingual", bool(act["note_te"]) and bool(act["disclaimer_te"]))
check("E9 an unparseable timestamp yields no hours, never a fake one",
      MI._hours_between("not-a-date", iso(1)) is None
      and MI._hours_between(None, None) is None
      and MI._hours_between(iso(1), iso(5)) is None)  # end before start → nothing invented

# ===========================================================================
section("F. routes — owner-only, honest 404s, nothing invented")
# ===========================================================================
r = client.get("/api/verification/%s/progress" % BRIDE["tsap_id"], headers=BH)
check("F1 verification progress answers for the owner", r.status_code == 200
      and r.json()["recorded_checks"] == 0, r.status_code)
check("F2 verification progress is private",
      anon.get("/api/verification/%s/progress" % BRIDE["tsap_id"]).status_code == 401
      and anon.get("/api/verification/%s/progress" % BRIDE["tsap_id"], headers=OH).status_code == 401)

r = client.get("/api/matches/%s/insights/%s" % (GROOM["tsap_id"], BRIDE["tsap_id"]), headers=GH)
check("F3 insights answer for the owner", r.status_code == 200
      and r.json()["compatibility_score_calculated"] is False, r.status_code)
hidden = member("TSAP-F-2026-4304", is_approved=False, status="pending")
M.DB_USERS.append(dict(hidden))
check("F4 insights on an unapproved profile stay 404",
      client.get("/api/matches/%s/insights/%s" % (GROOM["tsap_id"], hidden["tsap_id"]),
                 headers=GH).status_code == 404)
check("F5 insights are private to the viewer",
      anon.get("/api/matches/%s/insights/%s" % (GROOM["tsap_id"], BRIDE["tsap_id"]),
               headers=OH).status_code == 401)

r = client.get("/api/interest/coach?from_id=%s&to_id=%s" % (GROOM["tsap_id"], BRIDE["tsap_id"]),
               headers=GH)
body = r.json()
check("F6 the coach answers before any credit is spent", r.status_code == 200
      and body["can_send"] is True, r.status_code)
check("F7 answering the coach costs nothing",
      M.DB_USERS[[u["tsap_id"] for u in M.DB_USERS].index(GROOM["tsap_id"])]["credits"] == 3)
check("F8 the coach refuses to advise on another member's request",
      anon.get("/api/interest/coach?from_id=%s&to_id=%s" % (GROOM["tsap_id"], BRIDE["tsap_id"]),
               headers=OH).status_code == 401)
check("F9 the coach needs both ids",
      client.get("/api/interest/coach?from_id=%s" % GROOM["tsap_id"], headers=GH).status_code == 400)

send = client.post("/api/interest/send", headers=GH,
                   json={"from_id": GROOM["tsap_id"], "to_id": BRIDE["tsap_id"],
                         "note": "Namaste"})
req_id = str((send.json() or {}).get("request_id") or "")
check("F10 a request can still be sent", send.status_code == 200 and bool(req_id),
      send.status_code)
r = client.get("/api/interest/%s/timeline" % req_id, headers=GH)
check("F11 the sender reads their own timeline", r.status_code == 200
      and r.json()["total_steps"] == 4, r.status_code)
check("F12 the receiving owner may also read it",
      anon.get("/api/interest/%s/timeline" % req_id, headers=BH).status_code == 200)
check("F13 a stranger cannot read someone else's timeline",
      anon.get("/api/interest/%s/timeline" % req_id, headers=OH).status_code == 401)
check("F14 an unknown request id is a clean 404",
      client.get("/api/interest/NOPE-1/timeline", headers=GH).status_code == 404)

r = client.get("/api/me/%s/activity" % GROOM["tsap_id"], headers=GH)
check("F15 activity answers for the owner", r.status_code == 200
      and r.json()["sent"]["total"] >= 1, r.status_code)
check("F16 a brand-new account is flagged as a small sample",
      r.json()["small_sample"] is True)
check("F17 activity is private",
      anon.get("/api/me/%s/activity" % GROOM["tsap_id"], headers=OH).status_code == 401)

payload = honest(json.dumps(r.json()).lower() + json.dumps(body).lower()
                 + json.dumps(tl).lower() + json.dumps(coach).lower()
                 + json.dumps(MI.verification_progress(dict(BRIDE))).lower())
check("F18 no payload anywhere promises a score, a reply or trust",
      not any(phrase in payload for phrase in BANNED_PHRASES),
      [phrase for phrase in BANNED_PHRASES if phrase in payload])

print("\n" + "=" * 72)
print("🌊 WAVE 43 — MEMBER INTELLIGENCE: %d passed, %d failed" % (len(PASS), len(FAIL)))
if FAIL:
    print("FAILED:")
    for name in FAIL:
        print("   ❌ " + name)
    sys.exit(1)
print("🎉 ALL GREEN")
