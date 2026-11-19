# Community discovery preview, 17 November 2026

Status: local source changes only. No deployment. Final working review before live remains required.

## Scope

Six route patterns: /second-marriage, /spotlight, /districts, /castes, /castes/[slug], /channels. The dynamic sample was /castes/brahmin-bride-hyderabad and the linked groom counterpart. This does not prove every generated community/city combination.

## Changes

- Scoped readable small text, wrapping labels, 48px form controls, 44px actions and visible keyboard focus.
- Removed redundant route context strips where pages already own their heading.
- Remarriage card actions stack at phone widths, privacy notes stack, verification badges no longer overlap the avatar. A visit-only heart selection no longer implies a durable shortlist save.
- Remarriage API failure is separate from genuine empty results, with retry and retained filters. Age reset appears for values above as well as below the default.
- Spotlight preview has enough height for enlarged content, breadcrumbs wrap and errors use an alert. Submission remains disabled under unavailable payment configuration.
- District tabs expose selection, results are announced and empty search has a reset. Existing location catalogue and destinations unchanged.
- Community directory and detail controls are more readable. Hub and registration catalogue separation preserved.
- Full channel names and descriptions wrap rather than truncating. Existing registry and destinations untouched.

## Verification

- Final production build and TypeScript passed.
- Six bilingual Chromium fixture journeys passed at 320, 390 and 1280 CSS pixels. The combined final invocation hit the command time limit after its first four passing cases; all three English cases were then rerun successfully. All three Telugu cases had already completed successfully against the final build. An earlier full set of six also passed before changing the unavailable count glyph from a long dash to a hyphen.
- 16 existing community/remarriage browser regressions passed.
- 86 security checks passed.
- Full static command stops at one pre-existing RouteFrame assertion that expects /me to use its shared intro. The same assertion failed against HEAD f2fd950 in a separate temporary source copy. No test was weakened. All other static groups ran separately and passed.
- Journey requests were intercepted fixtures, including fictional profiles, empty lists, profile failure/retry, missing rates, an explicitly fictional rate, unconfigured payment, authoritative empty channel links and registry fallback. Zero non-GET API requests and zero uncaught browser errors were asserted.
- Actual live public route pages were read in both languages for comparison, with no submission. Live source pages are not this rebuilt version.
- Pixels inspected for narrow profile footer, error/retry state, Spotlight form and preview, district actions, expanded community options, dynamic FAQ, and channel names/descriptions. This is a bounded desktop/mobile sample, not a claim to have inspected every item of every long generated directory.

## Unchanged and unverified

No real member writes, contact disclosures, payment, application, verification, report/block, notification, channel join, deletion, service change or deployment. Catalogues retain 91 locations (33 TS, 28 AP, 30 other), 38 hubs, 61 registration choices, 85 channels and 76 community-specific entries. Link syntax does not establish external-channel availability; no external channel was opened or joined. Fixture rate 149 is not a current offer. Provider eligibility and existing policy/business decisions remain pending with the owner.

Coverage is now 29/54 source route patterns, 25 remaining: editorial/community 6; partner/referral 9; private-link/fallback 2; restricted operations 8. Coverage means bounded preview review, not launch acceptance.

## Review evidence

PRIVATE review: https://files.instinct.com/8cuohqqnm8ko-community-pages-checked-before-launch

The File contains rebuilt screenshot galleries, not an interactive staging deployment. Its source links intentionally open the current live pages and are labelled accordingly. Source URLs observed resolving:
- https://manavivaha.in/second-marriage
- https://manavivaha.in/spotlight
- https://manavivaha.in/districts
- https://manavivaha.in/castes
- https://manavivaha.in/castes/brahmin-bride-hyderabad
- https://manavivaha.in/channels
