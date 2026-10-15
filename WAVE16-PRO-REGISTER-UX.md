# Historical implementation log — not current verification

> Archived 2026-09-16 notes from a different branch. Example profile IDs and test data below are historical fixtures, not live member records. Reported pass counts, build output, process IDs, and “live proof” are not current evidence of deployment or external service health. The old mention of a `test_channels` live-network run is not a current smoke-test instruction. For current safe checks use `README.md` and `TEST-2-CHANNELS-NORMAL.md`.

# 🌊 WAVE 16 — PRO REGISTER UX (screenshot-standard + Duo Telugu)

**Date:** 2026-09-16 · **Branch:** `arena/01a0aaf1-matrimony-site` (branch-only, NO merge) ·
**Ref:** user screenshots (BharatMatrimony-style register) + saved HTML (`/home/user/uploads/`, homepage ideas later)

## SCREENSHOT → OUR BUILD (map)

| # | Screenshot | Mana build | File |
|---|-----------|-----------|------|
| 1 | Height dropdown `5 ft 6 in (168 cm)` | ✅ searchable `<select>` + `heightLabel()` ft→cm | `register/page.tsx`, `telugu-data.ts` |
| 2 | Physical pills `Normal / Physically challenged` | ✅ maroon-gradient pills + Telugu (సాధారణ / దివ్యాంగులు) | `register/page.tsx` |
| 3 | Marital pills `Never married / Widow(er) / Awaiting divorce / Divorced` | ✅ gender-aware pills (Bride→Widow, Groom→Widower) | `register/page.tsx` |
| 4 | Conditional `Number of children: None/1/2/3/4+` | ✅ shows only when previously married, required then | `register/page.tsx` |
| 5 | Religion dropdown | ✅ `<select>` + dynamic caste flow intact | `register/page.tsx` |
| 6 | Neat single-column pro form | ✅ same atoms (PillGroup/SelectField), brand maroon (not screenshot green) | — |

**Brand decision:** pills = maroon-gradient `chip-on` (mana brand), kadu screenshot green.

## BACKEND (`backend/main.py`, `backend/interest.py`)

- `children` field: `None/1/2/3/4+`, default `None`, required=False; **never-married → forced `None` server-side** (fake data aapedi).
- Marital canonical: `Pelli Kaledu, Widow, Widower, Divorced, Awaiting Divorce, Separated`
  + legacy `Vidakuulu, Widow-Widower, Handicapped` — **junk 400**.
- 🐛 **REAL BUG FIX:** old frontend sent `Widowed/Separated` but backend rejected 400 → real widowed/divorced users **could not register at all**. Fixed + live-verified.
- `/api/search?children=` exact-match filter; top-matches rows + match-send rows carry `children`.
- `safe_user()` + public profile: `marital_status, children, physical_status` (phone still masked).

## FRONTEND

- `telugu-data.ts`: `MARITAL_STATUSES` (canonical), `CHILDREN_OPTIONS`, `heightLabel("5'6\"") → "5 ft 6 in (168 cm)"`.
- `register/page.tsx`: `PillGroup` + `SelectField` atoms (Duo labels EN+తెలుగు), gender-aware widow(er),
  conditional children pills + validation (`Number of children select cheyyandi • పిల్లల సంఖ్య ఎంచుకోండి`).
- `matches/page.tsx`: children filter chips + `👶 N children•పిల్లలు` card badge (marital filter auto-canonical via shared constant).
- `search/[id]/ProfileView.tsx`: `👶 Children • పిల్లలు` profile row.

## TESTS — `backend/test_wave16_full.py` → **30/30** ✅

A. marital canonical 200 ×5 + legacy ok + junk 400 · B. children store/force-None/junk-400/default ·
C. search filter exact · D. safe_user + profile fields, no phone leak ·
E. frontend static 11 checks · F. **node-executed** `heightLabel`: 5'6"→168cm, 4'8"→142cm.

## FULL REGRESSION → **1612 pass / 0 fail** ✅

wave9 203 · wave10 74 · wave11 87 · wave12 75 · wave13 105 · wave14 106 · wave15 54 · **wave16 30** ·
channels_setup 84 · privacy 53 · redundancy 53 · referral 145 · safety 70 · topmatch 61 · vendors 130 ·
channels_router 60 · growth 138 · antiban 84 · (historical script output; not a current external check).

⚠️ Note: batch must NOT force `WHATSAPP_MODE=off` (wave10 bridge tests control it; proven pre-existing via stash A/B, not Wave16).

## Historical local checks (not current production verification) (2026-09-16)

- `tsc --noEmit` clean · `npm run build` green.
- `GET /register` 200, SSR contains `Select your height` + `Select religion` (pills hydrate client-side).
- Live API (fresh pid, Wave16 code): `Widow + children=2` → `TSAP-F-2025-3198` → approved →
  `search?children=2` returns **exactly her**; public profile shows Widow/2/Normal, **no phone leak**.
- `Separated` register → 200 (old code: 400).

## PENDING (next)

BharatMatrimony HTML → homepage ideas mining (user-approved later scope).
