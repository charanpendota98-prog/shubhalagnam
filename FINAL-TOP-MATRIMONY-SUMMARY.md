# Mana Vivaha • మన వివాహ — current scope and verification boundaries

This file replaces the former “100% workable / live” summary. It records repository scope, not a claim that production integrations or external destinations have been verified.

## What the repository contains

- A bilingual Telugu/English web application with registration, profile search, match filters, consent-based interest requests, credits, pricing, referral tools, safety/reporting, and member privacy controls.
- A vendor directory, vendor lead flow, and owner-session-protected vendor review and revenue tools. Vendor review mutations require CSRF protection; paid placement is not a popularity or trust score.
- A paid Spotlight application flow. Public cards are labeled as sponsored; payment and media review are separate from identity verification. The feed contains only approved, paid, unexpired items and does not establish that member-submitted details are true.
- A canonical channel registry with 64 configured directory entries. Its routing flags and link syntax are local configuration only.
- Local promotional wedding imagery and video that are labeled illustrative, not member photos or member stories.

## Pricing currently represented

- Registration includes 3 interest-request credits.
- Paid consumer plans begin at ₹99 for 5 requests, followed by ₹199 for 12, ₹299 for 25, and ₹499 for 50. Check `/pricing` and `backend/interest.py` for current validity and other plan conditions.
- Optional add-ons and Spotlight placements are separate products; availability and payment configuration must be checked before purchase.

## Verification wording and limits

Phone OTP confirms access to a phone number; photo and ID reviews describe only the specific review recorded. Profile approval, plan purchase, payment review, Spotlight review, and promotional placement do not guarantee identity or the accuracy of every profile field. Members should independently verify details.

The configured Telegram usernames, invite links, WhatsApp links, bot permissions, and message delivery were not externally checked for this work. No channel availability or bot-admin status is claimed here. Local tests and a successful build cannot prove external uptime.

## Smoke-test safety

- `backend/verify_live_flow.py` is GET-only and does not register accounts, submit payment references, or trigger workflow mutations.
- `backend/test_channels.py` prints a no-network dry run by default. Its optional explicit path performs only read-only Telegram lookups (`getMe`, `getChat`, `getChatMember`); it does not post or edit channels.
- Isolated automated test fixtures belong under `backend/test_fixtures/`; they are not production members or credentials.
- The mutating `setup_channels.py --apply` operation is not a smoke test and requires separate operator approval.

## Is the site “fully advanced”?

The repository includes a broad set of advanced product features, but “fully advanced” or “production-ready” cannot be substantiated from code alone. That requires operator-run staging and external integration checks, accessibility/device review, production configuration and security review, payment reconciliation, and ongoing monitoring. No such live-channel check or production mutation was performed as part of this repository work.
