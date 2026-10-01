# SECURITY_AUDIT.md — Phase 0/12 spot-check (PASS WITH NOTES overall)

**Status: targeted verification of auth, session, upload, and admin-authz
layers completed. Backend dependency CVE scan (`pip-audit`) completed and
acted on this pass — 2 critical/high findings fixed, 8 vestigial packages
with CVEs removed entirely. Remaining OWASP Top 10 follow-ups: IDOR
per-endpoint sweep, XSS sink audit.** No critical, currently-exploitable
vulnerability was found in the areas inspected; two dependency-level CVE
exposures (frontend Next.js, backend fastapi/starlette/Pillow/etc.) were
found and patched this pass.

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
| Dependency vulnerabilities (backend) | **Fixed this pass (see below)** | `pip-audit` ran against `requirements.txt`: 13 packages flagged with 150+ CVE/PYSEC advisories → after fixes, 2 packages with residual advisories remain, both low-reachability and documented. |
| SQL injection | N/A | No SQL database is in use anywhere in the backend (see `DATABASE_AUDIT.md`) — this class of vulnerability does not apply today. Will become relevant if/when a Postgres migration happens. |
| XSS (stored/reflected/DOM) | NOT YET AUDITED | No `dangerouslySetInnerHTML` sweep or output-encoding audit performed this pass — Phase 12 follow-up. |
| IDOR on profile data | NOT YET AUDITED | Whether `/api/search/{id}`-style endpoints enforce "can this caller see this profile's phone number" authorization was not independently re-verified this pass (existing dev-check suite confirms phone masking works in the demo flow: check #74, "Contact Phone Number Correctly Masked"). Full per-endpoint IDOR sweep is a Phase 12 follow-up. |
| Secrets in repo | PASS | `.env.example` present (placeholders only); `.gitignore` covers `data_db.json` and other runtime state; no hardcoded production secrets found in the files touched this pass. Full repo-wide secret-scan not yet run. |

## Fixed this pass
- **Critical CVE** in pinned Next.js (16.3.5 → 16.3.8) — see `CHANGELOG.md`.
- **Backend dependency CVE remediation** (`pip-audit` against
  `backend/requirements.txt`) — see full detail below.

## Backend dependency CVE audit (`pip-audit`) — done this pass

**Method:** ran `pip-audit -r backend/requirements.txt`, which flagged 13
packages with 150+ CVE/PYSEC advisories. Before patch-bumping anything, each
flagged package was checked for *actual usage* via repo-wide grep (imports,
dynamic `importlib`/`__import__`, Dockerfile, docker-compose, shell scripts)
to separate real attack surface from dead weight — per the standing rule to
never blindly upgrade/rewrite without first understanding what's actually
reachable.

**Finding: 8 of the 13 flagged packages are 100% dead code** — zero
references anywhere in the repository (not even in comments, except one
aspirational code comment naming `celery`/`apscheduler` as a *future*
scheduler option that was never built):
`python-jose[cryptography]`, `passlib[bcrypt]`, `rembg`, `onnxruntime`
(transitive, via rembg), `sentence-transformers`, `transformers` (transitive,
via sentence-transformers), `celery`, `apscheduler`. This also confirms the
earlier finding that auth in this app is hand-rolled PBKDF2+HMAC, not
`jose`/`passlib` — those libraries were installed but never wired in.

**Fix applied:** removed all 8 dead packages from `backend/requirements.txt`
outright (their transitive-only companion `ecdsa` also disappears). This is
strictly safer than upgrading them in place — a package that is never
imported can't be exploited regardless of version, and removing it also
shrinks install time / image size / future audit noise. Verified safe via a
clean `pip install` of the trimmed file (no resolution errors) and the full
test-script regression suite (see Testing below).

**Fix applied — real/used packages**, each bumped to the newest version
still compatible with this app's pinned `pydantic==2.5.3` (deliberately not
bumping pydantic itself this pass — it is pinned by numerous model
definitions throughout `main.py` and a pydantic 2.7+ bump is a larger,
separate-justification change):

| Package | Before | After | Why this exact version |
|---|---|---|---|
| `fastapi` | 0.110.0 | 0.121.0 | Lowest fastapi version that both allows `starlette<0.50.0` (needed for the starlette fix below) **and** still accepts `pydantic==2.5.3` (fastapi 0.126+ hard-requires `pydantic>=2.7.0`). |
| `starlette` | 0.36.3 (transitive) | 0.49.1 (pinned explicitly) | Fixes every starlette CVE that doesn't require a starlette 1.x major bump (1943, 1941, 1942). starlette 0.36.3 had **no** patched version available within fastapi 0.110's own `<0.37.0` constraint — the only way to patch it at all was the fastapi bump above. |
| `aiohttp` | 3.9.3 | 3.9.5 | `aiogram==3.4.1` (the only production consumer, in `telegram_bot.py`) pins `aiohttp~=3.9.0`, i.e. `>=3.9.0,<3.10.0`. 3.9.5 is the newest release inside that compatible range and fixes 2 of the flagged CVEs (PYSEC-2026-1102, -1098). |
| `Pillow` | 10.2.0 | 12.3.0 | Latest; fixes all flagged Pillow CVEs. Verified end-to-end against the real `photo_validate.py` structural-check pipeline (blur/glare/brightness/contrast) with a synthetic JPEG — produced correct, unchanged output shape. Pillow is used across `card_pro.py`, `card_generator.py`, `photo_validate.py`, `referral_card.py`, `vendor_kit.py` — all rely only on long-stable PIL APIs (`Image.open`, `ImageStat`, `ImageFilter`), no deprecated-API usage found. |
| `python-multipart` | 0.0.9 | 0.0.32 | Latest; fixes all flagged advisories. Used for file-upload form parsing — exercised indirectly by the photo-upload tests in the regression suite, all still pass. |
| `python-dotenv` | 1.0.1 | 1.2.2 | Latest; fixes the one flagged advisory. Low-risk (only parses `.env` at boot). |

**Residual, accepted-and-documented (not fixed this pass):**

| Package | Residual CVEs | Why not fully fixed | Real-world reachability |
|---|---|---|---|
| `starlette` 0.49.1 | PYSEC-2026-161, -2280/-2281, -248/-249 | Fixes require starlette **1.x**, which needs `fastapi>=0.135` and `pydantic>=2.7.0` — a bigger, cascading bump (pydantic underpins every request/response model in a 200+ route app) that needs its own dedicated regression pass, not a drive-by bundled into this dependency-hygiene pass. | Every HTTP request passes through starlette, so this is the single most "reachable" residual item in the whole audit — **top candidate for the next dependency-upgrade session**, with pydantic 2.7+ compat testing as its own scoped task. |
| `aiohttp` 3.9.5 | ~15 remaining PYSEC advisories needing aiohttp 3.10.11–3.14.3 | `aiogram==3.4.1` caps aiohttp at `<3.10.0`. Reaching a fully-patched aiohttp requires upgrading `aiogram` itself (newest aiogram 3.x still only allows `aiohttp<3.11`; even the latest aiogram line doesn't reach the aiohttp versions needed for the newest CVEs) — a Telegram-bot-library upgrade that needs its own bot-flow testing (webhooks, message handlers, antiban throttling), out of scope for a dependency-hygiene pass. | Lower than starlette: `aiohttp` here is used only for outbound/inbound traffic to Telegram's own Bot API in `telegram_bot.py`, not for parsing arbitrary public-internet input — materially smaller attack surface than a public-facing web framework. |

**Testing performed before accepting these changes:**
1. Established baseline: both full regression scripts (`test_100_developer_checks.py` → 110/110, `test_100_registrations_e2e.py` → 100/100) pass on the *original* dependency set.
2. Applied the dependency changes in a clean, from-scratch virtualenv (`pip install` with no resolver errors).
3. Restarted the backend process on the new dependencies; re-ran both full regression scripts → still 110/110 and 100/100.
4. Ran all remaining 44 standalone `test_*.py` scripts; 13 report non-zero exit. **Verified these are 100% pre-existing** by running the exact same 13 files against a parallel venv built from the original, unmodified `requirements.txt` — byte-for-byte identical pass/fail results. All 13 check frontend `.tsx` source-file content (e.g. `"useLang" in page_source`) and are unrelated to backend Python dependencies — zero regressions introduced by this change.
5. Directly exercised the Pillow-dependent `photo_validate.validate_photo()` function with a synthetic image end-to-end to confirm the structural photo-quality checks still execute correctly under Pillow 12.3.0.

## Next steps (Phase 12 full sweep — still open)
1. Per-endpoint IDOR check: can user A fetch user B's unmasked phone/private
   fields by guessing/iterating `tsap_id`?
2. `dangerouslySetInnerHTML` / raw-HTML-injection sweep across `frontend/src`.
3. Path-traversal / filename-sanitization check on the photo-upload save path.
4. Decide + implement a token-revocation story (short-lived access token +
   refresh token, or a server-side revocation list) if "logout everywhere" /
   compromised-account response time becomes a product requirement.
5. Missing security headers: `Content-Security-Policy`, `X-Frame-Options`,
   `X-Content-Type-Options` (only HSTS is currently set).
6. Scoped follow-up: bump `pydantic` to 2.7+ and `fastapi` to 0.135+ to reach
   starlette 1.x and close the remaining starlette CVEs — needs its own
   dedicated regression pass given how central pydantic models are to this
   codebase.
7. Scoped follow-up: evaluate an `aiogram` major-version upgrade (bot-flow
   regression testing required) to unlock a fully-patched `aiohttp`.
