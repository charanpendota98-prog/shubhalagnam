# Design system — Mana Vivaha

Updated: 2026-10-15 · Status: **foundation shipped, adoption partial**

This is the working reference for colours, type, spacing, controls and states.
It is deliberately additive: existing pages keep their current markup until they
are migrated one surface at a time. Nothing here changes registration, data
handling, or the mobile-first layout rules.

---

## 1. Where things live

| Layer | File | Role |
| --- | --- | --- |
| Tokens (TS) | `frontend/src/lib/design-tokens.ts` | Canonical values; validates hex at import time |
| Tokens (CSS) | `:root` block in `frontend/src/app/globals.css` | Same values as CSS custom properties |
| Primitives | `frontend/src/components/ui/` | `Button`, `Card`, `Badge`, `Field`, `EmptyState` |
| Primitive styles | `.ds-*` rules in `globals.css` | Hover/focus/active/disabled/loading states |
| Gate | `frontend/scripts/design-system.test.mjs` | Fails if tokens and CSS drift, or primitives break rules |
| A11y gate | `frontend/scripts/a11y-static.test.mjs` | Static JSX scan with a grandfathered baseline |
| Browser QA | `frontend/tests/visual.spec.ts`, `frontend/tests/a11y.spec.ts` | 8 viewports, overflow + tap targets, axe scan |

Changing a colour or a spacing step means editing **both** the TS token map and
the CSS `:root` block — the gate fails if only one is updated.

## 2. Tokens

69 tokens in 11 groups: brand palette, semantic text, surfaces, borders,
feedback, spacing, radii, type scale, elevation, motion, layout.

```ts
import { DESIGN_TOKENS } from "@/lib/design-tokens";
DESIGN_TOKENS["--ds-maroon"]; // "#7A0C2E"
```

```css
/* In CSS, always reference the variable — never retype the value. */
.my-surface { border: 1px solid var(--ds-border); }
```

### Spacing — 4px base

`--ds-space-0` … `--ds-space-16` = `0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64px`.
Pick the nearest step; do not introduce one-off values.

### Radii

`sm 8px · md 12px · lg 16px · xl 20px · 2xl 28px · pill 999px`.
Cards default to `xl`; controls default to `md` or `pill`.

### Type scale

| Token | Size | Line height | Use |
| --- | --- | --- | --- |
| `--ds-font-display` | `clamp(1.75rem, 5vw, 3rem)` | 1.25 | Hero headline only |
| `--ds-font-h2` | `clamp(1.3rem, 4.4vw, 1.9rem)` | 1.28 | Section titles |
| `--ds-font-h3` | 17px | 1.45 | Card titles, empty-state titles |
| `--ds-font-body` | 15px | 1.7 | Default body copy (mobile: 16px in controls) |
| `--ds-font-sm` | 13px | 1.7 | Secondary copy, button labels |
| `--ds-font-xs` | 12px | 1.7 | Hints, metadata |
| `--ds-font-caption` | 10px | 1.45 | Uppercase eyebrows/badges only |

Weights: `600 medium · 700 bold · 800 extrabold`. Body language is Telugu-first,
so line heights stay generous (≥1.5) — Telugu glyphs need vertical room.

### Colour rules and contrast

Contrast below is computed for the listed pair only; it is not a full audit.

| Pair | Ratio | Verdict |
| --- | --- | --- |
| `--ds-text` on `--ds-surface` | ~13.4:1 | AAA |
| `--ds-maroon` on white | ~11.0:1 | AAA |
| `--ds-text-muted` on white | ~6.2:1 | AA (normal text) |
| `--ds-danger` on white | ~6.3:1 | AA |
| `--ds-gold-text` on white | ~5.0:1 | AA |
| `--ds-gold-text` on `--ds-cream` | ~4.7:1 | AA |

Rules that follow from this:

- Never use raw `--ds-gold` (#D4AF37) for text on a light surface — it lands at
  ~2.7:1. Use `--ds-gold-text` (#8A6A1F) for any text and reserve the bright gold
  for fills, borders, rules and glows.
- Badge tones carry meaning, so pair them with words. Colour alone must never be
  the only signal (WCAG 1.4.1).
- Feedback colours (`success`/`warning`/`danger`/`info`) are for status text and
  borders, not large background washes behind body copy.

## 3. Primitives

```tsx
import { Button, Card, CardBody, Badge, Field, EmptyState } from "@/components/ui";
```

### Button

`variant`: `primary` (gold) · `secondary` (maroon) · `outline` · `ghost` · `light` (on dark).
`size`: `md` (44px) · `lg` (48px). `block`, `loading`, `iconLeft`, `iconRight`.

Pass `href` to render a `next/link` with identical visual states.

Baked in, so no call-site can forget:

- `type="button"` unless a caller explicitly asks for `submit` — a bare
  `<button>` inside a `<form>` submits it.
- 44px minimum height on every variant and size.
- `loading` sets `aria-busy`, shows a spinner and blocks re-submission.
- Focus ring comes from the global `:focus-visible` rule plus the control's own
  ring (`:focus-visible` outline, and a gold ring on form controls).

### Card

`as` (`div` default, `article`, `li`, `section`, `aside`) · `tone` (`plain`,
`brand` = gold top accent, `flat` = no shadow) · `interactive` (hover lift).
`CardBody` supplies the standard padding.

Hover lift is gated behind `@media (hover: hover) and (pointer: fine)` and is
disabled under `prefers-reduced-motion`, so touch users never see jumpy motion.

### Badge

`tone`: `gold` (default, the section eyebrow) · `maroon` · `neutral` · `success` ·
`warning` · `danger`. Optional `icon`.

### Field

Label + control + hint + error with the ARIA wiring done once. The control is
supplied through a render prop so it keeps its own element:

```tsx
<Field id="home-age" label="Age range" hint="Adults only" error={error}>
  {({ controlId, describedBy, invalid }) => (
    <select id={controlId} className="ds-control" aria-describedby={describedBy} aria-invalid={invalid}>
      …
    </select>
  )}
</Field>
```

`.ds-control` gives the 44px target, focus ring, invalid state, and the 16px
mobile font size that stops iOS zooming the page on focus.

### EmptyState

`icon` · `title` · `description` · `action`. An empty state must say what is
empty, why, and what to do next — it never invents content to fill the gap.

## 4. Control states

Every interactive primitive defines **default · hover · focus-visible · active ·
disabled · loading**. Missing states are a bug, not a style choice.

| State | Treatment |
| --- | --- |
| default | Token fill/border/text |
| hover | Brighten (gold) or darken (maroon); only on hover-capable pointers |
| focus-visible | 2.5px gold outline, 3px offset — plus a gold ring on form controls |
| active | `scale(0.99)` press feedback |
| disabled / `aria-disabled` | 55% opacity, no shadow, `not-allowed` |
| loading | Spinner + `aria-busy`, no double submit |

## 5. Loading, error, empty

| State | Pattern |
| --- | --- |
| Loading | `CardSkeletonList` from `components/Skeletons.tsx` (shimmer, `aria-busy`) — never a bare "Loading…" block in a card slot |
| Error | `EmptyState` with what failed, a plain-language next step, and a Retry `Button` |
| Empty | `EmptyState` with what is empty and where to go instead |

Error and empty copy states what happened. It does not promise a retry will
work, and it never fabricates members, counts or listings.

## 6. Motion

- Durations: `fast 150ms · base 250ms · slow 400ms`, easing `cubic-bezier(0.22, 1, 0.36, 1)`.
- Motion is decorative: hover lifts, press feedback, accordion rotation.
- `prefers-reduced-motion: reduce` disables the new transitions, the card lift,
  and slows the spinner; the hero film and canvas already respect it.

## 7. Mobile-first rules (unchanged)

- Base styles are single-column; grids widen at 400 / 560 / 640 / 768 / 1024px.
- Touch targets ≥ 44px; form controls render at 16px on small screens.
- No horizontal overflow — enforced at 8 viewports by `tests/visual.spec.ts`.
- Hover and transform effects only on hover-capable pointers.

## 8. Adoption status

| Surface | Status |
| --- | --- |
| Homepage `/` — headings, steps, pricing, FAQ, safety, CTA | ✅ primitives |
| Hero (`CinematicHero`) primary action | ✅ `Button` |
| Home search card (`HomeMatchSearch`) | ✅ `Field` + `Button` |
| Spotlight cards (`ProfilesOfTheDay`) loading/error/empty | ✅ `CardSkeletonList` + `EmptyState` |
| Vendor showcase (`HomeVendorsShowcase`) loading/empty | ✅ `CardSkeletonList` + `EmptyState` |
| Every route — public, member, studio, directory, admin, control | ✅ shared `RouteFrame` context, depth, mobile treatment |
| Direct profile search `/search` | ✅ `Card` + `Field` + `Button` + owner-privacy copy |
| Homepage `/` — headings, steps, pricing, FAQ, safety, CTA | ✅ primitives |
| Hero (`CinematicHero`) primary action | ✅ `Button` |
| Home search card (`HomeMatchSearch`) | ✅ `Field` + `Button` |
| Spotlight/vendor cards | ✅ skeleton + honest empty/error states |
| Route-specific controls | 🔄 migrated incrementally; the frame is additive and does not change data contracts |

### Migration checklist (next route-specific surfaces)

1. Keep the universal `RouteFrame` mounted; it is the visual contract for every route.
2. Replace ad-hoc button/link styling with `<Button>` as a surface is touched.
3. Replace card shells with `<Card>` / `<CardBody>`; keep page-specific layout classes.
4. Replace dashed "nothing here" boxes with `<EmptyState>`; text-only loading with `CardSkeletonList`.
5. Replace raw hex colours with tokens; add a token only when a value is genuinely new.
6. Run `npm run lint` (including the route-frame, design, a11y, and behaviour gates) and `npm run build`.
7. Re-baseline only if the a11y gate found a genuine pre-existing issue in the file you touched — prefer fixing it.

## 9. QA — what runs, and what does not

**Runs everywhere, no browser** (`npm run test:static`):

- `design-system.test.mjs` — 14 checks: token/CSS parity in both directions, no
  undefined `var(--ds-*)` references, valid hex, 44px touch token, no raw hex or
  focus removal inside primitives, Button's `type` default, Field's ARIA wiring,
  barrel exports.
- `a11y-static.test.mjs` — 7 checks over `src/**/*.tsx`: buttons without `type`,
  images without `alt`, positive `tabIndex`, `aria-hidden` on focusable elements,
  `role="button"` without `tabIndex`. 275 pre-existing findings are grandfathered
  per file in `scripts/a11y-baseline.json`; a file may improve freely but never
  regress, and new files start at zero. Re-baseline with
  `node scripts/a11y-static.test.mjs --update-baseline`.

**Needs a browser** (`npx playwright install chromium`, then `npm run test:visual`
and `npm run test:axe`):

- 8 viewports (320/360/390/430/768/1024/1280/1920) × 6 routes: no horizontal
  overflow, screenshots in `artifacts/visual/`, and every `.ds-btn` ≥ 44px.
- axe (WCAG 2.0/2.1 A + AA) on 5 routes — serious/critical fail, advisory findings
  are printed; plus a keyboard focus-visibility check on the homepage.

**Not covered — do not claim otherwise:**

- The Playwright and axe suites have **not been executed in this environment**:
  the sandbox cannot download the Chromium binary. They are written, type-checked
  and wired, and `npm run test:visual` reports an explicit skip (never a pass)
  when the browser is missing. Set `REQUIRE_VISUAL_TESTS=1` to make that a hard
  failure in CI.
- No real-device runs (Android, iOS Safari, foldables), no 200% zoom or large-text
  checks, no screen-reader passes, no network-throttling runs. Those remain
  manual items in the blueprint's responsive QA matrix.
