"""
End-to-end Phase 2 verification suite covering:
  1. Transactional Identity & Credentials SQL Slice + Dual-Read Reconciliation
  2. Member Session Registry, HttpOnly Cookie Upgrade & Logout-Everywhere Revocation
  3. Multi-Seat Bureau Tenant Isolation (zero cross-tenant access, role guards, seat revocation)
  4. Private Shareable Elder Profile Review Links (PII stripping, photo_private, view cap, revoke)
  5. Saved-Search Opt-In Digest Alerts & Assisted Matchmaker Appointments
"""
from __future__ import annotations

import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("phase2-platform")
os.environ["APP_ENV"] = "test"
os.environ["TSAP_AUTH_MODE"] = "enforced"

from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402
from hardening import sign_token, ADMIN_KEY  # noqa: E402


def _seed_user(tsap_id: str, phone: str, gender: str = "Male", caste: str = "Reddy", district: str = "Hyderabad", photo_private: bool = False):
    u = {
        "tsap_id": tsap_id,
        "full_name": f"Member {tsap_id}",
        "phone": phone,
        "email": f"{tsap_id.lower()}@example.com",
        "password_hash": "pbkdf2$dummyhash",
        "gender": gender,
        "age": 27 if gender == "Male" else 25,
        "caste": caste,
        "district": district,
        "state": "TS",
        "education": "B.Tech",
        "job": "Software Engineer",
        "salary": "₹14 LPA",
        "status": "approved",
        "account_status": "active",
        "photo_url": f"/photos/{tsap_id}.jpg",
        "photo_status": "approved",
        "photo_private": photo_private,
        "credits": 3,
        "created_at": "2026-11-13T08:00:00+00:00",
    }
    main.DB_USERS[:] = [x for x in main.DB_USERS if x.get("tsap_id") != tsap_id]
    main.DB_USERS.append(u)
    main._persist_core_state()
    return u


def test_identity_sql_shadow_sync_and_reconciliation():
    client = TestClient(main.app)
    _seed_user("PH2M01", "9848099101", "Male")
    _seed_user("PH2F01", "9848099102", "Female")

    admin_hdr = {"X-Admin-Key": ADMIN_KEY}
    r = client.get("/api/admin/identity/reconcile", headers=admin_hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["parity_ok"] is True
    assert body["json_count"] == body["sql_count"]
    assert body["missing_in_sql_count"] == 0
    assert body["checksum_mismatch_count"] == 0


def test_member_sessions_cookie_upgrade_and_revoke_everywhere():
    client = TestClient(main.app)
    _seed_user("PH2SES1", "9848099201", "Male")
    tok = sign_token("PH2SES1")
    hdr = {"X-Tsap-Token": tok}

    # Register two device sessions, upgrading browser cookie on the first
    r1 = client.post(
        "/api/me/PH2SES1/sessions/register",
        headers=hdr,
        json={"device_label": "Chrome Desktop", "enable_cookie": True},
    )
    assert r1.status_code == 200, r1.text
    assert main.MEMBER_SESSION_COOKIE in r1.cookies
    assert main.MEMBER_CSRF_COOKIE in r1.cookies
    sid1 = r1.json()["session"]["session_id"]

    r2 = client.post(
        "/api/me/PH2SES1/sessions/register",
        headers=hdr,
        json={"device_label": "Android Phone", "enable_cookie": False},
    )
    assert r2.status_code == 200
    sid2 = r2.json()["session"]["session_id"]

    listed = client.get("/api/me/PH2SES1/sessions", headers=hdr).json()
    active_ids = {s["session_id"] for s in listed["sessions"] if s["status"] == "active"}
    assert {sid1, sid2}.issubset(active_ids)

    # Revoke single device session
    rev = client.post(f"/api/me/PH2SES1/sessions/{sid2}/revoke", headers=hdr)
    assert rev.status_code == 200

    # Revoke everywhere -> bumps token_version and invalidates old token immediately
    rev_all = client.post("/api/me/PH2SES1/sessions/revoke-all", headers=hdr)
    assert rev_all.status_code == 200
    assert rev_all.json()["new_token_version"] >= 1

    # Old token must now fail verification on protected endpoints
    stale = client.get("/api/me/PH2SES1/sessions", headers=hdr)
    assert stale.status_code in (401, 403)


def test_bureau_multi_seat_tenant_isolation():
    client = TestClient(main.app)
    _seed_user("PH2CL1", "9848099301", "Female")

    t1 = client.post(
        "/api/bureaus/create",
        json={"business_name": "Kukatpally Vivaha Kendram", "owner_name": "Rao", "district": "Hyderabad", "contact_phone": "9848011223"},
    )
    assert t1.status_code == 200, t1.text
    b1_id = t1.json()["bureau_id"]
    b1_key = t1.json()["owner_key"]

    t2 = client.post(
        "/api/bureaus/create",
        json={"business_name": "Vijayawada Sambandhalu", "owner_name": "Murthy", "district": "NTR", "contact_phone": "9848044556"},
    )
    assert t2.status_code == 200
    b2_id = t2.json()["bureau_id"]

    # Cross-tenant key MUST fail closed
    cross = client.get(f"/api/bureaus/{b2_id}/workspace", headers={"X-Bureau-Key": b1_key})
    assert cross.status_code == 403

    # Owner creates coordinator and viewer seats
    coord = client.post(
        f"/api/bureaus/{b1_id}/seats",
        headers={"X-Bureau-Key": b1_key},
        json={"name": "Padma Coordinator", "role": "coordinator"},
    ).json()["seat"]
    viewer = client.post(
        f"/api/bureaus/{b1_id}/seats",
        headers={"X-Bureau-Key": b1_key},
        json={"name": "Kiran Viewer", "role": "viewer"},
    ).json()["seat"]

    # Unconsented client addition is rejected
    no_consent = client.post(
        f"/api/bureaus/{b1_id}/clients",
        headers={"X-Bureau-Key": coord["seat_key"]},
        json={"client_tsap_id": "PH2CL1", "consent_confirmed": False},
    )
    assert no_consent.status_code == 400

    # Coordinator adds consented client; viewer cannot mutate
    ok_client = client.post(
        f"/api/bureaus/{b1_id}/clients",
        headers={"X-Bureau-Key": coord["seat_key"]},
        json={"client_tsap_id": "PH2CL1", "client_label": "Bride Family", "notes": "Prefers Hyderabad IT groom", "consent_confirmed": True},
    )
    assert ok_client.status_code == 200

    viewer_write = client.post(
        f"/api/bureaus/{b1_id}/clients",
        headers={"X-Bureau-Key": viewer["seat_key"]},
        json={"client_tsap_id": "PH2CL1", "consent_confirmed": True},
    )
    assert viewer_write.status_code == 403

    # Revoking coordinator seat immediately blocks further workspace reads
    rev = client.post(
        f"/api/bureaus/{b1_id}/seats/{coord['seat_id']}/revoke",
        headers={"X-Bureau-Key": b1_key},
    )
    assert rev.status_code == 200
    after_rev = client.get(f"/api/bureaus/{b1_id}/workspace", headers={"X-Bureau-Key": coord["seat_key"]})
    assert after_rev.status_code == 403


def test_elder_private_review_links_pii_redaction_and_revocation():
    client = TestClient(main.app)
    _seed_user("PH2ELD1", "9848099401", "Female", photo_private=True)
    hdr = {"X-Tsap-Token": sign_token("PH2ELD1")}

    created = client.post(
        "/api/me/PH2ELD1/review-links",
        headers=hdr,
        json={"label": "Peddamma Review", "ttl_hours": 48, "max_views": 3},
    )
    assert created.status_code == 200, created.text
    rl = created.json()["review_link"]
    token = rl["token"]
    link_id = rl["link_id"]

    # Public resolution strips phone, email, password_hash, and suppresses private photo
    pub = client.get(f"/api/review-links/{token}")
    assert pub.status_code == 200, pub.text
    prof = pub.json()["profile"]
    assert "phone" not in prof
    assert "email" not in prof
    assert "password_hash" not in prof
    assert prof["photo_url"] is None
    assert prof["photo_private"] is True

    # Elder leaves a note
    fb = client.post(
        f"/api/review-links/{token}/feedback",
        json={"reviewer_name": "Lakshmi Peddamma", "relation": "Aunt", "note": "Good education details, proceed."},
    )
    assert fb.status_code == 200

    owner_links = client.get("/api/me/PH2ELD1/review-links", headers=hdr).json()["links"]
    assert len(owner_links[0]["feedback"]) == 1

    # Owner revokes link -> public view immediately 404s
    rev = client.post(f"/api/me/PH2ELD1/review-links/{link_id}/revoke", headers=hdr)
    assert rev.status_code == 200
    gone = client.get(f"/api/review-links/{token}")
    assert gone.status_code == 404


def test_saved_search_opt_in_alerts_and_assisted_appointments():
    client = TestClient(main.app)
    _seed_user("PH2ALT1", "9848099501", "Male", caste="Kamma", district="Guntur")
    _seed_user("PH2ALT2", "9848099502", "Female", caste="Kamma", district="Guntur")
    hdr = {"X-Tsap-Token": sign_token("PH2ALT1")}

    # Default alert preference is strictly opt-in False
    p0 = client.get("/api/me/PH2ALT1/alert-preferences", headers=hdr).json()["preferences"]
    assert p0["enabled"] is False
    assert p0["frequency"] == "off"

    # Explicit opt-in with quiet hours
    p1 = client.post(
        "/api/me/PH2ALT1/alert-preferences",
        headers=hdr,
        json={"enabled": True, "frequency": "weekly", "quiet_hours_start": "21:00", "quiet_hours_end": "08:00"},
    ).json()["preferences"]
    assert p1["enabled"] is True
    assert p1["frequency"] == "weekly"

    # Seed one saved search and verify factual digest
    main.QUALITY.SAVED_SEARCHES.append(
        {"search_id": "SS-PH2", "tsap_id": "PH2ALT1", "name": "Guntur Brides", "filters": {"caste": "Kamma", "district": "Guntur"}}
    )
    dig = client.get("/api/me/PH2ALT1/saved-search-digest", headers=hdr).json()
    assert dig["saved_search_count"] >= 1
    assert any(d["match_count"] >= 1 for d in dig["digests"])

    # Book assisted matchmaker appointment & confirm via admin
    booked = client.post(
        "/api/appointments/book",
        headers=hdr,
        json={"tsap_id": "PH2ALT1", "preferred_date": "2026-11-20", "preferred_slot": "evening_17_19", "language": "te", "topic": "shortlist_review"},
    )
    assert booked.status_code == 200
    apt_id = booked.json()["appointment"]["appointment_id"]

    upd = client.post(
        f"/api/admin/appointments/{apt_id}/status",
        headers={"X-Admin-Key": ADMIN_KEY},
        json={"status": "confirmed", "staff_note": "Confirmed 5 PM Telugu coordinator call."},
    )
    assert upd.status_code == 200
    assert upd.json()["appointment"]["status"] == "confirmed"
