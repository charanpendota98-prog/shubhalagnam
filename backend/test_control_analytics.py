"""Control-dashboard analytics: queue aging, funnel, engagement and trend.

The advanced dashboard drives daily operations from /api/control/analytics, so
these numbers have to be right and they have to stay aggregate. Covering:

  • queue aging buckets classify pending profiles by how long they waited and
    the buckets add up to the pending profiles that carry a timestamp;
  • the funnel is a subset chain (a later step can never exceed an earlier one)
    and "sent first interest" only counts approved members;
  • engagement counts request statuses, saved searches with recorded consent,
    and shortlist entries;
  • the signup trend compares the last 7 days with the 7 before them;
  • the payload is aggregate only — no member identifiers or phone numbers;
  • RBAC still hides finance totals and the audit log from a worker session.

Run with ``python test_control_analytics.py`` (no pytest needed).
"""
from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta
from unittest.mock import patch

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("ENV", "test")
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ.setdefault("TSAP_AUTH_SECRET", "control-analytics-test-secret")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("control-analytics")

import main  # noqa: E402
import quality  # noqa: E402

NOW = datetime.utcnow()


def iso(hours_ago: float) -> str:
    return (NOW - timedelta(hours=hours_ago)).isoformat()


def member(tsap_id: str, status: str = "pending", hours_ago: float = 1.0, **overrides) -> dict:
    row = {
        "tsap_id": tsap_id,
        "full_name": f"Member {tsap_id}",
        "phone": f"90000{tsap_id[-5:]}",
        "gender": "Bride",
        "status": status,
        "photo_status": "none",
        "caste": "Reddy",
        "district": "Hyderabad",
        "state": "TS",
        "created_at": iso(hours_ago),
    }
    row.update(overrides)
    return row


# Pending for: 2h, 30h, 100h, 200h — one in each aging bucket.
main.DB_USERS.extend([
    member("MVANAL001", "pending", 2),
    member("MVANAL002", "pending", 30),
    member("MVANAL003", "pending", 100),
    member("MVANAL004", "pending", 200),
    # Approved with a photo, registered 3 days ago (inside the last 7 days).
    member("MVANAL005", "approved", 72, is_approved=True, photo_status="approved"),
    # Approved without a photo, registered 10 days ago (previous-7d window).
    member("MVANAL006", "approved", 240, is_approved=True),
])
main.DB_INTERESTS.extend([
    {"request_id": "REQ1", "from_id": "MVANAL005", "to_id": "MVANAL006", "status": "accepted", "created_at": iso(5)},
    {"request_id": "REQ2", "from_id": "MVANAL006", "to_id": "MVANAL005", "status": "pending", "created_at": iso(6)},
    {"request_id": "REQ3", "from_id": "MVANAL005", "to_id": "MVANAL001", "status": "declined", "created_at": iso(7)},
])
main.DB_SAVES.extend([
    {"tsap_id": "MVANAL005", "saved_id": "MVANAL006", "at": iso(4)},
])
quality.SAVED_SEARCHES.extend([
    {"tsap_id": "MVANAL005", "search_id": "S1", "name": "Doctors", "alert": True, "alert_consent_at": iso(3), "filters": {}},
    {"tsap_id": "MVANAL006", "search_id": "S2", "name": "Engineers", "alert": True, "filters": {}},
    {"tsap_id": "MVANAL005", "search_id": "S3", "name": "Quiet", "alert": False, "filters": {}},
])


def analytics(role: str = "owner") -> dict:
    with patch.object(main.CONTROL_AUTH, "require", return_value={"role": role}):
        return main.control_analytics(request=None)


def bucket(body: dict, label: str) -> int:
    return next(row["count"] for row in body["queue_aging"]["buckets"] if row["label"] == label)


def test_queue_aging_classifies_pending_profiles():
    body = analytics()
    assert bucket(body, "under_24h") == 1, body["queue_aging"]
    assert bucket(body, "1_3_days") == 1, body["queue_aging"]
    assert bucket(body, "3_7_days") == 1, body["queue_aging"]
    assert bucket(body, "over_7_days") == 1, body["queue_aging"]


def test_queue_aging_buckets_add_up():
    body = analytics()
    aging = body["queue_aging"]
    assert sum(row["count"] for row in aging["buckets"]) == aging["pending_with_date"] == 4, aging
    assert aging["pending_with_date"] <= body["totals"]["pending"]
    assert aging["oldest_pending_hours"] >= 199, aging


def test_funnel_is_a_subset_chain():
    funnel = {row["step"]: row["count"] for row in analytics()["funnel"]}
    assert funnel["registered"] == 6, funnel
    assert funnel["photo_added"] == 1, funnel
    assert funnel["approved"] == 2, funnel
    assert funnel["photo_added"] <= funnel["registered"], funnel
    assert funnel["approved"] <= funnel["registered"], funnel
    assert funnel["sent_first_interest"] <= funnel["approved"], funnel


def test_funnel_counts_only_approved_interest_senders():
    funnel = {row["step"]: row["count"] for row in analytics()["funnel"]}
    # MVANAL005 and MVANAL006 both sent one, and both are approved.
    assert funnel["sent_first_interest"] == 2, funnel


def test_engagement_counts_request_statuses():
    engagement = analytics()["engagement"]
    statuses = {row["label"]: row["count"] for row in engagement["interest_status"]}
    assert engagement["interests_total"] == 3, engagement
    assert statuses == {"accepted": 1, "pending": 1, "declined": 1}, statuses
    assert engagement["shortlist_entries"] == 1, engagement


def test_engagement_counts_only_alerts_with_recorded_consent():
    engagement = analytics()["engagement"]
    assert engagement["saved_searches"] == 3, engagement
    assert engagement["saved_search_alerts_on"] == 1, engagement


def test_trend_compares_the_last_seven_days_with_the_previous_seven():
    trend = analytics()["trend"]
    # Registered 2h, 30h, 72h and 100h ago fall inside the last 7 days; the
    # 200h and 240h registrations fall in the 7 days before that.
    assert trend["last_7d"] == 4, trend
    assert trend["previous_7d"] == 2, trend
    assert trend["delta"] == trend["last_7d"] - trend["previous_7d"], trend


def test_payload_stays_aggregate():
    body = analytics()
    text = str(body)
    for identifier in ("MVANAL001", "MVANAL005", "90000", "REQ1"):
        assert identifier not in text, f"member-level data leaked into analytics: {identifier}"
    assert set(body["totals"]) >= {"profiles", "pending", "approved", "open_reports"}


def test_worker_session_does_not_receive_finance_or_audit():
    worker = analytics("worker")
    assert "revenue" not in worker, "workers must not see finance totals"
    assert "audit" not in worker, "workers must not see the audit log"
    assert "queue_aging" in worker, "operational counts stay available to workers"
    owner = analytics("owner")
    assert "revenue" in owner and "audit" in owner


def run_tests() -> int:
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
    raise SystemExit(run_tests())
