"""Regression coverage for the adversarial audit remediations.

These tests intentionally exercise the hostile boundary, not only the happy path:
legacy money callbacks, public referral enumeration, trust-state IDOR, staff PII,
and contact-grant revocation on deletion.
"""
from __future__ import annotations

import copy
import os
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))

from test_storage import isolate_test_stores  # noqa: E402

_TEST_ROOT = Path(isolate_test_stores("audit-remediations"))
os.environ.update(
    {
        "APP_ENV": "test",
        "TSAP_AUTH_MODE": "enforce",
        # Match the shared persistence-boundary fixture so pytest collection
        # order cannot replace the already-imported hardening key underneath it.
        "TSAP_AUTH_SECRET": "pytest-boundary-secret-" + "x" * 40,
        "ADMIN_KEY": "pytest-boundary-admin-" + "x" * 40,
        "STAFF_KEY": "audit-remediation-staff-" + "x" * 40,
        "REFERRAL_POSTER_DIR": str(_TEST_ROOT / "referral-posters"),
    }
)

from fastapi.testclient import TestClient  # noqa: E402

import hardening as H  # noqa: E402
import main as M  # noqa: E402
import smart12 as S12  # noqa: E402


CLIENT = TestClient(M.app)


def _user(tsap_id: str, phone: str, *, status: str = "approved", approved: bool = True, code: str = "") -> dict:
    return {
        "tsap_id": tsap_id,
        "full_name": tsap_id + " Member",
        "phone": phone,
        "status": status,
        "is_approved": approved,
        "is_active": True,
        "referral_code": code or tsap_id.replace("-", "")[:10],
        "credits": 3,
        "plan": "FREE",
    }


def _reset_state() -> None:
    for name in ("DB_USERS", "DB_INTERESTS", "DB_PAYMENTS", "DB_OTPS", "DB_VIEWS", "DB_SAVES", "DB_DIGEST"):
        value = getattr(M, name, None)
        if hasattr(value, "clear"):
            value.clear()
    if hasattr(M, "VERIFIED_PHONES"):
        M.VERIFIED_PHONES.clear()
    M._reindex_users()
    S12.UNLOCKS.clear()
    S12.REVEAL_LOG.clear()
    H._RL_BUCKETS.clear()
    H.ABUSE["events"].clear()


def setup_function() -> None:
    _reset_state()


def teardown_function() -> None:
    _reset_state()


def test_legacy_payment_callback_is_dead_and_cannot_mutate_credits() -> None:
    target = _user("MV-PAY-1", "9876543210", code="PAY123")
    M.DB_USERS.append(target)
    M._reindex_users()

    response = CLIENT.post(
        "/api/payment/webhook",
        params={
            "user_id": target["tsap_id"],
            "amount": 99,
            "razorpay_payment_id": "pay_fake_audit",
            "plan_code": "S_99",
        },
    )

    assert response.status_code == 410
    assert response.json()["error"] == "legacy_webhook_retired"
    assert target["credits"] == 3
    assert target["plan"] == "FREE"


def test_referral_lookup_and_assets_do_not_expose_pending_profiles() -> None:
    pending = _user("MV-PENDING", "9876543210", status="pending", approved=False, code="PEN123")
    approved = _user("MV-APPROVED", "9876543211", code="APP123")
    M.DB_USERS.extend([pending, approved])
    M._reindex_users()

    # Phone fragments are owner-authenticated only.
    assert CLIENT.get("/api/referral/lookup", params={"q": pending["phone"]}).status_code == 401
    assert CLIENT.get("/api/referral/lookup", params={"q": pending["referral_code"]}).status_code == 404
    assert CLIENT.get(f"/api/referral/{pending['tsap_id']}/share-kit").status_code == 404
    assert CLIENT.get(f"/api/referral/{pending['tsap_id']}/poster.png").status_code == 404
    # Legacy public wrappers must not turn a phone or TSAP ID into a directory
    # lookup either.
    assert CLIENT.get("/api/referral/lookup", params={"q": pending["tsap_id"]}).status_code == 404
    assert CLIENT.get("/api/referral/earnings-card", params={"code": approved["phone"]}).status_code == 404
    assert CLIENT.get("/api/referral/validate/%s" % approved["phone"]).json()["ok"] is False

    from testutil_photos import TEST_PROFILE_PHOTO
    registration = CLIENT.post(
        "/api/register",
        data={
            "gender": "Bride", "full_name": "Phone Probe Test", "dob": "1998-01-01",
            "age": "28", "height": "5'4\\\"", "marital_status": "Pelli Kaledu",
            "religion": "Hindu", "caste": "Reddy", "district": "Hyderabad", "state": "TS",
            "education": "BTech", "job": "Teacher", "salary": "40k",
            "phone": "9876500099", "password": "PhoneProbe123!",
            "consent_confirmed": "true", "photo_consent_confirmed": "true",
            "photo_private": "false", "referral_code": approved["phone"],
        },
        files={"photo_file": ("profile.jpg", TEST_PROFILE_PHOTO, "image/jpeg")},
    )
    assert registration.status_code == 200
    created = next(u for u in M.DB_USERS if u.get("phone") == "9876500099")
    assert not created.get("referred_by")
    assert not created.get("referred_by_raw")
    assert approved["phone"] not in registration.text

    public = CLIENT.get("/api/referral/lookup", params={"q": approved["referral_code"]})
    assert public.status_code == 200
    assert public.json()["tsap_id"] == approved["tsap_id"]
    assert CLIENT.get(f"/api/referral/{approved['tsap_id']}/share-kit").status_code == 200


def test_verification_refresh_requires_the_profile_owner() -> None:
    target = _user("MV-VERIFY", "9876543210")
    target["phone_verified"] = True
    other = _user("MV-OTHER", "9876543211")
    M.DB_USERS.extend([target, other])
    M._reindex_users()

    assert CLIENT.post("/api/verify/request", json={"tsap_id": target["tsap_id"], "kind": "phone"}).status_code == 401
    assert CLIENT.post(
        "/api/verify/request",
        json={"tsap_id": target["tsap_id"], "kind": "phone"},
        headers={"x-tsap-token": H.sign_token(other["tsap_id"])},
    ).status_code == 401
    owner = CLIENT.post(
        "/api/verify/request",
        json={"tsap_id": target["tsap_id"], "kind": "phone"},
        headers={"x-tsap-token": H.sign_token(target["tsap_id"])},
    )
    assert owner.status_code == 200
    assert target["verification_level"] == "phone"


def test_staff_profile_queue_masks_phone_and_never_returns_whatsapp_url() -> None:
    target = _user("MV-STAFF", "9876543210")
    M.DB_USERS.append(target)
    M._reindex_users()

    response = CLIENT.get(
        "/api/admin/profiles",
        params={"status": "approved"},
        headers={"x-admin-key": H.STAFF_KEY},
    )
    assert response.status_code == 200
    row = response.json()["profiles"][0]
    assert row["phone"] == ""
    assert row["phone_masked"] != target["phone"]
    assert target["phone"] not in response.text
    assert row["wa_followup_url"] == ""
    assert row["message_body"] == ""


def test_deletion_revokes_accepted_contact_grants_and_persists_revoked_interest() -> None:
    owner = _user("MV-DELETE", "9876543210", status="approved", approved=True)
    viewer = _user("MV-VIEWER", "9876543211", status="approved", approved=True)
    M.DB_USERS.extend([owner, viewer])
    M.DB_INTERESTS.append({"from_id": viewer["tsap_id"], "to_id": owner["tsap_id"], "status": "accepted"})
    M._reindex_users()
    viewer_headers = {"x-tsap-token": H.sign_token(viewer["tsap_id"])}
    owner_headers = {"x-tsap-token": H.sign_token(owner["tsap_id"])}

    before = CLIENT.post(
        "/api/unlock",
        json={"viewer_id": viewer["tsap_id"], "target_id": owner["tsap_id"]},
        headers=viewer_headers,
    )
    assert before.status_code == 200
    assert before.json()["phone"] == owner["phone"]

    deleted = CLIENT.post(
        "/api/user/delete-account",
        json={"tsap_id": owner["tsap_id"], "reason": "other"},
        headers=owner_headers,
    )
    assert deleted.status_code == 200
    assert any(
        row["status"] == "revoked" and row.get("revoked_reason") == "profile_deactivated"
        for row in M.DB_INTERESTS
    )

    after = CLIENT.post(
        "/api/unlock",
        json={"viewer_id": viewer["tsap_id"], "target_id": owner["tsap_id"]},
        headers=viewer_headers,
    )
    assert after.status_code == 410
    assert not any(owner["tsap_id"] in grants for grants in S12.UNLOCKS.values())


def test_deletion_rolls_back_when_core_checkpoint_fails(monkeypatch) -> None:
    owner = _user("MV-DELETE-ROLLBACK", "9876500010", status="approved", approved=True)
    viewer = _user("MV-VIEWER-ROLLBACK", "9876500011", status="approved", approved=True)
    M.DB_USERS.extend([owner, viewer])
    M.DB_INTERESTS.append({"from_id": viewer["tsap_id"], "to_id": owner["tsap_id"], "status": "accepted"})
    M._reindex_users()
    viewer_headers = {"x-tsap-token": H.sign_token(viewer["tsap_id"])}
    owner_headers = {"x-tsap-token": H.sign_token(owner["tsap_id"])}
    assert CLIENT.post(
        "/api/unlock",
        json={"viewer_id": viewer["tsap_id"], "target_id": owner["tsap_id"]},
        headers=viewer_headers,
    ).status_code == 200

    monkeypatch.setattr(M, "_persist_core_state", lambda: False)
    failed = CLIENT.post(
        "/api/user/delete-account",
        json={"tsap_id": owner["tsap_id"], "reason": "other"},
        headers=owner_headers,
    )
    assert failed.status_code == 503
    assert owner.get("status") == "approved"
    assert owner.get("is_active") is True
    assert any(row.get("status") == "accepted" for row in M.DB_INTERESTS)
    assert S12.is_entitled(viewer["tsap_id"], owner["tsap_id"])


def test_payment_id_ownership_survives_a_real_module_restart(tmp_path) -> None:
    """The replay guard must survive process replacement, not only cache reuse."""
    env = os.environ.copy()
    env.update({
        "APP_ENV": "test",
        "TSAP_AUTH_MODE": "off",
        "WA_TEST_FAST": "1",
        "DEMO_SEED_ENABLED": "0",
        "AUTO_POST_ON_REGISTER": "false",
        "PAY_UPI_ID": "restart-test@upi",
        "PYTHONPATH": str(HERE),
        "TSAP_DB_FILE": str(tmp_path / "core.json"),
        "TSAP_TOKEN_VERSIONS_FILE": str(tmp_path / "token-versions.json"),
        "MANA_VIVAHA_PAYPRO_FILE": str(tmp_path / "paypro.json"),
        "MANA_VIVAHA_REFERRAL_FILE": str(tmp_path / "referral.json"),
        "MANA_VIVAHA_SMART12_FILE": str(tmp_path / "smart12.json"),
        "MANA_VIVAHA_MONEY_AUDIT_FILE": str(tmp_path / "money-audit.jsonl"),
        "CONTROL_AUDIT_FILE": str(tmp_path / "control-audit.jsonl"),
        "MANA_VIVAHA_MEDIA_DIR": str(tmp_path / "media"),
    })
    first = """
import main
import paypro as PP
uid = "MV-RESTART-1"
u = {"tsap_id": uid, "full_name": "Restart Payer", "gender": "Groom",
     "phone": "9876500020", "credits": 3, "plan": "FREE"}
main.DB_USERS.append(u)
main._reindex_users()
created = PP.create_pay_order(uid, "credits", "S_99")
assert created.get("success"), created
order_id = created["pay_order"]["id"]
order = PP.get_pay_order(order_id)
order["rzp_order_id"] = "order_restart_1"
assert PP._persist()
event = {"event": "payment.captured", "payload": {"payment": {"entity": {
    "id": "pay_restart_once", "order_id": "order_restart_1", "amount": 9900,
    "currency": "INR", "status": "captured"}}}}
result = PP.handle_razorpay_webhook(event)
assert result.get("ok") and not result.get("duplicate"), result
assert u["credits"] == 8, u
"""
    second = """
import main
import paypro as PP
assert PP._payment_id_owner("pay_restart_once") == "pay_ord_00001", PP.PAYMENT_INDEX
uid = "MV-RESTART-2"
u = {"tsap_id": uid, "full_name": "Replay Target", "gender": "Bride",
     "phone": "9876500021", "credits": 3, "plan": "FREE"}
main.DB_USERS.append(u)
main._reindex_users()
created = PP.create_pay_order(uid, "credits", "S_99")
assert created.get("success"), created
order_id = created["pay_order"]["id"]
order = PP.get_pay_order(order_id)
order["rzp_order_id"] = "order_restart_2"
assert PP._persist()
event = {"event": "payment.captured", "payload": {"payment": {"entity": {
    "id": "pay_restart_once", "order_id": "order_restart_2", "amount": 9900,
    "currency": "INR", "status": "captured"}}}}
result = PP.handle_razorpay_webhook(event)
assert result.get("ok") is False and result.get("reason") == "payment_already_used", result
assert u["credits"] == 3, u
"""
    for script in (first, second):
        completed = subprocess.run(
            [sys.executable, "-c", script], cwd=str(HERE), env=env,
            capture_output=True, text=True, timeout=30,
        )
        assert completed.returncode == 0, completed.stdout + completed.stderr
