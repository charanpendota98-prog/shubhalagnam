# Growth error-state correction - 15 November 2026

Status: local-only candidate. Based directly on PR42 production baseline `90f6c1f`; no Creator Club or photography changes. No push, PR, merge or deployment.

## Verified source

Anonymous reads from https://manavivaha.in/api/leads/stats and https://manavivaha.in/api/leads?limit=30 correctly returned HTTP403 with an authorization detail. Inventory and WhatsApp status returned HTTP200. The existing frontend accepted the denied stats JSON as statistics and displayed `undefined%` and `today: undefined`. This was a frontend rendering error, not broken backend authorization.

## Changes

- Keep HTTP/error envelopes out of statistics and leads state.
- Show unavailable/access feedback instead of invalid metrics or endless loading.
- Clear previous statistics and leads on reload, ignore late obsolete loads, clear obsolete network failures after recovery.
- Preserve numeric zero; unknown numbers display `-`, not invented conversion percentages.
- Explain that the saved admin key is sent with admin API requests. Remove the unnecessary first-four-character key echo.
- No backend/API permissions, login policy, provider configuration, data records, WhatsApp actions or outreach changed.

## Verification

- Full frontend lint/static/security checks, production build and TypeScript pass.
- 11 isolated production-server browser tests pass: 401/403/500, network failure and recovery, valid zero metrics, partial success data, error envelope on200, expired access clearing, stale load race, Telugu320px denied state, corrected key help.
- Fixtures are synthetic local responses. No production member/authenticated acceptance or whole-site browser-suite claim.
- Desktop valid fixture and mobile English390/Telugu320 denied-state pixels inspected. Status can be scrolled into view above mobile fixed navigation.
- Initial test attempts exposed language-default/selector assumptions in the test harness; corrected and all11 rerun. Initial local build rejected a dependency symlink outside its root; local dependency tree corrected before the successful build.
