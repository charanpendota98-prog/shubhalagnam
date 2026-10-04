# Growth & operations — current data policy

> This document replaces an older launch-inventory guide that described fabricated profile generation, demo phones, launch targets, and seed APIs. Those flows are retired. Synthetic member data is not suitable for production or live-facing UI.

## Member and lead data integrity

- Application startup does not create launch profiles, vendors, or leads.
- The legacy profile-import endpoints `/api/admin/bulk-profiles` and `/api/admin/seed-launch` return HTTP 410. The retired `/api/demo/seed` and `/api/auth/demo-token` routes also do not create profiles or sessions.
- Isolated synthetic records used in a few backend tests live under `backend/test_fixtures/`. The application must not import or expose those fixtures.
- `/api/inventory` reports aggregate counts from stored, non-synthetic member records. It does not publish a target, readiness percentage, or generated supply claim.
- A quick lead form stores the details the visitor submits. Contact details are sensitive: operations staff must use authorized access and follow the user’s consent and applicable retention rules.

## Current operations routes

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/track` | Record a first-party visit event, subject to the app’s tracking behavior. |
| `POST` | `/api/leads/quick` | Submit a visitor-provided lead. |
| `GET` | `/api/leads` | Authorized lead follow-up queue. |
| `GET` | `/api/leads/stats` | Authorized aggregate traffic and lead statistics. |
| `POST` | `/api/leads/followup/{lead_id}` | Queue a follow-up when a delivery channel is configured. Queueing is not proof of delivery. |
| `GET` | `/api/inventory` | Aggregate counts of stored member records; no synthetic target. |
| `POST` | `/api/admin/bulk-profiles` | Retired; returns HTTP 410. |
| `POST` | `/api/admin/seed-launch` | Retired; returns HTTP 410. |

The `/growth` screen is an operations view. It should display empty states when there are no records and must not manufacture sample leads or member cards.

## OTP and advertising controls

- OTPs are stored as keyed digests and are never returned in an API response. Login/reset fails closed with HTTP 503 if no configured delivery channel succeeds. Configure a real WhatsApp bridge, Telegram destination, or SMS provider before enabling OTP sign-in; code cannot guarantee external service uptime or delivery.
- Ad campaign creation requires an existing active vendor and creates a **pending** campaign. A campaign is not live until an operator reviews the payment evidence and submits the actual payment reference. The application records the submitted reference but cannot independently verify a bank transaction.
- Do not invent phone numbers, UTRs, vendor IDs, testimonials, member identities, or external-service availability in operational UI or documentation.

## Validation notes

Run the backend/frontend checks documented in the project before deployment. Automated or sandbox checks can validate application behavior, but cannot establish WhatsApp/Telegram/SMS provider uptime, account ownership, or whether a real payment has settled.
