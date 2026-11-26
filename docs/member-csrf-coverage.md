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

`backend/tests/test_member_csrf_route_coverage.py` discovers owner-guarded mutation declarations with AST traversal, including local helper call chains and modular router handlers. Each discovered route must match policy and reject a missing-CSRF request before its handler runs. A route-count floor and representative route checks prevent an empty inventory from passing. A second check starts the actual app lifespan in disposable state (background workers disabled), then recursively compares served member-zone mutation paths with the declared inventory. It follows FastAPI lazy included-router effective paths and mounted sub-apps, including prefixes. Attribute-style owner guards are checked by transforming the repository sources. Direct, included-router, mounted-sub-app and lifespan registration mutants are included. Two additional mutants inserted registrations into the actual phase2 router and actual application lifespan; each failed the runtime inventory assertion.

The suite also checks malformed/missing CSRF values, real payment handler reachability with valid cookie or explicit token authentication, public/provider exclusions and rejection of an invalid webhook signature even when a member cookie accompanies the request. All state is disposable and socket connections are forbidden.

Local result after final review fixes: 98 passed. Against the unchanged preceding backend (PR213): 48 failed, 50 passed. The failures are forty uncovered owner mutations, four bad-CSRF payment rejection probes, and four policy-dependent runtime-mutant checks. For the intermediate 95-test version reviewed earlier, the corresponding result was 45 failed, 50 passed. Separate existing suites: privacy 125 passed, phase2 platform five passed, webhook matrix 14 passed.

Provider capture order/currency validation is a separate follow-up. No production member or provider probes were performed.

## Guard limits

This guard does not prove complete authentication or CSRF coverage for every endpoint. AST ownership discovery is limited to named require_owner calls and same-file helper call chains in main.py and backend/routers/*.py. Aliased/dynamic guards, additional source directories, non-HTTP transports and routes outside the current member policy need separate review. The runtime comparison flags unknown registrations only inside that policy zone; a new unguarded route outside it is not found by that comparison. Decorators on relative router/sub-app paths may need an explicit normalized inventory when such source shapes are introduced; current scanned routes use absolute paths.

Deliberately deleting or weakening the inventory assertions or whitelisting a new route can defeat the tests. That is an accepted review limit, not a guarantee provided by these tests. The count floor is a regression aid, not a proof of completeness. Control/staff-session checks and partner-token-only flows remain separate work. The existing partner flow with a coincident member cookie has a confirmed compatibility defect and is not fixed in this PR.
