# Mana Vivaha • మన వివాహ

Mana Vivaha is a Telugu matrimony service for members in Telangana and Andhra Pradesh. The site uses member-submitted profile details; verification status is shown separately and is not implied by plan purchase or profile publication.

## Current product rules

- **Free start:** registration includes 3 interest-request credits.
- **Consumer plans:** ₹99 → 5 requests, ₹199 → 12, ₹299 → 25, ₹499 → 50. The lowest paid consumer plan is ₹99. Credit validity and included features are shown on `/pricing` and come from `backend/interest.py`.
- **Vendor packages are separate:** `V_SINGLE_POST` ₹149 is one-day private, share-ready promo material—not a directory listing. `V_BASIC` ₹499 for 30 days is the first directory-listing package. Neither price promises external posting, reach, views, or leads.
- **Contact privacy:** purchasing credits does not reveal a phone number. Contact details are shared only after the profile owner accepts and applicable privacy settings allow it.
- **Referral:** a valid referral attachment grants request credits (not cash). A referrer may qualify for ₹50 once, only on the referred member's first qualifying paid S_99/S_199/S_299/S_499 consumer-plan payment of at least ₹99. Add-ons, renewals, complimentary grants, assisted services, boosts, and B2B/bureau payments are excluded. Payout requests are reviewed manually; eligibility and timing are not guaranteed.
- **Catalogues:** the current location lists contain 33 Telangana and 28 Andhra Pradesh district options. Registration and profile editing support `Other / self-described` community names; the community lists are not an official or exhaustive classification.
- **Channel directory:** the registry contains 64 configured entries (1 official, 5 regional, 5 religion, 45 selected-community, 8 special). Routing flags and link syntax do not prove external availability, bot permissions, or delivery; no external channel check is implied.
- **Live data:** generated profiles, demo credentials, and seed accounts are not production data sources. Synthetic test records belong under `backend/test_fixtures/` only.

The implementation source of truth is `backend/interest.py` (plans/add-ons), `backend/referral.py` (reward eligibility), `backend/location_catalog.py` and `backend/community_catalog.py` (backend catalogues), `frontend/src/lib/telugu-data.ts` (frontend catalogues), and `backend/channels_config.py` (channel registry).

For the verified current-state product audit, target architecture, proposed future relational schema, consent/matchmaking flows, responsive QA matrix, trust rules, pricing guardrails, component map, and SEO roadmap, see [`MANAVIVAHA_PRODUCT_BLUEPRINT.md`](MANAVIVAHA_PRODUCT_BLUEPRINT.md). The blueprint clearly distinguishes shipped code from proposed work and is not a production-readiness claim.

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
# Backend (run the commands from the repository root)
(
  cd backend
  python -m pip install -r requirements-test.txt
  python -m unittest test_catalog_ordering -v
  # Static Compose/storage checks; these do not run Docker.
  python test_production_storage_gate.py
  python test_wave39_install_backup.py
  python test_wave40_deploy.py
  python test_registration_photo_required.py
  python test_shortlist_notes.py
  python test_compare_preferences.py
  python test_control_analytics.py
)

# Frontend lint, TypeScript, and production build
(
  cd frontend
  npm ci
  npm run lint          # eslint + link check + design-system & a11y static gates + security script tests
  npx tsc --noEmit
  npm run build
)

# Frontend pure-logic suites (also run by `npm run lint`)
(
  cd frontend
  npm run test:matching      # explainable match reasons + relax suggestions
  npm run test:saved-search  # saved-search summaries
  npm run test:compare       # compare differences + expectation tallies
  npm run test:ops           # operations insight formatting
)

# Design-system, accessibility and match-explanation gates only
(
  cd frontend
  npm run test:static   # design + a11y + route chrome + media layout + pure-logic gates
)

# Optional browser QA — needs a Chromium binary; skips loudly without one
(
  cd frontend
  npx playwright install chromium
  npm run test:visual   # 8 viewports × 6 routes: overflow, screenshots, 44px targets
  npm run test:axe      # axe WCAG 2.0/2.1 A+AA + keyboard focus visibility
)
```

See [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) for the token/primitives reference,
the adoption status, and exactly what the QA suites do and do not cover.

`backend/verify_live_flow.py` performs GET-only endpoint checks against local or explicitly configured staging URLs; it does not create accounts or mutate production data. `backend/test_channels.py` is a no-network dry run by default; its optional Telegram path is read-only and requires explicit operator opt-in. Neither local tests nor repository configuration prove external uptime or delivery. Inspect scenario-test setup before running scripts; they are not all safe to invoke through indiscriminate test discovery.

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
