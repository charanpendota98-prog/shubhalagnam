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

## Continuation at 18:45 IST
- Exact-ID browser progress is in /tmp/locale-regression-progress.jsonl; /tmp/locale-batch.py imports prior successful logs too. Roughly 450/1845 distinct cases checked. This is not full regression. Completed IDs survive bounded runs; 4 workers was slower, keep 2.
- Real migration defect fixed: English community metadata was replaced by generic directory metadata. English concrete caste wrapper now preserves specific original title/description/caveats/OG/twitter, with English canonical URLs. All 8 community copy cases pass.
- Briefing test reopens collapsed activity after cross-root document replacement. Stale response remains absent.
- Community discovery passes all 6 locale/viewport cases after fixing locale screenshot selector.
- Discovery navigation English cases pass after root URL assertion fix.
- Discovery utilities preview fixture currently FAILS in both locales before first note assertion. It lacks the response ownership/count fields that newer integrity tests require. Update its fictional payloads to current response contracts, preserving assertions. It was an outdated preview fixture, not evidence to relax application validation. No fixture edit made yet.
- Full build/typecheck pass after community metadata fix. Full lint was last green immediately before this change; rerun after further changes.
- Runner helpers: /tmp/locale-batch.py /tmp/locale-progress-reporter.cjs /tmp/local-pw.py. Latest output /tmp/locale-batch-latest.log. Prior completed logs imported in locale-batch.py list. Add /tmp/locale-discovery-nav-fixed.log to that import list, or rerun those 3 checks.

## Continuation at 19:19 IST
- Exact-ID batches reached roughly 610/1845 checked. Progress reporter keeps unique passes, runner also imports earlier logs. One dedicated local-package test is skipped, not passed. Runner currently excludes 8 obsolete hero-artwork cases explicitly, not passed: CinematicHero remains unused; tests wait for .mv-hero__title absent from current page. Parent informed, exclusion/replacement must be reviewed before full gate can be called complete. Current hero/motion tests all pass.
- Discovery utilities fixture envelopes repaired to current ownership/count/ack schemas. All six locale/viewport flows pass; no application validation changed.
- Policy source-preservation test compares exact PR202 source; paths/origin adjusted, all 7 policy cases pass. Three isolated connected candidate journeys pass. Four header width sweeps pass.
- Old home-workspace preview waits for removed wedding-gallery carousel. Replaced only that obsolete section with current motion-image expectation, which has dedicated motion tests. Telugu three home-workspace cases pass. English still FAILS at advanced-search textbox accessible name (expects Search communities or sub-communities, inspect current component). Do not treat as passed.
- Typecheck passes; full lint rerun pending these test-only edits. Nothing pushed or deployed.
- Visual contact sheet /downloads/locale-regression-contact.jpg inspected, English private note card and Telugu pending-contact/home layouts readable, no overflow. Parent to receive pixels.
- Run batches separately in one command, do not concatenate two ~100-second runners into one 120-second call. An interrupted runner once left a local server/process group; terminated. Current helper cleans up within bounded runs.
