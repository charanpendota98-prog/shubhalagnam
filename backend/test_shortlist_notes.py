"""Shortlist private notes: ownership, sanitization, capping and persistence.

Covers the WAVE 41 shortlist work:
  • a note can only be written and read by the member who owns the shortlist;
  • the note text goes through the same `clean()` sanitizer used for profile text
    and is capped, so it can never carry markup or become a storage field;
  • shortlist changes are persisted, not just held in memory.

Run with ``python test_shortlist_notes.py`` (no pytest needed).
"""
from __future__ import annotations

import os
import sys

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("ENV", "test")
os.environ["TSAP_AUTH_MODE"] = "enforce"
os.environ.setdefault("TSAP_AUTH_SECRET", "shortlist-notes-test-secret-not-for-production")
os.environ.setdefault("OTP_DEV_MODE", "true")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("shortlist-notes")

from fastapi.testclient import TestClient  # noqa: E402

import hardening  # noqa: E402
import main  # noqa: E402

client = TestClient(main.app, raise_server_exceptions=False)


def make_member(tsap_id: str, gender: str = "Bride") -> dict:
    return {
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
        "photo_status": "approved",
        "photo_url": "",
        "created_at": "2026-01-01T00:00:00",
    }


VIEWER = "MVSNOTE001"
TARGET = "MVSNOTE002"
STRANGER = "MVSNOTE003"

main.DB_USERS.extend([make_member(VIEWER), make_member(TARGET, "Groom"), make_member(STRANGER, "Groom")])


def headers(tsap_id: str) -> dict[str, str]:
    token = hardening.sign_token(tsap_id)
    return {"Authorization": f"Bearer {token}", "X-TSAP-Token": token}


def shortlist(owner: str, target: str) -> None:
    """Ensure the pair is shortlisted. /api/save toggles, so only post when absent."""
    already = any(
        row.get("tsap_id") == owner and row.get("saved_id") == target for row in main.DB_SAVES
    )
    if already:
        return
    response = client.post("/api/save", json={"tsap_id": owner, "saved_id": target}, headers=headers(owner))
    assert response.status_code == 200, response.text[:200]


def saved_rows(owner: str) -> list[dict]:
    response = client.get(f"/api/saved/{owner}", headers=headers(owner))
    assert response.status_code == 200, response.text[:200]
    return response.json()["saved"]


def test_owner_can_save_and_read_a_private_note():
    shortlist(VIEWER, TARGET)
    response = client.post(
        f"/api/saved/{VIEWER}/{TARGET}/note",
        json={"note": "Spoke to family on Sunday — call back after 6pm."},
        headers=headers(VIEWER),
    )
    assert response.status_code == 200, response.text[:200]
    assert response.json()["note"].startswith("Spoke to family")

    rows = saved_rows(VIEWER)
    row = next(entry for entry in rows if entry["profile"]["tsap_id"] == TARGET)
    assert row["note"] == "Spoke to family on Sunday — call back after 6pm."
    assert row["note_at"]


def test_another_member_cannot_write_the_note():
    shortlist(VIEWER, TARGET)
    response = client.post(
        f"/api/saved/{VIEWER}/{TARGET}/note",
        json={"note": "I should not be able to write this."},
        headers=headers(STRANGER),
    )
    assert response.status_code in (401, 403)
    rows = saved_rows(VIEWER)
    row = next(entry for entry in rows if entry["profile"]["tsap_id"] == TARGET)
    assert row["note"] == ""


def test_a_note_cannot_be_written_without_a_token():
    shortlist(VIEWER, TARGET)
    response = client.post(
        f"/api/saved/{VIEWER}/{TARGET}/note",
        json={"note": "anonymous write"},
    )
    assert response.status_code in (401, 403)


def test_a_note_requires_an_existing_shortlist_entry():
    response = client.post(
        f"/api/saved/{VIEWER}/{STRANGER}/note",
        json={"note": "not shortlisted"},
        headers=headers(VIEWER),
    )
    assert response.status_code == 404


def test_note_markup_is_stripped():
    shortlist(VIEWER, TARGET)
    response = client.post(
        f"/api/saved/{VIEWER}/{TARGET}/note",
        json={"note": "Call <script>alert(1)</script> back"},
        headers=headers(VIEWER),
    )
    assert response.status_code == 200
    note = response.json()["note"]
    assert "<script>" not in note
    assert "alert" in note  # the text survives; only the markup is removed


def test_note_is_capped():
    shortlist(VIEWER, TARGET)
    response = client.post(
        f"/api/saved/{VIEWER}/{TARGET}/note",
        json={"note": "x" * 5000},
        headers=headers(VIEWER),
    )
    assert response.status_code == 200
    assert len(response.json()["note"]) <= main.SHORTLIST_NOTE_MAX


def test_an_empty_note_clears_the_previous_text():
    shortlist(VIEWER, TARGET)
    client.post(f"/api/saved/{VIEWER}/{TARGET}/note", json={"note": "temporary"}, headers=headers(VIEWER))
    response = client.post(f"/api/saved/{VIEWER}/{TARGET}/note", json={"note": ""}, headers=headers(VIEWER))
    assert response.status_code == 200
    assert response.json()["note"] == ""
    rows = saved_rows(VIEWER)
    row = next(entry for entry in rows if entry["profile"]["tsap_id"] == TARGET)
    assert row["note"] == ""


def test_shortlist_changes_are_persisted():
    shortlist(VIEWER, TARGET)
    client.post(f"/api/saved/{VIEWER}/{TARGET}/note", json={"note": "durable note"}, headers=headers(VIEWER))

    snapshot = main.DBSTORE.load()
    saved = snapshot.get("saves") or snapshot.get("db_saves") or []
    entry = next(
        (row for row in saved if row.get("tsap_id") == VIEWER and row.get("saved_id") == TARGET),
        None,
    )
    assert entry is not None, "the shortlist entry must be written to the store"
    assert entry.get("note") == "durable note"


def test_removing_from_the_shortlist_is_persisted_too():
    shortlist(VIEWER, TARGET)
    response = client.post("/api/save", json={"tsap_id": VIEWER, "saved_id": TARGET}, headers=headers(VIEWER))
    assert response.status_code == 200
    assert response.json()["saved"] is False

    snapshot = main.DBSTORE.load()
    saved = snapshot.get("saves") or snapshot.get("db_saves") or []
    assert not any(row.get("tsap_id") == VIEWER and row.get("saved_id") == TARGET for row in saved)


if __name__ == "__main__":
    tests = [(name, func) for name, func in sorted(globals().items())
             if name.startswith("test_") and callable(func)]
    failed = 0
    for name, test in tests:
        try:
            test()
            print(f"PASS {name}")
        except AssertionError as exc:
            failed += 1
            print(f"FAIL {name}: {exc}")
    print(f"RESULT: {len(tests) - failed} passed / {failed} failed")
    sys.exit(1 if failed else 0)
