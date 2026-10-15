# Mana Vivaha — Backup & Restore Safety Notes

> **Production status remains NO-GO until an operator completes an encrypted off-host backup and an isolated restore drill for both application state and uploaded media.** This page describes the limits of the in-app ZIP; it is not a disaster-recovery guarantee.

## What the in-app ZIP contains

The authenticated backup endpoint exports the core database and configured JSON/JSONL application-state files. It can be useful for an operator-managed restore, but its coverage depends on the configured paths at the time of export.

The ZIP does **not** include uploaded profile photos, cards, voice introductions, jathakams, vendor/referral posters, the production `.env`/secrets, the source code, or a copy of the Docker volume. Treat the ZIP as sensitive personal data: store it encrypted with restricted access and retention.

A local startup snapshot is on the same host/volume. It is not an off-site backup and cannot protect against host, disk, or volume loss.

## Production backup requirements

The standalone production Compose configuration stores JSON state and media under the named `appdata` volume. Before accepting real member or payment data, the operator must:

1. Inventory the existing host's database/state files and uploaded media. Do not replace existing data with a newly created empty volume.
2. Back up the complete persistent volume—including media—to an encrypted, access-controlled off-host destination.
3. Restore that backup to an isolated disposable environment and compare the resulting records and media before changing the live deployment.
4. Document a rollback that keeps the same source-of-truth volume. Never run `docker compose down -v` against production data.
5. Keep application ZIPs and host-volume backups separate from `.env.production` and provider credentials; provision secrets using the operator's secret manager or restricted host-only storage.

## Using the application ZIP

Only an authorized operator should export/import through the restricted owner/admin interface. Restore rejects incomplete core schemas, malformed/duplicate profile identity rows, and unmarked empty stores before changing files. If any core collection (including registrations or payments) would shrink, the first request is refused with HTTP 409; the owner UI requires a second explicit confirmation. A private same-volume pre-restore snapshot is created before writes, satellite files are installed before the core database, and a missing configured core DB is never represented as an empty placeholder backup. This snapshot is still not an off-host backup. Prefer a disposable staging environment, confirm the target paths and verified backup first, and do not treat a successful HTTP response as a tested disaster-recovery plan. The application ZIP cannot restore missing uploaded media or secrets.

For current commands, migration safeguards, and release gates, use [`PRODUCTION-DEPLOY.md`](PRODUCTION-DEPLOY.md) and [`PRODUCTION_READINESS.md`](PRODUCTION_READINESS.md). Keep the repository private and do not paste backup archives, member data, passwords, API keys, or secret files into chat or source control.
