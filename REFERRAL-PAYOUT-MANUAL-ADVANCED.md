# Referral rewards and payout review

This file replaces an old payout walkthrough containing fictional referral codes, masked phone/UPI destinations, and copy-and-paste payment instructions. Do not use any example recipient, account, amount, or payout command from the previous version.

## Current source of truth

Referral eligibility, qualifying plan payments, anti-abuse review, and reward accounting are defined in `backend/referral.py` and the current owner-authenticated admin workflow. A referral record or displayed balance is not proof that a payout has been approved or sent.

## Safe payout handling

- Never invent, guess, or paste a recipient UPI ID, phone number, bank account, UTR, payment screenshot, or payment reference.
- Confirm the recipient and eligibility through the authorized owner-session workflow, with required CSRF protections and audit records. Do not weaken authentication or bypass review.
- Use the payment provider or bank's normal verified workflow outside this repository. Reconcile the actual provider response before marking a payout complete.
- Keep test fixtures and payment-sandbox data isolated from live member and referral records.
- Do not run a payout smoke test against production or use fabricated transaction references.

For current validation limits, see [`README.md`](README.md) and [`LOCAL-TEST-VS-ORACLE-DEPLOY.md`](LOCAL-TEST-VS-ORACLE-DEPLOY.md). Local tests do not prove that any transfer settled.
