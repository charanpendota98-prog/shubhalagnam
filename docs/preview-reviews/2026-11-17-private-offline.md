# Private-link and offline preview, 17 November 2026

Local source only. No deployment. Final working review before live remains required.

Two patterns: /review/[token] and /offline. The review data, token and notes in screenshots are fictional local fixtures. No real token was opened or view consumed.

## Changes

- Scoped readable text, 48px inputs, 44px actions, keyboard focus, wrapping, phone summary layout and visible feedback labels. Removed duplicate route context for the two routes. Offline destinations and configured-contact behavior are unchanged.
- Review loading clears old profile/form/feedback, ignores late reads and distinguishes a confirmed unavailable response from network/malformed failure. Explicit retry warns it may consume a remaining view.
- Language changes no longer refetch the view-limited review endpoint. Server source confirms each successful GET increments the view count; tested zero extra GETs on language changes. Backend expiry, view-limit and profile projection remain unchanged.
- Feedback network errors now keep the note and explain uncertain save state. Rejected feedback remains visible with entries retained. Success means saved for owner review, not read or notification delivery. Inputs match the existing backend 60/40/300 character limits.

## Verification

Production build, TypeScript, full static suite and 86 security checks passed. Six English/Telugu browser journeys at 320/390/1280 passed with all APIs intercepted. Checked summary, private-photo withholding message, visible labels, disabled incomplete form, rejected/uncertain/saved feedback, malformed/missing/unavailable responses, explicit retry, no extra language-change read, one visible h1 and no horizontal overflow. Each journey made exactly three feedback writes to fixtures only, with exact payload asserted; no other writes or uncaught browser errors.

One local production service-worker test also passed: warmed offline cache, disabled network, navigated an uncached route and received the offline fallback. No API responses existed in the inspected cache. The generic route-context on that fallback follows the failed URL, not /offline; no service-worker routing policy was changed. This is one warmed-cache scenario, not first-ever offline/device-wide acceptance.

Visually inspected bilingual rebuilt states at all three widths, including summary, details, form, network/rejected/saved feedback and offline card. PRIVATE review page rendered and read completely at 320/390/1280; nine images decoded and all three galleries/arrow/Escape controls checked in its built preview. Its source link opened the live offline page separately while the review stayed open.

## Delivery and limits

PRIVATE review: https://files.instinct.com/2n03sfyszu3c-private-review-and-offline-checked

Screenshot review, not interactive staging. Only signed-in owner can open the File; anyone with the link can see the generic card. Private live links are deliberately absent. Observed source: https://manavivaha.in/offline . No real private token/member data/feedback, payment, notification, provider change, deletion or deployment.

Coverage: 46/54 route patterns; restricted operations eight remain. Coverage is not launch acceptance. Existing policy/provider/business decision holds remain open.
