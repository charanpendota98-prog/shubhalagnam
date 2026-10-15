# Local validation vs production deployment

This document is a safety-focused replacement for the previous deployment walkthrough. That walkthrough contained stale repository details, seeded member examples, unverified channel claims, and payment values that must not be used against a live service.

## What local checks establish

- Python compilation and automated tests can catch code regressions in the isolated test fixtures.
- `frontend/npm run lint` and `frontend/npm run build` check the frontend; lint may report existing warnings even when it exits successfully.
- `backend/verify_live_flow.py` is a read-only GET smoke check against local or explicitly configured staging URLs.
- `backend/test_channels.py` is a dry run by default. Its explicitly enabled path performs only `getMe`, `getChat`, and `getChatMember` read-only lookups for two exact destinations; it never posts or edits channels.

None of these checks proves production availability, identity verification, payment settlement, SMS/WhatsApp delivery, or that an external link is live. Do not use a fake UTR, an invented provider webhook, a fabricated member account, or a real member's data as a test fixture.

## Local verification commands

From the repository root:

```bash
cd backend
../.venv/bin/python -m compileall -q .
../.venv/bin/python -m unittest -v test_catalog_ordering.py test_copy_truth.py
../.venv/bin/python test_vendors_ads.py
../.venv/bin/python test_channels.py
../.venv/bin/python verify_live_flow.py  # requires the local app to be running
cd ../frontend
npm run lint
npm run build
```

The channel smoke command above remains a dry run. To inspect the exact two-channel opt-in procedure and its safeguards, see [`TEST-2-CHANNELS-NORMAL.md`](TEST-2-CHANNELS-NORMAL.md).

## Production readiness checklist

Before any deployment or external send, the service operator should verify all of the following in a staging environment:

1. **Configuration and secrets:** use deployment secret storage; rotate any previously exposed credentials; keep admin, bot, payment, database, and signing secrets out of source control and browser code.
2. **Authentication and access:** provision real operations accounts explicitly; confirm role restrictions, CSRF checks, rate limits, and owner-consent rules using non-production accounts.
3. **Data:** use the configured persistent database and tested backups; do not enable demo seeding or import synthetic people into public-facing data.
4. **Payments:** use the provider's official sandbox and signed test events. Manually reconcile real production payments against provider records before approving anything; payment is not identity verification.
5. **Messaging:** confirm each destination is operator-owned and correctly configured. The repository smoke script only performs explicit read-only Telegram lookups; it does not test message delivery. Use a controlled staging integration for any separately authorized send test. A local test does not guarantee Telegram or WhatsApp availability.
6. **Privacy and moderation:** verify member-submitted details are described as such. Phone OTP, photo review, ID review, profile approval, and payment review are distinct checks; none alone guarantees a person's identity or the truth of every profile field.
7. **Operations:** review TLS, firewall/network exposure, logging without unnecessary personal data, monitoring, retention, incident response, and rollback before opening public traffic.
8. **External destinations:** inspect WhatsApp, Telegram, and payment links from the actual production configuration on a trusted device. Repository tests cannot guarantee external uptime or link validity.

## Deployment decision

A green local build is a code check, not a launch approval. Deploy only after staging checks pass, production configuration is reviewed by the operator, and actual payment and messaging integrations have been independently validated. No cloud provider, domain, account, bot, channel, or payment recipient is assumed by this runbook.
