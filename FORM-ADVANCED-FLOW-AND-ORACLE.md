# Registration, product scope, and deployment validation

This document replaces an older mock-registration and Oracle deployment walkthrough. The previous example included fabricated member data, payment references, channel posts, and unsupported “100%”/capacity claims; do not use it as an operational runbook.

## Current registration and review boundaries

- Member-provided profile details are stored and displayed according to the current form, consent, privacy, and moderation rules in the application.
- Registration, profile approval, phone OTP, photo review, ID review, payment review, and sponsored placement are distinct events. None alone guarantees the person's identity or the truth of all profile details.
- The frontend must not fall back to a fabricated member when an ID is missing or the live directory is empty.
- Current plan terms are shown on `/pricing` and sourced from `backend/interest.py`. Registration includes 3 interest-request credits; the lowest paid consumer plan is ₹99 for 5 requests.

## Channel routing

The canonical registry has 64 configured directory entries. Its routing flags are local configuration only; they do not establish channel availability, bot-admin status, or delivery. Exact primary usernames are preserved in `backend/channels_config.py`; do not guess or automatically probe alternatives.

`backend/test_channels.py` is a local no-network dry run by default. Its explicitly enabled Telegram path only performs read-only `getMe`, `getChat`, and `getChatMember` lookups. It does not send or edit messages. `backend/verify_live_flow.py` is GET-only and does not create users, vendors, payment events, or channel posts. Local checks do not prove external uptime.

`backend/setup_channels.py --apply` can mutate Telegram metadata and send/pin a message. It is not a smoke test and requires separate, explicit operator approval for the exact destination.

## Deployment checks

Before any real deployment, an authorized operator must separately review production secrets and access, backups and retention, consent and privacy behavior, database/network exposure, payment-provider sandbox and reconciliation, and external messaging integrations. This repository does not name a cloud provider or claim that production has been deployed or validated.

Use [`LOCAL-TEST-VS-ORACLE-DEPLOY.md`](LOCAL-TEST-VS-ORACLE-DEPLOY.md) for safe local validation guidance. Do not run a payment test using a fabricated UTR/webhook or a public member account. Use isolated backend fixtures and the payment provider's official sandbox.
