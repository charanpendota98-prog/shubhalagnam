# Supported production release

This code supports phone-number + password login, verified-email verification and
password recovery, and optional previously enrolled passkeys. It does not add
email-identifier login or require email during registration. Phone OTP is disabled
in the production policy, including its send API, rather than pretending a bridge
URL means delivery works. A phone number is not verified by registration alone.

A member without a verified email can use their password but has no automatic
forgotten-password recovery while phone OTP is unavailable. Passkeys need an
existing owner session and current password to enroll; they do not solve loss of
all devices. Email configuration is not proof that a particular message arrived.

## Checks and serving

`python backend/preflight.py` uses shared authoritative storage/core DB validators
and operator-policy validation. It never imports `main`, starts workers, sends,
initializes a missing database or modifies the core DB. It creates directories and
private temporary write probes on configured volumes. Run only against an approved
staged environment after backup/restore verification. All 35 configured durable
paths must resolve inside the persistent root, and token versions inside state.
A genuinely empty DB needs the existing explicit initialization marker.

`ecosystem.config.js` requires APP_ENV=production and existing absolute paths:
MANA_VIVAHA_RELEASE_DIR, MANA_VIVAHA_PYTHON, MANA_VIVAHA_NODE,
MANA_VIVAHA_STANDALONE_DIR. The standalone frontend artifact must contain server.js,
public/, and .next/static/. Build BACKEND_URL=http://localhost:8000 before packaging.
Use the actual tested interpreter/dependencies. No .env loader is assumed. The PM2
backend entry runs preflight before exec of one uvicorn process; app startup again
validates module-resolved paths. No workers/replicas/watch/reload or memory restart
thresholds. PM2 restarts must receive the intended environment, not stale saved env.
Secrets come from the approved runtime secret mechanism, never this repository.

## Activation is a separate decision

No live deployment, key rotation, bridge pairing or real email send is part of the
patch. Production requires explicit stable signing/admin secrets, control accounts,
all storage configuration and legitimate EMAIL_MODE=resend configuration with the
approved sender. The approved domain must be verified with the provider separately.
Off/mock email is rejected in production. Optional passkeys require the HTTPS RP ID
and allowed origins to match the production site. Preflight does not prove sender
verification, delivery, DNS/TLS, restore readiness, or approval to deploy.

Before cutover, take an off-host restore-verified backup of every actual durable
store/media file, preserve tracked runtime files during source updates, stage the
exact tested artifact, and obtain approval for any session invalidation. Member
tokens are stateless; zero current members does not prove zero issued tokens.
Rollback must use a separately tested prior artifact/config and preserved data;
there is no blanket delete-PM2 or data-preservation guarantee.

Email sender, subject/body, automatic registration verification when email is
provided, manual password-reauth verification, verified-email reset and owner test
recipient still need the owner's reviewed activation scope. Existing email copy
was preserved by this patch, not silently approved.
