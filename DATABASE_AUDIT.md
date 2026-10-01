# DATABASE_AUDIT.md — Phase 0 finding, Phase 13 deep-dive pending

**Status: headline finding documented and one concrete bug fixed. Full
per-query/per-JSON-file audit is a follow-up phase.**

## Headline finding
See `ARCHITECTURE_AUDIT.md` §4 for full detail. Summary: this application has
**no real database**. `postgres`/`redis` are provisioned in docker-compose but
never connected to from `backend/*.py`. All persistence is 17+ flat JSON files,
the largest and most critical being `data_db.json` (users/interests/payments/
OTPs), managed by `backend/db_store.py` with an atomic tmp+rename write
pattern.

## P0 bug found + fixed this pass
`/api/profile/preferences` and `/api/profile/update` bypassed the atomic save
helper and wrote a wrong-shaped, non-atomic payload directly — a latent
data-loss trap on restart. Fixed; full reproduction + verification in
`CHANGELOG.md`.

## Confirmed-good patterns already in place
- `db_store.py`: tmp-file + `os.replace()` atomic write, 5s debounce, safe
  startup load (corrupt/missing file → empty dict, not a crash).
- `backup39.py`: admin-key-gated ZIP export/import of full JSON state.
- `wa_antiban.py`: also does atomic tmp+rename for its own state file.

## Not yet individually audited (Phase 13 backlog)
- `referral_state.json`, `vendor_state.json`, `stories_state.json`,
  `consent_ledger_state.json`, `retention_log.json`,
  `saved_searches_state.json`, `spotlight_promotions.json`,
  `wa_pool_state.json`, `channel_setup_state.json`, `push_state.json` and
  others — each module manages its own load/save; atomic-write discipline not
  yet individually verified for each file.
- No current evidence of query-performance problems (p99 API latency 3.9ms
  per the existing dev-check suite at current data volume), but there is no
  indexing strategy — every filter/search endpoint does an in-memory linear
  scan. This is a **scaling** concern, not a **current** bug.

## Recommendation (documented, not executed — per migration-safety rule)
A staged Postgres migration via the already-installed SQLAlchemy dependency is
the correct long-term direction, but requires, before any migration code is
written:
1. A frozen schema design mapped from the current JSON shapes (users,
   interests, payments, OTPs, referrals, vendors — one table/model per
   existing JSON domain).
2. A one-time, idempotent, re-runnable data-migration script
   (JSON → Postgres) with a dry-run mode.
3. A rollback plan (keep JSON-file writes running in parallel / shadow mode
   for a defined period before cutover).
4. Downtime/compatibility assessment for the ~30 backend modules that
   currently read/write these JSON files directly.

This is tracked as the top item in `PRODUCTION_READINESS.md`'s backlog and is
explicitly **not** something to execute blind in a single pass.
