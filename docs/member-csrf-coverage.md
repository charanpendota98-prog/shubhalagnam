# Member-cookie mutation CSRF coverage

The member-cookie middleware previously used a partial prefix list. The expanded policy covers all 68 mutation route declarations that call `require_owner` directly or through local helpers in main and the three modular routers. Forty of those route templates were previously outside the policy.

This is a coverage gap, not proof of an end-to-end cross-site exploit. SameSite=Lax cookies and JSON request handling reduce exposure but do not replace an explicit CSRF check.

## Policy

- Cookie-authenticated member writes require matching CSRF cookie and header.
- Explicit legacy token headers retain existing behavior. The browser cookie is not the authentication source when a token header is present.
- Member-owned vendor quote and review actions override the broader public vendor exemption.
- Provider webhooks stay exempt from member CSRF and still require provider signatures.
- Public login, registration, tracking and lead endpoints retain existing behavior. Family invite acceptance remains invite-code authenticated and exempt even when a member cookie accompanies the request.
- Control/staff cookies use their own checks. This change does not claim to audit all control-session entry points.

## Verification

`backend/tests/test_member_csrf_route_coverage.py` discovers owner-guarded mutation declarations with AST traversal, including local helper call chains and modular router handlers. Each discovered route must match policy and reject a missing-CSRF request before its handler runs. A route-count floor and representative route checks prevent an empty inventory from passing. A second check compares every runtime member-zone mutation in app.routes with the declared inventory, catching add_api_route registrations. Attribute-style owner guard and runtime add_api_route mutants are included.

The suite also checks malformed/missing CSRF values, real payment handler reachability with valid cookie or explicit token authentication, public/provider exclusions and rejection of an invalid webhook signature even when a member cookie accompanies the request. All state is disposable and socket connections are forbidden.

Local result after review fixes: 95 passed. Against the unchanged preceding backend: 44 failed, 46 passed. The failures are the forty uncovered owner mutations and four payment handler probes. Separate existing suites: privacy 125 passed, phase2 platform five passed, webhook matrix 14 passed.

Provider capture order/currency validation is a separate follow-up. No production member or provider probes were performed.
