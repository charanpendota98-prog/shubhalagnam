import os
import sys
import json
import time
from unittest.mock import patch

os.environ.setdefault("WA_TEST_FAST", "1")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores
_TEST_STORE = isolate_test_stores("wave22-passkey")

import main as M
from fastapi.testclient import TestClient
from webauthn.helpers import bytes_to_base64url

c = TestClient(M.app)

user1 = {"tsap_id": "PKEY-1", "phone": "1234567890", "passkeys": []}
user2 = {"tsap_id": "PKEY-2", "phone": "0987654321", "passkeys": []}
M.DB_USERS.extend([user1, user2])
token1 = M.sign_token("PKEY-1")
token2 = M.sign_token("PKEY-2")

class MockRegistration:
    credential_id = b"test-cred-id"
    credential_public_key = b"test-pub-key"
    sign_count = 0

class MockAuthentication:
    new_sign_count = 1

with patch("main.verify_registration_response", return_value=MockRegistration()), \
     patch("main.verify_authentication_response", return_value=MockAuthentication()):

    # 1. Register passkey and verify persistence
    r1 = c.post("/api/auth/passkey/register/begin", json={"tsap_id": "PKEY-1"}, headers={"X-Tsap-Token": token1})
    assert r1.status_code == 200
    challenge_id = r1.json()["challenge_id"]

    r2 = c.post("/api/auth/passkey/register/finish", json={
        "tsap_id": "PKEY-1",
        "challenge_id": challenge_id,
        "response": {"id": bytes_to_base64url(b"test-cred-id"), "rawId": bytes_to_base64url(b"test-cred-id"), "type": "public-key"}
    }, headers={"X-Tsap-Token": token1})
    assert r2.status_code == 200
    
    # Reload from disk
    import db_store
    disk_data = db_store.load()
    u1_disk = next(u for u in disk_data["users"] if u["tsap_id"] == "PKEY-1")
    assert len(u1_disk.get("passkeys", [])) == 1
    assert u1_disk["passkeys"][0]["credential_id"] == bytes_to_base64url(b"test-cred-id")

    # 2. Reject duplicate credential id across users
    r3 = c.post("/api/auth/passkey/register/begin", json={"tsap_id": "PKEY-2"}, headers={"X-Tsap-Token": token2})
    r4 = c.post("/api/auth/passkey/register/finish", json={
        "tsap_id": "PKEY-2",
        "challenge_id": r3.json()["challenge_id"],
        "response": {"id": bytes_to_base64url(b"test-cred-id"), "rawId": bytes_to_base64url(b"test-cred-id"), "type": "public-key"}
    }, headers={"X-Tsap-Token": token2})
    assert r4.status_code == 409
    assert "another account" in r4.text

    # 3. Reject expired challenge
    r5 = c.post("/api/auth/passkey/register/begin", json={"tsap_id": "PKEY-2"}, headers={"X-Tsap-Token": token2})
    c5_id = r5.json()["challenge_id"]
    # Manually backdate the challenge
    M._PASSKEY_CHALLENGES[c5_id]["time"] = time.time() - 601
    
    r6 = c.post("/api/auth/passkey/register/finish", json={
        "tsap_id": "PKEY-2",
        "challenge_id": c5_id,
        "response": {"id": bytes_to_base64url(b"other-cred-id"), "rawId": bytes_to_base64url(b"other-cred-id"), "type": "public-key"}
    }, headers={"X-Tsap-Token": token2})
    assert r6.status_code == 400
    assert "expired" in r6.text

    # 4. Login passkey and verify sign_count persistence
    r7 = c.post("/api/auth/passkey/login/begin")
    l_challenge_id = r7.json()["challenge_id"]

    r8 = c.post("/api/auth/passkey/login/finish", json={
        "challenge_id": l_challenge_id,
        "response": {
            "id": bytes_to_base64url(b"test-cred-id"),
            "rawId": bytes_to_base64url(b"test-cred-id"),
            "type": "public-key",
            "response": {
                "userHandle": bytes_to_base64url(b"PKEY-1")
            }
        }
    })
    assert r8.status_code == 200
    assert r8.json()["tsap_id"] == "PKEY-1"
    
    # Reload from disk
    disk_data2 = db_store.load()
    u1_disk2 = next(u for u in disk_data2["users"] if u["tsap_id"] == "PKEY-1")
    assert u1_disk2["passkeys"][0]["sign_count"] == 1

    print("Passkey endpoints integration OK")
