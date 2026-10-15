# Product automation: current scope and verification limits

This file replaces an older aspirational plan containing unverified channel destinations, automatic-posting promises, and unsupported production claims. It is not a production deployment guide.

## Current source of truth

- Channel routing configuration: `backend/channels_config.py` and [`LIVE-CHANNELS-CONFIG.md`](LIVE-CHANNELS-CONFIG.md)
- Interest plans and add-ons: `backend/interest.py`
- Public UI and route behavior: current frontend source and [`ROUTE_MAP.md`](ROUTE_MAP.md)
- Safe local checks: [`README.md`](README.md), [`TEST-2-CHANNELS-NORMAL.md`](TEST-2-CHANNELS-NORMAL.md), and [`LOCAL-TEST-VS-ORACLE-DEPLOY.md`](LOCAL-TEST-VS-ORACLE-DEPLOY.md)

## Important boundaries

- Configured destinations are not externally verified. Do not guess alternate channel usernames or claim uptime, bot-admin access, or delivery without an actual authorized check.
- Do not present a local smoke test as proof of production deployment or external service health.
- Member profile details are member-submitted unless a specific verification check is identified. Phone OTP, photo review, profile moderation, and identity verification are separate checks; none alone proves that all profile claims are true.
- Paid plans begin at ₹99 for 5 interest requests. Use `backend/interest.py` and the live pricing page as the source of truth. Add-ons are separate and must not be silently removed or re-described.
- Do not add demo members, fabricated payment references, test recipients, or made-up support contacts to live-facing surfaces.

## Operator review before production

Review authorization, CSRF protection, secret management, data retention and privacy, payment provider sandbox/reconciliation, consent, rate limits, backup/restore, logging, and each exact external integration. Production readiness must be established separately by an authorized operator; this repository does not claim that deployment has happened or that each integration works end to end.
