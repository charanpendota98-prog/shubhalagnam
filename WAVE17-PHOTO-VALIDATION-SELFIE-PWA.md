# Historical implementation log — not current verification

> Archived 2026-09-16 notes from a different branch. Example profile IDs and generated images below are historical test fixtures, not live member records. Reported pass counts, build output, process IDs, and “live proof” are not current evidence of deployment, identity verification, or external service health. The old mention of a `test_channels` live-network run is not a current smoke-test instruction. For current safe checks use `README.md` and `TEST-2-CHANNELS-NORMAL.md`.

# 🌊 WAVE 17 — PHOTO VALIDATION + SELFIE VERIFY + PWA (screenshot-standard)

**Date:** 2026-09-16 · **Branch:** `arena/01a0aaf1-matrimony-site` (branch-only, NO merge) ·
**Ref:** 7 user screenshots (family pills, about-min-50, add-photo benefits, validating, not-approved reasons, live-selfie verify, login keep-in)

**User rule:** "thappu photo iste asalu thiskovaddu — fully clear validate cheyali; correct aithe approve + thiskovali. Top matrimony em use chesthunnayo adi build cheyu."

## WHAT TOP SITES DO (idi mana build)

| Layer | Top sites | Mana build |
|-------|-----------|-----------|
| 1. Auto technical checks | resolution/blur/darkness/face/object AI | ✅ `backend/photo_validate.py` — PIL-only, deterministic, calibrated (no numpy/cv2 needed) |
| 2. Human moderation | photo review team | ✅ `/api/admin/photos/*` queue + `/admin/photos` UI + tab (Wave14: management inside ADMIN) |
| Wrong-photo reject | photo-of-photo / group / celebrity | ✅ auto (glare/frame/fake) + admin reject with Telugu reasons |
| Selfie verify | live selfie → badge | ✅ `/verify` + `/api/verify/selfie` → 🤳 badge on profile + cards |
| Trust order | strictest first | ✅ reject reasons ordered: format → size → resolution → dark/bright → flat → **glare/frame (true reason first)** → blur → density |

## VALIDATION PIPELINE (`photo_validate.py`)

- `LOW_RES` min side <350px · `TOO_DARK`/`TOO_BRIGHT` · `FLAT` (fake/blank) · `BLURRY` (Laplacian-var <250 @480px + JPEG-density <45 — calibrated sharp≈460/150+ vs blur≈230/<35) · `GLARE` (>12% hot pixels — flash/screen) · `PHOTO_OF_PHOTO` (dark frame bands + bright center) · `BAD_FORMAT`/`TOO_BIG`/`TOO_SMALL_FILE`
- Every verdict: `{ok, reason, en, te, checks{w,h,kb,blur_score,brightness,…}}` — admin sees scores (transparency).

## BACKEND (`main.py`, `interest.py`)

- `/api/photo/upload` — **validate BEFORE save**; fail → 422 + Telugu reason; pass → `photo_status=pending` (admin review).
- `/api/photo/status/{id}` — photo + selfie state (frontend screens).
- `/api/verify/selfie` — selfie upload (min 300px) → pending → admin approve → `selfie_verified` badge.
- `/api/admin/photos/pending` (first-name only, privacy) + `/api/admin/photos/review` (approve/reject + Telugu reason).
- Register: `family_status` canonical (`Middle Class / Upper Middle Class / Rich / Affluent (Elite)`) + legacy auto-map; `about_myself` min-50-if-present + **phone/email guard 400** (privacy — numbers ivvamu).
- `safe_user` gating: `photo_url` visible **only when approved**; + `photo_status`, `has_photo`, `selfie_verified`.

## FRONTEND (Duo EN+తెలుగు, maroon brand)

- `components/PhotoFlow.tsx` — benefits (90% / 10x) → Add photo now → Upload-validating spinner → approved / pending / **not-approved + reason + Add new photo + later** (screenshots 2–5). Embedded in register success + Skip.
- `app/verify/page.tsx` — Verify Profile + live-selfie card + pending/approved states (screenshot 6).
- `app/admin/photos/page.tsx` + admin **📸 Photo Review tab** — queue with check-scores, 1-click approve/reject + 5 Telugu reason templates.
- Register: family pills (3, screenshot 1) + about mandatory + live counter (`✓ n/600 · Minimum 50 characters`) + client contact-guard.
- Login: **Keep me logged in ✅** (default ON — Wave13 persist rule); OFF → sessionStorage (`api.ts` get/setToken dual-store + `getTsapId`).
- Badges: 🤳 Selfie Verified on ProfileView + matches cards.
- PWA (already installable — verified live): manifest standalone + icons + shortcuts, `sw.js` 200, `beforeinstallprompt` Telugu install banner, maroon theme-color → **phone home-screen lo app icon ✅**.

## TESTS — `test_wave17_full.py` → **46/46** ✅

A. 9 image variants (PIL-generated) → exact reasons + Telugu · B. upload strict + status · C. admin queue/approve/reject + selfie flow ·
D. family canonical/legacy/junk + about short/phone/email 400 · E. photo gating + profile fields · F. 10 frontend/PWA static checks.

## FULL REGRESSION → **1658 pass / 0 fail** ✅

wave9 203 · wave10 74 · wave11 87 · wave12 75 · wave13 105 · wave14 106 · wave15 54 · wave16 30 · **wave17 46** ·
router 60 · setup 84 · growth 138 · antiban 84 · privacy 53 · redundancy 53 · referral 145 · safety 70 · topmatch 61 · vendors 130
(historical script output; not a current external check).

## Historical local checks (not current production verification) (2026-09-16, fresh API pid 9989)

- `tsc` clean · `build` green 31 pages (incl. `/verify`, `/admin/photos`).
- `/verify` 200 · `/admin/photos` 200 · manifest + `sw.js` 200.
- Live: register (Bhongir, Upper Middle) → `TSAP-F-2025-1520` → sharp→`pending`, blur→`422 BLURRY`, status pending ✅.
- Live: admin review without key → **403** (lock works) ✅.

## PENDING (next)

BharatMatrimony HTML → homepage ideas mining (user-approved later scope).
