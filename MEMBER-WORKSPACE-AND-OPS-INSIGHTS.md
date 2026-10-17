# Member workspace & operations insights

How the shortlist, saved-search, comparison and control-dashboard work fit
together, and the rules each one has to keep.

Updated: 2026-10-16 · Scope: `/shortlist`, `/saved-searches`, `/compare`,
`/control` overview, `backend/main.py`, `backend/topmatch.py`, and four new
shared frontend modules.

---

## 1. `/shortlist` — saved profiles with private notes

**Route:** `frontend/src/app/shortlist/page.tsx` →
`frontend/src/components/ShortlistWorkspace.tsx`

One place to review saved profiles and keep a private reminder on each. Built on
the design-system primitives, with skeleton loading, a retryable error state and
an empty state that points back to browsing.

**API**

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/api/save` | Existing toggle. **Both** directions now persist (`_persist_core_state()`); previously every shortlist entry was lost on restart. |
| `GET` | `/api/saved/{tsap_id}` | Now returns `note` and `note_at` with each entry. |
| `POST` | `/api/saved/{tsap_id}/{saved_id}/note` | Body `{ note }`. Owner-gated, sanitized with the same `clean()` pass used for profile text, capped at **280** characters, persisted. An empty note clears it. `404` when the profile is not in that member's shortlist. |

**Privacy:** notes live on the owner's shortlist row and are returned only to
that account — never to the profile owner or another member. The page is
`robots: noindex`, shows `AuthGate` to signed-out visitors, and writes nothing
to `localStorage` beyond the session id the app already keeps. Note drafts stay
in component state until they are saved.

**Tests:** `backend/test_shortlist_notes.py` — **9/9**
(`python test_shortlist_notes.py`).

---

## 2. `/saved-searches` — alerts that are opt-in and explained

**Route:** `frontend/src/app/saved-searches/page.tsx` →
`frontend/src/components/SavedSearchWorkspace.tsx`

Before this, the only saved-search UI was a side panel on `/matches` that could
turn alerts **off** but never **on**, with no way to see the new matches or to
record consent. The workspace fixes all four.

- **Alerts are opt-in only.** Turning them on requires ticking an explicit
  consent box in that session (never pre-checked); the server keeps the consent
  record (`alert_consent_at`).
- **Legacy searches** whose alert flag predates recorded consent read as "paused
  until consent is recorded" and get a one-tap fix.
- **"Send me the new ones now"** reports exactly what the server did — queued,
  skipped for missing consent, skipped because WhatsApp is off, or no new
  matches. It never claims a message was delivered.
- **Counts are counts.** "5+ profiles match" is a description of the criteria,
  never a compatibility or outcome signal. A saved search with no filters says
  so instead of implying a curated list.

**Alert links now land somewhere.** `/matches?search=<id>` applies that saved
search once and drops the parameter, so the
`manavivaha.in/matches?search=<id>` link the backend already puts in alerts
resolves to the results instead of a default browse.

**Shared module:** `src/lib/saved-search-summary.mjs` — the summary line used by
both `/matches` and the workspace (previously a private duplicate inside
`page-client.tsx`). Pure, dependency-free, EN+TE, clamps out-of-range stored
ages and truncates long multi-selects with a visible `+N`.

**Tests:** `scripts/saved-search-summary.test.mjs` — **15/15**
(`npm run test:saved-search`).

---

## 3. `/compare` — differences and saved expectations, no scores

**Component:** `frontend/src/components/ProfileCompareStudio.tsx`

- **"Only show what differs (N)"** hides rows where the profiles agree; a dot
  marks differing rows in the full view. A blank is never a difference — a row
  only differs when two profiles state different values.
- **"Meets N of M things you saved"** per card, with every check listed and the
  factual reason behind it (met first). Nothing is shown when the member saved
  no expectations, because nothing is invented.
- **Optional ordering** "Most expectations met first", with copy next to it
  stating plainly that it is a count, not a score, percentage or prediction.

**API:** `POST /api/matches/compare-profiles` now returns per-profile
`preference_checks` and `field_checks` for the signed-in member, reusing the
same explainable comparison the profile page already used. Skipped for the
viewer's own profile; absent for members who saved nothing.

**Bug fixed:** `topmatch._preference_comparisons` emitted a
"Community preference: not met" check whenever the other profile listed a
community, even though the member had saved no preference at all — an empty
preference was producing a verdict. Empty preferences now produce no check.

**Shared module:** `src/lib/compare-insights.mjs` — matrix, difference, tally,
ranking and label helpers. **15/15** tests (`npm run test:compare`).
**Backend:** `backend/test_compare_preferences.py` — **8/8**.

---

## 4. `/control` overview — operations insights

**Component:** `frontend/src/components/control/OpsInsights.tsx`

Four panels under the existing KPI cards and charts:

1. **How long the queue has waited** — pending profiles bucketed under 24h,
   1–3 days, 3–7 days, over 7 days, plus the oldest wait. The most actionable
   number on the dashboard and previously invisible.
2. **Where members stall** — registered → added a photo → approved → sent a
   first request, each as a count and a share of registrations.
3. **Requests & saves** — interest-request statuses (what members did, not an
   outcome), saved searches with recorded consent, shortlist entries.
4. **Registration trend** — last 7 days against the previous 7, with a
   sparkline. A percentage only appears when the earlier week had a real count.

**API:** `GET /api/control/analytics` gained `queue_aging`, `funnel`,
`engagement` and `trend`. All aggregate. RBAC is unchanged: finance totals and
the audit log stay owner/finance-only, while the operational counts above remain
available to workers.

**Shared module:** `src/lib/ops-insights.mjs` — labels, shares, durations and the
trend line. **10/10** tests (`npm run test:ops`).
**Backend:** `backend/test_control_analytics.py` — **9/9**, including a
payload-wide check that no member identifier or phone number can leak into
analytics.

---

## 5. Rules these features share

1. **No invented numbers.** No compatibility percentage, score, ranking of
   people, or prediction. Counts are counts of what members entered.
2. **Missing data is not evidence.** A blank never counts as a difference, a
   match, or a miss; "not stated" stays visibly "not stated".
3. **Explanations ship with the number.** Every preference check and every
   alert result carries the reason it got the answer it did.
4. **Consent is explicit and recorded.** Alerts require a tick in that session;
   "alerts on" means consent was recorded, not merely requested.
5. **Delivery is never promised.** WhatsApp is described as queued, not sent.
6. **Aggregate by default.** Analytics returns counts, never member-level rows.

---

## 6. Verification

```bash
# Frontend
cd frontend && npm ci
npx tsc --noEmit
npm run lint        # 14 + 7 + 16 + 15 + 15 + 10 + 10 static checks
npm run build

# Backend
cd backend
python test_shortlist_notes.py      # 9/9
python test_compare_preferences.py  # 8/8
python test_control_analytics.py    # 9/9
python test_topmatch.py             # 17/17
```

Not verified here: rendered appearance at every breakpoint (no browser in this
sandbox — Playwright/axe suites are for local runs, see `DESIGN-SYSTEM.md` §9),
and any flow needing real shortlisted profiles or live WhatsApp.
