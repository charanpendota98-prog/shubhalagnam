# Editorial and community preview, 17 November 2026

Status: local source only. No deployment. Final working review before live remains required.

## Scope and changes

Six patterns: /stories, /events, /org/[slug], /p/[slug], /blog, /blog/[slug]. CMS /p is an information page, not a member profile. The sample organization and CMS page were fictional. All three current article routes and the legacy checklist redirect were exercised, not every possible dynamic slug.

- Readable small text, 48px form controls, 44px actions, wrapping and keyboard focus. Removed duplicate context strips; blog index owns its h1.
- Stories now distinguishes failure from empty, offers retry, clears stale results and has visible form labels. Optional featured-story module is unchanged.
- Events, bundles, organization list and insights have independent loading/failure states. Unavailable reads are not empty lists or zero counts. Missing aggregates say unavailable; the fallback no longer promises absolute anonymity.
- Organization and CMS pages clear stale data, distinguish missing from unavailable, and allow retry. CMS ignores late responses after route changes. Article body content and SEO data are unchanged.

## RSVP functional correction

Each event starts with blank attendee count and unchecked consent. Count must be an integer from 1 to 6; changing count clears consent. The user must review that event and explicitly consent before the button enables. The handler validates again and sends the entered count and actual checkbox state. Existing authentication/backend gates are unchanged. Already-registered responses no longer imply a new RSVP. Successful responses clear consent.

Backend capacity counts RSVP accounts rather than total attendees. The caption now says so. No event price/payment field exists in the examined RSVP path, and no claim of free attendance was added. No real RSVP was submitted.

Live public asset still contained the previous fixed-two/automatic-consent code when read around 17:31 IST. The public Events API returned zero events at that check, limiting immediate public exposure but not removing the defect if events are later added. This local correction is not deployed.

## Verification

- Production build, TypeScript, full static suite and all 86 security checks passed.
- Six final bilingual browser journeys at 320, 390 and 1280 CSS pixels passed in bounded batches. Read-only journey APIs were intercepted; zero non-GET requests and zero uncaught browser errors asserted.
- Two dedicated intercepted RSVP tests passed, checking initial disabled state, invalid counts, count-change consent reset, per-event isolation, exact payload with count 4, rejected response and already-registered response. These POSTs reached fixtures only.
- Ten home/biodata/heading regressions passed, including bilingual checks of all five member workspace heading owners.
- Corrected the stale RouteFrame assertion, not the application: /me, /matches, /requests, /shortlist and /saved-searches already own localized h1 headings. The static contract now requires both intro:none and an actual page h1; added runtime checks require one visible h1, one main and no shared intro. The earlier full-static caveat from the community slice is now resolved without weakening coverage.
- Visually inspected actual rebuilt screenshots and body samples in Telugu/English at phone and desktop sizes. The PRIVATE File was inspected at 320/390/1280, all twelve images decoded, all six galleries opened, arrow/Escape navigation checked, and a source link opened the live Stories page while the File remained available.

## Delivery and limits

PRIVATE review: https://files.instinct.com/wcrwn6rxgrs2-editorial-pages-checked-before-launch

This is a screenshot review, not a user-operated staging deployment. Source links explicitly open the current live site, not the rebuilt preview. Only the signed-in owner can open the File; anyone receiving its link can see the generic preview card.

Coverage: 35/54 route patterns, 19 remain: partner/referral 9; private-link/fallback 2; restricted operations 8. Bounded preview coverage is not launch acceptance.

No real story, like, RSVP, enquiry, ambassador application, member write, payment, verification, report/block, notification, external-channel join, provider/service change, deletion or deployment. Existing catalogues and destinations preserved. Policy/provider/business decisions remain pending with the owner.

Observed live read-only sources:
- https://manavivaha.in/stories
- https://manavivaha.in/events
- https://manavivaha.in/blog
- https://manavivaha.in/blog/online-matrimony-safety-telugu
- https://manavivaha.in/p/about-us
- https://manavivaha.in/p/contact-us
- https://manavivaha.in/api/cms/pages
- https://manavivaha.in/api/orgs
- https://manavivaha.in/api/events
- https://manavivaha.in/api/insights/demand
- https://manavivaha.in/_next/static/chunks/3prb7x_2fls3x.js
