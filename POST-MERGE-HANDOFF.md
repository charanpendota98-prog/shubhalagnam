# Archived post-merge handoff — deployment not signed off

Updated: 2026-10-11

This file previously described a deployed public domain, VM, PostgreSQL/Redis production services, and a layered Compose command. Those claims and commands are stale and are not evidence that a production deployment exists or passed checks.

**Do not deploy from this handoff.** Read `PRODUCTION_READINESS.md` and `PRODUCTION-DEPLOY.md`. The current production configuration is a standalone `docker-compose.prod.yml`; it must not be combined with the development `docker-compose.yml`. The app currently uses a single-worker JSON store on a named volume, not PostgreSQL/Redis, and is not horizontally scalable or highly available.

No production host, verified domain, real provider delivery, payment settlement, media restore, or external uptime has been verified in this session. Keep payments and outbound messaging disabled until owner-controlled credentials and destinations have been independently confirmed. Never put secrets in Git or chat.
