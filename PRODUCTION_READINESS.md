# PRODUCTION_READINESS.md

**Status after Phase 0 + first fix pass (2026-10-01).** This is scored
honestly against the "Definition of Done" checklist from the master
engagement brief — not inflated. Re-scored after every subsequent pass.

| Requirement | Status | Notes |
|---|---|---|
| Core user flows work | PASS | 110/110 dev-checks + 100/100 registration E2E passing |
| Authentication is secure | PASS WITH NOTES | See `SECURITY_AUDIT.md` — PBKDF2 iteration count, stateless-token revocation gap |
| Authorization is enforced server-side | PASS | 100% of admin/owner/moderation routes guarded (verified) |
| Redirects are correct | PASS WITH NOTES | `/remarriage` verified; full 47-route matrix not yet exhaustive (`ROUTE_MAP.md`) |
| Database integrity is protected | **NEEDS FIX (architectural)** | No real DB; JSON-file store, 1 concrete corruption bug found+fixed this pass, others not yet individually audited |
| APIs are validated | NOT YET FULLY AUDITED | `API_AUDIT.md` not yet exhaustive across 327 endpoints |
| Search is performant | PASS (today's scale) | p99 3.9ms per dev-check suite; no indexing strategy for future scale |
| Profiles work correctly | PASS | verified end-to-end incl. restart-survival this pass |
| Mobile UI is polished | PASS WITH NOTES | header/footer/bottom-nav icon system + a11y focus fix done; body-content pages not yet re-audited visually (no headless browser available in this sandbox) |
| Desktop UI is polished | PASS WITH NOTES | same caveat as above |
| Forms are robust | NOT YET FULLY AUDITED | Phase 10 follow-up |
| Errors are handled correctly | NOT YET FULLY AUDITED | Phase 15 follow-up |
| Security audit is clean | PASS WITH NOTES | targeted areas clean; full OWASP sweep + backend dependency audit pending |
| SEO foundation is correct | PASS WITH NOTES | robots/sitemap/canonical spot-checked and one contradiction fixed; full sweep pending |
| Core Web Vitals addressed | NOT YET MEASURED | no Lighthouse/CWV run performed this pass (no headless browser in sandbox) |
| Accessibility issues addressed | PASS WITH NOTES | global focus-visible fix + icon-based nav done; full WCAG sweep pending |
| Admin controls are secured | PASS | see Security table |
| Automated tests cover critical paths | PASS WITH NOTES | 46 scripts exist and pass, but are not CI/pytest-integrated |
| End-to-end journeys pass | PASS WITH NOTES | Journeys A/B tested via existing scripts; Journey C/D (admin moderation, unauthorized-redirect-then-return) not yet independently re-verified this pass |
| No critical console errors | NOT YET MEASURED | no browser available in this sandbox to check console output |
| No obvious broken links | PASS WITH NOTES | 30 routes smoke-tested 200 in a prior pass; not re-verified exhaustively this pass |
| No secrets exposed | PASS | spot-checked, not exhaustively repo-scanned |
| Production configuration is safe | PASS | app refuses to boot in production without real `ADMIN_KEY`/`TSAP_AUTH_SECRET` |

## Overall verdict
**Not yet production-ready by the full Definition of Done** — primarily
because of the JSON-file persistence architecture (a real, business-level
decision point, not a quick fix) and several "NOT YET AUDITED" rows above.
It is, however, a **functionally solid, already-hardened application** with
real security engineering history — not a from-scratch rebuild situation.

## Staged plan going forward
1. **Phase 1–2 (next):** finish `ROUTE_MAP.md` + re-verify auth journeys end-to-end (Journeys C/D).
2. **Phase 12–15:** full security sweep (IDOR, XSS, backend dependency audit), error-handling consistency pass.
3. **Phase 13 (big, staged):** document + begin a safe, reversible Postgres migration plan (schema design → migration script → shadow-write period → cutover). Not to be rushed.
4. **Phase 16–18:** SEO/Core Web Vitals/accessibility full sweep — will need a way to run Lighthouse/visual checks (not available in the current sandbox; may need to be done against the live/staging deployment instead).
5. **Phase 22:** convert the 46 standalone test scripts into a CI-runnable pytest suite.

This file will be updated (status column re-scored, not just appended) after
every subsequent phase.
