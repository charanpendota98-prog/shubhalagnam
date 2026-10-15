# Free vs paid — current request-credit plans

This page replaces an older comparison that overstated profile access, phone-number privacy, WhatsApp delivery, and verification. Use `backend/interest.py` and `/pricing` as the source of truth for plan rules.

## Plans

| Plan | Price | Interest requests | Validity |
|---|---:|---:|---:|
| Free Start | ₹0 | 3 | 365 days |
| Sambandham | ₹99 | 5 | 30 days |
| Family | ₹199 | 12 | 45 days |
| Premium | ₹299 | 25 | 60 days |
| VIP | ₹499 | 50 | 90 days |

Optional add-ons are separate: one-day profile boost ₹49, 30-day “Who viewed me” ₹49, and a manual photo-review request ₹199. A review request is not an approval or identity badge. Check `/pricing` for currently displayed terms.

## Interest and contact

A request uses one credit. Contact details are not included simply because someone registered, paid, viewed a profile, or sent a request. Details may be shared only after the profile owner accepts and the applicable privacy settings permit it. A request or notification does not guarantee that a message is sent, delivered, read, or answered.

## Verification labels

Profile details are member-submitted unless a specific check is named. Phone OTP, profile moderation, photo review, and any other review are separate checks; none establishes that every identity or profile claim is true. Members should verify important details independently.

## Messaging

WhatsApp support stays hidden until the business configures its real number. Automated notifications depend on an explicitly configured, policy-compliant integration and recipient consent. No fallback phone number or guessed channel destination is used. Queueing or local test success is not proof of external delivery.

## Developer checks

Use isolated test storage and fixtures for workflow tests. Do not use public member accounts, seeded live profiles, fabricated UTR/payment references, or production webhooks for tests. For routes and test safety, see [`README.md`](README.md) and [`TEST-2-CHANNELS-NORMAL.md`](TEST-2-CHANNELS-NORMAL.md).
