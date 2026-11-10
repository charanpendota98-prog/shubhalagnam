import os
import sys
import json
import time
import hashlib
import struct
import cbor2
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import hashes
from webauthn.helpers import bytes_to_base64url, base64url_to_bytes

os.environ.setdefault("WA_TEST_FAST", "1")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores
_TEST_STORE = isolate_test_stores("wave22-passkey")

import main as M
from fastapi.testclient import TestClient

c = TestClient(M.app)

user1 = {"tsap_id": "PKEY-1", "phone": "1234567890", "password_hash": M._hash_password("password123"), "passkeys": []}
user2 = {"tsap_id": "PKEY-2", "phone": "0987654321", "password_hash": M._hash_password("password123"), "passkeys": []}
M.DB_USERS.extend([user1, user2])
token1 = M.sign_token("PKEY-1")
token2 = M.sign_token("PKEY-2")

def gen_reg_response(challenge_b64, origin="http://localhost", rp_id="localhost", force_cred_id=b"test-cred-id-123"):
    client_data = json.dumps({"type": "webauthn.create", "challenge": challenge_b64, "origin": origin}).encode("utf-8")
    private_key = ec.generate_private_key(ec.SECP256R1())
    pn = private_key.public_key().public_numbers()
    cose_key = cbor2.dumps({1: 2, 3: -7, -1: 1, -2: pn.x.to_bytes(32, "big"), -3: pn.y.to_bytes(32, "big")})
    rp_id_hash = hashlib.sha256(rp_id.encode("utf-8")).digest()
    flags = 0b01000101  # UP + UV + AT
    auth_data = rp_id_hash + bytes([flags]) + struct.pack(">I", 0) + (b"\x00" * 16) + struct.pack(">H", len(force_cred_id)) + force_cred_id + cose_key
    att_obj = cbor2.dumps({"fmt": "none", "attStmt": {}, "authData": auth_data})
    return {"id": bytes_to_base64url(force_cred_id), "rawId": bytes_to_base64url(force_cred_id), "type": "public-key", "response": {"clientDataJSON": bytes_to_base64url(client_data), "attestationObject": bytes_to_base64url(att_obj), "transports": ["internal"]}}, private_key

def gen_auth_response(challenge_b64, private_key, cred_id_b64, origin="http://localhost", rp_id="localhost", sign_count_val=1):
    client_data = json.dumps({"type": "webauthn.get", "challenge": challenge_b64, "origin": origin}).encode("utf-8")
    rp_id_hash = hashlib.sha256(rp_id.encode("utf-8")).digest()
    auth_data = rp_id_hash + bytes([0b00000101]) + struct.pack(">I", sign_count_val)
    signature = private_key.sign(auth_data + hashlib.sha256(client_data).digest(), ec.ECDSA(hashes.SHA256()))
    return {"id": cred_id_b64, "rawId": cred_id_b64, "type": "public-key", "response": {"clientDataJSON": bytes_to_base64url(client_data), "authenticatorData": bytes_to_base64url(auth_data), "signature": bytes_to_base64url(signature), "userHandle": bytes_to_base64url(b"PKEY-1")}}

# 1. Negative Test: Enrollment without password or wrong password
r_nopw = c.post("/api/auth/passkey/register/begin", json={"tsap_id": "PKEY-1"}, headers={"X-Tsap-Token": token1})
assert r_nopw.status_code == 400
assert "Password required" in r_nopw.text

r_wrongpw = c.post("/api/auth/passkey/register/begin", json={"tsap_id": "PKEY-1", "password": "wrong"}, headers={"X-Tsap-Token": token1})
assert r_wrongpw.status_code == 401

# 2. Register passkey and verify persistence
r1 = c.post("/api/auth/passkey/register/begin", json={"tsap_id": "PKEY-1", "password": "password123"}, headers={"X-Tsap-Token": token1})
assert r1.status_code == 200
challenge_id = r1.json()["challenge_id"]
challenge_b64 = r1.json()["options"]["challenge"]

response_payload, priv_key = gen_reg_response(challenge_b64)

# Try wrong password on finish
r2_wrongpw = c.post("/api/auth/passkey/register/finish", json={
    "tsap_id": "PKEY-1", "password": "wrong", "challenge_id": challenge_id, "response": response_payload
}, headers={"X-Tsap-Token": token1})
assert r2_wrongpw.status_code == 401

r2 = c.post("/api/auth/passkey/register/finish", json={
    "tsap_id": "PKEY-1", "password": "password123", "challenge_id": challenge_id, "response": response_payload
}, headers={"X-Tsap-Token": token1})
assert r2.status_code == 200

# 3. Reject duplicate credential id across users
r3 = c.post("/api/auth/passkey/register/begin", json={"tsap_id": "PKEY-2", "password": "password123"}, headers={"X-Tsap-Token": token2})
assert r3.status_code == 200
challenge_id_2 = r3.json()["challenge_id"]
response_payload_2, priv_key_2 = gen_reg_response(r3.json()["options"]["challenge"], force_cred_id=b"test-cred-id-123")
r4 = c.post("/api/auth/passkey/register/finish", json={
    "tsap_id": "PKEY-2", "password": "password123", "challenge_id": challenge_id_2, "response": response_payload_2
}, headers={"X-Tsap-Token": token2})
assert r4.status_code == 409

# 4. Reject expired challenge
r5 = c.post("/api/auth/passkey/register/begin", json={"tsap_id": "PKEY-2", "password": "password123"}, headers={"X-Tsap-Token": token2})
c5_id = r5.json()["challenge_id"]
M._PASSKEY_CHALLENGES[c5_id]["time"] = time.time() - 601
response_payload_5, priv_key_5 = gen_reg_response(r5.json()["options"]["challenge"])
r6 = c.post("/api/auth/passkey/register/finish", json={
    "tsap_id": "PKEY-2", "password": "password123", "challenge_id": c5_id, "response": response_payload_5
}, headers={"X-Tsap-Token": token2})
assert r6.status_code == 400

# 5. Negative Test: Wrong origin
r7 = c.post("/api/auth/passkey/register/begin", json={"tsap_id": "PKEY-2", "password": "password123"}, headers={"X-Tsap-Token": token2})
c7_id = r7.json()["challenge_id"]
response_payload_7, _ = gen_reg_response(r7.json()["options"]["challenge"], origin="https://evil.com")
r8 = c.post("/api/auth/passkey/register/finish", json={
    "tsap_id": "PKEY-2", "password": "password123", "challenge_id": c7_id, "response": response_payload_7
}, headers={"X-Tsap-Token": token2})
assert r8.status_code == 400
assert "origin" in r8.text.lower()

# 6. Login passkey and verify sign_count persistence
r9 = c.post("/api/auth/passkey/login/begin")
l_challenge_id = r9.json()["challenge_id"]
l_challenge_b64 = r9.json()["options"]["challenge"]

auth_payload = gen_auth_response(l_challenge_b64, priv_key, response_payload["id"])

# Try with wrong challenge
r10 = c.post("/api/auth/passkey/login/finish", json={"challenge_id": "wrong", "response": auth_payload})
assert r10.status_code == 400

r11 = c.post("/api/auth/passkey/login/finish", json={"challenge_id": l_challenge_id, "response": auth_payload})
assert r11.status_code == 200
assert r11.json()["tsap_id"] == "PKEY-1"

print("Passkey endpoints real crypto integration OK")
