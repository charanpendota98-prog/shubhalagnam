# Security audit — consolidated findings

**Current status (rechecked 2026-10-12):** this audit records the IDOR and
CORS fixes, dependency remediation, and later scoped security checks. This
pass added durable, fail-closed token-version persistence and privacy-bounded
visitor analytics, with regression coverage. The focused photo-upload
path-traversal check is covered by Wave 23; a complete review of every
file-processing boundary is still required. Broader XSS taint/sink analysis
also remains open. The production release gate is in
[`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md); this file is not a release
approval.

> **Credential redaction notice:** the current working copy redacts a
> session-token-like value, phone number, and password hash from the historical
> exploit example. The base Git commit already contains that evidence, so the
> repository history may still expose it. Treat any related account credential
> as potentially compromised; the owner should invalidate/re-provision it and
> decide on history cleanup through the authorized repository process. No values
> are repeated here, and Git history was not rewritten in this pass.

## CRITICAL — historical IDOR finding; remediation recorded (full account takeover risk)

**Found by:** auditing every route handler that takes a `tsap_id` for a
missing `require_owner(...)` call (the project's own, already-proven IDOR
guard — used in ~20 other places in `main.py`), then empirically confirming
each candidate against the live API with `curl`.

**The bug:** `GET /api/profile/{tsap_id}` — intended for "self-editing" per
its own docstring — had **zero authentication**. It returned the complete,
raw internal user record to *any* caller who supplied *any* `tsap_id`, and
`tsap_id`s are sequential and trivially enumerable (`MV1001`, `MV1002`, ...).
That raw record included:
- `auth_token` — a **live, valid, reusable bearer session token** for that
  user (the same token the frontend normally gets once, at login/register,
  and stores in `localStorage`). Anyone could fetch any user's current
  session token and use it on every `require_owner`-protected endpoint —
  **full account takeover**, not just data disclosure, for up to 30 days
  (the token TTL) without ever knowing the password.
- `phone` — the real, unmasked phone number, bypassing the entire "numbers
  are never given directly, only via mutual interest" privacy promise shown
  throughout the product's own UI copy.
- `password_hash` — the PBKDF2 hash + salt, enabling offline password
  cracking.

Two sibling endpoints had the identical defect:
- `POST /api/profile/update` — accepted a `tsap_id` from the **request
  body** (fully attacker-controlled) with no ownership check, and applied
  arbitrary field overwrites to that user's profile. Any anonymous caller
  could deface/corrupt any other user's profile data.
- `POST /api/user/delete-account` (+ alias `POST /api/profile/{tsap_id}/delete`)
  — same defect, except destructive: any anonymous caller could
  deactivate/soft-delete any other user's account. Combined with sequential,
  enumerable IDs, this was scriptable into a mass-deletion of the entire user
  base.
- `GET`/`POST /api/profile/preferences` — same defect for a user's saved
  partner-matching preferences (lower severity — no PII/token leak — but
  still unauthenticated read/write of another user's data).

**Verified exploitable (not theoretical)** — reproduced against the live
backend before the fix:
```
$ curl -s localhost:8000/api/profile/MV5060 | jq '.profile.auth_token, .profile.phone, .profile.password_hash'
"[redacted session token]"
"[redacted phone number]"
"[redacted password hash]"

$ curl -s -X POST localhost:8000/api/profile/update -d '{"tsap_id":"MV5060","full_name":"HACKED BY ATTACKER"}'
# → 200 OK, profile actually renamed, zero auth required
```

**Fix applied:**
1. Added `require_owner(request, tsap_id)` — the codebase's existing,
   already-battle-tested IDOR guard — to all 5 endpoints above. It compares
   the caller's `X-Tsap-Token`/`Authorization: Bearer` header against the
   `tsap_id` being accessed and 401s on any mismatch or missing token.
2. **Defense in depth on top of the auth fix**: `GET /api/profile/{tsap_id}`
   now also strips `password_hash` and `auth_token` from the response even
   for the verified owner — there is no legitimate reason a GET response
   body needs to ever re-echo a live bearer credential or a password hash,
   even back to its rightful owner (reduces blast radius of any future bug,
   e.g. an XSS on that page).
3. **Frontend fix (required for the backend fix to not break real users):**
   the project already has a global `X-Tsap-Token`-attaching API client
   (`frontend/src/lib/api.ts`, used via `apiGet`/`apiPost`/`authHeaders()`)
   built specifically for this IDOR-guard pattern — but 4 call sites in
   `frontend/src/app/me/page-client.tsx` and
   `frontend/src/app/matches/page-client.tsx` used a raw `fetch(...)` with no
   headers at all, bypassing it. Updated all 4 to send `authHeaders()`.

**Files:** `backend/main.py` (5 endpoints),
`frontend/src/app/me/page-client.tsx`,
`frontend/src/app/matches/page-client.tsx`.

**Testing performed:**
- Re-ran all 4 attacks above post-fix with no token → all now return `401`.
- Registered a fresh real user, called all 5 endpoints **with** its own
  valid token → all still return `200` with correct behavior (profile
  visible incl. its own real phone number for self-editing, update
  succeeds, preferences readable/writable) and `password_hash`/`auth_token`
  are now absent from the response even for the owner.
- Attempted the same calls using **a different, valid-but-wrong user's**
  token (user A's token against user B's `tsap_id`) → still correctly `401`s
  (confirms the fix checks token-identity match, not just "any token
  present").
- Full regression: `test_100_developer_checks.py` (110/110) and
  `test_100_registrations_e2e.py` (100/100) still pass; all other 44
  standalone test scripts produce the same 13 pre-existing (frontend-content,
  unrelated) failures as before this change — zero regressions.
- `npx tsc --noEmit` and a full `next build` both pass cleanly on the
  frontend changes.

## CORS wildcard-with-credentials (P0) — remediation recorded

**Found while** reviewing the global middleware stack for the headers work
below. `app.add_middleware(CORSMiddleware, allow_origins=_CORS_ORIGINS,
allow_origin_regex=r".*", allow_credentials=True, ...)` — the code comment
directly above it claims to have fixed "`*` + credentials (browser security
hole)" by moving to an env allowlist, but `allow_origin_regex=r".*"` matches
*every* possible Origin header. Starlette's `CORSMiddleware` allows an origin
if it matches **either** `allow_origins` **or** `allow_origin_regex`, so the
explicit allowlist was completely nullified — this reopened the exact
"browser security hole" the comment claims was fixed.

**Verified exploitable before the fix:**
```
$ curl -s -i -X OPTIONS localhost:8000/api/profile/me -H "Origin: https://evil-attacker-site.com" ...
access-control-allow-origin: https://evil-attacker-site.com
access-control-allow-credentials: true
```
Any website on the internet could make credentialed cross-origin requests to
this API. (Real-world impact was partially mitigated by this app's control-
panel cookies already using `SameSite=Strict`, but this was a load-bearing
coincidence, not a designed-in second layer of defense, and the user-facing
bearer-token API had no such protection at all.)

**Fix:** removed `allow_origin_regex=r".*"`, kept only the explicit
`CORS_ORIGINS`-driven allowlist (already documented/used in the real deploy
guides for `manavivaha.in`/`www.manavivaha.in`/`control.manavivaha.in`). The
real website doesn't even need browser-side CORS for its own frontend↔API
traffic — `frontend/next.config.mjs` proxies `/api/*` server-side via Next.js
rewrites, so the browser never makes a cross-origin call to this backend in
production.

**Verified:** malicious origins now get `400 Disallowed CORS origin`;
`http://localhost:3000` and `https://manavivaha.in` still work correctly.
Full regression suite re-run, zero regressions.

**Files:** `backend/main.py`.

## Content-Security-Policy (P1) — addition recorded

Was completely missing (only HSTS/X-Frame-Options/X-Content-Type-Options
existed). Built a real allowlist from an actual audit of this app's external
resource usage (not a generic template): the only third-party
script/frame/connect target is Razorpay's checkout widget
(`PayBox.tsx` injects `checkout.razorpay.com` at runtime); there is no
`next/image` remote-domain usage, no Google Fonts/Analytics/GTM. Applied only
in production (left off in dev so Turbopack HMR and the Arena sandbox iframe
preview are unaffected — same pattern the existing `X-Frame-Options`
prod/dev split already used). `'unsafe-inline'` is kept for script/style
because this app has no nonce-based CSP plumbing yet — a nonce upgrade is a
larger, separately-justified follow-up (noted below), not bundled in here to
avoid risking a silent breakage across 40+ pages.

**Verified:** `next build` + `next start` in production mode; all sampled
pages (`/`, `/search`, `/register`, `/login`, `/pricing`, `/matches`, `/me`)
return `200` with the CSP header present and full page content (checked HTML
byte sizes); scanned the rendered HTML for any script/style/link tag not
covered by the allowlist — found none (all `/_next/static/*`, self-origin).

**Files:** `frontend/next.config.mjs`.

| Area | Status | Evidence |
|---|---|---|
| Password hashing | PASS WITH MIGRATION NOTE | New member and staff-password hashes use PBKDF2-HMAC-SHA256 with 600k iterations and random salts. Legacy member hashes remain verifiable at their stamped/legacy cost; existing staff hashes preserve their encoded cost until an operator re-provisions them with the updated hash utility. |
| Session tokens | PASS WITH DEPLOYMENT NOTES | HMAC-SHA256 signed, embedded expiry, and `hmac.compare_digest`; per-user monotonic versions support password-reset, logout-everywhere, and admin force-logout. Production requires `TSAP_TOKEN_VERSIONS_FILE` inside the durable volume; unreadable/corrupt state and failed writes fail closed. Back up/restore this JSON with the state volume. One JSON-backed worker only; use a transactional shared store before horizontal scaling. |
| Admin/owner auth | PASS | Constant-time key comparison; app **refuses to boot in production** without a 32+ char `ADMIN_KEY` and a real `TSAP_AUTH_SECRET`. |
| Admin authorization enforcement | PASS | 100% of `/api/admin/*`, `/api/owner/*`, `/api/moderation/*` routes in `main.py` have a programmatically-verified guard. |
| Cookies (control panel) | PASS | `httponly=True`, `secure=<production>`, `samesite=strict`. |
| CSRF | PASS WITH NOTES | User API uses header-based bearer tokens (not ambient cookies) for mutating calls — inherently CSRF-resistant. Admin cookie path relies on `samesite=strict` as its primary CSRF mitigation; no secondary CSRF-token scheme. Acceptable, not P0. |
| Rate limiting | PASS | Login lockout (5 attempts/15min), OTP lockout, sliding-window limiter on OTP/register/interest/webhook endpoints. |
| Visitor analytics | PASS WITH PRIVACY SCOPE | Process-local HMAC pseudonym; no stored raw IP/user-agent/client ID; origin-only referrer and allowlisted UTM fields; 30-day maximum and 10,000-event cap; response omits visitor IDs/internal totals. Separate infrastructure/provider logs may have independent retention and need operator review. |
| File upload validation | PASS WITH SCOPED NOTES | Content-based validation via PIL (`Image.open`+`.load()`, not extension/MIME trust), format whitelist, size bounds, resolution/brightness/blur/glare/photo-of-photo heuristics. Wave 23 now checks upload path traversal, no server-path leakage, and isolated media storage. This is scoped test coverage, not a review of every file-processing/deployment boundary. |
| Dependency vulnerabilities (frontend) | PASS WITH DEV-ONLY EXCEPTION | `npm audit --omit=dev`: 0. Full `npm audit`: 5 high findings in the `eslint-config-next` / `@next/eslint-plugin-next` development-tool dependency chain (`braces`/`micromatch`/`fast-glob`); no compatible patched Next 16 config is published. |
| Dependency vulnerabilities (backend) | PASS | Current `pip-audit -r backend/requirements.txt`: no known vulnerabilities; `pip check` reports no broken requirements. FastAPI/Starlette/Pydantic and aiogram/aiohttp were upgraded and regression-tested. |
| SQL injection | N/A | No SQL database is in use anywhere in the backend (see `DATABASE_AUDIT.md`) — this class of vulnerability does not apply today. Will become relevant if/when a Postgres migration happens. |
| XSS (stored/reflected/DOM) | PASS WITH SCOPED NOTES | Three `dangerouslySetInnerHTML` sites remain: a fixed language bootstrap and two JSON-LD payloads. Dynamic JSON-LD in the homepage/profile routes now uses `serializeJsonLd`, escaping `<`, `>`, and `&` before inline embedding; the profile identifier is additionally bounded/sanitized. The `printBiodata()` popup output was separately escaped. This is not a full taint-analysis of every rendering path. |
| IDOR on profile data | **CRITICAL — found & fixed this pass** | `GET /api/profile/{tsap_id}`, `POST /api/profile/update`, `POST /api/user/delete-account`, `GET`/`POST /api/profile/preferences` had **zero authentication** — see the dedicated section above. This was full account takeover (live session token leak), not just a data-masking gap. `/api/search/{id}` (the public ID-search feature) and `/api/matches/{id}` were separately verified safe — both only ever return `phone_masked`, never raw `phone`/`password_hash`/`auth_token`, by design. |
| CORS configuration | **CRITICAL — found & fixed this pass** | `allow_origin_regex=r".*"` + `allow_credentials=True` allowed any website to make credentialed cross-origin requests — see dedicated section above. |
| Security headers (CSP/X-Frame-Options/etc.) | **Fixed this pass** | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` were already present on both frontend and backend (an earlier pass's claim that "only HSTS" existed was incomplete/incorrect — corrected here). `Content-Security-Policy` was genuinely missing and has now been added (production only) — see dedicated section above. |
| Sensitive-looking credentials in Git | ACTION REQUIRED | The current working copy of this audit is redacted, and the current-worktree secret-pattern scan found no high-confidence key, token, or password-hash matches. The base Git commit still contains the historical session-token-like value, phone number, and password hash; their validity/association is unknown. Treat related credentials as potentially exposed; the owner must invalidate/re-provision as appropriate and decide on authorized history cleanup. |

## Fixed this pass
- **Next.js security patch**: 16.3.5 → 16.3.8; Tailwind 4.3.3 migration and aligned lint config included. Updated Next's optional `sharp` dependency from 0.35.4 to patched 0.35.5 after a newly reported image-processing advisory; production npm audit is now clean. The dev-only lint-plugin advisory remains documented above.
- **Backend dependency CVE remediation**: updated FastAPI/Starlette/Pydantic and aiogram/aiohttp; current runtime and test dependency audits plus `pip check` pass.
- **Inline JSON-LD script safety**: added a shared serializer that emits `<`, `>`, and `&` as Unicode JSON escapes; homepage and profile JSON-LD now use it, with a breakout regression check.
- **Registration E2E isolation**: test-only secrets and disposable DB/media storage; no fabricated photos, payment references, paid activations, or changes to production rate limits.
- **Payment/test-mode fail-closed guard**: paid test fixtures require an explicit isolated-test flag plus test mode; previews do not auto-activate purchases. Production startup now rejects auth-bypass flags, disabled rate limits, and test payment fixtures.
- **Factual-match/privacy fixes**: owner-only top-match rows now include their real profile IDs for links; gothram comparison only accepts active approved profiles, respects blocks, and does not return raw gothram values. Text comparisons never block or rank members.
- **Durable token revocation**: production now requires the revocation counter on the mounted persistent root; corrupt/unreadable files fail startup, failed writes do not claim success, and counters are backed up with runtime JSON. Added cross-process, corruption, write-failure, Compose, storage, and backup regression checks.
- **Visitor analytics minimization**: derive a process-local HMAC pseudonym from server request context; reject caller-supplied IDs/IP/UA, reduce referrers to origin, allowlist campaign fields, cap and expire stored events, and omit IDs/totals from the public response. Privacy text now documents restart clearing and separate infrastructure logs.

## Dependency audit — current verification (2026-10-12)

### Backend

Runtime dependencies remain pinned to FastAPI 0.142.2, Starlette 1.7.0,
Pydantic 2.13.5, aiogram 3.31.0, and aiohttp 3.14.4. The 2026-10-12
`pip-audit` runs for both runtime and test requirements reported **no known
vulnerabilities**; the recorded `pip check` reported no broken requirements.
The pinned test requirements include the HTTPX compatibility adapter and
PyYAML for static Compose checks. Focused regressions run in this pass passed:
visitor/growth **118/118**, Wave 9 hardening **210/210**, privacy contacts
**123/123**, contact configuration **8/8**, token-revocation persistence
**4/4**, required-photo policy **6/6**, copy truth **13/13**, deploy hardening
**20/20**, production storage gate **11/11**, and Wave 40 deployment assertions
**64/64**. Wave 40's high-confidence secret-pattern scan covers current
worktree files, not Git history. The payment-oriented Wave 34 script stopped at
its first order-creation assertion because no owner-configured provider or
merchant VPA is present; the API returned its expected unavailable response.
No synthetic UTR, recipient, or webhook was supplied. External payment, OTP,
messaging, production data, and deployment remain unvalidated.

### Frontend

Next.js and `eslint-config-next` are locked to 16.3.8; Tailwind CSS is 4.3.3,
and the Next optional `sharp` dependency is locked to patched 0.35.5. On
2026-10-12, `npm run lint`, `npx tsc --noEmit`, and the production build all
passed; the build generated 50 application routes. `npm audit --omit=dev`
reported **0 production dependency vulnerabilities**. The last full `npm audit`
reported **5 high, development-only findings** through the current Next ESLint
plugin chain (`braces`, `micromatch`, `fast-glob`). The registry's suggested
fix downgrades `eslint-config-next` to 14.2.35, incompatible with this Next 16 /
ESLint 9 setup; that breaking downgrade was not applied. `npm ci` also warns
ESLint 9 is out of support. An isolated ESLint 10.12.0 trial failed in
`eslint-plugin-react`'s `react/display-name` rule (`contextOrFilename.getFilename
is not a function`), so the passing ESLint 9 version was retained. Revisit when
an aligned, compatible patched lint chain is available.

### Remaining validation limits

The production build generated all 50 application routes. In this pass, a
separate temporary frontend/backend development preview returned HTTP 200 for
`/`, `/privacy`, `/api/plans`, `/api/inventory`, and proxied `/api/track`; the
empty isolated inventory returned zero and tracking exposed only `success` and
`channel`. This dev preview used the development/test auth bypass and is not a
production-auth check. A Playwright Chromium download was attempted again but
`cdn.playwright.dev` TLS connections reset, and no system browser is installed;
headless mobile/browser-layout checks remain incomplete. Real payment/OTP/
messaging providers and configured external links were not validated;
preview integrations remained off/dry-run. These local checks do not establish
production readiness.

## Phase 13 historical finding — stored XSS risk via "Print Biodata" (remediation recorded)

**Severity: P0 (critical).** While doing the broader `dangerouslySetInnerHTML`
sweep below, found a *third*, previously-unaudited raw-HTML-injection site
that the earlier "only 2 call sites, both safe" sweep had missed because it
doesn't use `dangerouslySetInnerHTML` at all — it uses `document.write()`.

**Where:** `frontend/src/app/search/[id]/ProfileView.tsx`, `printBiodata()`.
The "🖨️ Print Biodata" button opens a blank popup window
(`window.open("", "_blank")`) and builds a full HTML document as a raw
template-literal string — directly interpolating `profile.full_name`,
`profile.about_myself`, `profile.company`, `profile.education_detail`,
`profile.caste`, `profile.sub_caste`, `profile.gothram`, and every other
profile field with **zero escaping**, then writes it into the popup with
`printWindow.document.write(html)`.

**Why it's exploitable:**
- `full_name` and `about_myself` are free-text fields set at registration.
  Backend validation (`backend/main.py`, registration handler) only checks
  `about_myself` for minimum length (≥50 chars) and for phone-number/email
  patterns (privacy leak prevention) — it does **not** strip or reject
  HTML/script content, and `full_name` only gets `.strip()`'d. So a profile
  can be registered with e.g. `full_name = "<script>…steal tokens…</script>"`
  or the payload hidden inside `about_myself`/`company`/`education_detail`.
- React's JSX auto-escaping (the usual XSS defense in this codebase) **does
  not apply** to manually-built strings passed to `document.write()` — this
  bypasses it completely, same bug class as an unescaped `dangerouslySetInnerHTML`
  would be.
- The popup is opened via `window.open("", ...)` (no URL → `about:blank`),
  which is **same-origin** with the opener. Any script injected into it runs
  with same-origin privileges — including `window.opener` access back into
  the original tab. The frontend stores the session token in
  `localStorage.getItem("tsap_token")` (`frontend/src/app/register/page-client.tsx`),
  which is readable by same-origin JS. **Any visitor who views a malicious
  profile and clicks "Print Biodata" would have their session token stolen
  — full account takeover**, the same end result as the critical IDOR fixed
  earlier this phase, just via a different vector (stored XSS instead of
  missing authz).
- Blast radius: every visitor who prints *any* profile's biodata, not just
  the attacker's own session — this is stored XSS served to other users,
  not self-XSS.

**Fix (two layers):**
1. **Output layer (frontend):** added an `escapeHtml()` helper (escapes
   `& < > " '`) and wrapped every interpolated profile field in the
   `printBiodata()` template with it before building the HTML string.
2. **Input layer (backend, the actual root cause):** registration
   (`POST /api/register`) already runs every free-text field through
   `clean()` (strips HTML tags + `javascript:`/`onerror=`/`<script`
   patterns) right before saving — see the `"🛡️ sanitize free-text (XSS /
   control chars / huge payload fix)"` loop in `main.py`. But
   `POST /api/profile/update` (the endpoint a user calls to edit their
   *own* profile after registering) was setting every field straight from
   the request payload — `user[k] = payload[k]` — with **zero**
   sanitization, completely bypassing that protection. Confirmed exploitable
   live: registered a real test user, called `/api/profile/update` with
   `about_myself="<script>alert(document.cookie)</script>..."` and
   `company="<img src=x onerror=alert(1)>EvilCorp"` using that user's own
   valid owner token (no IDOR needed — this doesn't require bypassing auth,
   just normal self-service profile editing), then fetched the profile back
   via `/api/search/{id}` and confirmed the raw `<script>`/`<img onerror>`
   tags were stored and returned verbatim. **Fixed** by adding the same
   `clean()` sanitization pass (same field/max-length table as registration)
   to `/api/profile/update` before any free-text field is persisted.
   Re-ran the exact same exploit payload post-fix: `about_myself` came back
   as `"alert(document.cookie) hello there..."` (tags stripped, inert) and
   `company` came back as `"EvilCorp"` (the `<img onerror>` wrapper gone).
**Files:** `frontend/src/app/search/[id]/ProfileView.tsx`,
`backend/main.py` (`update_user_profile`).
**Verification:** (a) `npx tsc --noEmit` clean, (b) production `next build`
clean, (c) manual escaping unit-check confirms
`<script>alert(document.cookie)</script>` → `&lt;script&gt;alert(document.cookie)&lt;/script&gt;`,
(d) `GET /search/MV1001` still renders 200 with the frontend fix live,
(e) live end-to-end exploit-then-fix test against `/api/profile/update`
exactly as described above, (f) full `test_100_developer_checks.py`
(110/110) and `test_100_registrations_e2e.py` (100/100) regression suites
passing post-fix.
**Residual risk, closed in the same pass:** `POST /api/control/profiles/add`
(the admin Control Portal's instant profile creator, gated behind
`_control_write_guard` + an elevated staff/admin role) also set `full_name`
and other fields with a bare `.strip()`, no `clean()` call. Lower severity
— exploiting it requires an already-compromised or malicious admin
credential, a strictly higher trust boundary than a normal user account —
but closed anyway for defense-in-depth consistency: added the same
`clean()` pass over its free-text fields before the new profile is
appended to `DB_USERS`. Verified with the full regression suites
(110/110, 100/100) passing post-fix.

## Phase 13 — broader IDOR + upload-path sweep (done this pass)

Followed up on next-steps items 2 and 4 below with a systematic, repo-wide
check rather than a spot check:

- **Route-surface IDOR sweep.** Extracted all 300 `@app.get/post/put/patch/
  delete` route decorators in `backend/main.py` and flagged every one whose
  path contains an id-like segment (`vendor_id`, `owner_id`, `user_id`,
  `ref_id`, `code`, `referral_id`, `payment_id`, `order_id`, `request_id`,
  `match_id`, `report_id`, generic `id`) *and* whose handler body has none of
  the known guards (`require_owner`, `require_admin(`, `is_admin(`,
  `_control_write_guard`, `require_vendor`, `is_automation(`). 9 candidates
  came back; a second pass did the same thing for handlers that take a raw
  `payload: dict` and pull an id key (`vendor_id`/`tsap_id`/`owner_id`/
  `user_id`/`report_id`/`request_id`/`order_id`/`interest_id`/`from_id`/`id`)
  out of the body instead of the path (this is the exact shape the critical
  `/api/profile/update` bug fixed last pass had) — 1 more candidate.
  Manually read every one of the 10:
  - `POST /api/referral/click/{code}`, `GET /api/referral/validate/{code}` —
    intentionally public: these exist so an unauthenticated visitor who
    clicked a shared referral link gets attributed/validated. No private
    data returned, no state mutated on someone else's behalf. Safe by design.
  - `GET /api/vendors/{vendor_id}`, `.../promo`, `.../poster(.png)`,
    `POST /.../click` — public vendor-directory listing + its own marketing
    asset generator (QR/poster/caption text for the vendor's own public
    listing). All four go through a `public_vendor()` projection that never
    includes the vendor's private contact/bank fields. The one endpoint that
    *does* return sensitive vendor analytics, `GET /api/vendors/{id}/
    dashboard`, already calls `require_vendor(request, vendor_id)` — it just
    didn't match the path-param regex because of how its guard line was
    phrased, not because it's unprotected. No fix needed.
  - `GET /api/pay/qr/{order_id}.png` (+ alias) — generates a static UPI
    payment QR (merchant VPA + a numeric amount) server-side from
    `order_id`. Doesn't reveal who the payer is, their phone, or any other
    PII; the `order_id` itself isn't guessable-and-useful for anything since
    the QR just encodes "pay ₹X to the business's own public UPI handle".
    Safe by design (this is meant to be shareable without login so the
    payer can scan it from any device).
  - `POST /api/channels/route` (the `payload`-based hit) — a stateless
    marketing-copy calculator: caller supplies a hypothetical profile shape
    (gender/state/caste/age/job/`tsap_id` text) and gets back which
    Telegram/WhatsApp channels *would* this profile route to, for preview
    purposes. It never calls `_find_user()` / never reads or writes a real
    DB record — the `tsap_id` in the payload is just interpolated into a
    sample caption string. Not an IDOR because there's no "other user's
    record" being accessed at all.

  **Conclusion: no further IDOR vulnerabilities found.** The critical bug
  fixed last pass (missing `require_owner` on `tsap_id`-keyed endpoints) was
  the only real instance of this bug class in the codebase; everything else
  flagged by the heuristic is intentionally-public marketing/directory/
  QR-generator surface or already guarded under a line the regex didn't
  recognize.

- **Upload path-traversal / filename-sanitization audit.** Checked all 4
  `UploadFile` endpoints (`/api/photo/upload`, `/api/verify/selfie`,
  `/api/voice/upload`, `/api/astro/jathakam/upload`):
  - `/api/photo/upload` already sanitizes the caller-supplied `tsap_id` with
    `re.sub(r"[^A-Z0-9-]", "", ...)` before using it in the saved filename
    (WAVE 23 fix, pre-existing) and never uses the original uploaded
    filename for anything beyond extracting+allowlisting the extension —
    good.
  - `/api/verify/selfie` and `/api/astro/jathakam/upload` build the saved
    filename from `u["tsap_id"]` read back off a DB record that was found by
    exact match *before* that point, not from raw caller input — safe, since
    `tsap_id` values are always server-generated at registration
    (`generate_profile_id()`, never accepted as free-form user text).
  - `/api/voice/upload` was the one gap: it built the saved filename from
    the raw `tsap_id` Form field without the same sanitization the photo
    endpoint has. Not currently exploitable — `require_owner()` runs first
    and a caller can only hold a valid token for a `tsap_id` the server
    itself generated (clean `[A-Z0-9-]` by construction) — but this relied
    on that invariant never changing, so **fixed**: added the identical
    `re.sub(r"[^A-Z0-9-]", "", ...)` sanitization used in `/api/photo/upload`
    before the value is used in the on-disk filename. Zero behavior change
    for legitimate IDs; verified with a real multipart upload against the
    running backend post-fix (clean `tmp-<timestamp>.wav` filename
    produced) plus the full `test_100_developer_checks.py` /
    `test_100_registrations_e2e.py` regression suites (110/110 and 100/100
    passing).
  - All three upload directories (`/tmp/photos`, `/tmp/voice`, `/tmp/cards`)
    are served back out via Starlette's `StaticFiles` mount, which has its
    own battle-tested traversal protection — no custom file-serving code to
    audit there. `/tmp/jathakam` isn't mounted/served at all (pandit-review
    workflow only references it by a server-issued `jathakam_id`, never a
    public URL), so there's no read-side traversal surface for it either.

## Phase 14 — token revocation ("logout everywhere" + incident-response remediation)

**Historical background (before the Phase 14 fix):** tokens were stateless HMAC
(`tsap_id|exp|scope|nonce`, 30-day TTL) with no server-side session table, so
there was no way to invalidate one before expiry. A token exposed during the
Phase 12 IDOR window could therefore remain valid after that bug was patched;
password changes also did not invalidate existing sessions, and there were no
self-service or admin force-logout tools. The remediation and current
persistence limits are recorded below.

**Design (`backend/hardening.py`):** per-user, monotonically increasing
token-version counters are stored at `TSAP_TOKEN_VERSIONS_FILE`. Production
requires this path to be configured inside the durable state volume; the
standalone Compose file places it beside the other backed-up JSON state.
Local development keeps a gitignored backend-local default, and tests use a
disposable file. State loading validates the JSON and fails closed if it is
corrupt or unreadable. Revocation atomically replaces the file with mode
`0600`; a failed write rolls back the in-memory increment and raises rather
than claiming success. `sign_token()` stamps the current version into each
token (`tsap_id|exp|scope|tv|nonce`), while `verify_token()` rejects older
versions. Updating one user's counter is O(1) in memory, but persisting the
flat JSON index rewrites the counter file. Old 4-field tokens are treated as
version 0 and remain subject to revocation. The production stack intentionally
runs one backend worker; a transactional/shared store is required before
horizontal scaling.

**Wired in three places:**
1. `POST /api/auth/reset` (password reset) now calls `revoke_all_tokens()`
   before issuing the new post-reset token — changing your password now
   actually logs out every other session, as users would expect.
2. New `POST /api/auth/logout-everywhere` — self-service "log out of all
   devices" (e.g. lost/stolen phone). Requires `require_owner` (the caller
   must already hold a currently-valid token for that exact account) and
   returns a fresh token for the calling session so it isn't accidentally
   logged out by its own request.
3. New `POST /api/admin/users/{tsap_id}/force-logout` — admin/staff
   incident-response tool to kill every session for a specific reported or
   compromised account without needing that user's credentials.

**One-time remediation record (historical; not current production evidence):**
`backend/ops_revoke_all_tokens.py` is an explicit operator-run script, not an
on-startup action (which would force-logout everyone at each routine restart).
An earlier audit note reported running it against an 83-user table and then
restarting a backend, but that historical count and result were not
re-established against an authorized production volume in this pass. For any
real rollout, run the script inside the backend container (or with the exact
same `TSAP_DB_FILE` and `TSAP_TOKEN_VERSIONS_FILE` durable-volume paths),
inspect the dry-run output, perform the authorized operation, and restart all
backend workers immediately. The script no longer claims a demo/seed fallback.

**Verification:** historical notes above describe earlier endpoint/manual
checks and must not be read as current production proof. Current regression
coverage in `backend/test_token_revocation_persistence.py` passes **4/4**:
revocation survives a new process, state files have private POSIX mode, a
failed write does not claim/apply a revocation, production requires an explicit
state path, and corrupt state fails closed. The updated production storage and
backup tests verify the path is inside the durable volume and that the token
counter JSON round-trips with satellite state. The payment-oriented Wave 34 harness passed its single fail-closed assertion
and explicitly skipped the remaining provider-dependent cases because no
owner-configured merchant/provider is available. No UTR, recipient, or webhook
was supplied. External payment integration remains unverified.
**Files:** `backend/hardening.py`, `backend/main.py`,
`backend/ops_revoke_all_tokens.py`, Compose/storage tests, and `.gitignore`.

## Phase 12/13 remediation history and remaining follow-ups

1. ~~Broader `dangerouslySetInnerHTML` / raw-HTML-injection sweep~~ — completed
   across `frontend/src`. Three inline sinks remain: a fixed language bootstrap
   and two JSON-LD payloads. Homepage and profile JSON-LD now pass through
   `serializeJsonLd`, which escapes HTML-significant delimiters; the profile
   identifier is additionally sanitized. The `printBiodata()` popup output was
   separately escaped. No `eval(`/`new Function(`/raw `.innerHTML =` sites were
   found in that scan. This is still not a complete static taint analysis.
2. ~~Add `clean()` sanitization to `POST /api/control/profiles/add`~~ — done;
   profile updates use the same bounded/validated text handling.
3. ~~Implement token revocation~~ — done with per-user token versions,
   logout-everywhere, admin force-logout, and an explicit operator procedure.
   Production stores the JSON index on the durable volume and includes it in
   state backups; verify the real-volume migration/revocation at release time.
   Use a transactional shared store before scaling beyond one worker.
4. ~~Upgrade the API stack~~ — FastAPI 0.142.2, Starlette 1.7.0, and Pydantic
   2.13.5 are pinned and regression-tested; runtime and test dependency audits
   report no known vulnerabilities.
5. ~~Update Telegram HTTP dependencies~~ — aiogram 3.31.0 and aiohttp 3.14.4
   are pinned and locally regression-tested. External Telegram delivery and
   deployed bot permissions remain unverified here.
6. Remaining hardening: nonce-based CSP (remove `'unsafe-inline'` from
   `script-src`/`style-src`) requires per-request nonce plumbing through
   Next.js. Current production CSP is an improvement but does not eliminate
   inline-script allowances.
7. Remaining validation: no completed Playwright mobile/browser visual run,
   and no live payment, OTP, messaging-provider, or external-destination
   validation. See the limits above; local green checks are not launch
   certification.
