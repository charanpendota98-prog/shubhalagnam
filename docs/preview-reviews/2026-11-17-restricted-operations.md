# Restricted operations preview, 17 November 2026

Local source only. No deployment. Final working review before live remains required.

Eight patterns: /admin, /admin/photos, /control, /control/login, /control/workspace, /control/legacy, /owner and /growth.

## Changes

- Scoped restricted-workspace type, 48px form fields, 44px buttons, focus rings, wrapping and two-column phone owner metrics. Removed duplicate generic route-context bar. Existing roles, destinations, providers and actions remain.
- Owner summary clears old business totals at a new read and after network/denied/malformed failure, ignores superseded reads and offers retry after failure. Cookie-session probe runs on mount, not each emergency-key edit or language change. Key remains memory-only; legacy localStorage purge remains. Missing numeric fields display unknown rather than invented zero.
- Sign-in has a busy guard, disables role switching during submission and validates returned role before redirecting. No backend auth or role change.
- Control loading/failure has a heading and status/alert semantics; failed reads show a meaningful retry explanation, not raw internal error text.
- Growth clears secondary snapshots during reload, checks HTTP/error envelopes for inventory and WhatsApp status and shows missing counters/provider mode as unknown. Existing consent and delivery cautions remain. No provider switch.

## Verification

Final production build, TypeScript, full static suite and 86 security checks passed. Seven new tests passed: six English/Telugu journeys at 320/390/1280 plus one memory-key/session-probe test. Journeys cover owner/admin compatibility route, worker workspace without owner snapshot, legacy redirect, rejected/malformed sign-in, genuinely empty/denied photo queue, owner network/recovery/denial, growth secondary failures and control read failure. Each six-route journey intercepted exactly two fictional sign-in POSTs and no other writes; no page errors or viewport overflow. The extra test uses fictional in-memory keys and confirms typing does not probe cookies/refetch the summary, then checks denied refresh clears old summary.

All 49 existing owner-command-center, control-bureaus, growth-error-state and photo-review-revision tests passed on the final source. They include role-limited reads, queue failure/retry/expiry, stale-result isolation, real zero/unknown states and fictional photo decisions bound to displayed revision. These photo decisions reached intercepted local fixtures only.

Visually inspected rebuilt bilingual state contact sheets at 320/390/1280 plus final owner-summary full pages and both final phone control-error states. Inspected PRIVATE File layout completely at 320/390/1280, decoded all 12 images and exercised four galleries with arrow/Escape navigation. One gallery required waiting for its image to paint after opening; rechecked all three images and retained a decisive screenshot. No unresolved broken gallery was found.

## Delivery and limits

PRIVATE File: https://files.instinct.com/hqgor1hhfsi7-restricted-pages-checked-before-launch

Only the owner can open it; anyone with its link sees its generic preview card. Screenshot review, not interactive staging. File has no links into real restricted data. No real sign-in, profile/photo moderation, report/block/verification, export/restore, payment, notification, provider or live action.

54/54 source route patterns now have bounded preview evidence. This is not every tab/control, live role acceptance, backend security audit, every dynamic slug, real-device coverage or launch acceptance. Existing unresolved policy/provider/business decisions and the final working-review-before-live gate remain open. No merge, push or deployment was done in this slice.
