# Product architecture — current scope and open verification

This file replaces an older “100% workable” plan that presented guessed channel handles, invented member seeds, capacity/revenue projections, and deployment claims as facts. Those examples are not operational instructions.

## Current scope

The repository contains a bilingual matrimony web application with registration, member profiles, search/matches, consent-based interest requests, credit plans/add-ons, admin review, safety/reporting, vendor workflows, and a configured Telegram channel directory. The exact behavior is determined by the current source code; not every planned integration or operational workflow is necessarily enabled.

The canonical channel registry has 64 configured entries. That count does not mean the Telegram destinations exist, are controlled by the operator, have granted bot-admin permissions, are online, or receive posts. Do not guess or probe alternative usernames. Use only the exact operator-approved primary destinations in `backend/channels_config.py`.

## Verification boundaries

- Member data is member-submitted unless a specific check is identified. A phone OTP, moderator decision, photo review, or other badge is not blanket identity verification.
- Do not seed live/public channels with fictional profiles or fabricated payment activity.
- Payment tests belong in the payment provider's official sandbox; do not invent a UTR, webhook, recipient, or payment proof.
- `backend/test_channels.py` is local no-network by default; its opt-in Telegram path is read-only. It does not post or prove delivery.
- Local type checks, unit tests, and build output prove only that those local checks passed. They do not prove deployment, third-party uptime, or production behavior.

## Current references

- [`README.md`](README.md) — setup and safe validation
- [`ROUTE_MAP.md`](ROUTE_MAP.md) — application routes
- [`LIVE-CHANNELS-CONFIG.md`](LIVE-CHANNELS-CONFIG.md) — channel configuration semantics
- [`LOCAL-TEST-VS-ORACLE-DEPLOY.md`](LOCAL-TEST-VS-ORACLE-DEPLOY.md) — local vs. external validation
- `backend/interest.py` — current pricing catalogue

Production readiness must be assessed separately by an authorized operator. This document makes no claim that the full product is “fully advanced,” deployed, or externally verified.
