# మన వివాహ (Mana Vivaha) — ARCHITECTURE AUDIT
**Historical Phase 0 snapshot — generated 2026-10-01.**

> **Not a current status or release report.** Endpoint/route counts, dependency versions, risk findings, test totals, and words such as “today” below refer only to the 2026-10-01 audit snapshot. For current local verification and the production go/no-go decision, see [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md) and [`PRODUCTION-DEPLOY.md`](PRODUCTION-DEPLOY.md).

Status legend used throughout the original audit docs: `PASS` / `PASS WITH NOTES` / `NEEDS FIX`.

> **How to read this document.** This is a real inspection of the actual code in this
> repository (not assumptions). Every claim below was verified by reading source,
> running the app, running the existing automated test suites, or making live API
> calls against a running instance. Where something is a genuine strength, it is
> reported as such — per the audit rules, we do not invent problems or claim a false
> 100%/0% score in either direction.

---

## 1. Executive summary

This is **not** a template or a student project. It is a single large, organically-grown
FastAPI + Next.js monolith with ~327 backend endpoints, 47 frontend routes, a
dedicated HMAC-token auth layer, PBKDF2 password hashing, a PIL-based photo
validation pipeline, rate limiting, and **46 standalone test scripts at the
2026-10-01 snapshot** covering 110+ business invariants (the snapshot reported
110/110 then; this is not a current test result). Several dedicated hardening
passes are visible directly in the code (`hardening.py` = "WAVE 9",
`photo_validate.py` = "WAVE 17", `db_store.py` = "WAVE 22", etc.) — meaning this
codebase already has real security/reliability engineering history, not zero.

The **single biggest architectural risk** is that the system has **no real
database**. `docker-compose.yml` provisions a `postgres` service and
`requirements.txt` lists `sqlalchemy`/`psycopg2-binary`, but **zero lines of
backend code actually open a SQL connection**. All state (users, interests,
payments, OTPs, referrals, vendors, stories, CMS content, WhatsApp pool state,
etc.) lives in **17+ independent flat JSON files** on local disk, loaded into
Python in-memory lists/dicts at startup. This is documented in detail in
§4 and carries consequences for scalability, concurrency, multi-instance
deployment, and backup strategy (see `DATABASE_AUDIT.md`).

During this audit pass we found and fixed one **confirmed, reproducible P0 data-
integrity bug** in this JSON-file persistence layer (two endpoints were bypassing
the project's own atomic-save helper and could corrupt the on-disk snapshot —
see §9 and `CHANGELOG.md`), patched a **critical CVE** in the pinned Next.js
version, and fixed a sitemap/robots contradiction. These are implemented, not
just recommended — see `CHANGELOG.md` for exact diffs and test evidence.

---

## 2. Technology stack (verified)

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Frontend framework | Next.js (App Router) | 16.4.2 (updated from 16.3.8 in the latest verification pass) | Turbopack dev/build |
| Frontend language | TypeScript, React 18 | — | `tsc --noEmit` clean |
| Styling | Tailwind CSS | — | custom design tokens (maroon/gold brand) in `tailwind.config.ts` |
| Backend framework | FastAPI | 0.110.0 | single `main.py` (8,864 lines) + ~35 feature modules |
| Backend language | Python | 3.11 | stdlib-only crypto (no bcrypt/argon2 dependency) |
| "Database" | **Flat JSON files** (`data_db.json` + 16 others) | — | **not** the provisioned Postgres — see §4 |
| Cache/queue | Redis (provisioned in docker-compose) | — | not verified as wired into app logic this pass |
| Reverse proxy | Nginx / Caddy (examples present) | — | `nginx.conf`, `Caddyfile.example` |
| Messaging | WhatsApp bridge (Node, 3 instances) + Telegram bot | — | separate services in docker-compose |
| Deployment | Docker Compose (dev + prod files) | — | `docker-compose.yml`, `docker-compose.prod.yml` |
| Test tooling | Standalone Python scripts using `fastapi.testclient.TestClient` | — | **not** pytest-shaped (see §8); run directly as scripts |

---

## 3. Repository structure (top-level)

```
backend/        FastAPI app — main.py (8.8k lines) + ~35 single-purpose modules
                + 46 test_*.py scripts + 17 runtime *.json "DB" files (gitignored)
frontend/       Next.js App Router app — src/app (47 routes), src/components,
                src/lib
whatsapp-bridge/  Node service(s) for WhatsApp automation
nginx.conf, Caddyfile.example, docker-compose*.yml   deployment config
*.md (50+ files at repo root)   Telugu-language planning/strategy documents —
                see §10, this is real but unmanaged technical debt (clutter,
                not code risk)
```

**Finding — P3, Technical Lead / Code Quality:** 50+ planning markdown files
(`ADVANCED-PLAN-TELUGU.md`, `WAVE5-...md` .. `WAVE18-...md`, etc.) sit at the
repo root with no `docs/` folder grouping. This is navigable but unprofessional
for a production repo; recommend moving to `docs/planning/` in a dedicated,
low-risk cleanup pass. **Not fixed this pass** (zero functional risk, explicitly
deferred to avoid unnecessary churn per "do not introduce unnecessary changes").

---

## 4. ⚠️ Persistence architecture — the central finding

**Verified facts:**
- `grep -rln "create_engine|psycopg2.connect|sqlalchemy" backend/*.py` → **zero matches**.
  SQLAlchemy/psycopg2 are installed (`requirements.txt`) but never imported or used.
- The real persistence layer is `backend/db_store.py` ("WAVE 22 — core DB
  persistence"): an **atomic JSON file store** — writes go to `data_db.json.tmp`
  then `os.replace()` to the final path (corruption-safe on crash), with a
  5-second debounce. This is a genuinely reasonable pattern **for a JSON-file
  store** — the previous engineering effort already understood the corruption
  risk and built a mitigation for it.
- 16 additional independent JSON files hold other domains: `referral_state.json`,
  `vendor_state.json`, `stories_state.json`, `consent_ledger_state.json`,
  `retention_log.json`, `saved_searches_state.json`, `spotlight_promotions.json`,
  `wa_pool_state.json`, `channel_setup_state.json`, `push_state.json`, etc. Each
  module manages its own load/save independently. The latest persistence pass
  routes runtime JSON snapshots through `backend/atomic_store.py` (serialize
  before creating a private temp file, flush/fsync, atomic replace, directory
  fsync); append-only audit ledgers use its private fsyncing append helper. The
  remaining media writes use unique server-generated names and the same atomic
  byte writer, while `db_store.py` retains its dedicated equivalent.
- `postgres` and `redis` containers remain in the development `docker-compose.yml`,
  but nothing in `backend/*.py` connects to them. The standalone production
  `docker-compose.prod.yml` deliberately omits both so deployment does not imply
  a database migration that has not happened. A real PostgreSQL migration remains
  required before horizontal scaling or high-availability claims.

**Why this matters (Scalability / Reliability / Concurrency Architect sign-off — NEEDS FIX, long-term):**
1. **No real transactions.** Multi-step operations (e.g. "deduct credit + record
   interest + notify") are not atomic across the two call sites in the way a SQL
   transaction would guarantee; a crash mid-sequence can leave inconsistent state.
2. **No horizontal scaling.** In-memory Python lists + single JSON file means
   you cannot run two backend processes/containers against the same data — they
   would each keep a separate in-memory copy and the last one to save wins,
   silently discarding the other's writes. Current docker-compose runs exactly
   one `backend` replica, which is consistent with this constraint, but it is a
   hard ceiling on scaling the API tier.
3. **Full-table-scan queries everywhere.** Every "search"/"matches" endpoint
   iterates the in-memory Python list with filter predicates — functionally
   correct at hundreds–low-thousands of profiles (confirmed fine: p99 latency
   3.9ms in the existing dev-check suite, see §8), but there is no indexing
   strategy and it will degrade linearly as the user base grows. No current
   evidence of a problem at today's data volume; flagged as a **scaling**
   concern, not a **current-performance** bug.
4. **Backup = file copy.** `backup39.py` provides ZIP export/import of the JSON
   state (admin-key gated) — a real, working mechanism, but it is manual/file-
   based rather than a managed DB backup (point-in-time recovery, WAL, etc.).

**Recommendation (not executed this pass — see "migration" rule in brief):**
A move to Postgres via the already-installed SQLAlchemy is the correct long-term
fix, but it is a multi-week, whole-application-touching migration (every one of
~30 backend modules reads/writes these JSON stores) that needs its own documented
migration plan, data-migration script, and rollback strategy **before** a single
line of migration code is written — exactly as the governing instructions for
this engagement require. This is tracked as the #1 item for a dedicated future
phase; see `PRODUCTION_READINESS.md` for the staged plan.

**What we did fix this pass (safe, scoped, tested):** two specific endpoints
(`/api/profile/preferences`, `/api/profile/update`) were bypassing the existing
atomic `DBSTORE.save()` helper entirely and writing a raw, differently-shaped
payload straight to `data_db.json` with a plain `open(..., "w")` — not atomic,
and liable to make the next server restart silently discard all interests/
payments/OTP state. Fixed to use the same helper every other save-site in the
file already uses. Full reproduction, fix, and before/after verification in
`CHANGELOG.md` §1 and `DATABASE_AUDIT.md` §2.

---

## 5. Authentication & authorization (verified — mostly PASS)

- **Password hashing:** PBKDF2-HMAC-SHA256, 120,000 iterations, random 16-byte
  salt, stdlib only (`backend/main.py:5308-5325`). No bcrypt/argon2 dependency,
  but this is a legitimate, non-trivial KDF — **PASS WITH NOTES** (iteration
  count is below OWASP's 2023 recommendation of ~600k for PBKDF2-SHA256;
  acceptable but worth raising in a future pass; not a P0).
- **Session tokens:** Stateless HMAC-SHA256-signed tokens with an embedded
  expiry (`tsap_id|exp|scope|nonce`, verified with `hmac.compare_digest` —
  timing-safe), default TTL 720h/30 days (`backend/hardening.py`). **PASS WITH
  NOTES**: being stateless, a token cannot be server-side revoked before its
  natural expiry (e.g. on "logout everywhere" or a detected compromise) — a
  known, common trade-off of stateless tokens, but worth documenting as a gap
  for `SECURITY_AUDIT.md`.
- **Admin/owner auth:** Constant-time comparison (`hmac.compare_digest`)
  against `ADMIN_KEY`; **the app refuses to boot in production** if `ADMIN_KEY`
  is missing or shorter than 32 chars, or if `TSAP_AUTH_SECRET`/`JWT_SECRET` is
  missing (`backend/main.py:1363-1364`, `backend/hardening.py:80-93`) — this is
  genuinely solid defensive engineering already in place. **PASS.**
- **Authorization enforcement:** Every single `/api/admin/*`, `/api/owner/*`,
  `/api/moderation/*` route in `main.py` (scanned programmatically) has a
  visible `require_admin`/`require_owner`/`is_admin()` guard. **PASS.**
- **Cookies (admin/owner control-panel session):** `httponly=True`,
  `secure=<production>`, `samesite="strict"` (`backend/control_auth.py:228`).
  **PASS.**
- **Rate limiting:** Login lockout after 5 failed attempts / 15 min; OTP
  lockout after repeated attempts / 15 min; sliding-window rate limiter used
  across OTP/register/interest/webhook endpoints (`backend/hardening.py`).
  **PASS.**
- **CSRF:** The app does not rely on ambient cookie-based auth for user-facing
  API calls (Bearer/`X-Tsap-Token` header instead), which is inherently CSRF-
  resistant for those endpoints. The admin/owner control panel *does* use a
  cookie (see above) with `samesite=strict`, which mitigates classic CSRF.
  **PASS WITH NOTES** — no explicit CSRF token scheme exists as a second layer;
  acceptable given `samesite=strict`, not flagged as P0/P1.

---

## 6. File upload security (verified — PASS)

`backend/photo_validate.py` ("WAVE 17"): photos are parsed with PIL
(`Image.open()` + `.load()`, i.e. validated by **actual content**, not by
trusting the file extension or client-supplied MIME type), format-whitelisted
to JPEG/PNG/WEBP/MPO, size-bounded (4KB–5MB), and run through resolution,
brightness, blur (Laplacian variance), glare, and "photo-of-a-photo" frame
heuristics before acceptance. This is materially more sophisticated than a
"trust the extension" upload path. **PASS.** Not independently re-verified
this pass: where validated files are ultimately written to disk (filename
sanitization / path-traversal surface) — flagged as a follow-up item for
`SECURITY_AUDIT.md`.

---

## 7. Routing & SEO (spot-checked — PASS WITH NOTES, 1 bug fixed)

- `robots.txt` correctly disallows `/admin`, `/admin/photos`, `/control`,
  `/growth`, `/api/`, `/search/` (private profile IDs). **PASS.**
- `/me` and `/requests` (private, login-gated dashboards) both correctly
  declare `robots: { index: false, follow: false }` at the page level.
  **PASS.**
- **Bug found & fixed:** `frontend/src/app/sitemap.ts` listed `/requests` at
  **priority 0.92** (2nd-highest in the whole sitemap) despite that same page
  declaring `noindex` — a direct contradiction that wastes crawl budget and
  can make Google treat the sitemap as less trustworthy. Removed from the
  sitemap this pass (see `CHANGELOG.md`).
- `/remarriage` → `/second-marriage` is a real `308` edge-level redirect
  (config-level, not client JS) — confirmed in a prior pass this session,
  still correct.
- Full route-by-route redirect/canonical matrix is tracked separately in
  `ROUTE_MAP.md` (initial version — not yet exhaustive for all 47 routes;
  flagged as a Phase 1 follow-up to complete).

---

## 8. Existing automated test coverage (verified by actually running it)

Ran, this pass, against the live app:
- `test_100_developer_checks.py` — **110/110 passed** (covers registration,
  auth, astrology/porutham, matching, monetization, referral engine, admin
  CRM, retention policy, localization).
- `test_100_registrations_e2e.py` — **100/100 simulated registrations +
  full matching/admin-directory/astrology E2E flow passed.**

Both were re-run **after** this pass's code changes to confirm no regression.
**Current test-entrypoint policy:** the 67 hand-rolled backend integration scripts
remain authoritative subprocess programs using `fastapi.testclient.TestClient`
(the direct sweep passed **67/67**). `conftest.py` now gives those scripts a
no-import pytest collector so their deliberate module-level `sys.exit()` calls
cannot abort collection; the side-effect-free atomic persistence checks run as
normal pytest tests (**4 passed**). This keeps both CI-friendly collection and
the richer isolated direct-script regressions without pretending that printed
subprocess checks are ordinary pytest functions.

---

## 9. What was actually changed this pass

See `CHANGELOG.md` for full detail. Summary:
1. **P0 — Fixed:** two endpoints bypassing atomic JSON persistence
   (`backend/main.py`, `/api/profile/preferences` + `/api/profile/update`).
2. **P0 — Fixed:** critical RCE CVE in pinned Next.js version (16.3.5 → 16.3.8);
   the current lock is now on Next.js/eslint-config-next 16.4.2 and
   `npm audit --omit=dev` reports 0 production vulnerabilities. Full audit
   retains 5 high, dev-only findings in the Next ESLint plugin chain; its offered
   fix is an incompatible Next 14 lint-config downgrade, so it remains documented
   rather than forced.
3. **P1 — Fixed:** remaining runtime JSON/report writers now use the shared
   crash-safe writer; retention archive names are collision-resistant and a
   failed core save rolls the in-memory deletion back and returns 503. Upload
   state is committed transactionally, voice uploads require owner/admin auth,
   and all bounded media writes use unique atomic files.
4. **P1 — Fixed:** mutation retries are opt-in (GET only by default), API body
   parsing handles empty/non-JSON responses, and CSV/browser exports use
   authenticated Blob downloads instead of credential-bearing URLs.
5. **P2 — Fixed:** sitemap/robots contradiction for `/requests` and pytest
   collection failure caused by executable integration scripts.
6. Full regression verified: frontend lint/static/security, TypeScript,
   production build, corrected route fuzz (**356 probes, 0 5xx**), direct
   backend sweep (**67/67**), and pytest collection (**4 passed**).

---

## 10. Priority backlog for next phases (not yet actioned)

| Priority | Item | Domain |
|---|---|---|
| P1 | Document + plan (not yet execute) Postgres migration | Database/Migration Architect |
| P1 | Complete exhaustive `ROUTE_MAP.md` (all 47 frontend routes × redirect/canonical/auth-guard matrix) | Solution Architect |
| P1 | Full `SECURITY_AUDIT.md` pass: IDOR check on profile/search endpoints, upload filename handling, dependency audit on backend (`pip-audit`) | AppSec |
| P2 | Raise PBKDF2 iteration count; document stateless-token revocation gap | Password/Auth Security |
| P3 | Move 50+ root-level planning `.md` files into `docs/planning/` | Code Quality |

This backlog will be worked top-down (P0 → P1 → P2 → P3) in subsequent passes,
continuing the audit→fix→test→re-audit loop per domain, as mandated.

## Continuation verification — 2026-10-18 (transactional boundary pass)

The follow-up audit closed the previously identified cross-store persistence gaps:

- `backend/paypro.py` now treats payment-ledger writes as fallible, rolls back order/offer state on failure, persists verified credits/boost benefits before success, and restores the user, assisted order, or ad campaign when the final payment commit fails. Manual UTR, Razorpay verify, webhook, refund, offer-cap, and duplicate paths are fail-closed rather than silently returning success.
- `backend/ads.py` now checks every campaign create/approve/update/action, impression, click, lead, and expiry write; invalid edits and failed writes restore the prior campaign object.
- Cross-store admin operations now commit before reporting success: profile moderation, control-panel plan grants, admin plan grants, astro/jathakam verification, photo review, contact unlock, referral payouts, partner records, and assisted orders have explicit rollback/error paths.
- Focused boundary coverage expanded to **16 pytest tests**, including payment fulfillment/final-ledger rollback, ads rollback, consent-unlock rollback, referral payout rollback, astro profile/queue rollback, media rollback, and retention rollback.

Verification after this pass: direct backend integration sweep **67/67**, explicit pytest **16 passed**, frontend lint/static/security **passed**, frontend production build **passed** with 52 routes, `compileall` **passed**, and `git diff --check` **passed**. Provider-backed payment tests remain intentionally skipped without owner-configured credentials; this is not a production settlement validation.
