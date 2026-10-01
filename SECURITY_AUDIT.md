# SECURITY_AUDIT.md — Phase 0/12 spot-check (CRITICAL FOUND + FIXED this pass)

**Status: a critical, full-account-takeover-capable IDOR was found and fixed
this pass (see "CRITICAL — fixed this pass" below), on top of the backend
dependency CVE remediation and the CORS wildcard-with-credentials fix also
done this pass. Remaining OWASP Top 10 follow-ups: broader XSS sink audit
beyond the two sites already checked, path-traversal check on photo uploads.**

## 🔴 CRITICAL — fixed this pass: unauthenticated IDOR leaking live session tokens (full account takeover)

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
"TVY1MDYwfDE3OTM0MzI5OTV8dXNlcnxlMGFkY2FlOA.Vepfofol2OZs-ZXLTU9FNo-sbdF4EMQi27cv3XZudNA"
"9999988888"
"pbkdf2$38ef5a94164a57988090cb7deaf9cb8b$77648541483cf044d5a1..."

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

## CORS wildcard-with-credentials (P0) — fixed this pass

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

## Content-Security-Policy (P1) — added this pass

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
| XSS (stored/reflected/DOM) | PASS WITH NOTES (partial) | The 2 `dangerouslySetInnerHTML` call sites in the frontend were checked: both are JSON-LD structured data, one from static hardcoded FAQ content, the other already had a prior sanitization fix (WAVE 23) stripping `<>"'` from the URL-derived value before embedding. No broader output-encoding sweep across all components done this pass — follow-up. |
| IDOR on profile data | **CRITICAL — found & fixed this pass** | `GET /api/profile/{tsap_id}`, `POST /api/profile/update`, `POST /api/user/delete-account`, `GET`/`POST /api/profile/preferences` had **zero authentication** — see the dedicated section above. This was full account takeover (live session token leak), not just a data-masking gap. `/api/search/{id}` (the public ID-search feature) and `/api/matches/{id}` were separately verified safe — both only ever return `phone_masked`, never raw `phone`/`password_hash`/`auth_token`, by design. |
| CORS configuration | **CRITICAL — found & fixed this pass** | `allow_origin_regex=r".*"` + `allow_credentials=True` allowed any website to make credentialed cross-origin requests — see dedicated section above. |
| Security headers (CSP/X-Frame-Options/etc.) | **Fixed this pass** | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy` were already present on both frontend and backend (an earlier pass's claim that "only HSTS" existed was incomplete/incorrect — corrected here). `Content-Security-Policy` was genuinely missing and has now been added (production only) — see dedicated section above. |
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

## 🔴 Phase 13 finding — stored XSS → full account takeover via "Print Biodata" (fixed this pass)

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
**Residual risk / follow-up:** `POST /api/control/profiles/add` (the admin
Control Portal's instant profile creator, gated behind
`_control_write_guard` + an elevated staff/admin role) still sets
`full_name` and other fields with a bare `.strip()`, no `clean()` call.
Lower priority — exploiting it requires an already-compromised or malicious
admin credential, which is a strictly higher trust boundary than a normal
user account (an admin with write access already has far more direct ways
to tamper with data) — but still worth closing for defense-in-depth.
Tracked as a next step below.

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

## Next steps (Phase 12/13 sweep — still open)
1. ~~Broader `dangerouslySetInnerHTML` / raw-HTML-injection sweep~~ — **done
   this pass**, repo-wide (`grep -rn "dangerouslySetInnerHTML\|\.innerHTML\s*=\|document\.write(\|eval(\|new Function("`
   across `frontend/src`): the 2 pre-existing `dangerouslySetInnerHTML`
   sites (JSON-LD on the homepage + profile page) are confirmed safe —
   one serializes only hardcoded site-config/FAQ constants, the other
   already strips `< > " '` from the URL-sourced id before use (a prior
   WAVE 23 fix). Found and fixed one new site the earlier sweep's grep
   pattern missed: `document.write()` in `printBiodata()` — see the
   critical finding above. No `eval(`/`new Function(`/raw `.innerHTML =`
   sites exist anywhere in the frontend. Root-caused and fixed at the input
   layer too — see the critical finding above (`/api/profile/update` was
   bypassing registration's `clean()` sanitization entirely).
2. Add the same `clean()` sanitization to `POST /api/control/profiles/add`
   (admin Control Portal profile creator) — currently a bare `.strip()`,
   lower priority since it's already behind an elevated-role guard but
   worth closing for defense-in-depth consistency with every other write
   path.
3. Decide + implement a token-revocation story (short-lived access token +
   refresh token, or a server-side revocation list) if "logout everywhere" /
   compromised-account response time becomes a product requirement — this is
   higher priority given the account-takeover IDOR found in Phase 12
   (tokens issued before that fix remain valid until natural expiry; anyone
   who already scraped a token during the vulnerable window should be
   force-logged-out, which isn't possible without a revocation mechanism).
4. Scoped follow-up: bump `pydantic` to 2.7+ and `fastapi` to 0.135+ to reach
   starlette 1.x and close the remaining starlette CVEs — needs its own
   dedicated regression pass given how central pydantic models are to this
   codebase.
5. Scoped follow-up: evaluate an `aiogram` major-version upgrade (bot-flow
   regression testing required) to unlock a fully-patched `aiohttp`.
6. Scoped follow-up: nonce-based CSP (remove `'unsafe-inline'` from
   `script-src`/`style-src`) — needs per-request nonce plumbing through
   Next.js middleware, a larger change than this pass's allowlist-only CSP.
