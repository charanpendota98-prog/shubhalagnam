# Mobile filter and registration repair, 15 November 2026

Fresh-sweep second repair batch, separate from PR47.

## Reproduced defects

- At 320px the matches filter close button was only 13.4px wide. The unlayered universal min-width reset overrides the intended utility. The close control now has a narrow, explicit 44px minimum and cannot shrink. No global CSS reset was removed.
- Quick-registration English password input had Telugu placeholder/accessibility text. Show/Hide text and accessible names now follow the selected language; the toggle has a 64px minimum so its words do not break into a thin column.
- Registration field helpers and fallback read a mutable language variable rather than the provider state. A direct English-selected load could produce a hydration mismatch and rebuild the form. Those helpers now read the same context as the wizard, and their copy translation is a pure function of that language.
- English "Email (Optional)" was reduced to "Optional" by a parenthetical translation fallback. English labels are no longer treated as bilingual text to strip. Both quick and full registration use a clear Email label with the existing optional marker.

## Checks

Eight new responsive browser cases cover EN/TE 320/390 filter targets, close interaction, EN/TE 320/1280 password labels/placeholders/toggles, Email label, language switching and no page errors on direct registration loads. No registration submit is made. Existing PR47 photo/copy regressions are retained. Production-build and development-server checks are both used because the hydration defect was more visible in development.

The repairs change frontend presentation and language state reads only. No registration payload, password rules, role, API endpoint, provider, account, price, credit or moderation decision changes are made. No real member mutation is used in verification.

This is not the full-site sweep closeout. Dynamic routes, long-form generated cards, private flows and detailed full-page visual review remain separate work. Merge, deployment, rollback and live acceptance are recorded separately after the candidate passes all checks.
