"""Compare studio: explainable preference checks and field comparisons.

The compare page must help a member read differences, never rank people with an
invented score. These tests pin that down:

  • /api/matches/compare-profiles returns per-profile preference checks and
    field-by-field comparisons for the signed-in member only;
  • every check carries a factual note and a met/not_met status — never a
    percentage, score or verdict;
  • a member with no saved expectations simply gets no checks (no invented
    preferences), and a member comparing their own profile gets none either;
  • unauthenticated and blocked pairs are still refused.

Run with ``python test_compare_preferences.py`` (no pytest needed).
"""
from __future__ import annotations

import os
import sys

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("ENV", "test")
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ.setdefault("TSAP_AUTH_SECRET", "compare-prefs-test-secret-not-for-production")
os.environ.setdefault("OTP_DEV_MODE", "true")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("compare-prefs")

from fastapi.testclient import TestClient  # noqa: E402

import hardening  # noqa: E402
import main  # noqa: E402
import safety  # noqa: E402

client = TestClient(main.app, raise_server_exceptions=False)

BANNED = ("compatibility score", "compatibility:", "soulmate", "guaranteed", "perfect match")


def make_member(tsap_id: str, gender: str = "Bride", **overrides) -> dict:
    member = {
        "tsap_id": tsap_id,
        "full_name": f"Member {tsap_id}",
        "gender": gender,
        "phone": f"9{tsap_id[-9:]}",
        "dob": "1996-05-10",
        "age": 29,
        "height": "5'5\"",
        "marital_status": "Pelli Kaledu",
        "religion": "Hindu",
        "caste": "Reddy",
        "state": "TS",
        "district": "Hyderabad",
        "education": "B.Tech",
        "job": "Software",
        "status": "active",
        "approved": True,
        "is_approved": True,
        "photo_status": "approved",
        "photo_url": "",
        "created_at": "2026-01-01T00:00:00",
    }
    member.update(overrides)
    return member


VIEWER = "MVCMPPF001"
MATCHING = "MVCMPPF002"
DIFFERENT = "MVCMPPF003"
NO_PREFS = "MVCMPPF004"
BLOCKED = "MVCMPPF005"

main.DB_USERS.extend([
    make_member(VIEWER, "Bride", exp_filters={"ageMin": 28, "ageMax": 35, "caste": "Reddy", "job": "Software"}),
    make_member(MATCHING, "Groom", age=30, caste="Reddy", job="Software", district="Hyderabad"),
    make_member(DIFFERENT, "Groom", age=45, caste="Kamma", job="Teacher", district="Warangal"),
    make_member(NO_PREFS, "Groom"),
    make_member(BLOCKED, "Groom", age=30, caste="Reddy", job="Software"),
])
main.DB_BLOCKS.append({"owner": VIEWER, "blocked": BLOCKED, "at": "2026-01-01T00:00:00"})


def headers(tsap_id: str) -> dict[str, str]:
    token = hardening.sign_token(tsap_id)
    return {"Authorization": f"Bearer {token}", "X-TSAP-Token": token}


def compare(tsap_id: str | None, profile_ids: list[str]):
    return client.post(
        "/api/matches/compare-profiles",
        json={"profile_ids": profile_ids},
        headers=headers(tsap_id) if tsap_id else {},
    )


def assert_no_scores(payload: object, path: str = "body") -> None:
    text = str(payload).lower()
    for banned in BANNED:
        assert banned not in text, f"{banned!r} language found in {path}"


# --------------------------------------------------------------------------- #
# happy path
# --------------------------------------------------------------------------- #

def test_returns_preference_checks_for_each_profile():
    response = compare(VIEWER, [MATCHING, DIFFERENT])
    assert response.status_code == 200, response.text[:300]
    body = response.json()
    assert body["count"] == 2
    assert_no_scores(body)

    comparisons = body["comparisons"]
    assert set(comparisons) == {MATCHING, DIFFERENT}
    for pid, block in comparisons.items():
        assert block["preference_checks"], f"expected preference checks for {pid}"
        assert block["field_checks"], f"expected field comparisons for {pid}"
        for check in block["preference_checks"]:
            assert check["status"] in {"met", "not_met"}, check
            assert check["note"], "every check must explain itself"


def test_checks_reflect_the_members_saved_expectations():
    body = compare(VIEWER, [MATCHING, DIFFERENT]).json()
    matching = {row["key"]: row for row in body["comparisons"][MATCHING]["preference_checks"]}
    different = {row["key"]: row for row in body["comparisons"][DIFFERENT]["preference_checks"]}

    # Age 30 sits inside the saved 28-35 range; age 45 does not.
    assert matching["age"]["status"] == "met", matching["age"]
    assert different["age"]["status"] == "not_met", different["age"]
    # Community and profession were saved as Reddy / Software.
    assert matching["caste"]["status"] == "met"
    assert different["caste"]["status"] == "not_met"
    assert matching["job"]["status"] == "met"
    assert different["job"]["status"] == "not_met"
    assert body["has_saved_expectations"] is True


def test_field_checks_are_factual_same_or_different():
    body = compare(VIEWER, [MATCHING, DIFFERENT]).json()
    statuses = {row["status"] for row in body["comparisons"][MATCHING]["field_checks"]}
    assert statuses <= {"same", "different", "listed"}, statuses
    for row in body["comparisons"][MATCHING]["field_checks"]:
        assert row["key"] and row["label"] and row["note"]


# --------------------------------------------------------------------------- #
# no invented data
# --------------------------------------------------------------------------- #

def test_member_without_saved_expectations_gets_no_checks():
    body = compare(NO_PREFS, [MATCHING, DIFFERENT]).json()
    assert body["has_saved_expectations"] is False
    for block in body["comparisons"].values():
        assert block["preference_checks"] == [], "expectations must not be invented"
        # Field-by-field differences are still available: they are member facts.
        assert block["field_checks"]


def test_comparing_your_own_profile_yields_no_checks():
    body = compare(MATCHING, [MATCHING, DIFFERENT]).json()
    assert MATCHING not in body["comparisons"], "no self-comparison checks"
    assert body["comparisons"][DIFFERENT]["preference_checks"] == []


# --------------------------------------------------------------------------- #
# access control
# --------------------------------------------------------------------------- #

def test_sign_in_required():
    assert compare(None, [MATCHING, DIFFERENT]).status_code == 401


def test_blocked_pair_is_unavailable():
    assert compare(VIEWER, [MATCHING, BLOCKED]).status_code == 404


def test_duplicate_ids_rejected():
    assert compare(VIEWER, [MATCHING, MATCHING]).status_code == 400


def main() -> int:
    tests = [value for name, value in sorted(globals().items()) if name.startswith("test_")]
    failures = 0
    for test in tests:
        try:
            test()
            print(f"  ✓ {test.__name__}")
        except AssertionError as error:
            failures += 1
            print(f"  ✗ {test.__name__}: {error}")
        except Exception as error:  # noqa: BLE001
            failures += 1
            print(f"  ✗ {test.__name__}: {type(error).__name__}: {error}")
    print(f"\n# tests {len(tests)}\n# pass {len(tests) - failures}\n# fail {failures}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
