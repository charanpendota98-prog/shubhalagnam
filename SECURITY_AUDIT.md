# SECURITY_AUDIT.md — Phase 0/12 spot-check (PASS WITH NOTES overall)

**Status: targeted verification of auth, session, upload, and admin-authz
layers completed this pass. Full OWASP Top 10 sweep (IDOR per-endpoint, XSS
sink audit, dependency CVE scan on backend) is a follow-up phase.** No
critical, currently-exploitable vulnerability was found in the areas
inspected; one critical *dependency* CVE (Next.js) was found and patched.

| Area | Status | Evidence |
|---|---|---|
| Password hashing | PASS WITH NOTES | PBKDF2-HMAC-SHA256, 120k iterations, random salt. Below OWASP-2023's ~600k recommendation for PBKDF2 alone — raise in a future pass, not P0. |
| Session tokens | PASS WITH NOTES | HMAC-SHA256 signed, embedded expiry, `hmac.compare_digest` (timing-safe). Stateless → cannot be server-revoked before natural expiry (30d default). No token-blacklist/"logout everywhere" mechanism exists. |
| Admin/owner auth | PASS | Constant-time key comparison; app **refuses to boot in production** without a 32+ char `ADMIN_KEY` and a real `TSAP_AUTH_SECRET`. |
| Admin authorization enforcement | PASS | 100% of `/api/admin/*`, `/api/owner/*`, `/api/moderation/*` routes in `main.py` have a programmatically-verified guard. |
| Cookies (control panel) | PASS | `httponly=True`, `secure=<production>`, `samesite=strict`. |
| CSRF | PASS WITH NOTES | User API uses header-based bearer tokens (not ambient cookies) for mutating calls — inherently CSRF-resistant. Admin cookie path relies on `samesite=strict` as its primary CSRF mitigation; no secondary CSRF-token scheme. Acceptable, not P0. |
| Rate limiting | PASS | Login lockout (5 attempts/15min), OTP lockout, sliding-window limiter on OTP/register/interest/webhook endpoints. |
| File upload validation | PASS | Content-based validation via PIL (`Image.open`+`.load()`, not extension/MIME trust), format whitelist, size bounds, resolution/brightness/blur/glare/photo-of-photo heuristics. Not yet re-verified this pass: on-disk filename handling / path-traversal surface for the validated bytes. |
| Dependency vulnerabilities (frontend) | **Fixed this pass** | `npm audit`: was 1 critical (Next.js RCE) + 1 high (ReDoS) → now 0. |
| Dependency vulnerabilities (backend) | NOT YET AUDITED | `pip-audit`/`safety` scan not yet run against `requirements.txt` — Phase 12 follow-up. |
| SQL injection | N/A | No SQL database is in use anywhere in the backend (see `DATABASE_AUDIT.md`) — this class of vulnerability does not apply today. Will become relevant if/when a Postgres migration happens. |
| XSS (stored/reflected/DOM) | NOT YET AUDITED | No `dangerouslySetInnerHTML` sweep or output-encoding audit performed this pass — Phase 12 follow-up. |
| IDOR on profile data | NOT YET AUDITED | Whether `/api/search/{id}`-style endpoints enforce "can this caller see this profile's phone number" authorization was not independently re-verified this pass (existing dev-check suite confirms phone masking works in the demo flow: check #74, "Contact Phone Number Correctly Masked"). Full per-endpoint IDOR sweep is a Phase 12 follow-up. |
| Secrets in repo | PASS | `.env.example` present (placeholders only); `.gitignore` covers `data_db.json` and other runtime state; no hardcoded production secrets found in the files touched this pass. Full repo-wide secret-scan not yet run. |

## Fixed this pass
- **Critical CVE** in pinned Next.js (16.3.5 → 16.3.8) — see `CHANGELOG.md`.

## Next steps (Phase 12 full sweep)
1. `pip-audit` / `safety check` against `backend/requirements.txt`.
2. Per-endpoint IDOR check: can user A fetch user B's unmasked phone/private
   fields by guessing/iterating `tsap_id`?
3. `dangerouslySetInnerHTML` / raw-HTML-injection sweep across `frontend/src`.
4. Path-traversal / filename-sanitization check on the photo-upload save path.
5. Decide + implement a token-revocation story (short-lived access token +
   refresh token, or a server-side revocation list) if "logout everywhere" /
   compromised-account response time becomes a product requirement.
