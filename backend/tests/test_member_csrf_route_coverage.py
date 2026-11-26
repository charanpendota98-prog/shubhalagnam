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


def mutation_inventory(sources=None):
    """Follow local helpers too, so splitting a handler cannot bypass the guard."""
    routes = set()
    all_routes = set()
    if sources is None:
        sources = [p.read_text() for p in [BACKEND / "main.py", *sorted((BACKEND / "routers").glob("*.py"))]]
    for source in sources:
        tree = ast.parse(source)
        functions = {n.name: n for n in ast.walk(tree)
                     if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))}
        calls = {name: {getattr(n.func, "id", getattr(n.func, "attr", "")) for n in ast.walk(node)
                        if isinstance(n, ast.Call)} for name, node in functions.items()}
        guarded = {name for name, values in calls.items() if "require_owner" in values}
        while True:
            expanded = guarded | {name for name, values in calls.items() if values & guarded}
            if expanded == guarded:
                break
            guarded = expanded
        for name, function in functions.items():
            for dec in function.decorator_list:
                if (isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute)
                        and dec.func.attr in {"post", "put", "patch", "delete"}
                        and dec.args and isinstance(dec.args[0], ast.Constant)):
                    row = (dec.func.attr.upper(), dec.args[0].value)
                    all_routes.add(row)
                    if name in guarded:
                        routes.add(row)
    return sorted(routes), all_routes


OWNER_ROUTES, ALL_DECLARED_MUTATIONS = mutation_inventory()


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


@pytest.mark.parametrize("path", ["/api/pay/webhook", "/api/payment/webhook", "/api/family/accept-invite", "/api/register",
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


def runtime_mutations(routes, prefix=""):
    """Walk served paths, including lazy FastAPI includes and mounted apps."""
    for route in routes:
        effective = getattr(route, "effective_route_contexts", None)
        if callable(effective):
            for context in effective():
                target = context.starlette_route or context
                yield from runtime_mutations([target], prefix)
            continue
        path = prefix + getattr(route, "path", "")
        for method in getattr(route, "methods", set()) or set():
            if method in {"POST", "PUT", "PATCH", "DELETE"}:
                yield method, path
        children = getattr(route, "routes", None)
        if children is not None:
            yield from runtime_mutations(children, path.rstrip("/"))


def uncovered_runtime_mutations(app, declared):
    return {(method, path) for method, path in runtime_mutations(app.routes)
            if M._member_mutation_requires_csrf(route_path(path))
            and (method, path) not in declared}


def test_runtime_member_mutations_cannot_escape_inventory(monkeypatch):
    # Run real lifespan in disposable state, but do not start background workers.
    monkeypatch.setattr(M, "start_worker", lambda: False)
    monkeypatch.setattr(M, "start_wa_worker", lambda: False)
    monkeypatch.setattr(M.RETENTION, "start_daily", lambda *args: None)
    with TestClient(M.app):
        assert M.app.state.ready
        assert not uncovered_runtime_mutations(M.app, ALL_DECLARED_MUTATIONS)


def test_attribute_owner_guard_mutant_is_discovered():
    # Mutate actual repository sources instead of only a fabricated handler.
    sources = [p.read_text() for p in [BACKEND / "main.py", *sorted((BACKEND / "routers").glob("*.py"))]]
    mutated = [source.replace("require_owner(", "hardening.require_owner(") for source in sources]
    assert mutation_inventory(mutated)[0] == OWNER_ROUTES


def test_runtime_add_api_route_mutant_is_caught():
    from fastapi import FastAPI
    app = FastAPI()
    app.add_api_route("/api/pay/fixture", lambda: {}, methods=["POST"])
    assert uncovered_runtime_mutations(app, set()) == {("POST", "/api/pay/fixture")}


def test_family_invite_acceptance_keeps_prior_public_behavior_with_cookie(monkeypatch):
    calls = []
    monkeypatch.setattr(M.ECOSYSTEM3, "accept_family_invite", lambda code: calls.append(code) or (False, "Invalid fixture invite", {}))
    response = client().post("/api/family/accept-invite", json={"invite_code": "FICTIONAL-INVITE"})
    assert response.status_code == 400
    assert calls == ["FICTIONAL-INVITE"]
    assert "csrf_required" not in response.text


def test_included_router_add_api_route_mutant_is_caught():
    from fastapi import FastAPI, APIRouter
    app = FastAPI()
    inner = APIRouter()
    inner.add_api_route("/pay/fixture", lambda: {}, methods=["POST"])
    outer = APIRouter()
    outer.include_router(inner, prefix="/nested")
    app.include_router(outer, prefix="/api")
    # Nested includes preserve the effective path, independent of the policy zone.
    assert ("POST", "/api/nested/pay/fixture") in set(runtime_mutations(app.routes))
    direct = FastAPI()
    direct.include_router(inner, prefix="/api")
    assert uncovered_runtime_mutations(direct, set()) == {("POST", "/api/pay/fixture")}


def test_mounted_subapp_mutant_is_caught():
    from fastapi import FastAPI
    app, sub = FastAPI(), FastAPI()
    sub.add_api_route("/fixture", lambda: {}, methods=["POST"])
    app.mount("/api/pay", sub)
    assert uncovered_runtime_mutations(app, set()) == {("POST", "/api/pay/fixture")}


def test_lifespan_registered_mutant_is_caught():
    from contextlib import asynccontextmanager
    from fastapi import FastAPI
    @asynccontextmanager
    async def lifespan(app):
        app.add_api_route("/api/pay/startup-fixture", lambda: {}, methods=["POST"])
        yield
    app = FastAPI(lifespan=lifespan)
    assert not uncovered_runtime_mutations(app, set())
    with TestClient(app):
        assert uncovered_runtime_mutations(app, set()) == {("POST", "/api/pay/startup-fixture")}
