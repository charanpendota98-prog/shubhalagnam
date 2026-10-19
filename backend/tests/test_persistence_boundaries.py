"""Focused pytest coverage for the newly hardened state and upload boundaries."""
from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta

import pytest
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("pytest-boundaries")
os.environ.update({
    "APP_ENV": "test",
    "TSAP_AUTH_MODE": "enforce",
    "TSAP_AUTH_SECRET": "pytest-boundary-secret-" + "x" * 40,
    "ADMIN_KEY": "pytest-boundary-admin-" + "x" * 40,
})

from PIL import Image  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

import ads as ADS  # noqa: E402
import astro as AST  # noqa: E402
import main as M  # noqa: E402
import paypro as PP  # noqa: E402
import referral as REF  # noqa: E402
import smart12 as S12  # noqa: E402


CLIENT = TestClient(M.app)


def _photo_bytes() -> bytes:
    image = Image.new("RGB", (500, 500))
    pixels = image.load()
    # A deterministic high-frequency texture keeps the encoded file above the
    # upload validator's minimum while remaining entirely synthetic.
    for y in range(500):
        for x in range(500):
            value = (x * 37 + y * 61 + (x * y) % 251) % 256
            pixels[x, y] = (value, (value * 3 + x) % 256, (value * 7 + y) % 256)
    from io import BytesIO

    stream = BytesIO()
    image.save(stream, format="PNG")
    return stream.getvalue()


def test_voice_upload_without_owner_or_admin_is_rejected() -> None:
    response = CLIENT.post(
        "/api/voice/upload",
        files={"file": ("intro.mp3", b"not-a-real-audio", "audio/mpeg")},
    )
    assert response.status_code == 403


def test_photo_upload_rolls_back_file_and_profile_when_core_save_fails(monkeypatch) -> None:
    user = {"tsap_id": "TST-ROLLBACK", "full_name": "Rollback User", "phone": "9876543210"}
    M.DB_USERS[:] = [user]
    M._reindex_users()
    token = M.sign_token(user["tsap_id"])
    monkeypatch.setattr(M, "_persist_core_state", lambda: False)

    response = CLIENT.post(
        "/api/photo/upload",
        headers={"x-tsap-token": token},
        data={"tsap_id": user["tsap_id"]},
        files={"file": ("profile.png", _photo_bytes(), "image/png")},
    )

    assert response.status_code == 503
    assert "photo_url" not in user
    assert not list(Path(M.PHOTO_MEDIA_DIR).glob("TST-ROLLBACK-*"))
    M.DB_USERS.clear()
    M._reindex_users()


def test_photo_review_rolls_back_moderation_decision_when_core_save_fails(monkeypatch) -> None:
    user = {
        "tsap_id": "TST-REVIEW",
        "full_name": "Review User",
        "photo_url": "/photos/TST-REVIEW.png",
        "photo_status": "pending",
        "photo_urls": ["/photos/TST-REVIEW.png"],
    }
    M.DB_USERS[:] = [user]
    M._reindex_users()
    monkeypatch.setattr(M, "_persist_core_state", lambda: False)
    response = CLIENT.post(
        "/api/admin/photos/review",
        headers={"x-admin-key": os.environ["ADMIN_KEY"]},
        json={"tsap_id": user["tsap_id"], "kind": "photo", "decision": "approved"},
    )
    assert response.status_code == 503
    assert user["photo_status"] == "pending"
    assert user["photo_urls"] == ["/photos/TST-REVIEW.png"]
    M.DB_USERS.clear()
    M._reindex_users()


def test_retention_rolls_back_live_lists_when_core_save_fails(monkeypatch) -> None:
    old = {
        "tsap_id": "TST-OLD",
        "full_name": "Old User",
        "created_at": (datetime.utcnow() - timedelta(days=365 * 4)).isoformat(),
    }
    M.DB_USERS[:] = [old]
    M.DB_INTERESTS[:] = [{"from_id": "TST-OLD", "to_id": "OTHER"}]
    M.DB_VIEWS[:] = [{"tsap_id": "TST-OLD", "viewer_id": "OTHER"}]
    M.DB_SAVES[:] = [{"tsap_id": "OTHER", "saved_id": "TST-OLD"}]
    monkeypatch.setattr(M, "_retention_save", lambda: False)

    try:
        M._retention_cycle()
    except RuntimeError as error:
        assert "database could not be saved" in str(error)
    else:  # pragma: no cover - the assertion is intentionally explicit
        raise AssertionError("retention reported success after a failed core save")

    assert M.DB_USERS == [old]
    assert M.DB_INTERESTS == [{"from_id": "TST-OLD", "to_id": "OTHER"}]
    assert M.DB_VIEWS == [{"tsap_id": "TST-OLD", "viewer_id": "OTHER"}]
    assert M.DB_SAVES == [{"tsap_id": "OTHER", "saved_id": "TST-OLD"}]
    M.DB_USERS.clear()
    M.DB_INTERESTS.clear()
    M.DB_VIEWS.clear()
    M.DB_SAVES.clear()
    M._reindex_users()


def test_jathakam_submission_does_not_claim_success_when_state_save_fails(monkeypatch) -> None:
    AST.JATHAKAMS.clear()
    monkeypatch.setattr(AST, "_persist", lambda: False)
    result = AST.submit_jathakam("TST-OWNER", "file.pdf", "pdf")
    assert result["success"] is False
    assert AST.JATHAKAMS == []


def test_astro_verify_rolls_back_ast_and_profile_on_core_save_failure(monkeypatch) -> None:
    user = {"tsap_id": "TST-ASTRO", "full_name": "Astro User", "jathakam_verified": False}
    queued = {"id": "J-TST-ASTRO", "tsap_id": user["tsap_id"], "file": "astro.pdf",
              "kind": "pdf", "status": "pending", "note": "", "at": "now", "verified_at": ""}
    M.DB_USERS[:] = [user]
    M._reindex_users()
    old_queue = list(AST.JATHAKAMS)
    AST.JATHAKAMS[:] = [queued]
    monkeypatch.setattr(M, "_persist_core_state", lambda: False)
    response = CLIENT.post(
        "/api/admin/astro/verify/J-TST-ASTRO",
        headers={"x-admin-key": os.environ["ADMIN_KEY"]},
        json={"ok": True, "note": "reviewed"},
    )
    assert response.status_code == 503
    assert user["jathakam_verified"] is False
    assert queued["status"] == "pending"
    AST.JATHAKAMS[:] = old_queue
    M.DB_USERS.clear()
    M._reindex_users()


def test_ads_campaign_create_and_approval_roll_back_when_store_save_fails(monkeypatch) -> None:
    old_campaigns = list(ADS.CAMPAIGNS)
    old_seq = ADS._AD_SEQ
    try:
        ADS.CAMPAIGNS.clear()
        ADS._AD_SEQ = 0
        monkeypatch.setattr(ADS, "_persist", lambda: False)
        created = ADS.create_campaign("TST-VENDOR", "Test Ad", "district", 3, districts=["Hyderabad"])
        assert created["success"] is False
        assert ADS.CAMPAIGNS == []

        campaign = {"id": "AD-TST", "status": "pending", "days": 3, "amount": 204,
                    "utr": "", "start": "", "end": ""}
        ADS.CAMPAIGNS.append(campaign)
        result = ADS.approve_campaign("AD-TST", "UTR-TEST")
        assert result["success"] is False
        assert campaign["status"] == "pending"
        assert campaign["utr"] == ""
    finally:
        ADS.CAMPAIGNS[:] = old_campaigns
        ADS._AD_SEQ = old_seq


def test_pay_order_claim_rolls_back_when_ledger_save_fails(monkeypatch) -> None:
    old_orders = list(PP.PAY_ORDERS)
    order = {"id": "pay_ord_TST_CLAIM", "tsap_id": "TST-PAY", "status": "created",
             "final_amount": 99, "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
             "claim_utr": "", "claimed_at": ""}
    PP.PAY_ORDERS[:] = [order]
    monkeypatch.setattr(PP, "_persist", lambda: False)
    try:
        result = PP.claim_utr(order["id"], "TST-PAY", "123456789012")
        assert result["success"] is False
        assert order["status"] == "created"
        assert order["claim_utr"] == ""
    finally:
        PP.PAY_ORDERS[:] = old_orders


def test_payment_fulfillment_rolls_back_profile_when_core_save_fails(monkeypatch) -> None:
    user = {"tsap_id": "TST-FULFILL", "credits": 0, "plan": "FREE", "credit_history": []}
    M.DB_USERS[:] = [user]
    M._reindex_users()
    monkeypatch.setattr(M, "_persist_core_state", lambda: False)
    result = PP.fulfill_order(
        {"tsap_id": user["tsap_id"], "purpose": "credits", "ref": "S_99", "final_amount": 99},
        "payment-test", "test",
    )
    assert result["ok"] is False
    assert user["credits"] == 0
    assert user["plan"] == "FREE"
    M.DB_USERS.clear()
    M._reindex_users()


def test_manual_payment_rolls_back_cross_store_benefit_when_ledger_save_fails(monkeypatch) -> None:
    user = {"tsap_id": "TST-MANUAL", "credits": 0, "plan": "FREE", "credit_history": []}
    M.DB_USERS[:] = [user]
    M._reindex_users()
    old_orders = list(PP.PAY_ORDERS)
    order = {"id": "pay_ord_TST_MANUAL", "tsap_id": user["tsap_id"], "purpose": "credits",
             "ref": "S_99", "amount": 99, "final_amount": 99, "status": "created",
             "mode": "manual_upi", "offer_code": "", "payment_id": "", "utr": "",
             "claim_utr": "", "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
             "paid_at": "", "receipt": None}
    PP.PAY_ORDERS[:] = [order]
    monkeypatch.setattr(PP, "_persist", lambda: False)
    try:
        result = PP.confirm_manual(order["id"], "987654321098")
        assert result["success"] is False
        assert order["status"] == "created"
        assert user["credits"] == 0
        assert user["plan"] == "FREE"
    finally:
        PP.PAY_ORDERS[:] = old_orders
        M.DB_USERS.clear()
        M._reindex_users()


def test_consent_unlock_rolls_back_when_store_save_fails(monkeypatch) -> None:
    old_unlocks = {key: dict(value) for key, value in S12.UNLOCKS.items()}
    old_reveals = list(S12.REVEAL_LOG)
    S12.UNLOCKS.clear()
    S12.REVEAL_LOG.clear()
    monkeypatch.setattr(S12, "_persist", lambda: False)
    try:
        result = S12.unlock_number(
            {"tsap_id": "TST-VIEWER", "credits": 0},
            {"tsap_id": "TST-TARGET", "phone": "9876543210"},
            consent_granted=True,
        )
        assert result["success"] is False
        assert result["reason"] == "persistence_failed"
        assert S12.UNLOCKS == {}
        assert S12.REVEAL_LOG == []
    finally:
        S12.UNLOCKS.clear()
        S12.UNLOCKS.update(old_unlocks)
        S12.REVEAL_LOG[:] = old_reveals


def test_referral_payout_rolls_back_wallet_when_state_save_fails(monkeypatch) -> None:
    user = {"tsap_id": "TST-REF", "referral_code": "TSTREF", "wallet": 50,
            "referral_stats": {"wallet": 50, "pending_payout": 0, "paid_out": 0,
                                "registrations": 0, "ledger": [], "tier": "BRONZE"}}
    old_payouts = list(REF.PAYOUTS)
    REF.PAYOUTS[:] = []
    monkeypatch.setattr(REF, "save_state", lambda: {"ok": False})
    try:
        result = REF.payout_request(user, 50, method="upi", upi_id="test@upi")
        assert result["ok"] is False
        assert result["reason"] == "persistence_failed"
        assert user["referral_stats"]["wallet"] == 50
        assert REF.PAYOUTS == []
    finally:
        REF.PAYOUTS[:] = old_payouts


def test_control_upgrade_requires_payment_proof_and_separate_comped_reason(monkeypatch) -> None:
    user = {"tsap_id": "TST-CONTROL", "full_name": "Control User", "credits": 0,
            "plan": "FREE", "credit_history": []}
    old_users = list(M.DB_USERS)
    old_payments = list(M.DB_PAYMENTS)
    old_orders = list(PP.PAY_ORDERS)
    M.DB_USERS[:] = [user]
    M.DB_PAYMENTS[:] = []
    M._reindex_users()
    monkeypatch.setattr(M, "_control_write_guard", lambda request, roles: {"role": "owner", "username": "pytest-owner"})
    monkeypatch.setattr(M.CONTROL_AUTH, "audit", lambda *args, **kwargs: None)
    try:
        with pytest.raises(Exception) as missing_proof:
            M.control_profile_upgrade(user["tsap_id"], {
                "plan": "S_99", "payment_mode": "UPI_QR", "amount": 99,
            }, None)
        assert getattr(missing_proof.value, "status_code", None) == 400
        assert user["plan"] == "FREE"
        assert M.DB_PAYMENTS == []

        with pytest.raises(Exception) as missing_reason:
            M.control_profile_upgrade(user["tsap_id"], {
                "plan": "S_99", "payment_mode": "ADMIN_COMPLIMENTARY", "amount": 0,
            }, None)
        assert getattr(missing_reason.value, "status_code", None) == 400

        result = M.control_profile_upgrade(user["tsap_id"], {
            "plan": "S_99", "payment_mode": "UPI_QR", "amount": 99,
            "utr": "123456789012", "notes": "bank statement checked",
        }, None)
        assert result["success"] is True
        assert user["plan"] == "S_99"
        assert any(row.get("utr") == "123456789012" and row.get("status") == "paid"
                   for row in M.DB_PAYMENTS)
        assert any(row.get("pay_order_id") == row.get("order_id")
                   for row in PP.PAY_ORDERS if row.get("id") == row.get("pay_order_id"))
    finally:
        M.DB_USERS[:] = old_users
        M.DB_PAYMENTS[:] = old_payments
        PP.PAY_ORDERS[:] = old_orders
        M._reindex_users()


def test_razorpay_webhook_rejects_amount_and_currency_mismatch_before_fulfillment(monkeypatch) -> None:
    user = {"tsap_id": "TST-WEBHOOK", "full_name": "Webhook User", "credits": 0,
            "plan": "FREE", "credit_history": []}
    old_users = list(M.DB_USERS)
    old_payments = list(M.DB_PAYMENTS)
    old_orders = list(PP.PAY_ORDERS)
    M.DB_USERS[:] = [user]
    M.DB_PAYMENTS.clear()
    M._reindex_users()
    order = {
        "id": "pay_ord_WEBHOOK", "tsap_id": user["tsap_id"], "purpose": "credits",
        "ref": "S_99", "amount": 99, "final_amount": 99, "status": "created",
        "mode": "razorpay", "rzp_order_id": "rzp_WEBHOOK", "payment_id": "",
        "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"), "paid_at": "",
        "receipt": None,
    }
    PP.PAY_ORDERS[:] = [order]
    monkeypatch.delenv("RAZORPAY_VERIFY_CAPTURE", raising=False)
    monkeypatch.setenv("APP_ENV", "test")
    try:
        bad_amount = PP.handle_razorpay_webhook({
            "event": "payment.captured",
            "payload": {"payment": {"entity": {
                "id": "pay_bad_amount", "order_id": "rzp_WEBHOOK", "amount": 9800, "currency": "INR", "status": "captured"
            }}}
        })
        assert bad_amount["ok"] is False
        assert bad_amount["reason"] == "amount_mismatch"
        assert order["status"] == "created"
        assert user["credits"] == 0

        bad_currency = PP.handle_razorpay_webhook({
            "event": "payment.captured",
            "payload": {"payment": {"entity": {
                "id": "pay_bad_currency", "order_id": "rzp_WEBHOOK", "amount": 9900, "currency": "USD", "status": "captured"
            }}}
        })
        assert bad_currency["ok"] is False
        assert bad_currency["reason"] == "currency_mismatch"
        assert order["status"] == "created"

        good = PP.handle_razorpay_webhook({
            "event": "payment.captured",
            "payload": {"payment": {"entity": {
                "id": "pay_good", "order_id": "rzp_WEBHOOK", "amount": 9900, "currency": "INR", "status": "captured"
            }}}
        })
        assert good["ok"] is True
        assert order["status"] == "paid"
        assert user["credits"] == 5
        assert any(row.get("pay_order_id") == order["id"] and row.get("status") == "paid"
                   for row in M.DB_PAYMENTS)
    finally:
        M.DB_USERS[:] = old_users
        M.DB_PAYMENTS[:] = old_payments
        PP.PAY_ORDERS[:] = old_orders
        M._reindex_users()


def test_control_directory_masks_contacts_until_audited_reveal(monkeypatch) -> None:
    user = {"tsap_id": "TST-DIRECTORY", "full_name": "Directory User", "phone": "9876543210",
            "created_at": datetime.utcnow().isoformat(), "status": "approved", "plan": "FREE"}
    old_users = list(M.DB_USERS)
    M.DB_USERS[:] = [user]
    M._reindex_users()
    monkeypatch.setattr(M.CONTROL_AUTH, "require", lambda request, roles: {"role": "owner", "username": "pytest-owner"})
    audit_events = []
    monkeypatch.setattr(M.CONTROL_AUTH, "audit", lambda *args, **kwargs: audit_events.append((args, kwargs)))
    try:
        masked = M.control_directory(None, q="9876543210", include_contact=False, limit=10)
        row = masked["profiles"][0]
        assert row["phone"] == ""
        assert row["phone_masked"] == "98••••••10"
        assert row["contact_revealed"] is False
        revealed = M.control_directory(None, q="9876543210", include_contact=True, limit=10)
        assert revealed["profiles"][0]["phone"] == "9876543210"
        assert revealed["profiles"][0]["contact_revealed"] is True
        assert any(event[0][0] == "control_directory_contact_view" for event in audit_events)
    finally:
        M.DB_USERS[:] = old_users
        M._reindex_users()


def test_admin_csv_neutralizes_formula_cells() -> None:
    response = M._csv_response(["name", "note"], [["=HYPERLINK(\"https://evil\")", "+1-555"]], "test.csv")
    body = response.body.decode("utf-8")
    assert "'=HYPERLINK" in body
    assert "'+1-555" in body


def test_qr_image_requires_per_order_capability_token() -> None:
    old_orders = list(PP.PAY_ORDERS)
    PP.PAY_ORDERS[:] = [{
        "id": "pay_ord_QR", "mode": "manual_upi", "final_amount": 99,
        "qr_token": "one-time-qr-capability", "created_at": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S"),
    }]
    try:
        with pytest.raises(Exception) as denied:
            M.api_pay_qr_png("pay_ord_QR")
        assert getattr(denied.value, "status_code", None) == 403
    finally:
        PP.PAY_ORDERS[:] = old_orders
