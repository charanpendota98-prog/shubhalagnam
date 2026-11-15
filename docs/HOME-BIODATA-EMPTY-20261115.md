# Homepage search and empty biodata cleanup

## Live baseline

Read-only browser checks on 15 November 2026 reproduced two defects in English and Telugu:
- At 320px, homepage Bride/Groom controls stack because a general small-screen card rule overrides their two-column grid. Desktop control cases pass.
- Empty biodata renders empty parentheses, orphan birthday/education/job/company/location/income icons, and parentheses around phone-only contact details.

## Changes

Extend the existing segmented-control exception to the actual homepage hero search. Hide empty biodata badges and optional career icons. Join only populated birth, parent and contact values with a middle dot, and show a plain placeholder for empty family/contact rows. No data, pricing, backend or permission changes. The separate cinematic/original-imagery redesign is excluded.

## Verification

Eight new browser cases cover both languages at 320px and 1280px, empty and partially filled local-only biodata, full JPG export, same-row 44px controls, no horizontal page overflow, no browser errors and no API writes. Existing long-name exports and registration feedback regressions also pass, 16 cases in total. Production build, TypeScript and lint/static/security are checked separately. Actual exported JPG and mobile search pixels inspected.

No actual member edits or authenticated write acceptance is claimed.
