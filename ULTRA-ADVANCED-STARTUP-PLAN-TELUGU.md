# Archived startup and channel planning notes

This document replaces an older plan that included invented profile examples, unverified channel usernames, masked/fabricated destinations, unsupported revenue/capacity projections, and claims that features were live. Do not use its old example records or usernames.

## Current product facts

- Brand: **Mana Vivaha** / **మన వివాహ**.
- Lowest paid consumer plan: ₹99 for 5 interest requests; exact plan/add-on rules live in `backend/interest.py` and `/pricing`.
- Public profile information is member-submitted unless an explicit check is named. OTP, moderation, photo review, and identity checks are distinct; none guarantees that every profile claim is true.
- The channel registry contains 64 configured directory entries. Exact external availability, ownership, bot permissions, uptime, and delivery are not established by local code or tests.
- No fallback channel handles, support numbers, payment references, or synthetic member records should be invented.

Use `README.md`, `ROUTE_MAP.md`, `LIVE-CHANNELS-CONFIG.md`, and `TEST-2-CHANNELS-NORMAL.md` for current scope and validation. Production deployment and external integrations require separate, authorized verification. A local test is not proof of live service health.
