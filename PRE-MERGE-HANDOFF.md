# Archived handoff — do not use as current deployment instructions

Updated: 2026-10-11

This file contained obsolete branch, host, domain, PostgreSQL/Redis, and Compose-overlay assumptions. It is retained only as history. **Do not copy its deployment commands or treat its addresses/integration notes as verified.** The active source of truth is:

- `PRODUCTION_READINESS.md` — current no-go decision and release blockers.
- `PRODUCTION-DEPLOY.md` — current standalone production stack and safe release sequence.
- `docker-compose.prod.yml` — standalone production configuration; do not layer with `docker-compose.yml`.

Current status: this Arena worktree is not a reviewed release and has not been deployed to an authorized production host. The app still uses a single-worker JSON system of record. Provider credentials, verified destinations, migration state, encrypted off-host backup/restore, host/DNS/TLS, and production QA remain operator gates. Do not put tokens, passwords, private keys, or `.env.production` contents in Git or chat.

If any provider credential was exposed in historical notes or chat, rotate it through that provider before launch; do not copy the old value into new documentation.
