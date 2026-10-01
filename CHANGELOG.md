# CHANGELOG

All entries are real, implemented, tested changes — not recommendations.
Format: date, priority, domain, what/why, files, verification.

## 2026-10-01 — Phase 13 security sweep: broader IDOR audit + upload hardening

### P0 — CRITICAL — Fixed: stored XSS in "Print Biodata" → full account takeover (token theft via `document.write()`)
**Domain:** Application Security / Cross-Site Scripting
**Found by:** extending the earlier "2 `dangerouslySetInnerHTML` sites, both safe" sweep to also grep for `document.write(`, raw `.innerHTML =`, `eval(`, and `new Function(` across `frontend/src` — turned up one more raw-HTML-injection site the narrower grep pattern had missed.
**What:** `printBiodata()` in `frontend/src/app/search/[id]/ProfileView.tsx` opens a blank same-origin popup (`window.open("", "_blank")`) and builds a full HTML document by interpolating `profile.full_name`, `about_myself`, `company`, `education_detail`, `caste`, `sub_caste`, `gothram`, etc. directly into a template-literal string with **zero escaping**, then injects it via `printWindow.document.write(html)`. Backend registration validation only checks `about_myself` for min length + phone/email leakage — it never strips HTML-special characters from `full_name`/`about_myself`/etc. React's JSX auto-escaping (the normal XSS defense here) doesn't apply to manual `document.write()` string-building. Because the popup is same-origin (`about:blank` via `window.open("", ...)`), any injected script can read `localStorage.getItem("tsap_token")` (where the session token is stored) via `window.opener` — meaning any visitor who viewed a maliciously-crafted profile and clicked "Print Biodata" would have their own session token stolen. Full account takeover, same severity class as the IDOR fixed earlier this phase, different vector (stored XSS vs. missing authz) and different victim (any visitor who prints any profile, not just the profile owner).
**Fix (two layers, root-caused):**
1. Output layer: added an `escapeHtml()` helper (`& < > " '`) and applied it to every interpolated field in the `printBiodata()` HTML template before it's handed to `document.write()`.
2. Input layer (the real root cause): discovered that `POST /api/profile/update` — the endpoint a user calls to edit their own profile after registering — set every field straight from the request payload (`user[k] = payload[k]`) with **zero sanitization**, completely bypassing the `clean()` HTML-stripping pass that registration already runs on every free-text field. Confirmed live and exploitable: registered a real test user, called `/api/profile/update` with `about_myself="<script>alert(document.cookie)</script>..."` and `company="<img src=x onerror=alert(1)>EvilCorp"` using that user's own valid token (plain self-service editing, no auth bypass needed), then fetched the profile back and confirmed the raw tags were stored verbatim. Fixed by adding the same `clean()` sanitization (same field/max-length table as registration) to `/api/profile/update` before persisting any free-text field. Re-ran the exact exploit payload post-fix — tags now stripped, text comes back inert (`"alert(document.cookie) hello there..."` / `"EvilCorp"`).
**Files:** `frontend/src/app/search/[id]/ProfileView.tsx`, `backend/main.py` (`update_user_profile`).
**Verification:** `npx tsc --noEmit` clean; production `next build` clean; manual escaping check confirms `<script>alert(document.cookie)</script>` → `&lt;script&gt;alert(document.cookie)&lt;/script&gt;`; `GET /search/MV1001` still renders 200 with the fix live; live end-to-end exploit-then-fix test against `/api/profile/update` as described above; full `test_100_developer_checks.py` (110/110) and `test_100_registrations_e2e.py` (100/100) regression suites passing; repo-wide grep confirms no other `document.write(`/raw-`.innerHTML =`/`eval(`/`new Function(` sites exist in the frontend.
**Residual risk:** `POST /api/control/profiles/add` (admin Control Portal, behind an elevated-role guard) still uses a bare `.strip()` instead of `clean()` — lower priority since it requires an already-trusted admin credential, tracked as a next step.

### P2 — Fixed: `/api/voice/upload` filename missing the same path-traversal sanitization as `/api/photo/upload`
**Domain:** Application Security / File Upload Handling
**Found by:** auditing all 4 `UploadFile` endpoints for filename-construction safety after the Phase 12 IDOR fix, specifically checking whether any of them build an on-disk filename from unsanitized caller input.
**What:** `/api/photo/upload` already sanitizes the caller-supplied `tsap_id` with `re.sub(r"[^A-Z0-9-]", "", ...)` before it goes into the saved filename (a pre-existing WAVE 23 fix). `/api/voice/upload` built its filename from the raw `tsap_id` Form field without that same sanitization. Not currently exploitable in practice — `require_owner()` runs first and valid tokens only ever carry a server-generated `tsap_id` (always clean `[A-Z0-9-]`, produced by `generate_profile_id()` at registration, never accepted as free-form client text) — but it relied on that invariant holding forever rather than defending in depth.
**Fix:** Added the identical `re.sub(r"[^A-Z0-9-]", "", tid.strip().upper())[:24]` sanitization used in `/api/photo/upload` to `/api/voice/upload` before the value is used in the saved filename. Zero behavior change for legitimate IDs.
**Files:** `backend/main.py` (`voice_upload`).
**Verification:** Manual multipart upload against the running backend post-fix produced a clean filename (`tmp-<timestamp>.wav`); full `test_100_developer_checks.py` (110/110) and `test_100_registrations_e2e.py` (100/100) regression suites re-run clean.

### Audit only — no further fix needed: broader IDOR route-surface sweep (300 routes) + remaining 3 upload endpoints
**Domain:** Application Security / Authorization
**What was checked:** Extended the Phase 12 `require_owner`-sweep methodology from `tsap_id`-only path params to *every* id-like path param across all 300 route decorators in `backend/main.py` (`vendor_id`, `owner_id`, `user_id`, `ref_id`, `code`, `referral_id`, `payment_id`, `order_id`, `request_id`, `match_id`, `report_id`, generic `id`), plus a second pass over handlers that pull an id key out of a raw `payload: dict` body instead of the URL path (the exact shape the critical `/api/profile/update` bug had). Turned up 10 candidates total; manually read every one:
- `POST /api/referral/click/{code}`, `GET /api/referral/validate/{code}` — intentionally public referral-link attribution/validation, no PII returned, no third-party state mutated.
- `GET /api/vendors/{vendor_id}`, `.../promo`, `.../poster(.png)`, `POST /.../click` — public vendor-directory listing + its own public marketing-asset generator, all routed through a `public_vendor()` projection; the one endpoint with real vendor analytics (`.../dashboard`) already calls `require_vendor()` and just didn't match the detection regex.
- `GET /api/pay/qr/{order_id}.png` (+ alias) — generates a static UPI QR (merchant VPA + amount only, no payer identity) — safe/intended to be shareable without login.
- `POST /api/channels/route` — stateless marketing-copy preview calculator that never touches the real user database (`tsap_id` is only interpolated into a sample caption string) — not an IDOR because no other user's record is ever accessed.
- `/api/verify/selfie` and `/api/astro/jathakam/upload` build their saved filenames from a DB-verified `tsap_id` (read back after an exact-match lookup), not raw caller input — already safe.
- All upload directories (`/tmp/photos`, `/tmp/voice`, `/tmp/cards`) are served back via Starlette's `StaticFiles` mount (its own battle-tested traversal protection); `/tmp/jathakam` has no public read route at all.

**Conclusion:** no further IDOR or path-traversal vulnerabilities found beyond the one fix above. The Phase 12 critical bug was the only real instance of the missing-`require_owner` pattern in the codebase.
**Files:** audit only, see `SECURITY_AUDIT.md` → "Phase 13 — broader IDOR + upload-path sweep" for the full per-endpoint reasoning.
**Verification:** n/a (no behavior change beyond the voice-upload fix above).

## 2026-10-01 — Phase 12 security sweep: critical account-takeover IDOR + CORS fixes

### P0 — CRITICAL — Fixed: unauthenticated IDOR leaking live session tokens (full account takeover)
**Domain:** Application Security / Authentication & Authorization
**Found by:** systematically grepping every route handler keyed by `tsap_id`
for a missing call to this codebase's own existing IDOR guard
(`require_owner`, already used in ~20 other places), then empirically
confirming each candidate live against the running API with `curl`.

**The bug:** `GET /api/profile/{tsap_id}` (meant for self-editing, per its
own docstring) had **zero authentication** and returned the complete raw
internal user record — including `auth_token` (a live, reusable, 30-day
bearer session token for that user), raw unmasked `phone`, and
`password_hash` — to *any* caller supplying *any* `tsap_id` (sequential and
trivially enumerable: `MV1001`, `MV1002`, ...). This is full account
takeover, not just a data leak: anyone could script a loop over every ID,
collect every user's live session token, and act as that user on every
`require_owner`-protected endpoint with no password needed.

Four sibling endpoints had the same missing-auth defect: `POST
/api/profile/update` (arbitrary profile overwrite by any anonymous caller),
`POST /api/user/delete-account` + `/api/profile/{tsap_id}/delete`
(unauthenticated account deactivation — scriptable into mass-deleting the
entire user base given sequential IDs), and `GET`/`POST
/api/profile/preferences` (unauthenticated read/write of match preferences).

**Verified exploitable before the fix** (reproduced live, not theoretical):
registered a disposable test account, then fetched
`GET /api/profile/{its_id}` with **zero auth headers** → got back its live
`auth_token`, raw `phone`, and `password_hash` in the response body; then
called `POST /api/profile/update` with zero auth to rename the account to
"HACKED BY ATTACKER" — succeeded.

**Fix:** added `require_owner(request, tsap_id)` to all 5 endpoints.
Additionally, `GET /api/profile/{tsap_id}` now strips `password_hash` and
`auth_token` from its response even for the verified owner (defense in
depth — a GET response body never needs to re-echo a live credential).
The frontend already has a global API client (`frontend/src/lib/api.ts`)
that attaches the `X-Tsap-Token` header specifically for this IDOR-guard
pattern, but 4 call sites in `me/page-client.tsx` and
`matches/page-client.tsx` used a raw `fetch()` that bypassed it — updated
all 4 to send `authHeaders()` so real logged-in users are unaffected by the
new server-side enforcement.

**Files:** `backend/main.py` (5 endpoints),
`frontend/src/app/me/page-client.tsx`,
`frontend/src/app/matches/page-client.tsx`.

**Verification performed:**
- All 4 original zero-auth attacks re-run post-fix → all now `401`.
- Registered a fresh real user; all 5 endpoints called **with its own valid
  token** → still work correctly end-to-end (self-view shows its own real
  phone for editing, update succeeds, preferences readable/writable);
  `password_hash`/`auth_token` confirmed absent from the response even for
  the owner.
- Called the same endpoints with **a different, valid-but-wrong user's**
  token → still correctly `401`s (confirms identity-match checking, not
  just "any token present").
- Full regression: `test_100_developer_checks.py` 110/110,
  `test_100_registrations_e2e.py` 100/100, both unchanged; all other 44
  standalone test scripts produce the identical 13 pre-existing
  (frontend-content, unrelated) failures as before this change.
- `npx tsc --noEmit` and a full `next build` both pass cleanly.

### P0 — Fixed: CORS wildcard-with-credentials (any website could make authenticated cross-origin requests)
**Domain:** Application Security / Browser security model
**Found by:** reviewing the global middleware stack. `allow_origin_regex=r".*"`
was set alongside `allow_credentials=True` and an explicit `CORS_ORIGINS`
allowlist — but Starlette's `CORSMiddleware` allows an origin if it matches
*either* the allowlist *or* the regex, so `r".*"` (matches literally any
Origin header) completely nullified the allowlist. The code comment directly
above this line claimed to have already fixed "`*` + credentials (browser
security hole)" — this regex silently reopened the exact same hole.

**Verified exploitable before the fix:** `curl` with
`Origin: https://evil-attacker-site.com` got back
`access-control-allow-origin: https://evil-attacker-site.com` +
`access-control-allow-credentials: true`.

**Fix:** removed the `allow_origin_regex`, kept only the explicit
`CORS_ORIGINS` env allowlist (already the documented production
configuration). The real website doesn't need browser-side CORS at all for
its own traffic — `frontend/next.config.mjs` proxies `/api/*` server-side,
so the browser never makes a cross-origin call to this backend in
production; CORS only matters for direct API consumers, which the allowlist
already covers.

**Files:** `backend/main.py`.

**Verification:** malicious origins now get `400 Disallowed CORS origin`;
`localhost:3000` and `manavivaha.in` still work. Full regression suite
re-run, zero regressions.

### P1 — Added: Content-Security-Policy (was completely missing)
**Domain:** Application Security / Browser security headers
Built a real allowlist from an actual audit of this app's external resource
usage: Razorpay's checkout widget is the only third-party
script/frame/connect target in the entire app; no `next/image` remote
domains, no Analytics/GTM/Google Fonts. Applied in production only (same
prod/dev split the existing `X-Frame-Options` config already used, to avoid
breaking Turbopack HMR or the Arena sandbox iframe preview in dev).

**Files:** `frontend/next.config.mjs`.

**Verification:** `next build` + `next start` in production mode; sampled 7
pages all returned `200` with the CSP header and full content; scanned
rendered HTML for any script/style/link not covered by the allowlist — found
none.

## 2026-10-01 — Full-organization audit, Phase 0 (Discovery) + first P0/P1/P2 fixes

### P0 — Fixed: data-corrupting non-atomic writes in profile endpoints
**Domain:** Database Architect / Data Integrity Engineer / Concurrency Engineer
**Found by:** tracing every write path to `data_db.json` (the app's JSON-file
"database") and comparing against the project's own atomic-save helper
(`backend/db_store.py`, "WAVE 22").

**Bug:** `POST /api/profile/preferences` and `POST /api/profile/update` each
did:
```python
with open("data_db.json", "w", encoding="utf-8") as f:
    json.dump(DB_USERS, f, ensure_ascii=False, indent=2)
```
instead of the atomic `DBSTORE.save(DBSTORE.snapshot(...))` call used at
every other save site in `main.py`. This was wrong in two independent ways:
1. **Not atomic** — a crash/kill mid-write truncates/corrupts `data_db.json`.
2. **Wrong shape** — it wrote the bare `DB_USERS` *list* instead of the
   `{"users":[...], "interests":[...], "payments":[...], "otps":{...}, ...}`
   *dict* that `DBSTORE.load()` expects. `db_store.load()` treats any non-dict
   payload as empty (`{}`), so if one of these two endpoints happened to be
   the last write before a restart, the next startup would silently discard
   all interests/payments/OTP/verified-phone state and fall back to demo
   seed data — a real, latent production data-loss bug.

**Fix:** both call sites now call
`DBSTORE.save(DBSTORE.snapshot(DB_USERS, DB_INTERESTS, DB_PAYMENTS, DB_OTPS, VERIFIED_PHONES, DB_VIEWS, DB_SAVES, DB_DIGEST), force=True)`,
identical to every other save site in the file.

**Files:** `backend/main.py` (2 call sites, ~10 lines changed total).

**Verification performed (not just "looks right"):**
- Registered a real test user via `POST /api/register`.
- Called `POST /api/profile/preferences` and `POST /api/profile/update`.
- Inspected `data_db.json` on disk: confirmed proper dict shape
  (`{"saved_at","users","interests","payments","otps","verified_phones","views","saves","digest"}`),
  83 users, no leftover `.tmp` file (atomic rename succeeded).
- **Restarted the backend process** (the exact scenario the bug would break)
  and re-fetched the test profile via `GET /api/search/MV5060` — `about_myself`
  and `company` fields set via the (previously broken) update endpoint
  survived the restart intact.
- Ran the two existing full regression scripts: `test_100_developer_checks.py`
  → 110/110 passed; `test_100_registrations_e2e.py` → 100/100 passed.

### P0 — Fixed: critical RCE CVE in pinned Next.js version
**Domain:** Application Security / Dependency hygiene
**Found by:** `npm audit` during environment setup.

**Finding:** `next@16.3.5` (as pinned in `package.json`) is affected by a
**critical**-severity advisory (GHSA-vcvr-r3jv-pc5j — RCE in
`next/og ImageResponse`). `npm audit` also flagged a high-severity ReDoS in
the transitive `brace-expansion` package.

**Fix:** Bumped `next` to `16.3.8` (same minor line, patch-only — verified no
breaking changes via a full `tsc --noEmit` + `next build` pass), then ran
`npm audit fix` for the transitive `brace-expansion` issue.
**Result:** `npm audit` → **0 vulnerabilities** (was 1 critical + 1 high).
**Files:** `frontend/package.json`, `frontend/package-lock.json`.
**Verification:** `tsc --noEmit` clean; `next build` succeeds with the full
47-route table intact; dev server smoke-tested on `/`, `/register`,
`/pricing`, `/matches`, `/second-marriage`, `/spotlight` (all 200).
**Note:** this app does not use `next/og`/`ImageResponse` directly in its own
code, so exposure was lower than "actively exploited in a known code path" —
but a critical CVE with a zero-risk patch-version fix available is not
something to leave unpatched regardless.

### P1 — Fixed: backend dependency CVE exposure (`pip-audit`)
**Domain:** Application Security / Dependency hygiene (backend)
**Found by:** `pip-audit -r backend/requirements.txt`, which flagged 13
packages with 150+ CVE/PYSEC advisories. Before patch-bumping, every flagged
package was checked for real usage via repo-wide grep (direct imports,
dynamic `importlib`/`__import__`, Dockerfile/compose/shell-script
references).

**Finding 1 — 8 flagged packages are 100% dead code**, never imported
anywhere in the repository: `python-jose[cryptography]`, `passlib[bcrypt]`,
`rembg`, `onnxruntime`, `sentence-transformers`, `transformers`, `celery`,
`apscheduler` (plus their transitive-only `ecdsa`). This also confirms this
app's auth is hand-rolled PBKDF2+HMAC, never `jose`/`passlib` as the listed
dependency would suggest.

**Fix 1:** removed all 8 dead packages from `backend/requirements.txt`
outright — safer than upgrading something that's never executed, and it
shrinks install time/image size/future audit noise.

**Finding 2 — the packages actually used in production** (`fastapi`
→ transitively pins `starlette`; `aiohttp`/`aiogram` for the Telegram bot;
`Pillow`, `python-multipart`, `python-dotenv`) had real, patchable CVEs.

**Fix 2:** bumped to the newest mutually-compatible versions without
touching the pinned `pydantic==2.5.3` (a pydantic 2.7+ bump is a larger,
separately-justified change — see `SECURITY_AUDIT.md`):
`fastapi` 0.110.0→0.121.0, `starlette` 0.36.3→0.49.1 (pinned explicitly),
`aiohttp` 3.9.3→3.9.5 (capped by `aiogram==3.4.1`'s own `~=3.9.0`
constraint), `Pillow` 10.2.0→12.3.0, `python-multipart` 0.0.9→0.0.32,
`python-dotenv` 1.0.1→1.2.2.

**Residual (documented, not fixed this pass):** a handful of `starlette` and
`aiohttp` CVEs require a starlette 1.x / aiogram major-version bump,
respectively, which cascade into a `pydantic`/bot-flow regression pass of
their own — logged as scoped follow-ups in `SECURITY_AUDIT.md` rather than
done blindly in this pass.

**Files:** `backend/requirements.txt`.

**Verification performed:**
- Baseline: `test_100_developer_checks.py` (110/110) and
  `test_100_registrations_e2e.py` (100/100) passed on the original deps.
- Clean `pip install` of the new `requirements.txt` in a fresh venv — no
  resolver errors.
- Backend restarted on the new deps; both full regression scripts re-run →
  still 110/110 and 100/100.
- All 44 other standalone `test_*.py` scripts run; the 13 that report
  non-zero exit were verified **byte-for-byte identical** against a parallel
  venv built from the original, unmodified `requirements.txt` — i.e.
  pre-existing frontend-feature gaps (checking `.tsx` source for strings like
  `"useLang"`), not regressions from this change.
- `photo_validate.validate_photo()` (the PIL-based upload-quality pipeline)
  exercised directly with a synthetic image under Pillow 12.3.0 — blur/glare/
  brightness/contrast checks all executed correctly.
- `pip-audit` re-run after the fix: down from 13 flagged packages/150+
  advisories to 2 packages with documented, lower-reachability residual
  advisories.

### P2 — Fixed: sitemap/robots contradiction on `/requests`
**Domain:** Technical SEO Architect / Indexation Specialist
`frontend/src/app/sitemap.ts` listed the private, login-gated `/requests`
dashboard at priority 0.92 (2nd highest in the sitemap) even though
`frontend/src/app/requests/page.tsx` declares `robots: { index: false, follow:
false }` on itself. Removed `/requests` from the sitemap; `/me` (the other
private dashboard) was already correctly absent from it.
**Files:** `frontend/src/app/sitemap.ts`.

### Documentation produced this pass
- `ARCHITECTURE_AUDIT.md` — Phase 0 discovery: tech stack, repo structure,
  the JSON-file-persistence architectural finding, auth/authz/upload security
  verification, SEO spot-check, test-suite verification, prioritized backlog.

### Carried over from prior sessions (already live on this branch, not
redone this pass — listed for continuity):
- 8-item SEO/pricing/demo-data audit fixes (commit `b9848a0`).
- Identity-mismatch teaser fixes, `RealWeddingsFilm` marquee a11y fix,
  register-page SSR fallback content, trust-score 0-flash fix, mobile nav
  Pricing link (commit `07fa4fb`).
- Unified Lucide icon system across header/footer/mobile-nav + global
  `:focus-visible` accessibility fix (commit `b4a9d5d`).
