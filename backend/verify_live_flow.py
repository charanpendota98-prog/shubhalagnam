#!/usr/bin/env python3
"""Read-only local/live smoke check for Mana Vivaha.

Safe by default: this script sends GET requests only. It does not log in as a
member, mint demo tokens, register test users/vendors, track clicks, approve
records, trigger payment webhooks, or post to messaging channels.

Usage (from backend/):
    ../.venv/bin/python verify_live_flow.py

Optional endpoint overrides are SMOKE_WEB and SMOKE_API. An optional public
referral-code validation check uses SMOKE_REFERRAL_CODE. No member credentials,
profile IDs, payment references, or destination addresses are stored here.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

WEB = (os.getenv("SMOKE_WEB") or "http://127.0.0.1:3000").rstrip("/")
API = (os.getenv("SMOKE_API") or "http://127.0.0.1:8000").rstrip("/")
PASS: list[str] = []
FAIL: list[str] = []


def check(name: str, condition: bool, detail: object = "") -> None:
    (PASS if condition else FAIL).append(name)
    suffix = f" | {detail}" if detail and not condition else ""
    print(("  ✅ " if condition else "  ❌ ") + name + suffix)


def get(path: str, base: str = API):
    """Perform one unauthenticated, read-only GET and return (status, parsed-json-or-body)."""
    try:
        request = urllib.request.Request(
            base + path,
            method="GET",
            headers={"Accept": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=20) as response:
            body = response.read()
            content_type = response.headers.get("content-type", "")
            data = json.loads(body.decode("utf-8")) if "json" in content_type else body
            return response.status, data
    except urllib.error.HTTPError as error:
        return error.code, error.read()[:200]
    except Exception as error:  # network/timeout/parse failure is reported, not hidden
        return 0, str(error)[:160]


def main() -> int:
    print("=== READ-ONLY PAGES ===")
    pages = ["/", "/pricing", "/terms", "/privacy", "/refund", "/register",
             "/admin", "/channels", "/castes", "/vendors", "/vendors/register",
             "/matches", "/requests", "/safety", "/sitemap.xml", "/robots.txt"]
    for path in pages:
        status, _ = get(path, WEB)
        check(f"page {path} → 200", status == 200, status)

    print("=== READ-ONLY PUBLIC API ===")
    status, health = get("/api/health")
    check("/api/health responds", status == 200 and isinstance(health, dict), status)

    status, plans = get("/api/plans")
    plan_rows = plans.get("plans", []) if isinstance(plans, dict) else []
    check("/api/plans returns a plan list", status == 200 and isinstance(plan_rows, list), status)
    if plan_rows:
        prices = {str(plan.get("code")): plan.get("price") for plan in plan_rows if isinstance(plan, dict)}
        check("paid consumer plans start at ₹99", prices.get("S_99") == 99, prices.get("S_99"))

    status, channels = get("/api/channels")
    check("/api/channels responds", status == 200 and isinstance(channels, dict), status)

    status, terms = get("/api/referral/terms")
    check("/api/referral/terms responds", status == 200 and isinstance(terms, dict), status)

    status, leaderboard = get("/api/referral/leaderboard?period=week&limit=5")
    check("/api/referral/leaderboard responds", status == 200 and isinstance(leaderboard, dict), status)

    status, categories = get("/api/vendors/categories")
    check("/api/vendors/categories responds", status == 200 and isinstance(categories, dict), status)

    status, packages = get("/api/vendors/packages")
    check("/api/vendors/packages responds", status == 200 and isinstance(packages, dict), status)

    status, directory = get("/api/vendors?limit=5")
    check("/api/vendors directory responds", status == 200 and isinstance(directory, dict), status)
    if status == 200 and isinstance(directory, dict) and directory.get("vendors"):
        vendor_id = str(directory["vendors"][0].get("id") or "")
        if vendor_id:
            detail_status, detail = get(f"/api/vendors/{urllib.request.pathname2url(vendor_id)}")
            check("active vendor detail responds", detail_status == 200 and isinstance(detail, dict), detail_status)

    referral_code = (os.getenv("SMOKE_REFERRAL_CODE") or "").strip()
    if referral_code:
        status, validation = get(f"/api/referral/validate/{urllib.request.pathname2url(referral_code)}")
        check("configured referral code can be read", status == 200 and isinstance(validation, dict), status)
    else:
        print("  ↪ referral-code validation skipped (SMOKE_REFERRAL_CODE is unset)")

    print(f"\n=== RESULT: {len(PASS)} pass / {len(FAIL)} fail ===")
    if FAIL:
        print("Failed probes: " + ", ".join(FAIL))
        return 1
    print("Read-only smoke check passed. This does not verify payment, identity, channel delivery, or external link availability.")
    return 0


if __name__ == "__main__":
    # Retired options previously performed live registration/payment mutations.
    # Fail closed rather than silently doing anything destructive on an old command.
    retired = {"--flow", "--vendor"}.intersection(sys.argv[1:])
    if retired:
        print("Refusing retired destructive smoke option(s): " + ", ".join(sorted(retired)), file=sys.stderr)
        print("Use isolated backend tests for mutation flows. The live smoke script is GET-only.", file=sys.stderr)
        raise SystemExit(2)
    raise SystemExit(main())
