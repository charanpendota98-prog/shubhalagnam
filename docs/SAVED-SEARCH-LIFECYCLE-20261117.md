# Saved-search lifecycle acceptance

## Changes
- Matches uses the authenticated owner returned by /api/auth/verify, including HttpOnly-cookie sessions. A saved profile-id hint or missing JavaScript bearer token no longer decides login status.
- No bearer token is restored to persistent storage. Invalid sessions cannot start private saved-search or shortlist requests.
- Startup restores existing saved searches before workers start. Previously writes reached disk, but startup never loaded them.

## Evidence
- Real password login using the HttpOnly cookie, no API interception: create Hyderabad / age 27-33 search with notifications off; a different member receives 401; actual backend process restart; exact filters retained; Apply uses exact criteria; cancel deletion keeps the search; confirmed deletion and reload leave it absent.
- EN/TE Chromium checks at 320, 390 and 1280 widths use server-verified identity rather than a forged browser id hint. Invalid verification hides save and performs no private collection reads.
- Existing alert-preference and logout-device browser regressions pass.
- Two backend regressions cover startup call ordering and separate-process saved-search create/restore/delete.
- Lint/static/security, TypeScript and production build pass before packaging.

## Limits
Isolated accounts and state only. No real member changes, notifications, external sends, provider calls, payments, new access, policy edits or redesign. No rename feature exists or is added. This is not whole-site readiness or live authenticated member-flow acceptance. Mobile Safari, physical devices, screen-reader speech, email delivery and the remaining release decisions are unchanged.
