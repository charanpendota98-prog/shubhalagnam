"""Focused regression coverage for the owner WhatsApp operations boundary."""
from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace

os.environ["APP_ENV"] = "test"
os.environ["TSAP_AUTH_MODE"] = "on"
os.environ["ADMIN_KEY"] = "wa-ops-test-admin-key"
os.environ["TSAP_AUTH_SECRET"] = "wa-ops-test-secret-0123456789012345"
os.environ["WA_TEST_FAST"] = "0"
os.environ["CONTROL_OWNER_USERNAME"] = "ops-owner"
os.environ["CONTROL_WORKER_USERNAME"] = "ops-worker"

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("whatsapp-operations")

import control_auth  # noqa: E402

os.environ["CONTROL_OWNER_PASSWORD_HASH"] = control_auth.password_hash("OwnerPass@2026!")
os.environ["CONTROL_WORKER_PASSWORD_HASH"] = control_auth.password_hash("WorkerPass@2026!")

from fastapi.testclient import TestClient  # noqa: E402
import hardening  # noqa: E402
import main  # noqa: E402
import publisher  # noqa: E402
import wa_pool  # noqa: E402


passed = 0
failed = 0


def check(label: str, condition: bool, detail: object = "") -> None:
    global passed, failed
    if condition:
        passed += 1
        print(f"PASS {label}")
    else:
        failed += 1
        print(f"FAIL {label}: {str(detail)[:240]}")


class FakeResponse:
    def __init__(self, body: dict, status_code: int = 200):
        self._body = body
        self.status_code = status_code

    def json(self):
        return self._body


class FakeClient:
    calls = []
    connected = False


    def __init__(self, **kwargs):
        self.kwargs = kwargs

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def request(self, method, url, headers=None, json=None):
        self.calls.append({"method": method, "url": url, "headers": headers or {}, "json": json})
        if url.endswith("/auth/status"):
            return FakeResponse({
                "ok": True, "connected": self.connected, "registered": self.connected,
                "qr_available": not self.connected, "pairing_available": not self.connected,
                "state": "connected" if self.connected else "awaiting_qr",
            })
        if url.endswith("/auth/qr"):
            return FakeResponse({"ok": True, "connected": self.connected, "qr": "opaque-qr-payload"})
        if url.endswith("/auth/pairing-code"):
            return FakeResponse({"ok": True, "pairing_code": "ABCD-1234"})
        return FakeResponse({"ok": False}, 404)


bridge_source = Path(__file__).resolve().parents[1].joinpath("whatsapp-bridge", "index.js").read_text(encoding="utf-8")
compose_source = Path(__file__).resolve().parents[1].joinpath("docker-compose.yml").read_text(encoding="utf-8")
check("bridge production mode fails closed without a token", "BRIDGE_REQUIRE_TOKEN" in bridge_source and "return !BRIDGE_REQUIRE_TOKEN" in bridge_source)
check("bridge pairing code is not logged", "pairing_code" in bridge_source and "console.log(`Pairing code" not in bridge_source)
check("bridge keeps raw QR in process memory only", "lastQR = qr" in bridge_source and "qr.html" not in bridge_source)
check("compose keeps each bridge session isolated and internal-only",  all(x in compose_source for x in ("session2:/app/session", "session3:/app/session", "BRIDGE_REQUIRE_TOKEN=true")) and '"3001:3001"' not in compose_source)


with tempfile.TemporaryDirectory(prefix="wa-ops-") as tmp:
    state_file = os.path.join(tmp, "pool.json")
    pool = wa_pool.WAPool([
        wa_pool.WAInstance("otp-main", "http://bridge-otp:3001/send", "otp", 25, "bridge-secret-one", "+919876543210"),
        wa_pool.WAInstance("channel-main", "http://bridge-channel:3001", "channels", 40, "bridge-secret-two"),
        wa_pool.WAInstance("personal-backup", "http://bridge-backup:3001", "both", 20, "bridge-secret-three"),
    ], state_file=state_file)
    check("bridge tokens are encrypted at rest", pool.save_state()
          and "bridge-secret-one" not in open(state_file, encoding="utf-8").read()
          and '"enc:v1:' in open(state_file, encoding="utf-8").read())
    restored = wa_pool.WAPool([], state_file=state_file)
    check("encrypted bridge tokens remain compatible after reload",
          next((item.token for item in restored.instances if item.name == "otp-main"), "") == "bridge-secret-one")
    original_httpx = wa_pool.httpx
    wa_pool.httpx = SimpleNamespace(Client=FakeClient)
    wa_pool._POOL = pool
    wa_pool._SIG = (os.getenv("WA_INSTANCES", ""), os.getenv("WHATSAPP_BRIDGE_URL", ""),
                    os.getenv("WHATSAPP_BRIDGE_TOKEN", ""), os.getenv("WA_INSTANCE_STATE", ""))
    main._WA_PAIRING_COOLDOWNS.clear()
    try:
        client = TestClient(main.app, raise_server_exceptions=False)
        admin = {"X-Admin-Key": hardening.ADMIN_KEY}
        anon = TestClient(main.app, raise_server_exceptions=False)

        r = anon.get("/api/admin/wa/numbers")
        check("anonymous cannot read number configuration", r.status_code in (401, 403), r.status_code)
        r = anon.get("/api/admin/wa/numbers/otp-main/auth/qr")
        check("anonymous cannot retrieve QR", r.status_code in (401, 403), r.status_code)
        r = client.post("/api/admin/wa/numbers", headers=admin, json={"name": "bad", "url": "file:///etc/passwd"})
        check("invalid bridge URL is rejected", r.status_code == 400, r.text)
        check("bridge URL normalization accepts management-route suffixes",
              wa_pool._bridge_base_url("http://bridge:3001/auth/status") == "http://bridge:3001")
        r = client.post("/api/admin/wa/numbers", headers=admin, json={"name": "bad", "url": "http://bridge:3001", "number": "123"})
        check("invalid authorized phone input is rejected", r.status_code == 400, r.text)

        r = client.get("/api/admin/wa/numbers/otp-main/auth", headers=admin)
        check("admin receives metadata-only auth status", r.status_code == 200 and r.json().get("qr_available") is True
              and "token" not in r.text.lower(), r.text)
        alias_status = client.get("/api/admin/wa/numbers/otp-main/auth/status", headers=admin)
        check("auth status has an explicit REST alias", alias_status.status_code == 200 and alias_status.json().get("state") == "awaiting_qr", alias_status.text)
        check("backend forwards the configured bridge token server-side",
              any(call["headers"].get("X-Bridge-Token") == "bridge-secret-one" for call in FakeClient.calls), FakeClient.calls)

        r = client.get("/api/admin/wa/numbers/otp-main/auth/qr", headers=admin)
        check("admin QR is available through the application proxy", r.status_code == 200 and r.json().get("qr") == "opaque-qr-payload", r.text)
        check("QR response is not cacheable", r.headers.get("cache-control") == "no-store", r.headers)
        check("QR is not included in the normal numbers payload", "opaque-qr-payload" not in client.get("/api/admin/wa/numbers", headers=admin).text)

        invalid = client.post("/api/admin/wa/numbers/otp-main/auth/pairing-code", headers=admin, json={"phone": "not-a-phone"})
        check("pairing endpoint validates phone before bridge access", invalid.status_code == 400 and len(FakeClient.calls) >= 1, invalid.text)
        mismatch_calls = len(FakeClient.calls)
        mismatch = client.post("/api/admin/wa/numbers/otp-main/auth/pairing-code", headers=admin, json={"phone": "+919999999999"})
        check("pairing phone must match the configured authorized number", mismatch.status_code == 400 and len(FakeClient.calls) == mismatch_calls, mismatch.text)
        valid = client.post("/api/admin/wa/numbers/otp-main/auth/pairing-code", headers=admin, json={"phone": "+919876543210"})
        check("pairing code is returned only to the owner proxy request", valid.status_code == 200 and valid.json().get("pairing_code") == "ABCD-1234", valid.text)
        state_content = open(state_file, encoding="utf-8").read() if os.path.exists(state_file) else ""
        check("pairing code is not persisted in the pool state", "ABCD-1234" not in state_content, state_content)
        check("pairing phone is not echoed by the API", "+919876543210" not in valid.text and "9876543210" not in valid.text, valid.text)
        again = client.post("/api/admin/wa/numbers/otp-main/auth/pairing-code", headers=admin, json={"phone": "+919876543210"})
        check("pairing requests have a cooldown", again.status_code == 429 and again.headers.get("retry-after"), again.text)

        # A bridge state transition produces a redacted audit event.
        FakeClient.connected = True
        changed = client.get("/api/admin/wa/numbers/otp-main/auth", headers=admin)
        audit = control_auth.audit_recent(50)
        check("bridge auth state changes are audited without secrets",
              changed.status_code == 200 and any(e.get("action") == "wa_bridge_auth_state_changed" for e in audit)
              and all("ABCD-1234" not in json.dumps(e) and "+919876543210" not in json.dumps(e) for e in audit), audit[-5:])

        # Lane routing remains explicit and dedicated instances are preferred.
        check("pool exposes separate OTP/channel/personal failover orders",
              pool.order("otp")[0].name == "otp-main"
              and pool.order("channels")[0].name == "channel-main"
              and pool.order("personal")[0].name == "personal-backup", pool.health())
        check("OTP and consent/referral kinds stay in their explicit lanes",
              publisher._wa_lane({"kind": "otp"}) == "otp"
              and publisher._wa_lane({"kind": "interest_accepted", "priority": 0}) == "personal"
              and publisher._wa_lane({"kind": "personal_digest", "priority": 1}) == "personal"
              and publisher._wa_lane({"kind": "channel_post", "priority": 1}) == "channels")

        previous_mode = os.environ.get("WHATSAPP_MODE")
        os.environ["WHATSAPP_MODE"] = "bridge"
        publisher.WA_QUEUE.clear()
        publisher._WA_COMPLETED_KEYS.clear()
        first_queue = publisher.enqueue_whatsapp(["+919999999999"], "dedupe body", kind="otp", priority=0)
        second_queue = publisher.enqueue_whatsapp(["+919999999999"], "dedupe body", kind="otp", priority=0)
        check("identical operational sends are idempotently deduplicated",
              first_queue.get("added") == 1 and second_queue.get("deduplicated") == 1 and len(publisher.WA_QUEUE) == 1,
              (first_queue, second_queue))
        publisher.WA_QUEUE.clear()
        publisher._WA_COMPLETED_KEYS.clear()
        if previous_mode is None:
            os.environ.pop("WHATSAPP_MODE", None)
        else:
            os.environ["WHATSAPP_MODE"] = previous_mode
        publisher.WA_DEAD.clear()
        publisher.WA_QUEUE.append({"target": "+919999999999", "text": "secret message body", "kind": "otp", "attempts": 1})
        publisher.WA_STATS["last"] = [{"target": "+919999999999", "detail": "secret message body", "kind": "otp", "ok": False}]
        ops = publisher.worker_ops_status()
        encoded_ops = json.dumps(ops)
        check("worker snapshot includes queue heartbeat retries and dead-letter fields",
              all(key in ops for key in ("worker", "queue", "dead_letters", "paused", "recent_errors")), ops)
        check("worker snapshot withholds recipient and message data",
              "+919999999999" not in encoded_ops and "secret message body" not in encoded_ops and "bridge-secret" not in encoded_ops, encoded_ops)

        # Control-session RBAC: workers get operations status but not owner configuration.
        owner_session = control_auth.login("ops-owner", "OwnerPass@2026!")
        worker_session = control_auth.login("ops-worker", "WorkerPass@2026!")
        owner_client = TestClient(main.app, raise_server_exceptions=False)
        worker_client = TestClient(main.app, raise_server_exceptions=False)
        owner_client.cookies.set(control_auth.COOKIE_NAME, owner_session["session"])
        worker_client.cookies.set(control_auth.COOKIE_NAME, worker_session["session"])
        worker_ops = worker_client.get("/api/control/worker/ops")
        check("worker role can read least-privilege operations status",
              worker_ops.status_code == 200 and worker_ops.headers.get("cache-control") == "no-store", worker_ops.text)
        worker_admin = worker_client.get("/api/admin/wa/numbers")
        check("worker role cannot read owner WhatsApp configuration", worker_admin.status_code == 403, worker_admin.text)
        owner_admin = owner_client.get("/api/admin/wa/numbers")
        check("owner control session can read WhatsApp configuration", owner_admin.status_code == 200, owner_admin.text)
        owner_write = owner_client.post("/api/admin/wa/numbers", headers={"X-Control-CSRF": owner_session["csrf"]}, json={
            "name": "new-personal", "url": "http://bridge-new:3001", "lane": "personal", "daily_cap": 12,
        })
        check("owner control session can configure a lane with CSRF", owner_write.status_code == 200, owner_write.text)
        worker_write = worker_client.post("/api/admin/wa/numbers/personal-backup", json={"paused": True})
        check("worker cannot pause or mutate a bridge", worker_write.status_code == 403, worker_write.text)
    finally:
        wa_pool.httpx = original_httpx

print(f"RESULT: {passed} passed / {failed} failed")
if failed:
    raise SystemExit(1)
