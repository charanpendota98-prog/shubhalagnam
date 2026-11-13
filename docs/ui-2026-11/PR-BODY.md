## What this PR does

Three things, in priority order: the critical mobile pill-collapse bug, stale auth copy that still advertised phone OTP, and a cinematic redesign of home → search → profile → interest.

All screenshots below are real Chromium renders of this branch at 390 px (DPR 2) and 1440 px. Files live in `docs/ui-2026-11/`.

---

## 1 · Critical mobile layout bug — pill rows collapsed to 34 px strips

**Root cause.** `frontend/src/app/globals.css`, inside `@media (max-width: 640px)`, carried:

```css
.whitespace-nowrap { white-space: normal !important; overflow-wrap: anywhere; text-align: center; }
```

Tailwind v4 utilities live in `@layer`, so this **unlayered + `!important`** rule beat every `whitespace-nowrap` pill on a phone. Inside `flex + overflow-x-auto` rows each pill then shrank to min-content (~34 px) and rendered one letter per line. Measured on `main` at 390 px: account tab `w=34, h=288, white-space: normal`; vendor chip `w=93` with the label stacked 4 lines deep.

**Fix.**
* **Deleted the override entirely** — not replaced with another global nowrap-killer.
* Narrowed the neighbouring `h1, h2, … span { overflow-wrap: anywhere }` rule to `break-word` (prose still wraps, whole words stay whole, unbreakable tokens like IDs/URLs still break) and added an explicit `.wrap-anywhere` opt-in for the rare element that genuinely needs it.
* Added `frontend/src/components/ui/PillScroller.tsx` — one rail for every chip row: `flex` that never wraps, `flex: 0 0 auto` children (natural width), `overflow-x: auto` + `overscroll-behavior-x: contain`, scroll-snap, 44 px targets, edge fades only on the side that has more content, one Tab stop with arrow-key movement inside, reduced-motion safe.
* Wired it into the vendor category chips, the `/me` account tabs and the `/matches` quick filters. The `/me` header actions now wrap on a phone instead of being crushed into circles.

**Verified at 390 px** (and 360 / 414 / desktop): pills compute `white-space: nowrap`, natural widths (vendor chips 93–123 px, account tabs 66–213 px), all `h=44`, rows scroll (`scrollWidth 835 > clientWidth 316`), **zero page-level horizontal overflow** at every width.

### Before / after — home at 390 px
| Before | After |
|---|---|
| `before-home-390-top.png` | `after-home-390-top.png` |

![home before/after](https://github.com/charanpendota98-prog/shubhalagnam/blob/arena/dd2118a6-shubhalagnam/docs/ui-2026-11/compare-home-390.png?raw=true)

### Before / after — `/me` account tab row at 390 px
![tab row before/after](https://github.com/charanpendota98-prog/shubhalagnam/blob/arena/dd2118a6-shubhalagnam/docs/ui-2026-11/compare-me-tabs-390.png?raw=true)

*Left: every tab is a one-letter-per-line vertical strip (34 × 288 px). Right: labels on one line, natural width, 44 px tall, row scrolls sideways with an edge fade.*

### Before / after — home vendors category chips at 390 px
![vendor chips before/after](https://github.com/charanpendota98-prog/shubhalagnam/blob/arena/dd2118a6-shubhalagnam/docs/ui-2026-11/compare-vendors-390.png?raw=true)

*Left: chips squeezed into 34–40 px columns with the Telugu label stacked one grapheme per line. Right: one-line pills, 44 px tall, horizontal scroll.*

---

## 2 · Stale copy: phone OTP is disabled in production

Login is **phone + password**; phone OTP was still being sold in several places.

* `/me` logged-out notice (`AuthGate` + `page-client`) — now "sign in with your phone number and password — no SMS/WhatsApp OTP is used", plus the real recovery story (verified email only; no automatic recovery without one).
* `login/page-client.tsx` — reset-code labels/errors/buttons say *email verification code* rather than "reset OTP", and the failure copy states that password reset is email-only while phone OTP is unavailable.
* `backend/hardening.py`, `backend/main.py` — the 401 auth-required message and both `login-password` 429/401 errors no longer say "or log in with OTP"; they point to a verified-email password reset instead.
* `privacy`, `terms`, `WhyChooseUs` — dropped "(OTP verified)" / "Phone OTP status" claims. Factual *verification-badge* strings ("Phone OTP recorded" on a profile, where the check exists in data) were left intact deliberately: they describe stored evidence, not a login route.

---

## 3 · Cinematic redesign (CSS/SVG only — no video, no paid assets)

**Hero — search first.** The old hero was a 1.4 MB MP4 + AI poster behind a search card that started ~800 px down the page. It is now a layered depth stage — maroon→teal night sky, breathing halo, two drifting aurora veils, a perspective grid floor, a garland/mandapam SVG with lamp glows, slow light motes and film grain — behind **one luminous search card**. At 390 px the search heading sits **≈ 380 px from the top**, inside the first screen; the register action is above it and still in the first screen (asserted by `tests/visual.spec.ts`). Videos: **0 bytes**. Promo stills: **0**.

**Motion, with a hard performance contract.**
* Only `transform` / `opacity` animate (verified by inspecting `document.getAnimations()` — 15 animations, properties ⊂ {transform, opacity}). The hero floor was rewritten from animated `background-position` to a transform for exactly this reason.
* The stage pauses via `IntersectionObserver` (`data-inview="false"` → `animation-play-state: paused`) when scrolled away.
* `prefers-reduced-motion: reduce` freezes every layer at frame 1 (verified: all hero `animationName === "none"`); `prefers-reduced-transparency` drops the glass blur; phones get fewer layers and smaller blurs.
* Shared motion tokens (`--mv-ease`, `--mv-dur`), tab-panel fade (`mv-panel`), card lift on `hover: hover` only, CTA sheen — all opt-out under reduced motion.

**Imagery: less AI photo album, more honest content.**
* Deleted `CinematicGallery.tsx` and `WeddingStoryHero.tsx`; no route mounts `/promo/*` any more (enforced by `scripts/media-layout.test.mjs`).
* New `WeddingStorySection` replaces the story film on home: original inline SVG art + the real ritual sequence (pelli choopulu → porutham/muhurtham → lagna patrika → mandapam), each step linking to the page that already covers it.
* `/stories` header redesigned without the gallery.
* Empty states are designed, not faked: a drawn SVG shopfront for "no listings for this filter yet", a drawn couple/lamp motif for "no stories published yet". No invented profiles, testimonials, reviews or badges.

**Interest / send-request flow.** The profile page's plain ordered list became a connected three-step track (this is the action → the owner reviews → contact appears only after acceptance), with 48 px primary CTAs and the request/acceptance wording unchanged.

---

## Consistency with the existing product

* Brand held: maroon `#7A0C2E` + gold, Poppins/Noto Sans Telugu stack, existing spacing scale, `ds-*` primitives and tokens (the design-system gate that forbids raw hex in `ui/` still passes — `PillScroller` uses `var(--ds-*)`).
* Bilingual copy written for both Telugu and English on every new surface.
* No backend API contract, auth flow, route or feature was changed or removed. The only backend edits are user-facing error strings.

## Verification run

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npm run lint` (eslint + link check + all static suites) | pass |
| `npm run build` (Next 16 prod, type errors fatal) | pass |
| backend suite — every `backend/test_*.py` in an isolated process | pass |
| `tests/visual.spec.ts` (8 viewports × 6 routes + 44 px targets + register-above-fold) | **57 passed** |
| `tests/a11y.spec.ts` (axe serious/critical + focus ring) | **6 passed** |

Manual 390 px / 360 px / 414 px / 1440 px checks: (a) vendor chips and account tabs render on one line and scroll sideways, (b) `scrollWidth === clientWidth` on `/`, `/me`, `/matches`, (c) animations run, reduced-motion fallback frozen, and the hero frame budget stays compositor-only.

## Notes for review

* `CinematicGallery.tsx` and `WeddingStoryHero.tsx` are deleted rather than left unmounted, so nothing can silently re-mount the promo album. The MP4/JPG files still in `frontend/public/promo/` are now unused — worth deleting in a follow-up (12 MB) once nothing else references them.
* Some backend checkpoint tests asserted the old hero/gallery wiring; they were updated to assert the new contract (no video bytes in the hero, content-first story section, no gallery on home or `/stories`) rather than weakened.
* `playwright.config.ts` gained an optional `PLAYWRIGHT_CHROMIUM_PATH` so CI/sandboxes with a pre-installed Chromium can run the browser suites.

**Do not merge — this goes through owner review first.**

---

## 4 · Follow-up fix: decorative artwork no longer crosses the copy

**Reported:** on the home hero a decorative gold arc visibly struck through the Telugu subtitle at 390 px, and the same artwork passed through copy on desktop.

**Cause.** The hero's ornament (`HeroArt`) was an absolutely-positioned SVG arch pinned to the *stage* box, while the copy column moves with the layout. The two were never registered to each other, so the curve crossed the headline on wide screens and the subtitle on phones — a diagonal strike-through, worst on the 390 px Telugu layout where the subtitle wraps to two lines.

**Fix — the ornament moved out of the overlay and into reserved space.**

* `HeroArt` is now a **garland swag + two corner lamps in their own flow band** (`.mv-hero__basan`), rendered *after* the copy block with a fixed height and the hero's own bottom padding between them. Line art can't be made safe as a full-bleed overlay, so it no longer is one: **text-to-ornament separation is now structural**, not a matter of tuning coordinates.
* The band's top edge is masked so the garland emerges from the light instead of starting on a hard line, and the swag gets a ±0.2° sway (`transform` only). At 1440 px that is a 2.5 px lift, with ~40 px of clearance still left.
* Removed the scroll cue that lived in that same space (it would have collided with the band), and its CSS/animation.
* Background layers were re-confined too: the 3D floor grid is now a thin band under the search card with a two-axis mask, and the halo/noise sit below a new **`.mv-hero__scrim`** gradient wash.
* **Contrast:** the scrim (plus a darker kicker pill) keeps every on-stage text run legible across the whole loop — measured worst case **5.98:1** at 390 px and **6.26:1** at 1440 px, all above 4.5:1. The kicker previously sat at 4.4:1 against the halo's bright phase.
* Reduced motion still freezes everything; the static frame is now explicitly pinned to the animated frame's resting values (halo scale 1, floor at rest tilt, steady lamps, no sway).

**Verified, every frame — not just frame 0.** New suite `frontend/tests/hero-artwork.spec.ts` (+ `tests/helpers/png.ts`, a dependency-free PNG reader) pauses and scrubs **every hero animation** across the loop (6 stops spanning 19.5 s), samples each stroked path/line/polyline in screen space at 2 px intervals, and asserts:

1. **zero** strokes within 2 px of any text box — 0 crossings at 390 px and 1440 px, Telugu and English, all 6 frames;
2. the ornament band's top is always **> 8 px below the lowest line of copy** (structural separation);
3. every on-stage text run keeps **≥ 4.5:1** contrast against the real rendered pixels (copy hidden, stage screenshotted and decoded);
4. the **reduced-motion static frame** passes all three, with all `mv*` animations confirmed frozen.

Run against the previous commit (`aa1a69c`) the same suite **fails 8/8** (51 stroke hits at 390 px, 427 at 1440 px), so the test genuinely encodes the regression. Current branch: **8/8 pass**.

![390px before/after](https://github.com/charanpendota98-prog/shubhalagnam/blob/arena/dd2118a6-shubhalagnam/docs/ui-2026-11/fix-hero-art-390.png?raw=true)

*390 px, loop frozen at 7.8 s. **Left (before):** the gold arc cuts across “ఆసక్తి తెలియజేయండి.”, then disappears behind the search card. **Right (after):** nothing crosses the copy; the garland + lamps sit in their own band at the bottom.*

![desktop before/after](https://github.com/charanpendota98-prog/shubhalagnam/blob/arena/dd2118a6-shubhalagnam/docs/ui-2026-11/fix-hero-art-1440.png?raw=true)

*1440 px: same artwork, but the band is below the copy and above nothing that matters — no diagonal under the headline or the facts rail.*

![reduced motion](https://github.com/charanpendota98-prog/shubhalagnam/blob/arena/dd2118a6-shubhalagnam/docs/ui-2026-11/fix-hero-art-390-reduced.png?raw=true)

*Reduced-motion static frame at 390 px.*

### Gates after the fix

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | pass |
| `npm run lint` (eslint + links + static + security suites) | pass, 0 fail |
| `npm run build` | pass |
| `tests/visual.spec.ts` | **57 passed** |
| `tests/hero-artwork.spec.ts` (new) | **8 passed** |
| `tests/a11y.spec.ts` | **6 passed** |

Still **not merged** — owner review first.
