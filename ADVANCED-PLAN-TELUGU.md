# Archived product architecture proposal — not current behavior

This file replaces an old bot-first plan containing guessed channel destinations, fake profile IDs, unsupported member/popularity counts, and unverified payment/notification promises. Do not use its previous diagrams, channel handles, rates, or example records as current requirements.

## Current product scope

The repository contains a bilingual matrimony web application with registration, profiles, search/matches, consent-based interest requests, payment-plan code, safety/reporting, owner-authenticated administrative workflows, vendor surfaces, and configured channel-directory metadata. Exact behavior must be checked in current source; this does not claim every integration is enabled or production-ready.

- The lowest paid consumer plan is ₹99 for 5 interest requests (`backend/interest.py`).
- Member profile details are member-submitted unless an exact check is named; no blanket identity verification is implied.
- The channel registry has 64 configured directory entries. No external channel availability, ownership, permissions, uptime, or delivery is established by local tests.
- WhatsApp support remains hidden until the real business number is configured. Do not invent recipients, support numbers, payment references, or member examples.

For current routes and safe validation, see [`ROUTE_MAP.md`](ROUTE_MAP.md), [`README.md`](README.md), and [`TEST-2-CHANNELS-NORMAL.md`](TEST-2-CHANNELS-NORMAL.md). A local check is not proof of production or external service health.
