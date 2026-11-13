"""Comprehensive pytest suite for Mana Vivaha Ecosystem 3.0 & Audit Fixes (MV-001..MV-021)."""
from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path

import pytest
from PIL import Image

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("pytest-ecosystem3")
os.environ.update({
    "APP_ENV": "test",
    "TSAP_AUTH_MODE": "enforce",
    "TSAP_AUTH_SECRET": "pytest-eco3-secret-" + "s" * 40,
    "ADMIN_KEY": "pytest-eco3-admin-" + "a" * 40,
})

from fastapi.testclient import TestClient  # noqa: E402

import credits as CR  # noqa: E402
import db_store as DBSTORE  # noqa: E402
import ecosystem3 as ECO  # noqa: E402
import main as M  # noqa: E402
import safety as S  # noqa: E402
import topmatch as TM  # noqa: E402
import vendors as V  # noqa: E402

CLIENT = TestClient(M.app)
ADMIN_H = {"x-admin-key": os.environ["ADMIN_KEY"]}

FORBIDDEN_SCORE_KEYS = {
    "score", "match_score", "compatibility_score", "trust_score",
    "raw_score", "grade", "grade_telugu", "stars", "percent",
    "verdict", "strengths", "weak_points",
}


def _auth(tsap_id: str) -> dict[str, str]:
    return {"x-tsap-token": M.sign_token(tsap_id)}


def _png_bytes() -> bytes:
    img = Image.new("RGB", (320, 320), color=(122, 12, 46))
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def test_mv006_salary_parser_accuracy() -> None:
    assert ECO.parse_salary_bounds_inr("₹8 - 12 Lakhs / year") == (800_000, 1_200_000)
    assert ECO.parse_salary_bounds_inr("₹6.5 Lakhs") == (650_000, 650_000)
    assert ECO.parse_salary_bounds_inr("12 LPA") == (1_200_000, 1_200_000)
    assert ECO.parse_salary_bounds_inr("₹1.2 Crore") == (12_000_000, 12_000_000)
    assert ECO.parse_salary_bounds_inr("₹50,000 / month") == (600_000, 600_000)
    assert ECO.parse_salary_bounds_inr("₹12,00,000") == (1_200_000, 1_200_000)
    assert ECO.parse_salary_bounds_inr("Below 3 Lakhs") == (0, 300_000)
    assert ECO.parse_salary_bounds_inr("Not working") == (0, 0)
    assert ECO.parse_salary_bounds_inr("—") == (0, 0)


def test_mv003_single_reporter_cannot_autohide_target_and_appeal_reinstates() -> None:
    users = [
        {"tsap_id": "MV-R1", "full_name": "Reporter One", "is_approved": True},
        {"tsap_id": "MV-R2", "full_name": "Reporter Two", "is_approved": True},
        {"tsap_id": "MV-TGT", "full_name": "Target Member", "is_approved": True},
    ]
    reports: list[dict] = []
    # Single reporter files 3 different high-severity categories -> MUST NOT auto-hide
    for cat in ("fake_profile", "advance_money", "harassment"):
        ok, _, rec = S.submit_report("MV-R1", "MV-TGT", cat, "abuse attempt", reports, users)
        assert ok
        assert rec["auto_flagged"] is False
    assert users[2]["is_approved"] is True

    # Second distinct reporter files a high-severity report -> NOW auto-flags for review
    ok2, _, rec2 = S.submit_report("MV-R2", "MV-TGT", "fake_profile", "second reporter", reports, users)
    assert ok2
    assert rec2["auto_flagged"] is True
    assert users[2]["is_approved"] is False

    # Target files moderation appeal and staff reinstates
    M.DB_USERS[:] = users
    M._reindex_users()
    ap_res = CLIENT.post(
        "/api/safety/appeal",
        headers=_auth("MV-TGT"),
        json={"tsap_id": "MV-TGT", "reason": "My profile details are genuine and verified."},
    )
    assert ap_res.status_code == 200
    appeal_id = ap_res.json()["appeal"]["id"]

    res_adm = CLIENT.post(
        f"/api/admin/appeals/{appeal_id}/resolve",
        headers=ADMIN_H,
        json={"outcome": "reinstated", "note": "Verified genuine member."},
    )
    assert res_adm.status_code == 200
    assert M._find_user("MV-TGT")["is_approved"] is True


def test_mv004_interest_withdraw_by_sender_and_credit_refund() -> None:
    groom = {
        "tsap_id": "MV-GRM-1", "full_name": "Kiran Rao", "gender": "Groom", "age": 28,
        "phone": "9876500001", "credits": 3, "is_approved": True, "is_active": True,
    }
    bride = {
        "tsap_id": "MV-BRD-1", "full_name": "Anusha Devi", "gender": "Bride", "age": 25,
        "phone": "9876500002", "credits": 3, "is_approved": True, "is_active": True,
    }
    M.DB_USERS[:] = [groom, bride]
    M.DB_INTERESTS.clear()
    M._reindex_users()

    send_r = CLIENT.post(
        "/api/interest/send",
        headers=_auth("MV-GRM-1"),
        json={"from_id": "MV-GRM-1", "to_id": "MV-BRD-1", "note": "Namaste"},
    )
    assert send_r.status_code == 200
    req_id = send_r.json()["request_id"]
    assert M._find_user("MV-GRM-1")["credits"] == 2

    # Recipient cannot withdraw sender's request
    wrong_r = CLIENT.post(
        "/api/interest/respond",
        headers=_auth("MV-BRD-1"),
        json={"tsap_id": "MV-BRD-1", "request_id": req_id, "action": "withdraw"},
    )
    assert wrong_r.status_code == 403

    # Sender CAN withdraw pending request and receives +1 credit refund
    ok_r = CLIENT.post(
        "/api/interest/respond",
        headers=_auth("MV-GRM-1"),
        json={"tsap_id": "MV-GRM-1", "request_id": req_id, "action": "withdraw"},
    )
    assert ok_r.status_code == 200
    body = ok_r.json()
    assert body["success"] is True
    assert body["result"]["action"] == "withdraw"
    assert body["credits"] == 3
    assert M._find_user("MV-GRM-1")["credits"] == 3
    assert M.DB_INTERESTS[0]["status"] == "withdrawn"


def test_mv005_fifo_credit_ledger_preserves_legacy_and_expires_paid_buckets() -> None:
    member = {"tsap_id": "MV-CRD-1", "full_name": "Srinivas", "credits": 3, "plan": "FREE", "is_approved": True}
    M.DB_USERS[:] = [member]
    M._reindex_users()

    # Existing 3 free credits are preserved as non-expiring bucket
    assert ECO.sync_member_credits(member) == 3

    # Grant S_99 (5 credits, 30 days) -> total 8
    CR.add_credits(member, "S_99", payment_verified=True)
    assert member["credits"] == 8

    # Spend 1 credit -> FIFO consumes the expiring S_99 bucket first (4 paid + 3 free = 7)
    CR.deduct_credit(member)
    ledger = ECO.member_credit_ledger(member)
    assert ledger["available_credits"] == 7
    paid_bkt = next(b for b in ledger["buckets"] if b["plan_code"] == "S_99")
    free_bkt = next(b for b in ledger["buckets"] if b["kind"] == "legacy_or_free")
    assert paid_bkt["remaining"] == 4
    assert free_bkt["remaining"] == 3

    # Fast-forward paid bucket past expiry -> 4 paid credits expire, 3 legacy/free remain intact!
    state = ECO._ensure_loaded()
    for b in state["credit_buckets"]["MV-CRD-1"]:
        if b["plan_code"] == "S_99":
            b["expires_at"] = (datetime.utcnow() - timedelta(days=1)).replace(microsecond=0).isoformat()
    ECO.save_state()

    ledger_after = CLIENT.get("/api/credits/MV-CRD-1/ledger", headers=_auth("MV-CRD-1"))
    assert ledger_after.status_code == 200
    assert ledger_after.json()["available_credits"] == 3
    assert member["credits"] == 3


def test_mv009_blocked_media_guard_and_private_photo_signed_access() -> None:
    os.makedirs(M.PHOTO_MEDIA_DIR, exist_ok=True)
    fn_pub = "mv009-pub.png"
    fn_priv = "mv009-priv.png"
    Path(M.PHOTO_MEDIA_DIR, fn_pub).write_bytes(_png_bytes())
    Path(M.PHOTO_MEDIA_DIR, fn_priv).write_bytes(_png_bytes())

    u_pub = {
        "tsap_id": "MV-PH-PUB", "full_name": "Public Owner", "gender": "Bride", "age": 24,
        "photo_url": f"/photos/{fn_pub}", "photo_status": "approved", "is_approved": True, "is_active": True,
    }
    u_priv = {
        "tsap_id": "MV-PH-PRV", "full_name": "Private Owner", "gender": "Bride", "age": 26,
        "photo_url": f"/photos/{fn_priv}", "photo_status": "approved", "photo_private": True,
        "is_approved": True, "is_active": True,
    }
    viewer = {
        "tsap_id": "MV-VIEWER", "full_name": "Viewer Groom", "gender": "Groom", "age": 29,
        "is_approved": True, "is_active": True,
    }
    M.DB_USERS[:] = [u_pub, u_priv, viewer]
    M.DB_BLOCKS.clear()
    M._reindex_users()

    # Before block: viewer can fetch public photo
    assert CLIENT.get(f"/photos/{fn_pub}", headers=_auth("MV-VIEWER")).status_code == 200
    # After block: viewer gets 404 even for public photo
    S.block_user("MV-PH-PUB", "MV-VIEWER", "privacy", M.DB_BLOCKS)
    assert CLIENT.get(f"/photos/{fn_pub}", headers=_auth("MV-VIEWER")).status_code == 404

    # Private photo returns 404 before grant
    assert CLIENT.get(f"/photos/{fn_priv}", headers=_auth("MV-VIEWER")).status_code == 404
    req_r = CLIENT.post(
        "/api/photo/access/request",
        headers=_auth("MV-VIEWER"),
        json={"viewer_id": "MV-VIEWER", "owner_id": "MV-PH-PRV", "note": "Requesting family view"},
    )
    assert req_r.status_code == 200
    grant_id = req_r.json()["grant"]["id"]

    # Owner approves for 7 days
    app_r = CLIENT.post(
        "/api/photo/access/respond",
        headers=_auth("MV-PH-PRV"),
        json={"owner_id": "MV-PH-PRV", "grant_id": grant_id, "decision": "approved", "days": 7},
    )
    assert app_r.status_code == 200

    sig_r = CLIENT.post(
        "/api/photo/access/signed-url",
        headers=_auth("MV-VIEWER"),
        json={"viewer_id": "MV-VIEWER", "owner_id": "MV-PH-PRV"},
    )
    assert sig_r.status_code == 200
    signed_url = sig_r.json()["signed_url"]
    assert CLIENT.get(signed_url).status_code == 200

    # Owner revokes -> signed URL immediately stops working (404)!
    CLIENT.post(
        "/api/photo/access/respond",
        headers=_auth("MV-PH-PRV"),
        json={"owner_id": "MV-PH-PRV", "grant_id": grant_id, "decision": "revoked"},
    )
    assert CLIENT.get(signed_url).status_code == 404


def test_mv010_db_store_trailing_debounce_flush() -> None:
    snap1 = DBSTORE.snapshot([{"tsap_id": "MV-DB1", "full_name": "First"}], [], [], {}, set(), [], [], [])
    assert DBSTORE.save(snap1, force=True) is True
    snap2 = DBSTORE.snapshot(
        [{"tsap_id": "MV-DB1", "full_name": "First"}, {"tsap_id": "MV-DB2", "full_name": "Second"}],
        [], [], {}, set(), [], [], [],
    )
    # Immediate non-forced save is debounced, NOT lost
    assert DBSTORE.save(snap2, force=False) is False
    assert DBSTORE.flush_pending() is True
    loaded = DBSTORE.load()
    assert len(loaded["users"]) == 2


def test_search_new_filters_and_categorized_matches_and_ecosystem_workflows() -> None:
    groom = {
        "tsap_id": "MV-G10", "full_name": "Harsha Vardhan", "gender": "Groom", "age": 29,
        "caste": "Kamma", "district": "Guntur", "state": "Andhra Pradesh", "current_city": "Hyderabad",
        "country": "India", "mother_tongue": "Telugu", "salary": "₹14 Lakhs", "is_approved": True,
        "is_active": True, "created_at": "2026-11-10T10:00:00",
        "exp_filters": {"ageMin": 23, "ageMax": 28, "caste": "Kamma", "location": "Hyderabad"},
    }
    bride1 = {
        "tsap_id": "MV-B10", "full_name": "Sahithi Chowdary", "gender": "Bride", "age": 25,
        "caste": "Kamma", "district": "Krishna", "state": "Andhra Pradesh", "current_city": "Hyderabad",
        "country": "India", "mother_tongue": "Telugu", "salary": "₹8 - 12 Lakhs / year",
        "id_verified": True, "is_approved": True, "is_active": True, "created_at": "2026-11-11T10:00:00",
    }
    bride2 = {
        "tsap_id": "MV-B11", "full_name": "Neha Sharma", "gender": "Bride", "age": 26,
        "caste": "Brahmin", "district": "Dallas", "state": "Texas", "current_city": "Dallas",
        "country": "USA", "mother_tongue": "Hindi", "salary": "₹4 Lakhs",
        "is_approved": True, "is_active": True, "created_at": "2026-11-12T10:00:00",
    }
    M.DB_USERS[:] = [groom, bride1, bride2]
    M._reindex_users()

    # Search with salary_min=1_000_000 & mother_tongue=Telugu & verification_level=id -> matches bride1 ("₹8 - 12 Lakhs")!
    sr = CLIENT.get(
        "/api/search",
        params={
            "gender": "Bride",
            "salary_min": 1_000_000,
            "mother_tongue": "Telugu",
            "city": "Hyderabad",
            "verification_level": "id",
        },
    )
    assert sr.status_code == 200
    assert [r["tsap_id"] for r in sr.json()["results"]] == ["MV-B10"]

    # Categorized matches v3 -> zero forbidden score keys!
    cat_r = CLIENT.get("/api/matches/MV-G10/categories", headers=_auth("MV-G10"))
    assert cat_r.status_code == 200
    cat_json = cat_r.json()

    def _walk_keys(obj):
        if isinstance(obj, dict):
            assert not (set(obj.keys()) & FORBIDDEN_SCORE_KEYS)
            for val in obj.values():
                _walk_keys(val)
        elif isinstance(obj, list):
            for el in obj:
                _walk_keys(el)

    _walk_keys(cat_json)
    assert cat_json["categories"]["strong_preference"]["count"] == 1

    # Multi-badge verification redacts Aadhaar digits & approves cleanly
    sub_v = CLIENT.post(
        "/api/verification/MV-G10/submit",
        headers=_auth("MV-G10"),
        json={"badge_type": "education", "document_type": "B.Tech Degree", "summary": "JNTU ID 123456789012"},
    )
    assert sub_v.status_code == 200
    rec_v = sub_v.json()["record"]
    assert "123456789012" not in rec_v["detail_summary"]
    assert "9012" in rec_v["detail_summary"]
    CLIENT.post(
        f"/api/admin/verification/{rec_v['id']}/review",
        headers=ADMIN_H,
        json={"decision": "approved"},
    )
    badges_r = CLIENT.get("/api/verification/MV-G10/badges", headers=_auth("MV-G10"))
    assert any(b["badge_type"] == "education" for b in badges_r.json()["badges"])

    # Family Collaboration workflow
    inv_r = CLIENT.post(
        "/api/family/MV-G10/invite",
        headers=_auth("MV-G10"),
        json={"name": "Rama Rao", "relation": "father", "can_suggest": True},
    )
    assert inv_r.status_code == 200
    code = inv_r.json()["invite"]["invite_code"]
    acc_r = CLIENT.post("/api/family/accept-invite", json={"invite_code": code})
    assert acc_r.status_code == 200
    fam_tok = acc_r.json()["family_token"]
    collab_id = acc_r.json()["collaborator"]["collaborator_id"]

    sug_r = CLIENT.post(
        "/api/family/MV-G10/suggest",
        headers={"x-tsap-token": fam_tok},
        json={"candidate_tsap_id": "MV-B10", "note": "Good Guntur/Hyderabad family background"},
    )
    assert sug_r.status_code == 200
    CLIENT.post(f"/api/family/MV-G10/revoke/{collab_id}", headers=_auth("MV-G10"))
    sug_blocked = CLIENT.post(
        "/api/family/MV-G10/suggest",
        headers={"x-tsap-token": fam_tok},
        json={"candidate_tsap_id": "MV-B11"},
    )
    assert sug_blocked.status_code == 403

    # Verified-only Vendor Reviews (blocks before inquiry, succeeds after quote inquiry!)
    reg_v = V.register_vendor({
        "business_name": "Sri Lakshmi Mandapam",
        "owner_name": "Prasad",
        "category": V.CATEGORIES[0]["key"],
        "phone": "9888877776",
        "city": "Guntur",
        "district": "Guntur",
        "state": "AP",
        "price_range": "₹1L - ₹3L",
        "about": "AC Kalyana Mandapam in Guntur city center.",
        "package": "V_BASIC",
    })
    assert reg_v["ok"] is True
    vid = reg_v["vendor_id"]
    assert V.activate_vendor(vid, "V_BASIC", "UTR9988776655")["ok"] is True

    unverified_rev = CLIENT.post(
        f"/api/vendors/{vid}/reviews",
        headers=_auth("MV-G10"),
        json={"tsap_id": "MV-G10", "rating": 5, "review_text": "Trying to review without inquiry"},
    )
    assert unverified_rev.status_code == 403

    quote_ok = CLIENT.post(
        f"/api/vendors/{vid}/quote",
        headers=_auth("MV-G10"),
        json={"tsap_id": "MV-G10", "event_date": "2027-02-14", "city": "Guntur", "guest_count": 500},
    )
    assert quote_ok.status_code == 200

    verified_rev = CLIENT.post(
        f"/api/vendors/{vid}/reviews",
        headers=_auth("MV-G10"),
        json={"tsap_id": "MV-G10", "rating": 5, "review_text": "Prompt response and clear hall availability details."},
    )
    assert verified_rev.status_code == 200
    assert CLIENT.get(f"/api/vendors/{vid}/reviews").json()["count"] == 1

    # DPDP Self-Service Data Export
    exp_r = CLIENT.get("/api/me/MV-G10/data-export", headers=_auth("MV-G10"))
    assert exp_r.status_code == 200
    exp_json = exp_r.json()
    assert exp_json["export_format"] == "mana-vivaha-member-data-export-v1"
    assert exp_json["tsap_id"] == "MV-G10"
