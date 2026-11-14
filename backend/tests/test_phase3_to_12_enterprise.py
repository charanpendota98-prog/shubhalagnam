"""
End-to-end verification suite for Phases 3–12 Enterprise Platform Architecture:
  - Phase 3: Migration 002, Pillow media inspection/quarantine, wedding bundles (#15),
             verified community events (#23), white-label org portals (#17), k-anonymous insights (#18)
  - Phase 4: Transactional interests/blocks + live contact-grant re-verification & outbox dispatcher
  - Phase 5: Payment ledger sync & auditable refund/chargeback desk
  - Phase 6: Indexed SQL search v2 with keyset cursor pagination + ETag / 304 Not Modified
  - Phase 7: Legal holds blocking destructive purge (423 Locked) + non-destructive DR rehearsal drill
  - Phase 8: Default-closed feature flags, zero-PII coarse funnel counters & community ambassadors
  - Phase 9: PII-redacted advisory-only AI Assist triage + instant global kill switch
  - Phase 10: Bureau API v2 settings, SSRF-guarded HTTPS webhooks & tenant-scoped JSON export
  - Phase 11–12: Rolling SLO latency/availability tracker + transparent public /api/status
"""
from __future__ import annotations

import base64
import io
import os
import sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BACKEND = os.path.dirname(HERE)
if BACKEND not in sys.path:
    sys.path.insert(0, BACKEND)

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("phase3-to-12-enterprise")
os.environ["APP_ENV"] = "test"
os.environ["TSAP_AUTH_MODE"] = "enforced"

from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402
from hardening import sign_token, ADMIN_KEY  # noqa: E402


def _seed_user(
    tsap_id: str,
    phone: str,
    gender: str = "Male",
    caste: str = "Reddy",
    district: str = "Hyderabad",
    salary: str = "₹18 LPA",
):
    u = {
        "tsap_id": tsap_id,
        "full_name": f"Member {tsap_id}",
        "phone": phone,
        "email": f"{tsap_id.lower()}@example.com",
        "password_hash": "pbkdf2$dummyhash",
        "gender": gender,
        "age": 28 if gender == "Male" else 25,
        "caste": caste,
        "district": district,
        "state": "TS",
        "mother_tongue": "Telugu",
        "education": "B.Tech",
        "job": "Engineer",
        "salary": salary,
        "status": "approved",
        "is_approved": True,
        "account_status": "active",
        "photo_url": f"/photos/{tsap_id}.jpg",
        "photo_status": "approved",
        "photo_private": False,
        "credits": 5,
        "created_at": f"2026-11-13T09:00:{len(main.DB_USERS):02d}+00:00",
    }
    main.DB_USERS[:] = [x for x in main.DB_USERS if x.get("tsap_id") != tsap_id]
    main.DB_USERS.append(u)
    main._persist_core_state()
    return u


def _make_png_b64(w: int = 320, h: int = 320, color=(120, 30, 50)) -> str:
    buf = io.BytesIO()
    img = Image.new("RGB", (w, h), color=color)
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


def test_phase3_media_quarantine_bundles_events_orgs_and_k_anonymity():
    client = TestClient(main.app)
    admin_hdr = {"X-Admin-Key": ADMIN_KEY}

    # Seed 6 Hyderabad Reddy members (meets k=5) and 2 Warangal Kamma members (below k=5)
    for i in range(1, 7):
        _seed_user(f"P3HYD{i:02d}", f"98481101{i:02d}", "Male" if i % 2 else "Female", "Reddy", "Hyderabad")
    for j in range(1, 3):
        _seed_user(f"P3WGL{j:02d}", f"98481201{j:02d}", "Female", "Kamma", "Warangal")

    m_hdr = {"X-Tsap-Token": sign_token("P3HYD01")}

    # 1. Media quarantine: valid 320x320 passes, duplicate SHA-256 across accounts is quarantined, tiny 80x80 is flagged
    good_b64 = _make_png_b64(320, 320, (90, 20, 40))
    r_ok = client.post("/api/media/P3HYD01/inspect", json={"filename": "portrait.png", "content_base64": good_b64}, headers=m_hdr)
    assert r_ok.status_code == 200
    assert r_ok.json()["inspection"]["scan_status"] == "clean"

    m2_hdr = {"X-Tsap-Token": sign_token("P3HYD02")}
    r_dup = client.post("/api/media/P3HYD02/inspect", json={"filename": "dup.png", "content_base64": good_b64}, headers=m2_hdr)
    assert r_dup.status_code == 200
    assert r_dup.json()["inspection"]["scan_status"] == "quarantined"
    assert "cross_account_duplicate_hash" in r_dup.json()["inspection"]["scan_reason"]

    tiny_b64 = _make_png_b64(80, 80)
    r_tiny = client.post("/api/media/P3HYD01/inspect", json={"filename": "tiny.png", "content_base64": tiny_b64}, headers=m_hdr)
    assert r_tiny.json()["inspection"]["scan_status"] == "flagged"

    rq = client.get("/api/admin/media/quarantine?status=quarantined", headers=admin_hdr)
    assert rq.status_code == 200
    assert rq.json()["count"] >= 1

    # 2. Wedding Vendor Bundles (#15)
    rb = client.get("/api/bundles")
    assert rb.status_code == 200
    assert len(rb.json()["bundles"]) >= 3

    rb_fail = client.post(
        "/api/bundles/enquire",
        json={"tsap_id": "P3HYD01", "bundle_id": "BND-PELLI-ESSENTIALS", "city": "Hyderabad", "event_date": "2027-03-10", "consent_confirmed": False},
        headers=m_hdr,
    )
    assert rb_fail.status_code == 400

    rb_ok = client.post(
        "/api/bundles/enquire",
        json={"tsap_id": "P3HYD01", "bundle_id": "BND-PELLI-ESSENTIALS", "city": "Hyderabad", "event_date": "2027-03-10", "guest_count": 300, "consent_confirmed": True},
        headers=m_hdr,
    )
    assert rb_ok.status_code == 200
    assert rb_ok.json()["enquiry"]["bundle_id"] == "BND-PELLI-ESSENTIALS"

    # 3. Verified Community Events (#23)
    rev = client.post(
        "/api/admin/events",
        json={"title_en": "Hyderabad Family Parichaya Vedika", "city": "Hyderabad", "event_date": "2027-01-25", "organizer": "Telangana Seva Samithi"},
        headers=admin_hdr,
    )
    assert rev.status_code == 200
    ev_id = rev.json()["event"]["event_id"]

    rsvp = client.post(f"/api/events/{ev_id}/rsvp", json={"tsap_id": "P3HYD01", "attendee_count": 2, "consent_confirmed": True}, headers=m_hdr)
    assert rsvp.status_code == 200
    assert rsvp.json()["event"]["rsvp_count"] == 1

    # 4. White-Label Community Org Portals (#17) — zero PII leakage
    rorg = client.post(
        "/api/admin/orgs",
        json={"slug": "hyd-reddy-vedika", "org_name_en": "Hyderabad Reddy Welfare Vedika", "community_filter": "Reddy", "district_focus": "Hyderabad"},
        headers=admin_hdr,
    )
    assert rorg.status_code == 200

    rpub = client.get("/api/orgs/hyd-reddy-vedika")
    assert rpub.status_code == 200
    portal = rpub.json()["portal"]
    assert portal["approved_profile_count"] >= 6
    for prof in portal["sample_profiles"]:
        assert "phone" not in prof
        assert "email" not in prof

    # 5. k-Anonymous Aggregate Demand Insights (#18) — Warangal (n=2 < 5) MUST be suppressed
    rins = client.get("/api/insights/demand")
    assert rins.status_code == 200
    ins = rins.json()
    assert ins["k_anonymity_floor"] == 5
    districts = {d["district"]: d["approved_profiles"] for d in ins["districts"]}
    assert districts.get("Hyderabad", 0) >= 6
    assert "Warangal" not in districts
    assert ins["suppressed_small_cohorts"]["districts"] >= 1


def test_phase4_to_6_live_contact_grant_outbox_refunds_and_indexed_search_v2():
    client = TestClient(main.app)
    admin_hdr = {"X-Admin-Key": ADMIN_KEY}
    _seed_user("P4M01", "9848210101", "Male", "Kamma", "Guntur", salary="₹24 LPA")
    _seed_user("P4F01", "9848210102", "Female", "Kamma", "Guntur", salary="₹16 LPA")

    m_hdr = {"X-Tsap-Token": sign_token("P4M01")}

    # Phase 4: Before accepted interest, contact authorization is denied
    r_pre = client.get("/api/contact/authorize-check?viewer_id=P4M01&owner_id=P4F01", headers=m_hdr)
    assert r_pre.status_code == 200
    assert r_pre.json()["authorized"] is False

    # Record accepted interest -> live SQL authorization becomes True
    main.DB_INTERESTS.append({"id": "INT-P4-1", "from_id": "P4M01", "to_id": "P4F01", "status": "accepted"})
    main._persist_core_state()
    r_acc = client.get("/api/contact/authorize-check?viewer_id=P4M01&owner_id=P4F01", headers=m_hdr)
    assert r_acc.json()["authorized"] is True

    # Subsequent block immediately revokes live contact authorization!
    if isinstance(main.DB_BLOCKS, dict):
        main.DB_BLOCKS.setdefault("P4F01", set()).add("P4M01")
    else:
        main.DB_BLOCKS.append({"blocker": "P4F01", "blocked": "P4M01"})
    main._persist_core_state()
    r_blk = client.get("/api/contact/authorize-check?viewer_id=P4M01&owner_id=P4F01", headers=m_hdr)
    assert r_blk.json()["authorized"] is False
    assert "block" in r_blk.json()["reason"]

    # Outbox enqueue + bounded dispatch
    client.post("/api/admin/outbox/enqueue", json={"topic": "interest_accepted", "recipient_id": "P4M01", "payload": {"ref": "INT-P4-1"}}, headers=admin_hdr)
    r_disp = client.post("/api/admin/outbox/dispatch", headers=admin_hdr)
    assert r_disp.status_code == 200
    assert r_disp.json()["dispatched"] >= 1

    # Phase 5: Refund request & staff resolution
    rf_open = client.post(
        "/api/refunds/request",
        json={"tsap_id": "P4M01", "order_id": "ORD-991", "amount_inr": 199, "kind": "refund", "reason": "Accidental duplicate UPI payment"},
        headers=m_hdr,
    )
    assert rf_open.status_code == 200
    rf_id = rf_open.json()["refund"]["refund_id"]

    rf_res = client.post(
        f"/api/admin/refunds/{rf_id}/resolve",
        json={"status": "approved", "staff_note": "Verified duplicate UPI reference"},
        headers=admin_hdr,
    )
    assert rf_res.status_code == 200
    assert rf_res.json()["refund"]["status"] == "approved"

    # Phase 6: Indexed Search v2 with keyset cursor + ETag 304 Not Modified + block exclusion
    s1 = client.get("/api/v2/search?limit=3", headers=m_hdr)
    assert s1.status_code == 200
    etag = s1.headers.get("etag")
    assert etag
    # Blocked profile P4F01 must NOT appear when P4M01 searches
    returned_ids = {item["tsap_id"] for item in s1.json()["results"]}
    assert "P4F01" not in returned_ids

    # Conditional GET with If-None-Match returns 304 Not Modified
    s304 = client.get("/api/v2/search?limit=3", headers={**m_hdr, "If-None-Match": etag})
    assert s304.status_code == 304

    # Cursor pagination moves cleanly to next slice
    next_cursor = s1.json()["next_cursor"]
    if next_cursor:
        s2 = client.get(f"/api/v2/search?limit=3&cursor={next_cursor}", headers=m_hdr)
        assert s2.status_code == 200
        assert set(x["tsap_id"] for x in s2.json()["results"]).isdisjoint(returned_ids)


def test_phase7_to_12_legal_hold_dr_flags_ai_killswitch_bureau_v2_and_status():
    client = TestClient(main.app)
    admin_hdr = {"X-Admin-Key": ADMIN_KEY}
    _seed_user("P7HOLD01", "9848310101", "Male", "Velama", "Karimnagar")
    hold_member_hdr = {"X-Tsap-Token": sign_token("P7HOLD01")}

    # Phase 7: Place legal hold -> member delete attempt returns 423 Locked
    rh = client.post(
        "/api/admin/legal-holds",
        json={"tsap_id": "P7HOLD01", "reason": "Active chargeback & impersonation investigation"},
        headers=admin_hdr,
    )
    assert rh.status_code == 200
    hold_id = rh.json()["hold"]["hold_id"]

    r_del_blocked = client.post("/api/profile/P7HOLD01/delete", json={"reason": "other"}, headers=hold_member_hdr)
    assert r_del_blocked.status_code == 423

    # Release legal hold -> deletion succeeds
    r_rel = client.post(f"/api/admin/legal-holds/{hold_id}/release", headers=admin_hdr)
    assert r_rel.status_code == 200
    r_del_ok = client.post("/api/profile/P7HOLD01/delete", json={"reason": "married_elsewhere"}, headers=hold_member_hdr)
    assert r_del_ok.status_code == 200

    # Phase 7/11: Automated non-destructive DR rehearsal drill
    rdr = client.post("/api/admin/dr/drill", headers=admin_hdr)
    assert rdr.status_code == 200
    assert rdr.json()["drill"]["sql_parity_ok"] is True
    assert len(rdr.json()["drill"]["snapshot_sha256"]) == 64

    # Phase 8: Default-closed flag assertion, flag update, zero-PII coarse funnel & ambassador application
    assert client.get("/api/flags").json()["flags"]["auto_moderation_enforcement"] is False
    rf = client.post("/api/admin/flags", json={"flag": "community_events_v3", "enabled": True, "owner": "community-team"}, headers=admin_hdr)
    assert rf.status_code == 200
    assert client.get("/api/flags").json()["flags"]["community_events_v3"] is True

    client.post("/api/analytics/coarse-event", json={"event": "home_search_submitted", "consent": True})
    client.post("/api/analytics/coarse-event", json={"event": "evil_custom_pii", "consent": True})
    funnel = client.get("/api/admin/analytics/funnel", headers=admin_hdr).json()
    assert funnel["totals"]["home_search_submitted"] >= 1
    assert "evil_custom_pii" not in funnel["totals"]

    _seed_user("P8AMB01", "9848310199", "Female", "Kapu", "Rajahmundry")
    r_amb = client.post(
        "/api/ambassadors/apply",
        json={"tsap_id": "P8AMB01", "district": "East Godavari", "statement": "Helping local families verify profiles transparently."},
        headers={"X-Tsap-Token": sign_token("P8AMB01")},
    )
    assert r_amb.status_code == 200

    # Phase 9: AI Assist Triage — redacts PII, enforces human_only authority, and respects instant kill-switch
    client.post("/api/admin/ai-assist/kill-switch", json={"enabled": True, "reason": "Enable for test"}, headers=admin_hdr)
    r_ai_on = client.post(
        "/api/admin/ai-assist/triage",
        json={"kind": "moderation", "text": "Urgent advance money scam! Contact 9848012345 or scammer@evil.com", "distinct_reporters": 2},
        headers=admin_hdr,
    )
    assert r_ai_on.status_code == 200
    tri = r_ai_on.json()["triage"]
    assert tri["authority"] == "human_only"
    assert tri["auto_action_taken"] is False
    assert tri["priority"] == "P1_URGENT_HUMAN_REVIEW"
    assert "9848012345" not in tri["redacted_summary"]
    assert "scammer@evil.com" not in tri["redacted_summary"]
    assert "[PHONE_REDACTED]" in tri["redacted_summary"]
    assert "[EMAIL_REDACTED]" in tri["redacted_summary"]

    # Instant kill-switch shutoff -> returns 503 immediately
    client.post("/api/admin/ai-assist/kill-switch", json={"enabled": False, "reason": "Shutoff"}, headers=admin_hdr)
    assert client.post("/api/admin/ai-assist/triage", json={"kind": "support", "text": "hello"}, headers=admin_hdr).status_code == 503

    # Phase 10: Bureau v2 SSRF protection + tenant-scoped JSON export
    b_res = client.post(
        "/api/bureaus/create",
        json={"business_name": "Godavari Vivaha Kendra", "owner_name": "Srinivas Rao", "district": "Rajahmundry", "contact_phone": "9848445566"},
    ).json()
    bid, bkey = b_res["bureau_id"], b_res["owner_key"]
    bhdr = {"X-Bureau-Key": bkey}

    # SSRF attempt against internal IP or HTTP is strictly rejected
    r_ssrf = client.post(f"/api/v2/bureaus/{bid}/settings", json={"sla_tier": "priority_partner", "webhook_url": "https://127.0.0.1/hook"}, headers=bhdr)
    assert r_ssrf.status_code == 400
    r_http = client.post(f"/api/v2/bureaus/{bid}/settings", json={"sla_tier": "priority_partner", "webhook_url": "http://crm.example.com/hook"}, headers=bhdr)
    assert r_http.status_code == 400

    r_v2_ok = client.post(f"/api/v2/bureaus/{bid}/settings", json={"sla_tier": "priority_partner", "webhook_url": "https://crm.partner-example.org/manavivaha"}, headers=bhdr)
    assert r_v2_ok.status_code == 200

    r_exp = client.get(f"/api/v2/bureaus/{bid}/export", headers=bhdr)
    assert r_exp.status_code == 200
    assert r_exp.json()["tenant"]["bureau_id"] == bid
    assert "webhook_secret_sha256" not in str(r_exp.json())

    # Phase 11 & 12: Public transparent status report
    r_stat = client.get("/api/status")
    assert r_stat.status_code == 200
    st = r_stat.json()
    assert st["overall_status"] == "operational"
    assert st["components"]["transactional_sql_plane"] == "operational"
    assert st["last_dr_drill"]["passed"] is True
    assert st["slo"]["sample_size"] >= 5


def test_phase3_registration_idempotency_key_header():
    from testutil_photos import TEST_PROFILE_PHOTO
    client = TestClient(main.app)
    jpeg_bytes = TEST_PROFILE_PHOTO

    form_data = {
        "gender": "Female",
        "religion": "Hindu",
        "password": "Idempotent-Test-Password-2026!",
        "consent_confirmed": "true",
        "photo_consent_confirmed": "true",
        "full_name": "Ananya Deshmukh",
        "dob": "1999-04-18",
        "phone": "9848776655",
        "caste": "Reddy",
        "district": "Hyderabad",
        "state": "TS",
        "education": "M.Tech",
        "job": "Architect",
        "salary": "₹16 LPA",
        "height": "5'5\"",
        "marital_status": "Pelli Kaledu",
    }
    idem_hdr = {"Idempotency-Key": "idem_reg_retry_2026_11_13_0001"}

    r1 = client.post(
        "/api/register",
        data=form_data,
        files={"photo_file": ("portrait.jpg", jpeg_bytes, "image/jpeg")},
        headers=idem_hdr,
    )
    assert r1.status_code == 200
    first_id = r1.json()["tsap_id"]

    # Second identical submission with the same Idempotency-Key recovers the exact same TSAP ID without 409!
    r2 = client.post(
        "/api/register",
        data=form_data,
        files={"photo_file": ("portrait.jpg", jpeg_bytes, "image/jpeg")},
        headers=idem_hdr,
    )
    assert r2.status_code == 200
    assert r2.json()["tsap_id"] == first_id
