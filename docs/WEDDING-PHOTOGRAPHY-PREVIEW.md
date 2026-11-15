# Wedding photography review candidate - 15 November 2026

Status: local preview branch only. Not pushed, merged or deployed. Built on the separate held Creator Club candidate (`a8218f1`), which itself follows production PR #42. Creator Club release needs the coordinator's signal. Redesign needs Cherry's design approval before any live release.

## Scope

- New home photo hero, genuine existing search controls, join/browse links and editorial family-guide section.
- Ivory/maroon preview-scoped shared header, form, context and intro styling. Existing route-specific layouts and functions remain.
- Visible preview banner. Real photos are illustrative stock, not member stories or endorsements.
- No backend changes, members, payments, reward rates, permissions, provider settings or outbound messages.
- This is not a claim that every page has been rebuilt, that authenticated workspaces were accepted, or that every below-fold state was visually certified.

## Verification

- Production build, TypeScript, lint, static and security checks pass.
- 188 local page-opening checks: 47 entry/sample routes, English/Telugu, 390/1280px. All HTTP 200, one main landmark, no page exceptions, horizontal overflow, failed images or observed server errors.
- Seven home photography/search/accessibility browser tests pass, including 320px checks. Search selection resolves to the existing matches query; no production mutation.
- Page-opening screenshots reviewed in contact sheets for both languages and screen widths, plus individual home/editorial and narrower screenshots. Small contact sheets do not establish detailed readability of every private/below-fold state.
- Public data read through nonmutating GET requests only. Protected pages reviewed signed out. No synthetic production member was created.
- Existing Growth signed-out conversion tile displays `undefined%` in the opening screenshot. Separately investigating; not hidden by a visual redesign and not proof of a backend fault.

## Review File

Owner-only screenshot review: https://files.instinct.com/w5ds3fa4dzzl-manavivaha-design-preview

PRIVATE generation 1, revision `filerevision-01M7FDQVJ3ZVVDXZ2GTWGH54NN`. 47-route picker, English/Telugu and mobile/desktop selectors, searchable empty/reset states. Controls inside screenshots are intentionally static. Hosted controls and a photo-credit destination checked in the browser; full File rendered/inspected at 320/390/1280px. Text-only preview card prevents exposing unreleased design before sign-in.

## Photography

Suresh Photography / Pexels:

- https://www.pexels.com/photo/traditional-south-indian-wedding-in-telangana-33608795/
- https://www.pexels.com/photo/traditional-south-indian-wedding-portrait-outdoors-33608790/
- https://www.pexels.com/license/

License verified for free use/editing with no implied endorsement. Credits and illustrative-photo labels retained in the website and review File. Existing illustration section is retained and describes its own illustrations, not these photos.
