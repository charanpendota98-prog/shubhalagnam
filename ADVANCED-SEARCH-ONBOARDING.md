# Advanced search + onboarding — explainable results, honest next steps

Updated: 2026-10-15 · Scope: `/matches`, `/me`, `ProfileRail`, and one new shared module.

Both features follow the blueprint's explainable-matchmaking rules (§5): facts
only, nothing inferred, no ranking change, no compatibility score.

---

## 1. Explainable match reasons — `frontend/src/lib/match-reasons.mjs`

A new dependency-free module (companion to `match-filter-query.mjs`) that
answers one question: **"why did this profile appear in my results?"**

`matchReasons(row, filters, { limit })` returns 0–3 chips per result card. Each
chip restates a filter the member actually set plus the value the profile
actually carries, e.g. "District matches your filter (Hyderabad)", "Age 27 is
inside your 25–30 range", "A review check is recorded (not an identity
guarantee)".

Rules enforced by the module and its tests:

- **Facts only.** No compatibility percentage, no "good match", no marriage
  outcome, no prediction. Anything invented fails the test suite.
- **No inference.** Religion, caste, income, health, intent and family approval
  are never inferred — only compared when the member filtered on them.
- **Missing data yields no reason.** An empty profile field never produces a
  guessed or "probably" label.
- **Deterministic.** Same row + same filters ⇒ same reasons, same order.
- **Narrowed filters only.** The default 18–60 age range is not "an explanation";
  the age chip appears only when the member narrowed it.
- **Recorded checks are described as recorded**, never as identity proof.
- The results header carries a standing disclaimer: these notes restate the
  filters and the member-submitted details; they are not a score and do not
  verify anyone.

**Ranking is untouched.** Nothing here changes the order the API returns.

## 2. One-tap relax suggestions — same module

`relaxSuggestions(filters, { limit })` returns up to 3 concrete widenings for a
search that came back empty, most-restrictive first: drop `photo_only`, drop
`verified_only`, clear the keyword, open up sub-community, widen district to the
whole state, any education, any work, remove the minimum income, any marital
status, any community, both states, widen the age range (±5 years, clamped to
18–60, with the new range shown on the button).

Each suggestion carries a `patch` that merges into the filter state; the existing
debounced fetch re-runs, so it is one tap. Suggestions only cover filters the
member actually narrowed, and "Reset all filters" stays available.

## 3. Continue where you left off

`ProfileRail` (already used for "More profiles" on a profile page) gained an
explicit `viewerId` prop, and `/matches` now renders the **Recently viewed** rail
for signed-in members. It calls `/api/recently-viewed/{id}`, which is
owner-gated (`require_owner`) and returns safe fields, deduplicated, with blocked
and banned profiles excluded. The rail renders nothing when the list is empty.

## 4. Onboarding — guided next steps on `/me`

The profile-completion card became an actionable checklist:

- Each suggested missing field is a button that scrolls to and focuses that
  control (control ids added as `me-<field>`), instead of a plain comma list.
- Fields without an editable control on this page (`phone`, `gender`, …) show as
  plain informational chips, never as fake buttons.
- Copy states the truth: these steps are optional, tapping only jumps to the
  field, and nothing changes or is shared until the member saves.
- Two onward actions: browse matches, and the safety guide.
- The existing honesty line is unchanged: completeness does not guarantee search
  placement or responses.

**Registration itself was not touched** — no field, validation, step or endpoint
in the register flow changed.

## 5. Tests

`npm run test:matching` → `scripts/match-reasons.test.mjs` — **16/16**, and it is
part of `npm run test:static` (which `npm run lint` now runs alongside eslint,
the link check, the design-system gate, the a11y gate and the security script
tests).

Covered: no filters ⇒ no reasons; default age range is not a reason; mismatched
filters produce nothing; missing profile data never produces a guessed reason;
multi-select matching (case/space-insensitive); sub-community before community;
recorded checks are not called identity proof; no compatibility/outcome language
anywhere; the cap and determinism; relax suggestions only for narrowed filters;
patches merge cleanly; age widening stays inside 18–60 and labels itself;
suggestion cap.

## 6. What is not verified

- **Visual rendering of the reason chips, the relax buttons and the `/me`
  checklist was not seen in a browser** — this sandbox cannot download a
  Chromium binary (see DESIGN-SYSTEM.md §9). The logic is unit-tested, the page
  type-checks and builds, and `/matches`, `/me` and `/` all return 200.
- The dev database in this sandbox has **0 profiles**, so `/matches` renders the
  empty state rather than real result cards. The reason chips need a populated
  database to review.
- No real-device, zoom, screen-reader or low-network runs.

## 7. Privacy and data safety

- No new data collected, stored or sent. Reasons are computed in the browser from
  data the search API already returned.
- No new third-party scripts, trackers or analytics.
- The recently-viewed rail uses an existing owner-gated endpoint and renders
  nothing for signed-out visitors.
- No PII is written to `localStorage` by any of this work.
