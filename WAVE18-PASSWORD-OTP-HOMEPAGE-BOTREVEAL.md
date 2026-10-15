# Historical implementation log — not current verification

> Archived 2026-09-16 notes from a different branch. Example profile IDs and demo/dev details below are historical, not live member records or current instructions. Reported pass counts, build output, process IDs, and “live proof” are not current evidence of deployment, identity verification, or external service health. The old mention of a `test_channels` live-network run is not a current smoke-test instruction. For current safe checks use `README.md` and `TEST-2-CHANNELS-NORMAL.md`.

# 🌊 WAVE 18 — PASSWORD LOGIN + FREE OTP + HOMEPAGE GROWTH + BOT REVEAL

**Date:** 2026-09-16 · **Branch:** `arena/01a0aaf1-matrimony-site` (branch-only, NO merge)

**User brief (paraphrased):** top-site standard homepage (success posts + blurred random profiles → register/login push);
login/register best + advanced; FREE OTP how?; number+password login + forgot/reset; register → ₹99 → 3 profiles (no numbers);
number via **"Full details + Number" button → Telegram bot → 1 credit cut**. Religions = Hindu/Muslim/Christian only.
(BharatMatrimony HTML attachments not present in sandbox — built from top-site patterns; mining still pending if re-uploaded.)

## 🔑 PASSWORD AUTH (new — OTP alternative)

- Register: `password` field (show/hide, min 6, max 72) — API optional (old clients/tests compat), UI mandatory.
- Hash: `pbkdf2-sha256 + salt, 120k rounds` (stdlib only) — plaintext **never stored** (tested).
- `POST /api/auth/login-password` — 5 wrong → 15-min lock (429) + OTP fallback hint.
- `POST /api/auth/forgot` (purpose=reset OTP) + `POST /api/auth/reset` (OTP + new password, clears lock).
- Login page: **🔑 Password | 📱 OTP tabs** + Forgot-password flow + Keep-logged-in + demo intact.

## 📱 FREE OTP — `backend/otp_channels.py` (honest chain)

| Priority | Channel | Cost | Needs |
|----------|---------|------|-------|
| 1 | WhatsApp bridge (fast lane) | **FREE** | `WHATSAPP_MODE=bridge` + connected |
| 2 | Telegram DM | **FREE** | `BOT_TOKEN` + user `/link` |
| 3 | SMS (MSG91/Fast2SMS) | trial free → ~₹0.15 | `MSG91_KEY`/`FAST2SMS_KEY` |
| 4 | DEV fallback | — | `OTP_DEV_MODE` (code in response) |

- Order via `OTP_CHANNELS` env; first success wins; `otp_send` returns `channel` + Telugu note.
- Register OTP step already existed (step 4) — now rides the same free chain.

## 🏠 HOMEPAGE GROWTH (`HomeGrowth.tsx` + `/api/home/teasers`)

- **Teasers:** random approved profiles, emoji-photo **blurred + 🔒 locked**, masked details, maroon "View full profile" → register.
  API returns `safe_user` only, `photo_url=""`, unapproved excluded (tested — zero PII leak).
- **Success stories:** live from `/api/stories` (CMS-approved) + link to `/stories`.
- **Religions:** Hindu 🕉️ / Muslim ☪️ / Christian ✝️ cards → `/castes` (3 only, per user scope).
- **Final CTA:** maroon band — Register FREE + Member Login push.
- Register success: **🔓 ₹99 ke Sambandham nudge → /pricing** (register → 3 FREE matches → ₹99 = 5 profiles + boost; numbers never free — consent/unlock only, standing rule intact).

## 📵 HISTORICAL BOT-LINK FLOW — NOT A CURRENT DESTINATION

- This archived note described a past unlock-through-bot concept. It is not a live integration, launch instruction, or evidence of external availability.
- `BOT_USERNAME` is blank by default in the current configuration. Do not construct a Telegram URL, publish a bot CTA, or substitute a guessed username; use the current website interest and consent flow instead.
- Any future bot contact must be explicitly configured and reviewed before it is shown to members. No automatic identity or delivery claim follows from this historical note.

## TESTS — `test_wave18_full.py` → **36/36** ✅

A. password 13 (hash/leak/short/login/lock/forgot/reset) · B. channels 7 (dev/bridge/tg/sms/order/api) ·
C–D. teasers 4 + bot parse 2 · E. frontend static 10.

## FULL REGRESSION → **1694 pass / 0 fail** ✅

wave9 203 · w10 74 · w11 87 · w12 75 · w13 105 · w14 106 · w15 54 · w16 30 · w17 46 · **w18 36** ·
router 60 · setup 84 · growth 138 · antiban 84 · privacy 53 · redundancy 53 · referral 145 · safety 70 · topmatch 61 · vendors 130
(historical script output; not a current external check).

## Historical local checks (not current production verification) (fresh API pid 11318)

- `tsc` clean · `build` green 31/31 · `/` 200 (retry; transient) · `/login` 200 · `/pricing` 200.
- Live: register+password → `TSAP-F-2025-4345` → pw-login ✅ → forgot (channel `dev`, purpose `reset`) ✅ →
  teasers 3, all blur, zero leak ✅.

## PENDING

BharatMatrimony HTML mining (attachments unavailable in sandbox — re-upload cheyandi if needed).
