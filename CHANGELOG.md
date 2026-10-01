# CHANGELOG

All entries are real, implemented, tested changes — not recommendations.
Format: date, priority, domain, what/why, files, verification.

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
