import os
import sys
import json
from unittest.mock import patch

os.environ.setdefault("WA_TEST_FAST", "1")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores
_TEST_STORE = isolate_test_stores("wave22-passkey")

import main as M
from fastapi.testclient import TestClient
from webauthn.helpers import bytes_to_base64url

c = TestClient(M.app)

user = {"tsap_id": "PKEY-1", "phone": "1234567890", "passkeys": []}
M.DB_USERS.append(user)
token = M.sign_token("PKEY-1")

# Mock verification
class MockRegistration:
    credential_id = b"test-cred-id"
    credential_public_key = b"test-pub-key"
    sign_count = 0

class MockAuthentication:
    new_sign_count = 1

with patch("main.verify_registration_response", return_value=MockRegistration()), \
     patch("main.verify_authentication_response", return_value=MockAuthentication()):

    # Register
    r1 = c.post("/api/auth/passkey/register/begin", json={"tsap_id": "PKEY-1"}, headers={"X-Tsap-Token": token})
    assert r1.status_code == 200, r1.text
    challenge_id = r1.json()["challenge_id"]

    r2 = c.post("/api/auth/passkey/register/finish", json={
        "tsap_id": "PKEY-1",
        "challenge_id": challenge_id,
        "response": {"id": bytes_to_base64url(b"test-cred-id"), "rawId": bytes_to_base64url(b"test-cred-id"), "type": "public-key"}
    }, headers={"X-Tsap-Token": token})
    assert r2.status_code == 200, r2.text
    
    u = next(x for x in M.DB_USERS if x["tsap_id"] == "PKEY-1")
    assert len(u["passkeys"]) == 1
    assert u["passkeys"][0]["credential_id"] == bytes_to_base64url(b"test-cred-id")

    # Login
    r3 = c.post("/api/auth/passkey/login/begin")
    assert r3.status_code == 200, r3.text
    l_challenge_id = r3.json()["challenge_id"]

    r4 = c.post("/api/auth/passkey/login/finish", json={
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
    assert r4.status_code == 200, r4.text
    assert r4.json()["tsap_id"] == "PKEY-1"
    assert r4.json()["success"] is True

    print("Passkey endpoints integration OK")
