"""Focused tests for readiness gating and opt-in low-cardinality metrics."""
from __future__ import annotations

import os
import sys

os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("TSAP_AUTH_MODE", "on")
os.environ.setdefault("WA_TEST_FAST", "1")
os.environ.pop("METRICS_TOKEN", None)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from test_storage import isolate_test_stores  # noqa: E402

isolate_test_stores("readiness-observability")

from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402

client = TestClient(main.app, raise_server_exceptions=False)
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


main.app.state.ready = False
not_ready = client.get("/api/ready")
check("readiness blocks traffic before startup completes",
      not_ready.status_code == 503 and not_ready.json().get("status") == "starting",
      not_ready.text[:180])
check("readiness failure does not expose storage details",
      "data_db" not in not_ready.text and "password" not in not_ready.text.lower(),
      not_ready.text[:180])

main.app.state.ready = True
ready = client.get("/api/ready")
check("readiness returns a minimal ready response after startup",
      ready.status_code == 200 and ready.json().get("status") == "ready"
      and "counts" not in ready.json(), ready.text[:180])
check("readiness is never cached",
      ready.headers.get("cache-control") == "no-store", ready.headers)

tracked = []
_original_track_visit = main.track_visit
main.track_visit = lambda *args, **kwargs: tracked.append((args, kwargs))
try:
    client.get("/api/ready")
    client.get("/api/health")
finally:
    main.track_visit = _original_track_visit
check("health and readiness probes do not pollute visitor analytics", not tracked, tracked)

metrics_disabled = client.get("/metrics")
check("metrics stay undiscoverable until explicitly configured",
      metrics_disabled.status_code == 404, metrics_disabled.status_code)

os.environ["METRICS_TOKEN"] = "test-metrics-token"
metrics_denied = client.get("/metrics")
check("configured metrics still require the scrape token",
      metrics_denied.status_code == 404, metrics_denied.status_code)

metrics = client.get("/metrics", headers={"X-Metrics-Token": "test-metrics-token"})
check("authorized metrics use the Prometheus exposition format",
      metrics.status_code == 200
      and "manavivaha_http_requests_total" in metrics.text
      and "# TYPE" in metrics.text,
      metrics.text[:300])
check("metrics contain no member identifiers or request bodies",
      "phone" not in metrics.text.lower() and "tsap_id" not in metrics.text.lower(),
      metrics.text[:300])

os.environ.pop("METRICS_TOKEN", None)
main.app.state.ready = False

print(f"RESULT: {passed} passed / {failed} failed")
if failed:
    raise SystemExit(1)
