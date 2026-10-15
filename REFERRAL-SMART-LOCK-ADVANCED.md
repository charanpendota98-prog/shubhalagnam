# Archived referral-flow proposal — check current implementation

This document replaces a proposal containing fabricated referral codes/names, unverified commission terms, guaranteed payout claims, and fake WhatsApp copy. Do not use those examples or promises in the application or public marketing.

The current source of truth for referral code generation, eligibility, reward accounting, and review requirements is `backend/referral.py` and the active UI. A referral code, balance, or successful local test does not prove payment or payout settlement.

Any referral action affecting rewards or member records must retain the owner-session authorization and CSRF checks required by the current workflow. Do not weaken authorization, bypass review, or invent recipients, UPI IDs, payment references, names, or contact numbers. Use the payment provider's official sandbox and isolated test fixtures for local validation.

For current scope, see [`README.md`](README.md), [`ROUTE_MAP.md`](ROUTE_MAP.md), and [`LOCAL-TEST-VS-ORACLE-DEPLOY.md`](LOCAL-TEST-VS-ORACLE-DEPLOY.md).
