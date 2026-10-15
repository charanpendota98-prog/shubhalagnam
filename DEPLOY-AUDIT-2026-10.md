# Archived deployment-audit notes — not current verification

This file replaces an older audit report that asserted a large “real” profile seed, production-grade completeness, live preview verification, and broad end-to-end results without a reproducible current record. Its profile counts, test totals, risk findings, and production claims must not be treated as current facts.

No production deployment, external channel availability, bot-admin permissions, message delivery, payment settlement, or third-party uptime is established by this document. Do not create or seed member-like data in live systems to reproduce the old report.

## Current safe validation

- `backend/verify_live_flow.py` performs GET-only checks and does not create accounts, vendors, payment events, or channel posts.
- `backend/test_channels.py` defaults to a local no-network dry run. Its explicitly enabled Telegram check is read-only and uses only two exact operator-supplied destinations; it never sends or edits messages.
- Use isolated fixtures for local workflow tests and the payment provider's official sandbox for payment checks. Never fabricate a UTR or webhook event.
- Local build/typecheck/tests prove only those local checks passed; they do not prove production deployment or external service health.

For current instructions, see [`README.md`](README.md), [`TEST-2-CHANNELS-NORMAL.md`](TEST-2-CHANNELS-NORMAL.md), and [`LOCAL-TEST-VS-ORACLE-DEPLOY.md`](LOCAL-TEST-VS-ORACLE-DEPLOY.md).
