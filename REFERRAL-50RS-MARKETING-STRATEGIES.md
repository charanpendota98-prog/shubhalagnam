# Referral program notes — verify current terms before publication

This file replaces an older marketing draft that used a fabricated referral code, guaranteed conversions and commissions, and unsupported growth/revenue projections. Do not copy those examples into public copy.

## Current source of truth

Referral code generation, qualifying consumer-plan payments, review conditions, and reward amounts are implemented in `backend/referral.py`. Public terms must match the current application and legal policy; eligibility is conditional and a referral is not automatically a payable reward.

## Safe publication checklist

- Do not use fixed example codes such as `LAK42`, fake names, phone numbers, UPI IDs, or payment references.
- Avoid guarantees about earnings, conversion rates, virality, user growth, or payout timing.
- Explain eligibility and anti-abuse review plainly; do not describe an unreviewed balance as “paid.”
- Use member-approved marketing material and avoid making profile verification claims from promotional artwork.
- Verify every public route, feature, price, and reward claim against the current backend and UI before launch.

Do not treat local tests or simulated provider responses as proof of real payments, referral settlement, or business performance.
