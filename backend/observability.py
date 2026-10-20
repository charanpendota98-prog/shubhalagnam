"""Low-cardinality, opt-in Prometheus observability for the API.

The application remains usable without a metrics scrape endpoint: production
only exposes ``/metrics`` when an operator configures ``METRICS_TOKEN``. Labels
are bounded HTTP metadata (method, route template, status), never profile IDs,
phones, query strings, referrers, or request bodies.

The module uses the Apache-2.0 prometheus-client project rather than inventing a
metrics wire format. It deliberately owns a private registry so test imports,
workers, and future plugin integrations cannot collide through the process-wide
default registry.
"""
from __future__ import annotations

import hmac
import os

from prometheus_client import CONTENT_TYPE_LATEST, CollectorRegistry, Counter, Gauge, Histogram, generate_latest

REGISTRY = CollectorRegistry(auto_describe=True)

REQUESTS = Counter(
    "manavivaha_http_requests_total",
    "HTTP requests completed by the Mana Vivaha API.",
    ("method", "route", "status"),
    registry=REGISTRY,
)
REQUEST_LATENCY = Histogram(
    "manavivaha_http_request_duration_seconds",
    "HTTP request duration in seconds.",
    ("method", "route"),
    # Keep useful latency buckets without creating a high-cardinality metric.
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
    registry=REGISTRY,
)
READINESS = Gauge(
    "manavivaha_readiness",
    "Whether the API completed its startup checks (1 ready, 0 not ready).",
    registry=REGISTRY,
)


def configured() -> bool:
    """Return whether an operator intentionally enabled the scrape endpoint."""
    return bool(os.getenv("METRICS_TOKEN", "").strip())


def authorized(candidate: str) -> bool:
    """Compare a supplied token without exposing timing information."""
    expected = os.getenv("METRICS_TOKEN", "").strip()
    supplied = str(candidate or "").strip()
    return bool(expected) and hmac.compare_digest(supplied, expected)


def route_template(request) -> str:
    """Resolve a bounded Starlette route template, never a user-controlled path."""
    route = request.scope.get("route") if request is not None else None
    template = getattr(route, "path", "") if route is not None else ""
    if not isinstance(template, str) or not template or len(template) > 160:
        return "unmatched"
    return template


def observe(request, status_code: int, elapsed_seconds: float) -> None:
    """Record one request with bounded labels; telemetry must never break traffic."""
    try:
        method = str(getattr(request, "method", "UNKNOWN") or "UNKNOWN").upper()[:12]
        route = route_template(request)
        status = str(int(status_code))
        REQUESTS.labels(method=method, route=route, status=status).inc()
        REQUEST_LATENCY.labels(method=method, route=route).observe(max(0.0, float(elapsed_seconds)))
    except Exception:
        # Observability is intentionally fail-open for the request path.
        return


def set_ready(value: bool) -> None:
    """Update the scrape-safe readiness gauge."""
    try:
        READINESS.set(1 if value else 0)
    except Exception:
        return


def render() -> tuple[bytes, str]:
    """Render the standard Prometheus exposition payload."""
    return generate_latest(REGISTRY), CONTENT_TYPE_LATEST


__all__ = [
    "CONTENT_TYPE_LATEST",
    "authorized",
    "configured",
    "observe",
    "render",
    "route_template",
    "set_ready",
]
