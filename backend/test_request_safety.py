"""Focused regression tests for request correlation and cheap abuse guards."""
from __future__ import annotations

import os
import re
import sys

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("TSAP_AUTH_MODE", "on")
os.environ.setdefault("OTP_DEV_MODE", "false")
os.environ.setdefault("MEMBER_COOKIE_SESSIONS", "1")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("request-safety")

from fastapi.testclient import TestClient  # noqa: E402
import main as M  # noqa: E402
import hardening as H  # noqa: E402

client = TestClient(M.app, raise_server_exceptions=False)
client.cookies.set(H.MEMBER_SESSION_COOKIE, H.sign_token("NO-SUCH-MEMBER"))
client.cookies.set(H.MEMBER_CSRF_COOKIE, "csrf-test-token")


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


response = client.get("/api/plans")
request_id = response.headers.get("x-request-id", "")
check("public responses carry a bounded request correlation id",
      response.status_code == 200 and re.fullmatch(r"[A-Za-z0-9._-]{8,80}", request_id) is not None,
      request_id)

supplied = client.get("/api/plans", headers={"X-Request-ID": "client-trace_2026-01"})
check("valid caller correlation ids are preserved", supplied.headers.get("x-request-id") == "client-trace_2026-01",
      supplied.headers.get("x-request-id"))

malformed = client.get("/api/plans", headers={"X-Request-ID": "bad value with spaces"})
check("malformed correlation ids are replaced rather than reflected", malformed.headers.get("x-request-id") != "bad value with spaces"
      and re.fullmatch(r"[A-Za-z0-9._-]{8,80}", malformed.headers.get("x-request-id", "")) is not None,
      malformed.headers.get("x-request-id"))

oversized = client.post("/api/register", headers={"Content-Length": str(9 * 1024 * 1024)})
check("registration rejects oversized bodies before multipart work", oversized.status_code == 413,
      oversized.text[:180])

csrf_missing = client.post("/api/interest/respond", json={})
check("cookie-authenticated member mutations require CSRF", csrf_missing.status_code == 403,
      csrf_missing.text[:180])
csrf_valid = client.post("/api/interest/respond", headers={"X-CSRF-Token": "csrf-test-token"}, json={})
check("a valid CSRF token reaches route authorization", csrf_valid.status_code != 403,
      csrf_valid.status_code)
check("cookie-session mode does not serialize bearer tokens for JavaScript",
      H.MEMBER_COOKIE_SESSIONS and M._browser_auth_token("secret-token") == "")

check("expensive public reads have explicit route limits",
      H.RL_RULES.get("GET /api/search") == (120, 60)
      and H.RL_RULES.get("GET /api/facets") == (120, 60), H.RL_RULES)

admin_health_denied = client.get("/api/admin/health")
check("operational health is not public", admin_health_denied.status_code == 403,
      admin_health_denied.status_code)
admin_health = client.get("/api/admin/health", headers={"X-Admin-Key": H.ADMIN_KEY})
check("admin health retains detailed diagnostics behind auth",
      admin_health.status_code == 200
      and "counts" in admin_health.json()
      and "pay_mode" in admin_health.json(),
      admin_health.text[:180])

_original_app_env = os.environ.get("APP_ENV")
os.environ["APP_ENV"] = "production"
try:
    production_health = client.get("/api/health")
    production_body = production_health.json()
    check("production health is a minimal public liveness response",
          production_health.status_code == 200
          and production_body.get("status") == "ok"
          and "counts" not in production_body
          and "pay_mode" not in production_body
          and "wa_queue" not in production_body,
          production_body)
finally:
    if _original_app_env is None:
        os.environ.pop("APP_ENV", None)
    else:
        os.environ["APP_ENV"] = _original_app_env

print(f"RESULT: {passed} passed / {failed} failed")
if failed:
    raise SystemExit(1)
