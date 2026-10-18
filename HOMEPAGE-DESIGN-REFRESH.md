# Homepage design refresh — presentation only

Updated: 2026-10-15 · Scope: the homepage (`/`) only.

> **Follow-up (same day):** the homepage is now the first surface built on the
> shared design system. Its eyebrows, cards and buttons use the `ds-*`
> primitives from `frontend/src/components/ui/`, and its loading/empty states use
> `CardSkeletonList` / `EmptyState`. The page-level `hp-*` rules that remain are
> layout only and read from the shared tokens. See
> [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md).

This pass refreshes how the homepage looks. It does not change what the homepage
does, what it collects, or where it sends anyone.

## What changed

| Area | Before | After |
| --- | --- | --- |
| Hero (`CinematicHero.tsx`) | Solid badge, plain divider, small price text | Glass badge, gold rule, glass price note, soft fade from the film into the cream page, warm halo behind the preference card |
| New trust rail (under the hero) | — | Four short lines stating the actual rules (free registration + included interests, contact after acceptance, photo privacy setting, what phone OTP does and does not mean) |
| How it works | Plain bordered cards | Branded card surface with icon tiles and step labels |
| Pricing summary | Plain bordered cards | Same figures, plus a derived `≈ ₹X per request` rounded from the published price ÷ credits |
| FAQ | Bordered accordion, `+` rotates 45° | Same accordion behaviour and copy, tighter spacing and an open-state border |
| Safety strip | Plain bordered box | Icon-led callout on a soft rose→ivory→mint wash |
| Closing CTA | Maroon gradient panel | Deeper gradient with a dotted pattern, corner glow, and clearer button pairing |

All new CSS lives in one block at the end of `frontend/src/app/globals.css`,
keyed to `.home-page` (the homepage shell) or `.cinematic-hero` (rendered on the
homepage only), using `hp-*` / `hp-hero-*` class names. No other route, page
shell, or shared component is affected.

## What was deliberately preserved

1. **Registrations.** The hero CTA (`/register`) is unchanged in label,
   destination and prominence, and stays above the fold. The closing CTA keeps
   both `/register` and `/matches`. `StickyCTA`, `SiteHeader` and the whole
   `/register` flow were not touched.
2. **Data safety.** No new fields, endpoints, requests, storage, third-party
   scripts or trackers. Plan figures still come from `/api/meta/home-stats` with
   the same in-component fallback. Trust, safety and privacy copy is unchanged;
   the trust rail repeats existing statements and introduces no new claims,
   counts or guarantees. The `≈ ₹X per request` line is arithmetic on the
   published price ÷ credits, not a new price promise.
3. **Mobile-first.** Base styles are single-column; grids widen at 400px / 560px /
   768px / 1024px. Touch targets stay ≥ 44px (the global mobile rule still
   applies). Hover lift and transforms are gated behind
   `@media (hover: hover) and (pointer: fine)` so touch devices get no jumpy
   motion, and `prefers-reduced-motion` disables the new transitions. The
   existing `.home-page` mobile guardrails (single readable column under 480px,
   `overflow-wrap`, no horizontal overflow) are untouched.

Accessibility: the step label colour moved to a darker gold (`#8a6a1f`) so the
small text clears 4.5:1 on white; the refresh keeps the existing heading order,
`aria-expanded` on the FAQ, and the global focus-visible ring.

## Verification

Ran from `frontend/`:

```bash
npx tsc --noEmit     # clean
npm run lint         # eslint + link check + 10/10 security script tests
npm run build        # production build clean
```

Homepage HTML spot-checks: `/register` present 6×, `/matches` 4×, `/safety` 5×,
`/pricing` 4×; trust rail renders 4 items, pricing renders 4 cards with derived
per-request values (₹20 / ₹17 / ₹12 / ₹10 for the fallback 99/199/299/499 plans).

Not verified here: rendered visual appearance at every breakpoint (no browser in
this environment — reviewed via the dev-server preview), and the spotlight /
vendor sections, which need the backend API and collapse gracefully without it.
