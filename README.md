# Mana Vivaha • మన వివాహ

Mana Vivaha is a Telugu matrimony service for members in Telangana and Andhra Pradesh. The site uses member-submitted profile details; verification status is shown separately and is not implied by plan purchase or profile publication.

## Current product rules

- **Free start:** registration includes 3 interest-request credits.
- **Consumer plans:** ₹99 → 5 requests, ₹199 → 12, ₹299 → 25, ₹499 → 50. The lowest paid consumer plan is ₹99. Credit validity and included features are shown on `/pricing` and come from `backend/interest.py`.
- **Contact privacy:** purchasing credits does not reveal a phone number. Contact details are shared only after the profile owner accepts and applicable privacy settings allow it.
- **Referral:** a valid referral attachment grants request credits (not cash). A referrer may qualify for ₹50 once, only on the referred member's first qualifying paid S_99/S_199/S_299/S_499 consumer-plan payment of at least ₹99. Add-ons, renewals, complimentary grants, assisted services, boosts, and B2B/bureau payments are excluded. Payout requests are reviewed manually; eligibility and timing are not guaranteed.
- **Catalogues:** the current location lists contain 33 Telangana and 28 Andhra Pradesh district options. Registration and profile editing support `Other / self-described` community names; the community lists are not an official or exhaustive classification.
- **Channel directory:** the registry contains 52 configured entries (1 official, 5 regional, 5 religion, 33 selected-community, 8 special). Local checks cannot guarantee an external Telegram/WhatsApp destination is live or that a post will be delivered.
- **Live data:** generated profiles, demo credentials, and seed accounts are not production data sources. Synthetic test records belong under `backend/test_fixtures/` only.

The implementation source of truth is `backend/interest.py` (plans/add-ons), `backend/referral.py` (reward eligibility), `backend/location_catalog.py` and `backend/community_catalog.py` (backend catalogues), `frontend/src/lib/telugu-data.ts` (frontend catalogues), and `backend/channels_config.py` (channel registry).

## Local development

```bash
cp .env.example .env
# Add real service credentials locally; never commit them or paste them into chat.
docker compose up --build
```

Typical local URLs, if those services are enabled:

- Web: `http://localhost:3000`
- API docs: `http://localhost:8000/docs`
- Channel directory: `http://localhost:3000/channels`

The optional WhatsApp bridge requires its own opt-in configuration and account pairing. Do not use it for unsolicited messages. External account, link, and delivery status must be checked with the respective providers.

## Validation commands

```bash
# Focused catalogue regression tests
cd backend && python -m unittest test_catalog_ordering -v

# Frontend lint, TypeScript, and production build
cd frontend
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

Other scripts under `backend/` include live-service smoke tests and manually run scenario tests; inspect their setup before executing them. They are not all safe to run as an indiscriminate test-discovery command.

## Repository map

- `backend/main.py` — FastAPI routes and application workflows.
- `backend/interest.py`, `backend/credits.py`, `backend/paypro.py` — consumer plans, credit handling, and payment validation.
- `backend/referral.py` — referral credits, one-time qualifying reward, exclusions, and payout review.
- `backend/location_catalog.py`, `backend/community_catalog.py`, `backend/community_catalog.json` — canonical district/community/subcommunity data and compatibility rules.
- `backend/channels_config.py` — channel registry; `backend/gen_frontend_channels.py` regenerates `frontend/src/lib/channels.ts`.
- `frontend/src/app/` — Next.js pages and user journeys.
- `frontend/src/lib/` — shared catalogues, channel links, site configuration, and frontend helpers.
- `backend/test_fixtures/` — isolated synthetic data for tests only.

Root-level planning and launch documents are historical notes and may contain superseded pricing, channel, or referral assumptions. Use the current product rules above and the source-of-truth modules—not old planning text—for implementation or customer-facing claims.
