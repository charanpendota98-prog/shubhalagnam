# Partner and referral preview, 17 November 2026

Status: local source only. No deployment. Final working review before live remains required.

## Scope and changes

Nine patterns: /referral, /referral/register, /r/[code], /bureau, /vendors, /vendors/[id], /vendors/campaign, /vendors/kit, /vendors/register. Dynamic referral and vendor evidence uses fictional fixtures, not real accounts or endorsements.

- Scoped readable small text, 48px inputs, 44px actions, keyboard focus, wrapping and phone choice grids. Removed duplicate context strips. Vendor names are no longer truncated in the directory.
- Referral links distinguish a failed check from a confirmed invalid code. Automatic redirect and saved attribution require a confirmed valid code. Retry is explicit; no real click tracking was triggered for a dynamic code.
- Bureau and vendor package prices no longer use invented fallback offers. Loading, empty and unavailable states differ; submission is disabled without loaded required choices. Vendor directory failures clear stale results rather than becoming a zero-result list.
- Vendor details clear stale page data, distinguish unavailable from missing, and retain the enquiry consent gate. Registration exposes most previously placeholder-only fields as visible labels; owner-name and State still use their prior pattern.
- Campaign edits invalidate an old quote. Quote failures are visible; totals must be finite. Campaign creation/listing now handles network failures. These are local source changes, not a real campaign or payment acceptance.
- Editing kit credentials clears a previously loaded kit and rejects late successful responses. Bureau workspace handlers now catch failures and opening a workspace clears old data. Authenticated kit/workspace operations were not exercised.

## Verification

- Production build, TypeScript, full static suite and all 86 security checks passed on final source.
- Six final bilingual browser journeys passed at 320, 390 and 1280 CSS pixels. APIs were intercepted. Only fixture referral-click and quote POSTs were permitted; zero other writes and zero uncaught browser errors were asserted.
- Thirteen referral regressions passed before the final display-only spacing/name/count corrections.
- Visually inspected rebuilt English/Telugu screenshots at phone and desktop widths, including unavailable prices, retry spacing, full vendor names, consent and quote failure states.
- PRIVATE review page inspected at 320/390/1280. All 18 gallery images decoded; all nine galleries and arrow/Escape behavior were inspected. A generic source link opened the current live referral page in a separate tab while the review remained available.

## Delivery and limits

PRIVATE review: https://files.instinct.com/x04lz86uduxe-partner-pages-checked-before-launch

This is a screenshot review, not a user-operated staging deployment. Source links open the current live site, not the rebuilt preview. Only the signed-in owner can open the File; its generic preview card contains no private account details.

Coverage: 44/54 route patterns. Ten remain: private-link/fallback 2 and restricted operations 8. Bounded preview coverage is not launch acceptance.

No real referral, invite, payout, bureau workspace, vendor registration, enquiry, campaign, kit access, member write, payment, verification, report/block, notification, provider/service change, deletion or deployment. Existing catalogues and destinations preserved. No authenticated kit, bureau operation, live checkout, real attribution or full campaign execution acceptance is claimed. Policy/provider/business decisions remain with the owner.

Observed live read-only sources:
- https://manavivaha.in/referral
- https://manavivaha.in/referral/register
- https://manavivaha.in/bureau
- https://manavivaha.in/vendors
- https://manavivaha.in/vendors/register
- https://manavivaha.in/vendors/campaign
- https://manavivaha.in/vendors/kit
- https://manavivaha.in/api/vendors/categories
- https://manavivaha.in/api/vendors/packages
- https://manavivaha.in/api/meta/home-stats
