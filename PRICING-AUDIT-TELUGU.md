# Mana Vivaha — Current Pricing Reference

**Updated: 2026-10-04.** This page records the current implementation, not a forecast or a payment-provider approval claim. The live plan catalogue is defined in `backend/interest.py`; `/api/plans` is the runtime API and `/pricing` is the customer-facing page.

## Consumer request-credit plans

| Plan code | Price | Interest-request credits | Validity | Included feature notes |
|---|---:|---:|---:|---|
| `FREE` | Free | 3 | 365 days in the plan data | Profile card; no payment required |
| `S_99` | ₹99 | 5 | 30 days | Entry consumer plan |
| `S_199` | ₹199 | 12 | 45 days | No popularity/value badge; show price and credits only |
| `S_299` | ₹299 | 25 | 60 days | Who-viewed names while this plan is active |
| `S_499` | ₹499 | 50 | 90 days | Who-viewed names while this plan is active |

The least expensive paid consumer plan is **₹99**. The retired ₹29 / `S_29` option is not a purchasable plan; payment validation rejects it. Do not describe credits as direct phone-number unlocks: contact details are shared only after the profile owner accepts and applicable privacy settings allow it. Buying a plan does not verify a member, approve a profile, promise a match, or guarantee a response.

## Separate services and add-ons

These are not consumer request-credit plans and do not change the ₹99 starting price:

| Code / service | Price | Current scope |
|---|---:|---|
| `BOOST_49` | ₹49 | One-day profile boost; placement availability may vary |
| `WHOVIEWED_49` | ₹49 | Who-viewed names for 30 days |
| `VERIFY_199` | ₹199 | Manual photo-review request; approval or a verification badge is not guaranteed |
| `RENEW_99` | ₹99 | 8 request credits, 30 days; renewal offer only |
| `BUREAU_999` | ₹999 | 25 request credits, 30 days; B2B/bureau plan |
| `BUREAU_2999` | ₹2,999 | 100 request credits, 30 days; B2B/bureau plan |

Other separately quoted services may have their own checkout and price rules. Keep them distinct from consumer plans; do not silently change or roll them into this plan table.

## Referral rule — separate from pricing

A valid referral attachment grants **+2 request credits to the referrer and +1 to the new member**; these are credits, not cash. A referrer may qualify for **one ₹50 reward per referred member**, only on that member’s first qualifying paid `S_99`, `S_199`, `S_299`, or `S_499` consumer-plan payment of at least ₹99. Add-ons, renewals, assisted services, boosts, gifts, complimentary grants, and B2B/bureau or other non-consumer payments are excluded. Repeat payments do not earn another reward. Payout requests receive manual review; eligibility and timing are not guaranteed. See `/referral` and `backend/referral.py` for the implemented terms.

## Consistency checks for future edits

- Keep the price, request-credit count, validity, and currently included benefits synchronized between `backend/interest.py`, `/api/plans`, the frontend fallback data in `frontend/src/app/pricing/page-client.tsx`, and other public plan summaries.
- Keep checkout amount validation tied to the plan code. Never infer a plan from an arbitrary amount or let an unknown/retired code grant fallback credits.
- Keep the public starting-price claim at **₹99**. Add-on prices such as ₹49 and ₹199 remain valid where the corresponding separately priced service is active.
- Keep contact sharing consent-gated. A paid credit is not consent to disclose a phone number.
- Keep referral marketing qualified as a possible, one-time reward under the rules above. Avoid “every payment,” “everyone gets ₹50,” “instant,” or “unlimited earnings” claims.
- External checkout methods, payment settlement, refund status, and service availability depend on the configured provider and must be verified in the deployed environment; local code checks cannot guarantee them.
