# Mana Vivaha — production deployment gate

> **NO-GO for public production from this checkout (rechecked 2026-10-18).** The production bundle has a durable named volume, explicit runtime-store paths, one backend worker, non-root/read-only runtime targets, bounded container resources, loopback-only frontend exposure, and fail-closed storage validation. Production now also refuses to start on a missing, corrupt, incomplete, or unmarked-empty core registrations database; first-run empty initialization requires an explicit opt-in. These safeguards have only been tested against disposable local stores. No production host, real volume/database, verified domain, operator secret manager, real provider credentials, migration backup, off-host media backup, or Docker engine is connected to this session. The backend still uses a single-process JSON system of record; this is not a horizontally scalable or highly available database deployment.

## Deployment shape and limits

`docker-compose.prod.yml` is now a **standalone** production stack. Do not combine it with the development `docker-compose.yml`: the latter bind-mounts source code and exposes development services. The production stack builds the backend `prod` target (Python 3.11, non-root) and the frontend `runner` target (Next standalone, Node 20 Alpine, non-root), runs one backend worker, stores runtime JSON and media under the named `appdata` volume, keeps the backend API off the host network, and binds the frontend to `127.0.0.1:3000` for the host Caddy reverse proxy. Backend/frontend/bot containers use read-only roots, `tmpfs` scratch space, `no-new-privileges`, dropped capabilities, bounded CPU/RAM/PIDs, and rotated JSON logs. It intentionally does not start the unused PostgreSQL or Redis services from the development stack; the application has not been migrated to use either as its system of record.

This layout protects state from ordinary container replacement on the same host. It does **not** protect against host/disk loss, provide multi-host failover, or permit safe horizontal backend scaling. Configure encrypted off-host volume backups and test restore before accepting real member or payment data. The application ZIP backs up JSON/JSONL state; it does not include uploaded media files, which require a separate backup of the persistent media volume. The reviewable OCI host/bootstrap, encrypted volume backup, and new-volume restore artifacts are in [`deploy/oci/`](deploy/oci/) and [`scripts/backup-volume.sh`](scripts/backup-volume.sh)/[`scripts/restore-volume.sh`](scripts/restore-volume.sh); each is guarded and does not authorize public launch by itself.

## 1. Protect current data before changing storage

Before starting this stack on any host:

1. Determine whether that host already contains profiles, payments, referrals, photos, token-revocation counters, or other real records.
2. Take an off-host backup of the existing application state and media, then test restoring it to a separate disposable environment.
3. Map every existing JSON/JSONL and media store to the new volume **without replacing it with an empty volume**. In particular, preserve any prior `token_versions.json` values at `TSAP_TOKEN_VERSIONS_FILE` before cutover, or arrange an approved session-secret rotation if the prior state cannot be recovered. The configured volume name defaults to `mana-vivaha-appdata`; changing `MANA_VIVAHA_VOLUME_NAME` later creates a different, empty store.
4. Keep the old storage untouched until the new volume has been checked against the backup and a rollback has been tested.
5. Confirm `TSAP_DB_FILE` points at the verified existing `data_db.json` on the volume that will remain attached to the backend. A populated legacy JSON snapshot is accepted after structural checks; startup does not copy or migrate another volume automatically.
6. The new production backend runs as UID/GID `10001:10001`. A newly created named volume normally inherits the image directory ownership; for an existing volume, inspect first and perform a one-time maintenance migration before launch, without changing data contents:

   ```bash
   docker run --rm --user 0 -v mana-vivaha-appdata:/var/lib/manavivaha \
     --entrypoint sh mana-vivaha-backend:reviewed \
     -c 'chown -R 10001:10001 /var/lib/manavivaha'
   ```

   Replace the volume/image names with the reviewed project values. Verify ownership and archive the volume before this operation. Never solve a permission error with `chmod 777` or by making the production container root.
7. For a **verified brand-new installation only**, use the separate one-shot initializer in Section 3 before starting the service. It requires explicit confirmation, verifies the target path is inside the durable volume, and refuses to overwrite any existing path. Normal server startup has no empty-database override, so a replacement empty volume will remain blocked.

The backend refuses to start when the database is missing, corrupt/unreadable, missing required collections, malformed, or empty without the initialization marker. It does not truncate or auto-replace corrupt data. Duplicate/malformed registration rows also block production restore instead of being filtered and written back. Preserve the source volume and restore/repair only from a verified copy. Do not run `docker compose down -v`, delete the named volume, or change its name against live data.

## 2. Provision deployment secrets out of band

Create a server-only `.env.production` using a secret manager or a file with restrictive permissions. Do not commit it or paste secrets into chat:

```bash
cp .env.example .env.production
chmod 600 .env.production
```

Generate distinct random values for `TSAP_API_KEY`, `TSAP_AUTH_SECRET`, `ADMIN_KEY`, and `JWT_SECRET` (at least 32 random bytes each). Do not reuse development keys. Verify the domain and DNS before replacing the localhost values in `PUBLIC_SITE_URL` and `CORS_ORIGINS`.

Provision owner/worker control accounts with long unique passwords. The helper prints PBKDF2 password hashes; keep the output private and put only the resulting JSON into the secret manager:

```bash
cd backend
.venv/bin/python provision_control.py
```

Set `CONTROL_ACCOUNTS_JSON` from that output. Production rejects plaintext control passwords. Set `APP_ENV=production`, `OTP_DEV_MODE=false`, `PAYMENT_AUTO_APPROVE=false`, and `DEMO_SEED_ENABLED=false`. In production, member authentication issues a Secure/SameSite/HttpOnly `mv_member_session` cookie plus a double-submit `mv_member_csrf` cookie; cookie-authenticated mutations require `X-CSRF-Token`. The frontend keeps only a short-lived sessionStorage migration fallback and removes legacy persistent bearer tokens. Verify this behavior through the TLS hostname before launch.

A real OTP provider is required for production startup. Configure a verified SMS provider and template (or an owner-controlled WhatsApp OTP bridge) using the appropriate secret variables. Do not enable live payments until a real merchant account, webhook secret, amount/currency flow, and sandbox replay/failure behavior have been verified. Leave `PAYMENTS_LIVE=false` until that sign-off. Leave WhatsApp/channel publishing disabled until the owner confirms the exact sender and destinations.

Keep `SUPPORT_EMAIL`, `SUPPORT_PHONE`, `SUPPORT_WHATSAPP`, and the frontend `NEXT_PUBLIC_SUPPORT_*` values blank until the owner supplies and confirms actual business contacts. Likewise, do not publish `NEXT_PUBLIC_LEGAL_NAME`, `NEXT_PUBLIC_BUSINESS_CONTACT_NAME`, `NEXT_PUBLIC_BUSINESS_LOCATION`, or `NEXT_PUBLIC_GRIEVANCE_OFFICER` unless those details are evidenced. The frontend `NEXT_PUBLIC_*` settings are baked into the image at build time; rebuild after a reviewed configuration change. No legal-acceptance certificate or personal acceptance metadata is exposed by the service.

Browser push stays preview-only unless the sender dependency is installed, the public/private VAPID keys are valid and match, and an owner-configured `VAPID_SUBJECT` (or valid configured `SUPPORT_EMAIL`) is present. No contact address is synthesized. Device delivery is not confirmed by a successful send attempt.

## 3. Validate and start the standalone stack

Use Docker Compose v2. This sandbox does not have Docker installed, so the production image build and Compose interpolation must still be tested on the target host or CI:

```bash
docker compose version
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
# Build both hardened runtime targets; review the generated image users and sizes.
docker compose --env-file .env.production -f docker-compose.prod.yml build --pull backend frontend
```

Do **not** append `-f docker-compose.yml`. Before the first `up`:

- **Existing populated database:** do not run the initializer. Keep its verified file and named volume mounted.
- **Verified brand-new installation with no database file:** only after `.env.production`, the project name, and volume name are confirmed, initialize once:

  ```bash
  docker compose --env-file .env.production -f docker-compose.prod.yml build backend
  docker compose --env-file .env.production -f docker-compose.prod.yml \
    run --rm --no-deps backend python bootstrap_core_db.py --confirm-new-install
  ```

- **Legacy empty database without a marker:** after an off-host backup and confirming every collection is empty, use `--confirm-existing-empty` in place of `--confirm-new-install`. That mode preserves existing metadata and refuses any database containing records.

Never run either initializer against an unreadable/corrupt database. The initializer is a separate command; normal server startup has no empty-database override.

Start the stack only after the appropriate existing-data or one-time-bootstrap path is complete:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

After startup, confirm both services are healthy before enabling promotion or payments. In production, the public `/api/health` endpoint is intentionally minimal (liveness only); registration/payment/queue counts and payment mode are available only through the authenticated `/api/admin/health` route.

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 backend frontend
```

The backend intentionally refuses startup unless all configured stores and media directories resolve inside `MANA_VIVAHA_PERSISTENT_ROOT`, are writable, and the production auth/control/OTP checks pass. It also validates the core registrations/payments JSON before starting workers. A populated legacy database is accepted after structural checks; it is not replaced by an empty database when the file is missing or damaged.

### Rebuild and rollback without replacing registrations

1. Record the exact Compose project and volume name (`docker volume inspect mana-vivaha-appdata`, or the owner-configured `MANA_VIVAHA_VOLUME_NAME`). Confirm the backend is mounted to that same volume; `docker compose up --build` is safe only when it retains the same project and volume configuration.
2. Build and review the release image before the maintenance window. Keep the previously reviewed backend image/commit available for rollback; do not prune images or volumes during the release.
3. During a short maintenance window, stop the backend gracefully so its shutdown flush completes, then take and checksum an encrypted, off-host archive of the **entire named volume** (state and media). Verify the archive and test extraction into a separate disposable volume. Do not put backup archives in this repository.
4. Recreate only the backend with the reviewed build, same Compose project, same `.env.production`, and same named volume. Do not run `down -v`, rename the volume, add the development Compose file, or restore an empty data directory.
5. Check container health and logs, `/api/health`, restored registration/payment counts, profile/photo access, and the same-volume mount before reopening writes. If checks fail, stop writes and redeploy the previous reviewed backend against the **same volume**. Do not delete or overwrite the source database during rollback.
6. If a data restore is actually needed, restore the verified archive to a separately named clone first, compare records and media, then use an owner-approved cutover. Never test restore by extracting over the only live volume.

This release adds only an additive JSON format marker; no registration migration or replacement is performed for a populated legacy store. Any future schema migration must be separately backed up, validated on a clone, and explicitly reviewed before it is allowed to write.

The optional Telegram polling bot is not started by default. Start it only after owner-confirming the token and destinations:

```bash
docker compose --profile telegram --env-file .env.production -f docker-compose.prod.yml up -d bot
```

## 4. TLS reverse proxy

Install Caddy on the host and replace the example hostnames in `Caddyfile.example` with domains the operator owns and has verified in DNS.

The backend deliberately ignores `X-Forwarded-For` unless `TRUSTED_PROXY_CIDRS` names the immediate reverse-proxy peer. Set that variable to the verified proxy/container CIDR(s) before launch; never set it to the public internet or an unverified broad range. This policy is used by both abuse limits and referral analytics, so a missing or invalid value fails closed to the direct peer address. The frontend listens on host loopback only; Caddy should proxy to `127.0.0.1:3000`. The backend port is not published to the host. The control hostname is not a security boundary; server-side session and role checks remain mandatory.

## 5. Staging smoke/recovery gate before public launch

On staging, with real provider sandbox credentials (never fake production values), verify:

- `/`, `/register`, and `/api/health` load through the public TLS hostname.
- Registration without a valid photo is rejected; an uploaded photo requires consent, stays private/pending, and only becomes public when approved **and** the member opted into visibility.
- SMS/OTP reaches a controlled test handset; codes expire, are single-use, and cannot be replayed.
- Owner and worker control accounts can sign in; worker role receives 403 for owner-only exports, payment/refund actions, and backup operations.
- Payment sandbox verifies webhook signatures, duplicate/replay behavior, amount/currency, and failure paths. No live money or fake payment references are used in the test.
- Message queues report unavailable/queued/sent states honestly; no external delivery is inferred from local queue success.
- A JSON backup restores to the configured state path, and a separate volume/media backup restores photos/cards/jathakams on an isolated copy.
- A container replacement preserves the same data; rollback does not point to a new empty volume.
- Responsive layout, keyboard flows, screen-reader labels, and production performance are reviewed on real mobile and desktop browsers.

Only after an operator records these results, confirms data migration and rollback, and verifies external destinations should the site be announced or paid promotion enabled. A passing build or local test suite is not production sign-off.
