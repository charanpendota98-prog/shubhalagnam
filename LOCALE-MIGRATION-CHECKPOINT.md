# Static locale migration, local checkpoint, 24 November 2026

Not ready to merge or deploy. Production remains PR202. PR201 is paused.

## Product contract
- URL owns language: unprefixed Telugu, /en English.
- Saved preference never redirects or hides an unprefixed page. A dismissible fixed-position English link is offered instead.
- Explicit route inventory only. Restricted English counterparts share authorization components, noindex and robots exclusions; neither variant appears in sitemap.

## Checks completed locally
- Production build, full frontend lint/static/security, TypeScript.
- 54 raw route checks (legacy control redirect excluded), canonical/hreflang/main/link checks.
- Locale navigation and cookie independence; private raw HTML markers absent even with fictional credential cookies.
- Both unauthenticated variants request identical API routes and keep private state out of HTML. Owner/worker/moderator/support/finance fixtures match across languages; owner-only region remains owner-only.
- 20 owner dashboard browser tests pass. Other scoped responsive/auth/error tests pass, but full browser regression is NOT complete. Initial six-worker/20-second diagnostic run was too aggressive and timed out; later two-worker/default-timeout checks are the relevant evidence.
- Captured actual Slow 4G trace screenshots: 390px, 4x CPU, 150ms, 1.6Mbps down/0.75Mbps up. First visible correct text around 2.82s English and 2.76s Telugu, opposite saved preference, no wrong-language heading in captured frames. Single local samples only.
- Three local English-to-Telugu root switches replace document, 892-989ms click-to-heading. English internal navigation preserves document, 871-1446ms. Includes automation waits.

## Remaining gates
- Complete every browser suite with explicit locale URL fixture and href assertions. Inventory changes are recorded in frontend/scripts/locale-browser-inventory.json. Do not relax authorization, ownership or response-integrity assertions.
- Complete broad route visual audit and post-registration profile/photo scenarios.
- Arena review and exact-head CI. No remote locale PR exists at this checkpoint.
- Rebuild/package exact merged tree, repeat disk/inode peak calculation, backup, restore proof, rollback and live verification.

## Disk preflight, preliminary local candidate
Read-only production measurement: 1,552,621,568 bytes and 5,022,243 inodes available. Candidate runtime 108,613,937 bytes / 3363 files; gzip 42,303,067 bytes. PR202 runtime measurement 106,353,193 bytes. Candidate extra runtime about 2.26 MB. Conservative three allocated runtimes + two archives + 128 MiB reserve = 571,576,320 bytes, leaving about 981 MB. These are not final merged-artifact numbers. No production files created or pruned.
