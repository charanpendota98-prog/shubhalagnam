# 🛡️ Full Deploy Audit — Mana Vivaha (2026-10 round)

> **TL;DR:** Platform production-grade ga, mature ga undi (13 merged audit PRs
> before this). Ee round lo sandbox lo nijamga run chesi **deep audit** chesa —
> security / PII / money / OTP / wiring / backup anni verify chesa. **3 real
> production risks** dorikipayi, fix chesa, and vaatini **lock cheyyadaniki oka
> regression suite** (`test_deploy_hardening.py`) add chesa. Full backend suite
> **46/46 + 16/16 hardening = GREEN**. Site live-preview lo verify ayyindi.

Audit method: code ni sandbox lo actually run chesi (382 real profiles seed),
330 backend routes × 115 frontend calls cross-reference, auth-guard matrix,
PII-leak scan, payment-webhook replay analysis, backup round-trip — static
reading kadu, live behavior.

---

## ✅ Verified SOLID (no action needed — already production-grade)

| Area | Em check chesa | Result |
|---|---|---|
| **PII / phone privacy** | `safe_user()` anni public responses lo phone mask chestunda? Raw phone leak edaina route unda? | 🔒 Solid — public API lo raw phone **eppudu ledu**; `phone_masked` (98••••••45) matrame. Number exchange consent/plan tho only. Non-admin routes scan → **0 leaks**. |
| **Payment webhook** | Signature, replay, idempotency, amount-tamper | 💰 Excellent — timing-safe HMAC on **raw body**, **fail-closed** (gateway live + secret ledu → 503), amount↔plan mismatch reject, `idem_seen()` **check-and-set** replay guard (double-credit ledu), client `signature_verified` flag → 403, abuse ledger. |
| **OTP** | Brute-force, replay, timing, storage | 🔐 Excellent — 5-try → 429 + 15-min lock, **single-use** (verify tarvata pop = replay ledu), `hmac.compare_digest` (timing-safe), **hashed** OTP storage, expiry check. |
| **Auth guards / IDOR** | Sensitive endpoints (delete-account, grant-plan, credits, views, manual-activate) | 🛡️ Guarded — `delete-account` → `require_owner` (P0 IDOR fix already in), `grant-plan`/`manual-activate` → `require_admin`, `who-viewed` → `require_owner(viewer_id)`, partner payout → OTP-verified phone. |
| **Frontend↔backend wiring** | 115 frontend API calls × 330 routes | ✔️ **0 broken** — anni calls correct endpoints ki resolve (control/admin/referral/profile dynamic routes tho kalipi). |
| **Feature completeness** | Stub/TODO/coming-soon/empty handlers | ✔️ **0 broken features** — who-viewed end-to-end wired (`ProfileView` records view → owner sees, free=masked/paid=names), shortlist, saved-search alerts, porutham, match-score anni functional. |
| **Docs protection** | `/docs`, `/openapi.json` production lo | 🔒 Gated behind `dev_mode() or is_admin` (public kadu). |

---

## 🔧 3 REAL production risks — FOUND & FIXED this round

### 1. 🎭 Fabricated public stats (misleading-advertisement risk) — *fixed last sub-round, re-verified*
`/api/stats` + `/api/platform/stats` returned `max(10000, users+9940)` with
hard-coded `verified_percentage: 98.4`, `daily_matches: 1450`. Frontend repeated
**"10,000+ verified profiles"**, **"3,500+ happy marriages"**, **"trusted by
10,000+ families"** (hero, trust band, referral/register share templates) while
real inventory was a few hundred.

**Risk:** Consumer Protection Act 2019 (misleading ads) + ASCI code +
payment-gateway/bank **KYC review** — and it burns the one asset a matrimony
brand runs on: trust.

**Fix:** `real_platform_stats()` derives every number from the live DB
(approved profiles, OTP/photo-verified counts, brides/grooms, real district &
caste coverage, today's curated matches) + `stats_are_live:true`. New frontend
`lib/live-stats.ts` (`useLiveStats`); hero/trust-band/share-templates now show
live counts / true coverage.
> After: `382 ధృవీకరించబడిన నిజమైన తెలుగు సంబంధాలు • 39 కులాలు • 53 జిల్లాలు`

### 2. 🎬 Demo-token issuance in production — FIXED
`/api/auth/demo-token` had `DEMO_LOGIN` default **`"1"` (ON)** and granted a
token for any `is_seed` profile. In production a legacy seed/inventory profile
(e.g. from an earlier `LAUNCH_SEED_COUNT>0` run) could get an **auth-less
token** → browse/act as that profile.

**Fix:** `APP_ENV=production/prod/live` → demo-token **always 403** (even for
seed, even if `DEMO_LOGIN=1` explicitly). Dev/preview (`dev_mode`) unchanged so
sandbox/staging browsing still works. `docker-compose.prod.yml` now pins
`DEMO_LOGIN=false` (defense-in-depth).

### 3. 💾 Backup silently omits core DB when `TSAP_DB_FILE` is set — FIXED
`backup39.export_zip()` globbed only `backend/*.json`. The live DB is
`db_store.DB_FILE = $TSAP_DB_FILE or backend/data_db.json`. Operators commonly
point `TSAP_DB_FILE` at a **persistent volume** (`/data/db.json`) so data
survives container rebuilds — in that case the backup zip looked healthy
(`meta.count>0`) but **omitted the entire database**, and `import_zip()`
restored to `backend/` (not the configured path). A "successful" backup that
cannot restore the site.

**Fix:** `export_zip()` now resolves the real `DB_FILE` and **guarantees** the
core DB is in the zip under the canonical `data_db.json` (meta records the true
`db_file` path); `import_zip()` restores the core to `DB_FILE`, satellites to
`backend/`. Round-trip verified with the DB on an external volume.
> Note: current prod has `TSAP_DB_FILE` **unset** → backup already worked; this
> hardens it against the volume-persistence pattern before it bites.

---

## 🧪 Test harness — App Router split (23 suites were false-failing)
After the R13 refactor pages are `page.tsx` (server) + `page-client.tsx` (real
UI). 19 static-source suites read only `page.tsx` → **~23 false failures**
("feature missing" though present in `page-client.tsx`). New
`backend/testutil_paths.py::src_page()` resolves a page **with** its `-client`
sibling; rewrote the frontend reads across wave15–40 + privacy/referral/
vendors/growth. Also fixed wave34 (token-versioning after route-sweep revoke),
wave31 (multi-line JSX comment stripper), ProfileView bilingual children label.

---

## 🖼️ Preview/staging embed (opt-in, default locked)
`next.config` `EMBED_ALLOWED_ORIGINS` adds trusted origins to CSP
`frame-ancestors` (X-Frame-Options stays SAMEORIGIN). **Unset → `'self'`
exactly as before** — production unchanged unless the env var is set. Lets a
production build be reviewed in an Arena/staging iframe.

---

## ✅ Verification (sandbox, live — not static)
- **46/46** backend suites GREEN + **16/16** new `test_deploy_hardening.py`
- `next build` clean (49/49 pages), all key routes HTTP 200
- `/api/stats` honest (382, `stats_are_live:true`), plan ladder correct
  (FREE 3 / ₹29 1 / ₹99 5 / ₹199 12 / ₹299 25 / ₹499 50)
- Backup round-trip on external volume DB ✓ · demo-token prod-block ✓

## 🚀 Deploy (zero-downtime, live-site safe)
```bash
DEPLOY_BRANCH=main bash update-vm.sh     # backup → pull → prod rebuild → health-check → auto-rollback on fail
```
Production checklist unchanged (PRODUCTION-DEPLOY.md): `APP_ENV=production`,
`OTP_DEV_MODE=false`, real SMS/WhatsApp OTP, secrets 32+ chars,
`DEMO_LOGIN=false` (now pinned in prod compose), **do NOT set
`EMBED_ALLOWED_ORIGINS`** (keeps frame-ancestors `'self'`).

**New regression guard:** `python3 backend/test_deploy_hardening.py` — run it in
CI / before every deploy; it fails loudly if honest-stats, prod demo-token
block, or volume-safe backup ever regress.
