# Owner command center - 15 November 2026

Candidate on the live PR45 main baseline. This document records implementation-time checks, not a deployment claim. Release closeout records merge/live separately.

## Scope

- Owner-session-only GET `/api/control/operations`, using the existing owner guard. Admin-key-only, anonymous and non-owner roles are denied. Allowlisted counts only, no contacts, credentials, member records or config values. Current in-memory source and UTC snapshot/today labels; counts are not sales, transfers, identity checks or delivery evidence.
- Owner overview groups growth, Creator Club payout-request review counts, story/spotlight review and channel configuration. Unknown is `-`, not zero. Refresh clears old counts. Errors/auth expiry clear the snapshot. Queue shortcuts do not mutate anything.
- Existing profile queue gains bounded name/ID/district search and pagination. Existing status/worker restrictions and PII-free fields remain. Old `limit` callers remain supported; queries are not written into audit.
- Profile/report/story/spotlight/payout queue loads clear old records and distinguish failure/loading from genuinely empty results. Obsolete profile responses cannot replace a newer search. Queue auth expiry clears session-visible data and returns to sign-in.
- Empty donut total is now real zero, not a fabricated one. Control header no longer overlays mobile content. Owner badge does not split across lines.
- No new writes, role/access policy, economics, payout execution, credential/provider configuration, paid service, production member edit/deletion or outreach.

Content means existing story/spotlight review queues, not an unrestricted CMS editor. Qualification/refund/ledger detail remains in the existing review tools; aggregate counts do not invent qualification evidence. The new snapshot is not a continuous live feed or reconciliation system. Existing controls retain their pre-existing authorization and CSRF rules. Verification never acts on real members.

## Verification

- New backend suite:5 tests cover owner cookie/key-only/anonymous/non-owner, POST denial, allowlist/no secrets, zero/unknown, corrupt/unavailable storage, bounded search/pagination and unchanged worker restrictions.
- Existing isolated suites:6 bureau and9 analytics tests pass,21 story moderation checks pass. A combined pytest attempt collided on global test-store setup; independent-process reruns pass, matching CI's process-per-suite design. Not reported as a combined pass.
-18 new browser tests plus12 existing bureau samples pass, including EN/TE320/390/1280 and targeted axe, zero/unknown, recovery/auth clear, search/pagination, late obsolete response, four error-state queues and role exclusion. Test selectors were corrected for Next's route-announcer alert and shortcut arrow text before the full30 rerun.
- Lint/static/security, production build and TypeScript pass. EN1280 and TE320 actual synthetic workspace pixels inspected. The first full-page capture showed sticky-header obstruction; mobile header/scroll handling fixed and new viewport pixels inspected.
- All browser fixtures are synthetic. No live private workspace acceptance or member-data mutation is implied.

## Public feature benchmark

These are vendor-described categories, not independent performance proof or access to private Shaadi/BharatMatrimony consoles.

- https://matrilyze.com/features - operator console, review queues, attributable audit.
- https://www.narjisinfotech.com/public/assets/images/pro-matrimony/pdf/Pro-Matrimonial-Software-Backend-Features.pdf - member/lead/affiliate/content reports.
- https://www.matrimic.in/marriage-bureau-software - member approvals, subscriptions, operational reporting.
- https://www.matrimony-script.com/php-matrimony-software.php - approval, search and reporting workflows.
- https://matrimonydesign.com/features - dashboard/content/privacy categories, explicitly marked under development, lower-confidence reference.
- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html - server-side authorization on every request and deny by default.

The existing Control dashboard already covers many of those categories. This upgrade improves daily review visibility and known correctness gaps instead of duplicating controls or adding unsafe breadth.
