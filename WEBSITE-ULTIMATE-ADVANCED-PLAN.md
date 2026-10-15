# Archived website product proposal — current scope is in source

This document replaces an older “ultra advanced” plan with fabricated counts, profile IDs, popularity/match percentages, guessed channel strategies, and unsupported live-integration claims. Do not copy those examples into current UI or treat them as implemented features.

The current application is defined by the repository source and its tests. It includes registration, member profiles, search/matches, request-credit plans, safety/reporting, admin and vendor workflows, and configured channel-directory data. Not every proposed automation or deployment operation is necessarily enabled.

- The lowest paid consumer plan is ₹99 for 5 interest requests; see `backend/interest.py`.
- Profile information is member-submitted unless a specific check is identified. Phone OTP, photo review, ID review, and moderation are distinct checks, not guarantees of identity.
- The channel registry has 64 configured entries, not 64 externally verified channels. No guessed alternate usernames are used.
- Do not publish fictional member data, synthetic trust/popularity scores, fake testimonials, fabricated payment references, or a made-up support number.

See [`README.md`](README.md), [`ROUTE_MAP.md`](ROUTE_MAP.md), and [`LOCAL-TEST-VS-ORACLE-DEPLOY.md`](LOCAL-TEST-VS-ORACLE-DEPLOY.md) for current references and validation limits.
