# Website scope and operational gaps — current notes

This file replaces an old strategy draft that contained unverified channel-status claims, sample profiles, unsupported performance/revenue figures, and production-post instructions. Use `README.md`, `ROUTE_MAP.md`, and the canonical source files for current behavior.

## Implemented repository scope

The codebase contains a Next.js frontend and FastAPI backend for member registration, profile search and filters, consent-based interest requests, credits and payment workflows, referrals, vendor directory/lead capture, sponsored Spotlight placements, and a registry-driven channel directory. The UI includes Telugu/English language selection and local promotional media labeled as illustrative.

The lowest paid consumer plan is ₹99 for 5 interest requests; registration includes 3 free interest-request credits. Plan features and validity are sourced from `backend/interest.py` and shown on `/pricing`.

## Channel configuration and publishing

`backend/channels_config.py` is the canonical registry. It contains 64 configured directory entries. A configured username, link shape, routing-eligibility flag, or successful local build does not establish that a Telegram/WhatsApp destination exists, is reachable, or grants the bot permission. No external channel check is implied here. Preserve the configured primary usernames; never guess or automatically try alternates.

Profile publishing is conditional on review, publishing configuration, routing candidates, and external service access. Queued work is not proof of message delivery. The app must not display fictional profile data to fill an empty live directory.

For safe local checks, see `TEST-2-CHANNELS-NORMAL.md`. `backend/test_channels.py` is a no-network dry run by default; the explicit optional Telegram check is read-only. `backend/setup_channels.py --apply` can mutate Telegram channel metadata and send/pin a message; it is not a smoke test and requires separate operator approval.

## Remaining operational work

Before production launch, an authorized operator still needs to validate the actual deployment configuration, database/backup/retention setup, payment-provider sandbox and reconciliation procedures, consent and privacy behavior, external messaging integrations, and accessible behavior across supported devices. Local tests cannot prove production uptime, payment settlement, identity, external link validity, or delivery.

No channel availability, bot-admin status, production profile count, revenue forecast, performance benchmark, or launch-readiness claim is made by this document.
