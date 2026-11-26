"""Member-cookie CSRF coverage, disposable stores and no provider access."""
import ast
import os
import re
import sys
import socket
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

BACKEND = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND))
from test_storage import isolate_test_stores

isolate_test_stores("member-csrf-route-coverage")
os.environ.update(APP_ENV="test", ENV="test", TSAP_AUTH_MODE="enforce",
                  MEMBER_COOKIE_SESSIONS="true", TSAP_AUTH_SECRET="isolated-csrf-secret-" + "x" * 40)
import main as M
import hardening as H
import paypro as P


@pytest.fixture(autouse=True)
def block_provider_network(monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("External network forbidden in isolated CSRF test")
    monkeypatch.setattr(socket.socket, "connect", forbidden)


def owner_routes():
    """Follow local helpers too, so splitting a handler cannot bypass the guard."""
    routes = set()
    for path in [BACKEND / "main.py", *sorted((BACKEND / "routers").glob("*.py"))]:
        tree = ast.parse(path.read_text())
        functions = {n.name: n for n in ast.walk(tree)
                     if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}
        calls = {name: {getattr(n.func, "id", "") for n in ast.walk(node)
                        if isinstance(n, ast.Call)} for name, node in functions.items()}
        guarded = {name for name, values in calls.items() if "require_owner" in values}
        while True:
            expanded = guarded | {name for name, values in calls.items() if values & guarded}
            if expanded == guarded:
                break
            guarded = expanded
        for name in guarded:
            for dec in functions[name].decorator_list:
                if (isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute)
                        and dec.func.attr in {"post", "put", "patch", "delete"}
                        and dec.args and isinstance(dec.args[0], ast.Constant)):
                    routes.add((dec.func.attr.upper(), dec.args[0].value))
    return sorted(routes)


OWNER_ROUTES = owner_routes()


def route_path(template):
    return re.sub(r"\{[^}]+\}", "FICTIONAL-CSRF", template)


def client(cookie=True):
    c = TestClient(M.app)
    if cookie:
        c.cookies.set(H.MEMBER_SESSION_COOKIE, H.sign_token("FICTIONAL-CSRF"))
        c.cookies.set(H.MEMBER_CSRF_COOKIE, "fixture-csrf")
    return c


def test_owner_inventory_is_not_empty_or_missing_modular_routes():
    assert len(OWNER_ROUTES) >= 68
    for template in ["/api/profile/update", "/api/pay/order", "/api/me/{tsap_id}/sessions/register",
                     "/api/vendors/{vendor_id}/quote", "/api/media/{tsap_id}/inspect"]:
        assert ("POST", template) in OWNER_ROUTES


@pytest.mark.parametrize("method,template", OWNER_ROUTES)
def test_every_owner_mutation_is_covered_and_rejects_missing_csrf(method, template):
    path = route_path(template)
    assert M._member_mutation_requires_csrf(path), template
    # No handler executes, so even destructive routes never touch fixture state.
    response = client().request(method, path, json={})
    assert response.status_code == 403, (template, response.text)
    assert response.json()["error"] == "csrf_required"


@pytest.mark.parametrize("cookie_value,header_value", [
    ("fixture-csrf", "wrong"), ("", "fixture-csrf"), ("fixture-csrf", ""),
    ("x" * 161, "x" * 161),
])
def test_cookie_payment_rejects_bad_csrf_before_action(monkeypatch, cookie_value, header_value):
    c = client()
    c.cookies.set(H.MEMBER_CSRF_COOKIE, cookie_value)
    def forbidden(*args, **kwargs):
        pytest.fail("payment action reached without matching CSRF")
    monkeypatch.setattr(P, "create_pay_order", forbidden)
    response = c.post("/api/pay/order", json={"tsap_id": "FICTIONAL-CSRF"},
                      headers={"x-csrf-token": header_value})
    assert response.status_code == 403
    assert response.json()["error"] == "csrf_required"


@pytest.mark.parametrize("auth_mode", ["cookie", "legacy", "legacy-with-stale-cookie"])
def test_valid_cookie_and_explicit_header_auth_reach_payment_action(monkeypatch, auth_mode):
    monkeypatch.setattr(M, "DB_USERS", [{"tsap_id": "FICTIONAL-CSRF"}])
    M._USERS_ID_MAP.clear()
    calls = []
    monkeypatch.setattr(P, "create_pay_order", lambda *args: calls.append(args) or {"success": True})
    c = client(cookie=auth_mode != "legacy")
    headers = {"x-csrf-token": "fixture-csrf"} if auth_mode == "cookie" else {
        "x-tsap-token": H.sign_token("FICTIONAL-CSRF")}
    response = c.post("/api/pay/order", json={"tsap_id": "FICTIONAL-CSRF"}, headers=headers)
    assert response.status_code == 200, response.text
    assert len(calls) == 1
    M._USERS_ID_MAP.clear()


@pytest.mark.parametrize("path", ["/api/pay/webhook", "/api/payment/webhook", "/api/register",
    "/api/auth/login-password", "/api/auth/passkey/login/begin", "/api/auth/passkey/login/finish",
    "/api/referral/partner/register", "/api/referral/click/fixture", "/api/spotlight/track/fixture",
    "/api/vendors/register", "/api/vendors/fixture/lead", "/api/vendors/fixture/click",
    "/api/ads/fixture/click"])
def test_public_or_provider_routes_remain_exempt(path):
    assert not M._member_mutation_requires_csrf(path)


def test_webhook_with_member_cookie_still_requires_provider_signature(monkeypatch):
    monkeypatch.setattr(P, "verify_webhook_signature", lambda *args: False)
    response = client().post("/api/pay/webhook", json={})
    assert response.status_code == 401
    assert "csrf_required" not in response.text
