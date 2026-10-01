# ROUTE_MAP.md — Full Route Inventory (Frontend + Backend)

Covers all 46 `frontend/src/app/**/page.tsx` routes and all 328 backend
`@app.get/post/put/patch/delete` registrations in `backend/main.py`
(~300 distinct endpoints; some paths have both a canonical route and a
short alias).

## Confirmed-correct redirects
| From | To | Mechanism | Verified |
|---|---|---|---|
| `/remarriage` | `/second-marriage` | `next.config.mjs` `redirects()`, 308 permanent (edge-level, not client JS) | `curl -D-` → `308`, `location: /second-marriage` |

## Frontend route inventory (`frontend/src/app/**/page.tsx`)

Access column: "Public" = no auth required to view; "Login-required" = page
itself (or the actions on it) requires a valid user token, enforced via the
`AuthGate` component client-side **and** the underlying API calls being
`require_owner`-gated server-side (client-side gating alone is never relied
on — see `SECURITY_AUDIT.md`); "Admin" = intended for staff/owner only.
Robots directive: centralized disallow list lives in `frontend/src/app/
robots.ts`; per-page `noindex,nofollow` is set via each page's `export const
metadata = { robots: { index: false, follow: false } }`.

| Route | Access | Robots directive | Purpose |
|---|---|---|---|
| `/` | Public | Index | Homepage |
| `/admin` | Admin | Disallow (robots.txt) | Legacy admin dashboard |
| `/admin/photos` | Admin | Disallow (robots.txt) | Photo moderation queue |
| `/biodata` | Public | Index | Biodata/PDF generator landing |
| `/blog` | Public | Index | Blog listing |
| `/blog/[slug]` | Public | Index | Blog post |
| `/bureau` | Public | Index | Matrimony bureau/assisted-matchmaking landing |
| `/castes` | Public | Index | Caste directory listing |
| `/castes/[slug]` | Public | Index | Per-caste landing page (SEO) |
| `/channels` | Public | Index | Telegram/WhatsApp channel directory |
| `/compare` | Public | Index | Side-by-side profile comparison tool |
| `/control` | Admin | Disallow (robots.txt) | Control Portal shell |
| `/control/legacy` | Admin (AuthGate) | Disallow (robots.txt) | Legacy control dashboard |
| `/control/login` | Admin | Disallow (robots.txt) | Control Portal login |
| `/control/workspace` | Admin | Disallow (robots.txt) | Control Portal workspace |
| `/districts` | Public | Index | District directory listing |
| `/growth` | Admin | Disallow (robots.txt) | Internal growth/ops dashboard |
| `/lagna-patrika` | Public | Index | Wedding invitation generator |
| `/login` | Public (noindex) | noindex,nofollow (page metadata) | OTP/password login |
| `/matches` | Login-required (AuthGate) | Index | Personalized matches dashboard |
| `/me` | Login-required (AuthGate, noindex) | noindex,nofollow (page metadata) | My profile / self dashboard |
| `/muhurtham` | Public | Index | Muhurtham (auspicious date) calculator |
| `/offline` | Public | Index | PWA offline fallback page |
| `/owner` | Admin (noindex) | noindex,nofollow (page metadata) | Owner-only private tools |
| `/p/[slug]` | Public | Index | CMS static page (terms/about/etc. by slug) |
| `/pelli-choopulu` | Public | Index | Pelli Choopulu (traditional meeting) guide |
| `/porutham` | Public | Index | Horoscope-matching (porutham) calculator |
| `/pricing` | Public | Index | Pricing plans |
| `/privacy` | Public | Index | Privacy policy |
| `/r/[code]` | Public | Index | Referral-link landing (redirects/attributes a referral code) |
| `/referral` | Public | Index | Referral program info |
| `/referral/register` | Public | Index | Referral-based registration |
| `/refund` | Public | Index | Refund policy |
| `/register` | Public | Index | New profile registration form |
| `/requests` | Login-required (AuthGate, noindex) | noindex,nofollow (page metadata) | Interest requests inbox |
| `/safety` | Login-required for actions (AuthGate) | Index | Trust & safety center (report/block) |
| `/search` | Public | Index | Search/browse profiles |
| `/search/[id]` | Public | Disallow (robots.txt — PII protection) | Individual profile detail page |
| `/second-marriage` | Public | Index | Second-marriage section |
| `/spotlight` | Public | Index | Spotlight/premium-placement profiles |
| `/stories` | Public | Index | Success stories |
| `/terms` | Public | Index | Terms of service |
| `/vendors` | Public | Index | Vendor directory (photographers/caterers/etc.) |
| `/vendors/[id]` | Public | Index | Vendor detail page |
| `/vendors/campaign` | Public | Index | Vendor ad campaign management |
| `/vendors/register` | Public | Index | Vendor signup |
| `/verify` | Login-required (noindex) | noindex,nofollow (page metadata) | Selfie/ID verification upload |

## Confirmed robots/indexation state (spot-verified)
| Route | robots meta | In sitemap.ts | Status |
|---|---|---|---|
| `/me` | `noindex,nofollow` | No | Correct |
| `/requests` | `noindex,nofollow` | No | Correct |
| `/admin`, `/admin/photos`, `/control`, `/growth` | N/A (robots.txt `Disallow`) | No | Correct |
| `/search/*` (individual profile pages) | N/A (robots.txt `Disallow: /search/`) | No | Correct (PII protection) |

---

# Backend API route inventory (`backend/main.py`)

**Auth column legend:** `owner` = `require_owner()` (caller must hold a valid token for the exact `tsap_id`/account being accessed — the fix for the Phase 12 critical IDOR); `admin` = `require_admin()` (X-Admin-Key / control-session with owner role); `admin(soft)` = `is_admin()` used for response-shaping (e.g. masking) rather than hard-blocking; `control-portal` = `_control_write_guard()` (Control Portal session with an allowed role); `vendor` = `require_vendor()` (vendor's own token); `automation-key` = `is_automation()` (TSAP_API_KEY, for the Telegram bot/bridge); `control-session` = gated via the `CONTROL_AUTH` session object; `—` = no explicit guard detected by this scan (**does not necessarily mean unprotected** — see note below).

**Important caveat on the `—` rows:** a blank Auth column means the automated regex scan didn't find one of the known guard-function names in the handler body — it does **not** mean the endpoint is unaudited or vulnerable. Every route in this file that returns private data (PII, tokens, payment info) has been manually reviewed as part of the Phase 12/13 security sweep (see `SECURITY_AUDIT.md`) and is either genuinely public-by-design (search/profile browsing, vendor directory, referral-link tracking, astrology/match-preview data, static content pages) or carries a guard this scan's keyword list didn't recognize (e.g. a guard called through a wrapper function). Treat this column as a fast triage aid, not a final verdict — cross-reference `SECURITY_AUDIT.md` for the actual per-endpoint security reasoning on anything sensitive.

**Total:** 328 route registrations across 88 domain groups.

---

## `/api/admin` — Admin Dashboard & Moderation (staff/owner only) (89)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/admin/abuse` | `admin_abuse` | admin | 🚨 Abuse dashboard — rate limits, OTP locks, webhook attacks, validation errors. |
| GET | `/api/admin/ads` | `api_admin_ads` | admin |  |
| GET | `/api/admin/ads/stats` | `api_admin_ads_stats` | admin |  |
| POST | `/api/admin/ads/{cid}/action` | `api_admin_ads_action` | admin |  |
| POST | `/api/admin/ads/{cid}/approve` | `api_admin_ads_approve` | admin |  |
| POST | `/api/admin/ads/{cid}/update` | `api_admin_ads_update` | admin | ADMIN: campaign dates/districts/days/content edit. |
| POST | `/api/admin/approve/{tsap_id}` | `admin_approve` | admin | Admin approve → auto-post to channels |
| GET | `/api/admin/assist-orders` | `api_assist_list` | admin |  |
| POST | `/api/admin/assist-orders` | `api_assist_create` | admin |  |
| POST | `/api/admin/assist-orders/{order_id}/paid` | `api_assist_paid` | admin |  |
| POST | `/api/admin/assist-orders/{order_id}/profiles` | `api_assist_attach` | admin |  |
| GET | `/api/admin/astro/queue` | `api_astro_queue` | admin |  |
| GET | `/api/admin/astro/stats` | `api_astro_stats` | admin, vendor |  |
| POST | `/api/admin/astro/verify/{jid}` | `api_astro_verify` | admin |  |
| GET | `/api/admin/audit` | `api_admin_audit` | admin, owner | 🌊 WAVE 26 — Money audit trail (admin): approve/pay/payout/refund history. |
| GET | `/api/admin/backup/export` | `api_admin_backup_export` | admin | 💾 WAVE 39 — anni data files ZIP download (ADMIN KEY ONLY). |
| POST | `/api/admin/backup/import` | `api_admin_backup_import` | admin | 💾 WAVE 39 — backup ZIP restore (ADMIN KEY ONLY). Body = zip bytes. |
| POST | `/api/admin/bulk-profiles` | `api_bulk_profiles` | admin |  |
| GET | `/api/admin/channels/coverage` | `api_admin_chan_coverage` | admin |  |
| POST | `/api/admin/channels/import` | `api_admin_chan_import` | admin | Bulk paste (`Label \| tg-link \| wa-link`) → fuzzy match → apply. |
| POST | `/api/admin/channels/link` | `api_admin_chan_link` | admin |  |
| GET | `/api/admin/channels/map` | `api_admin_chan_map` | admin |  |
| GET | `/api/admin/cms` | `api_admin_cms` | admin |  |
| POST | `/api/admin/cms/banners` | `api_admin_cms_banner` | admin |  |
| POST | `/api/admin/cms/delete` | `api_admin_cms_delete` | admin |  |
| POST | `/api/admin/cms/pages` | `api_admin_cms_page` | admin |  |
| POST | `/api/admin/cms/seed` | `api_admin_cms_seed` | admin |  |
| POST | `/api/admin/cms/stories` | `api_admin_cms_story` | admin |  |
| POST | `/api/admin/daily-matches` | `daily_matches_set` | admin | Admin — ఈ రోజు 'Matches of the Day' select → profiles vari caste channels lo post (boost). |
| GET | `/api/admin/daily-matches/candidates` | `daily_matches_candidates` | admin | Admin — candidates: ⚡ boost active (paid) users FIRST, then fresh registrations. |
| GET | `/api/admin/export/leads` | `api_admin_export_leads_alias` | admin |  |
| GET | `/api/admin/export/leads.csv` | `admin_export_leads` | admin, owner | 📤 ADMIN — leads sheet (name/phone/source/status). |
| GET | `/api/admin/export/payments` | `api_admin_export_payments_alias` | admin |  |
| GET | `/api/admin/export/payments.csv` | `admin_export_payments` | admin, owner | 📤 ADMIN — payments sheet (orders + status + UTR). |
| GET | `/api/admin/export/users` | `api_admin_export_users_alias` | admin |  |
| GET | `/api/admin/export/users.csv` | `admin_export_users` | admin, owner | 📤 ADMIN — FULL profiles sheet (Excel-ready CSV, Telugu BOM tho). |
| POST | `/api/admin/grant-plan` | `api_admin_grant_plan` | admin |  |
| POST | `/api/admin/link-telegram` | `api_admin_link_tg` | admin | 🔗 Admin manual link — buyer /myid chepthe ఇక్కడ link (DM delivery కోసం). |
| POST | `/api/admin/make_premium/{tsap_id}` | `admin_make_premium` | admin | Manual premium — admin gift |
| POST | `/api/admin/manual-plan-activate` | `api_admin_manual_plan_activate_body` | admin | ADMIN - Manual plan activation alias with payload body. |
| GET | `/api/admin/match-send/copy-list` | `api_copy_list` | admin | 📋 Admin 1-click copy — `NAME -- NUMBER` lines (manual paste కోసం). ADMIN-ONLY. |
| POST | `/api/admin/match-send/deliver` | `api_match_deliver` | admin |  |
| GET | `/api/admin/match-send/{buyer_id}` | `api_match_send` | admin |  |
| GET | `/api/admin/offers` | `api_admin_offers_list` | admin |  |
| POST | `/api/admin/offers` | `api_admin_offer_create` | admin |  |
| POST | `/api/admin/offers/seed` | `api_admin_offers_seed` | admin |  |
| DELETE | `/api/admin/offers/{code}` | `api_admin_offer_delete` | admin | 🎟️ ADMIN — promo/offer delete. |
| POST | `/api/admin/offers/{code}/toggle` | `api_admin_offer_toggle` | admin |  |
| GET | `/api/admin/payments` | `api_admin_payments` | admin |  |
| POST | `/api/admin/payments/{order_id}/confirm` | `api_admin_pay_confirm` | admin | Manual-UPI fallback: admin UTR verify చేసి confirm → fulfill. |
| POST | `/api/admin/payments/{order_id}/refund` | `api_admin_pay_refund` | admin | WAVE 34 PREMIUM - REAL refund: Razorpay API (auto) leda manual-UPI (note+proof). |
| GET | `/api/admin/payouts` | `admin_payout_list` | admin | 👮 Admin — payout queue (approve/reject). ADMIN_TOKEN set అయితే token కావాలి. |
| POST | `/api/admin/payouts/{request_id}/action` | `admin_payout_action` | admin | ✅ Approve (UTR required) leda ❌ Reject (wallet కి మళ్లీ credit). |
| GET | `/api/admin/photos/pending` | `admin_photos_pending` | admin | 📸 ADMIN — photo + selfie moderation queue (Layer-2 human review). |
| POST | `/api/admin/photos/review` | `admin_photos_review` | admin | 📸 ADMIN — approve/reject photo or selfie (wrong-person/group/celebrity → reject). |
| GET | `/api/admin/poster` | `api_admin_poster` | admin | Smart poster: queue + random-gap config + pause state (1 screen). |
| POST | `/api/admin/poster/gaps` | `api_admin_poster_gaps` | admin | Jitter range tune (seconds). Safe bounds enforce. |
| GET | `/api/admin/profiles` | `api_admin_profiles` | admin |  |
| POST | `/api/admin/profiles/{tsap_id}/activate-plan` | `api_admin_activate_plan` | admin | ADMIN - Manual plan activation (when user pays cash / direct UPI / phone call). |
| POST | `/api/admin/profiles/{tsap_id}/ban` | `api_admin_ban` | admin | ADMIN - profile ban (search/matches/channels నుంచి పోతుంది) + audit. |
| POST | `/api/admin/profiles/{tsap_id}/id-verification` | `api_admin_id_verification` | admin | Manual government-ID review. Stores only the decision metadata, never the ID number/image. |
| POST | `/api/admin/profiles/{tsap_id}/unban` | `api_admin_unban` | admin | ADMIN - unban + approve (malli live) + audit. |
| GET | `/api/admin/push/queue` | `admin_push_queue` | admin, owner |  |
| GET | `/api/admin/referrals/ledger` | `admin_referrals_ledger` | admin | 🤝🌊 WAVE 20 — ADMIN per-join commission drilldown: evaru join, eppudu, |
| GET | `/api/admin/referrals/partners` | `api_admin_referrals_partners_alias` | admin |  |
| GET | `/api/admin/referrals/partners.csv` | `admin_referrals_csv` | admin | 🤝 ADMIN — partners SHEET download (Excel/Sheets-ready CSV). |
| POST | `/api/admin/referrals/pay-full` | `admin_pay_wallet_full` | admin, owner | 🌊 WAVE 21 — ADMIN manual pay: PhonePe/bank lo amount pampaka → wallet ₹0. |
| GET | `/api/admin/referrals/report` | `admin_referrals_report` | admin | 🤝🌊 WAVE 19 ADMIN — ఎవరికీ entha + evari referral లో ఎవరు (partners + users, earning sort). |
| POST | `/api/admin/refund/{tsap_id}` | `admin_refund` | admin, owner |  |
| GET | `/api/admin/retention/preview` | `admin_retention_preview` | admin | 🗑️ Admin — 3-year policy: ye profiles delete avtayi (dry preview). |
| POST | `/api/admin/retention/run` | `admin_retention_run` | admin | 🗑️ Admin — retention run NOW (archive → delete → save). |
| POST | `/api/admin/seed-launch` | `api_seed_launch` | admin | Shortcut: demo profiles వెంటనే load (dev/preview కి). DEMO_SEED_ENABLED=false చేస్తే bandh. |
| POST | `/api/admin/showcase` | `showcase_set` | admin | Admin/Staff — ఈ వారం caste showcase set → ఆ caste channels lo post (bride + groom). |
| GET | `/api/admin/showcase/candidates` | `showcase_candidates` | admin | Admin/Staff — okka caste candidates (score + photo first). Rotation suggestion kooda. |
| GET | `/api/admin/spotlight/queue` | `admin_spotlight_queue` | admin | Admin / Staff — Review queue of paid spotlight submissions. |
| POST | `/api/admin/spotlight/{promo_id}/action` | `admin_spotlight_action` | admin | Admin / Staff — Approve, reject, or close a spotlight promotion. |
| GET | `/api/admin/stories` | `api_admin_stories` | admin | ADMIN - user success stories queue (approve -> /stories page + channels). |
| POST | `/api/admin/stories/{story_id}/action` | `admin_story_action` | admin, owner | 💑 Admin: story approve/reject (approve → share text ready). |
| POST | `/api/admin/upgrade-user` | `api_admin_grant_plan` | admin |  |
| POST | `/api/admin/users/{tsap_id}/force-logout` | `admin_force_logout` | admin | 🔐 Phase 14 — ADMIN: force-logout every session for a specific |
| GET | `/api/admin/vendors` | `admin_vendor_list` | admin | 👮 Admin — vendor requests queue (approve/reject). |
| GET | `/api/admin/vendors/revenue/summary` | `admin_vendor_revenue` | admin, owner | 💰 Vendor revenue: active, pipeline, MRR, leads, renewals due. |
| POST | `/api/admin/vendors/{vendor_id}/action` | `admin_vendor_action` | admin |  |
| POST | `/api/admin/vendors/{vendor_id}/token` | `admin_vendor_token` | admin |  |
| GET | `/api/admin/wa/numbers` | `admin_wa_numbers` | admin | 📱🌊 WAVE 19 ADMIN — 3 numbers health (otp/channels/personal lanes + orders + caps). |
| POST | `/api/admin/wa/numbers` | `admin_wa_number_add` | admin | 📱 ADMIN — number add (name, bridge url, lane, cap, token, number). |
| DELETE | `/api/admin/wa/numbers/{name}` | `admin_wa_number_delete` | admin | 📱 ADMIN — number remove. |
| POST | `/api/admin/wa/numbers/{name}` | `admin_wa_number_update` | admin | 📱 ADMIN — number update/pause/resume (url/lane/cap/token/number/paused). |
| GET | `/api/admin/whoami` | `admin_whoami` | admin | 👤 WAVE 41 — current role: owner (full) \| staff (limited tabs). Frontend tab gating. |

## `/api/ads` — Ads / Sponsored Listings (5)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/ads` | `api_ads_serve` | vendor | 🎯 Targeted ad serve (slot + user district/state). No ad → house promo signal. |
| GET | `/api/ads/list` | `api_ads_list` | — | Targeted multiple ads for district/state/slot. |
| POST | `/api/ads/quote` | `api_ads_quote` | vendor |  |
| GET | `/api/ads/rates` | `api_ads_rates` | vendor | 💰 Public ad rates (vendor ki mundhe telustundi). |
| POST | `/api/ads/{cid}/click` | `api_ads_click` | admin, vendor |  |

## `/api/astro` — Astrology (dosha, rasi chart, jathakam) (7)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/astro/chart` | `api_astro_chart_default` | — |  |
| GET | `/api/astro/chart/{tsap_id}` | `api_astro_chart` | owner | 🗺️ Rasi katam data — South-Indian fixed chart (Moon house = stored rasi). |
| GET | `/api/astro/dosha/{tsap_id}` | `api_dosha` | owner | 🔍 Dosha screening — profile కి దోషం unda/leda (honest flags). |
| GET | `/api/astro/guna` | `api_guna` | — | 🪐 36-guna jathakam గుణమేళనం — 2 profile IDs (gender auto-detect + swap). |
| POST | `/api/astro/jathakam/upload` | `api_jathakam_upload` | admin, owner | 📜 Jathakam upload (photo/PDF, max 8MB) → pandit queue. |
| GET | `/api/astro/muhurtham` | `api_astro_muhurtham` | — | Returns auspicious marriage muhurtham timings. |
| GET | `/api/astro/report/download` | `api_download_astro_report` | — | 📜 Official Vedic Gunamelanam & Horoscope Matching PDF Certificate Download. |

## `/api/auth` — Authentication (OTP, password login/reset, demo token) (6)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/auth/demo-token` | `auth_demo_token` | owner |  |
| POST | `/api/auth/forgot` | `auth_forgot` | — | 🔑 Forgot password — reset OTP (purpose=reset) pampistham. |
| POST | `/api/auth/login-password` | `auth_login_password` | — | 🔑 Number + password login (OTP alternative). 5 wrong → 15 min lock. |
| POST | `/api/auth/logout-everywhere` | `auth_logout_everywhere` | admin, owner | 🔐 Phase 14 — user-initiated "log out of all devices": invalidates |
| POST | `/api/auth/reset` | `auth_reset` | — | 🔑 Reset password — OTP verify + కొత్త password set. |
| GET | `/api/auth/verify` | `auth_verify` | admin(soft), owner | Token valid aa? Frontend login state కి (ఎవరికీ token undo cheptundi, PII లేదు). |

## `/api/block` — Block a profile (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/block` | `api_block` | owner | 🚫 Block — safety first (blocked వల్ల profile/interest రెండు vaipula hide అవుతాయి). |

## `/api/blocks` — List blocks (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/blocks/{tsap_id}` | `api_blocks` | owner |  |

## `/api/blog` — Blog (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/blog` | `api_blog_posts` | — | Returns blog articles and matrimony safety advice. |

## `/api/boost` — Profile Boost (paid visibility) (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/boost/buy` | `boost_buy` | owner |  |
| GET | `/api/boost/packs` | `boost_packs` | owner | ⚡ Boost packs list (B_1/B_3/B_7) + మీ boost status కోసం ?tsap_id=. |

## `/api/bot` — Telegram Bot integration (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/bot/matches` | `api_bot_matches` | admin | Telegram bot /matches command కి: age-rule + profession-first top-3. |

## `/api/bots` — Bot management (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/bots/health` | `bots_health` | admin | 🤖 Telegram bots health + failover order (primary → backup → alert). |

## `/api/castes` — Caste directory pages (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/castes` | `api_castes_list` | — | Returns all 43 Telugu castes with counts and category groupings. |

## `/api/channels` — Channel routing (Telegram/WhatsApp auto-post) (8)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/channels` | `channels` | — | FULL master registry — 52 channels (L0 Official → L4 Special, caste clusters × bride/groom). |
| GET | `/api/channels/join` | `api_channels_join` | admin | Public: Join buttons కి admin-mapped telegram/whatsapp links (active vi మాత్రమే). |
| GET | `/api/channels/links` | `channels_links` | owner |  |
| GET | `/api/channels/live` | `channels_live` | — |  |
| GET | `/api/channels/photo/{key}.png` | `channel_photo` | — | Channel DP (512x512) — website లో channel card కి + Telegram setChatPhoto కి same file. |
| POST | `/api/channels/route` | `channels_route` | admin(soft) |  |
| GET | `/api/channels/setup-plan` | `channels_setup_plan` | — | Channel create plan (wave order) + caste×gender coverage + health — launch/growth dashboard కి. |
| GET | `/api/channels/{key}/kit` | `channel_kit` | — | ఒక్క channel కి full kit — description + 📌 pinned post + rules + share text (website నుంచి copy). |

## `/api/cms` — CMS (editable site content) (5)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/cms/banners` | `api_cms_banners` | admin |  |
| GET | `/api/cms/pages` | `api_cms_pages` | admin |  |
| GET | `/api/cms/pages/{slug}` | `api_cms_page` | admin |  |
| GET | `/api/cms/stories` | `api_cms_stories` | admin |  |
| GET | `/api/cms/tags` | `api_cms_tags` | admin |  |

## `/api/consent` — Consent ledger (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/consent/log/{tsap_id}` | `consent_log_endpoint` | admin, owner |  |

## `/api/control` — Control Portal (private admin SPA backend) (26)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/control/ads` | `control_ads_list` | control-portal, control-session | Control Portal: All ad campaigns with district/state targeting & metrics. |
| POST | `/api/control/ads/create` | `control_ads_create` | control-portal | Control Portal: Admin instant targeted ad creation for district/state/all. |
| POST | `/api/control/ads/{cid}/action` | `control_ads_action` | control-portal, control-session | Control Portal: Admin ad actions (approve/pause/resume/expire/extend). |
| GET | `/api/control/analytics` | `control_analytics` | control-session | Rich, privacy-safe operations analytics for the advanced dashboard. |
| GET | `/api/control/astro-check` | `control_astro_check` | control-session | Control Portal: Vedic 36-Gunas & 10-Koota Astro Match Calculator for phone counselors. |
| GET | `/api/control/castes` | `control_castes_list` | control-session | Control Portal: Castes & Community Hubs overview with counts and subcastes. |
| GET | `/api/control/demand-matrix` | `control_demand_matrix` | control-session | Control Portal: Caste Demand & Gender Supply Balance Matrix. |
| GET | `/api/control/directory` | `control_directory` | control-session |  |
| GET | `/api/control/high-intent-leads` | `control_high_intent_leads` | control-portal, control-session | Control Portal: High-intent unpaid leads with ready-to-dispatch discount offers. |
| POST | `/api/control/login` | `control_login` | control-session |  |
| POST | `/api/control/logout` | `control_logout` | control-session |  |
| GET | `/api/control/matchmaker/{profile_id}` | `control_matchmaker` | control-session |  |
| GET | `/api/control/me` | `control_me` | control-session |  |
| GET | `/api/control/payouts/queue` | `control_payouts_queue` | control-portal, control-session | Control Portal: Queue of referral payout withdrawal requests. |
| POST | `/api/control/payouts/{request_id}/action` | `control_payout_action` | control-portal, control-session | Control Portal: Approve (with UTR) or reject a referral payout request (CSRF authed). |
| GET | `/api/control/profile-queue` | `control_profile_queue` | control-portal, control-session | Safe operations queue. This endpoint deliberately has no phone/email/payment fields. |
| POST | `/api/control/profile/{tsap_id}/action` | `control_profile_action` | control-portal, control-session | Worker/owner: approve (auto-post) or reject a profile. Session + CSRF authed. |
| POST | `/api/control/profile/{tsap_id}/counselor-note` | `control_add_counselor_note` | control-portal, control-session | Admin/Worker Counselor Log: add timestamped call notes, interaction status & next callback date. |
| GET | `/api/control/profile/{tsap_id}/counselor-notes` | `control_get_counselor_notes` | control-portal, control-session | Get all counselor notes and interaction history for a profile. |
| POST | `/api/control/profile/{tsap_id}/upgrade` | `control_profile_upgrade` | control-portal | Admin/Worker: 1-Click Upgrade ANY profile to Verified/Premium Plan (offline/QR/PhonePe/GPay/Complimentary). |
| POST | `/api/control/profiles/add` | `control_add_profile` | control-portal | Control Portal: Admin instant profile creator for any caste. |
| GET | `/api/control/reports` | `control_reports` | control-portal, control-session | Moderation queue for the control portal (session-authed). |
| POST | `/api/control/reports/{report_id}/resolve` | `control_report_resolve` | control-portal, control-session | Resolve a report from the control portal (session + CSRF authed). |
| GET | `/api/control/spotlight/queue` | `control_spotlight_queue` | control-portal, control-session | Control Portal: Queue of paid 'Profiles of the Day' promotions for review & moderation. |
| POST | `/api/control/spotlight/{promo_id}/action` | `control_spotlight_action` | control-portal, control-session | Control Portal: Approve, reject, or close a paid spotlight promotion (CSRF authed). |
| GET | `/api/control/summary` | `control_summary` | control-session |  |

## `/api/credits` — Credits / wallet (3)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/credits/buy` | `credits_buy` | owner |  |
| POST | `/api/credits/deduct/{tsap_id}` | `deduct_credit_api` | owner |  |
| GET | `/api/credits/{tsap_id}` | `credits_endpoint` | owner |  |

## `/api/daily-matches` — Daily match digest (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/daily-matches` | `daily_matches_public` | admin | 🗓️ Public — ఈ రోజు featured profiles (admin select chesina 'Matches of the Day'). |

## `/api/demo` — Demo mode (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/demo/seed` | `demo_seed` | admin |  |

## `/api/digest` — Digest/notification batching (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/digest/preview` | `digest_preview` | admin |  |

## `/api/districts` — District directory pages (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/districts` | `api_districts_stats` | — | Returns active district breakdown across Telangana and Andhra Pradesh. |
| GET | `/api/districts/stats` | `api_districts_stats` | — | Returns active district breakdown across Telangana and Andhra Pradesh. |

## `/api/facets` — Search facets (filter options) (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/facets` | `search_facets_endpoint` | owner | 🔎 Search UI chips కి counts (caste/district/education/job) — advanced filter UX. |

## `/api/featured` — Featured profiles (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/featured/caste-showcase` | `api_featured_caste_showcase` | admin | Alias for weekly showcase. |

## `/api/free-plan` — Free plan info (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/free-plan` | `free_plan_clarity` | — |  |

## `/api/gothram` — Gothram directory (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/gothram/check` | `gothram_check` | owner | 🛡️ రెండు IDs madhya గోత్రం check — same అయితే పెళ్లి కూడదు (block). |

## `/api/health` — Health check (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/health` | `api_health` | admin, owner | 🌊 WAVE 26 — EASY debug: server live? data ok? workers on? (no secrets). |

## `/api/home` — Homepage data (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/home/teasers` | `home_teasers` | — | 🏠 Homepage teaser profiles — RANDOM approved, safe_user only (blur+lock frontend lo). |

## `/api/interest` — Interest (send/accept/decline — the core matchmaking action) (5)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/interest/inbox/{tsap_id}` | `interest_inbox` | owner |  |
| POST | `/api/interest/respond` | `interest_respond` | owner | Owner accept/decline. Accept → రెండు numbers WhatsApp లో (consent based). Decline → credit refund. |
| POST | `/api/interest/send` | `interest_send` | owner |  |
| GET | `/api/interest/sent/{tsap_id}` | `interest_sent` | owner |  |
| GET | `/api/interest/status/{request_id}` | `interest_status` | owner |  |

## `/api/inventory` — Profile inventory (seed/demo data status) (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/inventory` | `api_inventory` | admin | Launch readiness — '300-400 profiles చాలు' gauge + ఎలా fill cheyyalo. |

## `/api/lagna-patrika` — Lagna Patrika (invitation) generator (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/lagna-patrika/generate` | `api_generate_lagna_patrika` | — |  |

## `/api/leads` — Vendor leads (4)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/leads` | `api_leads` | admin, admin(soft) | Admin — leads list (follow-up కి). Deploy లో ADMIN_TOKEN env తో protect చెయ్యాలి. |
| POST | `/api/leads/followup/{lead_id}` | `api_lead_followup` | admin | Lead కి WhatsApp follow-up pampu (మన side నుంచి). |
| POST | `/api/leads/quick` | `api_lead_quick` | admin |  |
| GET | `/api/leads/stats` | `api_lead_stats` | admin, admin(soft) | Traffic + conversion dashboard: visits, channels, top pages, lead sources, inventory. |

## `/api/legal` — Legal/acceptance records (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/legal/acceptance` | `api_legal_acceptance` | admin | 🛡️ Verified legal acceptance & ownership details. |

## `/api/link-telegram` — Link Telegram account (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/link-telegram` | `api_link_telegram` | automation-key, owner | 🔗 Bot /link — Telegram chat_id ni profile tho link (personal delivery kosam). |

## `/api/match` — Match compatibility (single pair) (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/match/score` | `api_match_score` | owner |  |
| POST | `/api/match/score` | `api_match_score_raw` | owner | Raw dicts తో score (frontend preview / admin tools కి). |

## `/api/matches` — Matches listing (smart alerts, partner-preferred, etc.) (6)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/matches/compare-profiles` | `api_compare_profiles` | — | Compares 2-3 Telugu candidate profiles side-by-side with Gunamelanam, education, salary, etc. |
| GET | `/api/matches/compatibility-radar/{applicant_id}/{candidate_id}` | `api_compatibility_radar` | — |  |
| GET | `/api/matches/partner-preferred` | `get_partner_preferred_matches` | — | Returns all profiles matching user's saved partner preferences. |
| GET | `/api/matches/smart-alerts` | `smart_matches_alerts` | — | 🔔 Smart Match Alerts & Re-engagement Digest Engine (High Compatibility, Fresh Joins, WhatsApp Reminders). |
| GET | `/api/matches/{tsap_id}` | `get_matches` | — |  |

## `/api/meta` — Metadata (site meta/robots/sitemap helpers) (3)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/meta/castes` | `api_meta_castes` | — |  |
| GET | `/api/meta/home-stats` | `api_meta_home_stats` | — | 🌊 WAVE 30 — homepage live numbers (NO DUMMY): channels + castes + plans + referral + bureau. |
| GET | `/api/meta/religions` | `api_meta_religions` | — |  |

## `/api/moderation` — Content moderation queue (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/moderation/queue` | `api_moderation_queue` | admin, owner |  |
| POST | `/api/moderation/resolve/{report_id}` | `api_moderation_resolve` | admin, owner |  |

## `/api/offers` — Promotional offers (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/offers/active` | `api_offers_active` | admin | Public: live festival offers (homepage banner కి). |

## `/api/og` — Open Graph image generation (share cards) (6)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/og/porutham/{bride}/{groom}.png` | `api_og_porutham` | — |  |
| GET | `/api/og/porutham/{pair_slug}` | `api_og_porutham_slug` | admin | Handles porutham slug preview e.g. /api/og/porutham/TSAP-F-1042_TSAP-M-2042 |
| GET | `/api/og/profile/{tsap_id}` | `api_og_profile_alias` | admin | Alias for /api/og/profile/{tsap_id}.png |
| GET | `/api/og/profile/{tsap_id}.png` | `api_og_profile` | — |  |
| GET | `/api/og/site` | `api_og_site_alias` | admin | Alias for /api/og/site.png |
| GET | `/api/og/site.png` | `api_og_site` | — |  |

## `/api/otp` — OTP send/verify (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/otp/send` | `otp_send` | — |  |
| POST | `/api/otp/verify` | `otp_verify` | — |  |

## `/api/owner` — Owner-only private tools (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/owner/summary` | `api_owner_summary` | admin | 👑 Owner business summary — ADMIN KEY ONLY (revenue/funnel/system). |

## `/api/pay` — Payments (UPI QR, order creation/status) (8)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/pay/claim` | `api_pay_claim` | admin, owner | 🌊 WAVE 25 — USER submits UTR in-app (claim ≠ confirm — admin verifies statement). |
| GET | `/api/pay/config` | `api_pay_config` | owner | Public: Razorpay key_id (publishable) + plans + active offers. Secret NEVER. |
| POST | `/api/pay/order` | `api_pay_order` | owner | Create pay order — amount SERVER computes (client amount trust cheyyam). |
| GET | `/api/pay/qr/{order_id}` | `api_pay_qr_alias` | admin | Alias for /api/pay/qr/{order_id}.png |
| GET | `/api/pay/qr/{order_id}.png` | `api_pay_qr_png` | admin | 📱 Generates a crisp, scannable UPI QR code PNG for any payment order. |
| GET | `/api/pay/status/{order_id}` | `api_pay_status` | owner |  |
| POST | `/api/pay/verify` | `api_pay_verify` | owner | Razorpay verify → signature OK అయితే ONLY fulfill. Idempotent. |
| POST | `/api/pay/webhook` | `api_pay_webhook` | admin | 🌊 WAVE 25 — Razorpay webhook: HMAC verify → auto-fulfill (signature = auth). |

## `/api/payment` — Payment webhook/confirmation (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/payment/webhook` | `payment_webhook` | — |  |

## `/api/photo` — Photo upload & status (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/photo/status/{tsap_id}` | `photo_status` | owner | 📸 Photo + selfie verification status (frontend screens: validating/approved/not-approved). |
| POST | `/api/photo/upload` | `photo_upload` | owner |  |

## `/api/plans` — Pricing plans (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/plans` | `plans_endpoint` | owner | Pricing ladder: FREE 3 → ₹99=5 → ₹199=12 → ₹299=25 → ₹499=50 (VIP) + add-ons. |

## `/api/platform` — Platform-level status (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/platform/stats` | `api_platform_stats` | — | Returns live public platform stats for homepage tickers and trust badges. |

## `/api/porutham` — Porutham (horoscope matching) calculator (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/porutham` | `porutham_by_id` | — |  |
| POST | `/api/porutham` | `porutham_raw` | — | Star/రాశి direct గా isthe కూడా calculate చేస్తుంది (register cheyyakunda test కి). |

## `/api/profile` — Single profile detail/update/quality (7)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/profile/complete-bonus/{tsap_id}` | `complete_bonus` | owner | 🎮 Profile 90%+ → 2 credits FREE (okasari మాత్రమే — gamification). |
| GET | `/api/profile/preferences` | `get_partner_preferences` | owner | Fetches user's saved partner preferences, default smart suggestions, and live match count. |
| POST | `/api/profile/preferences` | `save_partner_preferences` | owner | Saves user's custom multi-select partner preferences (Castes, Subcastes, Age, Height, Education, Jobs, Dist... |
| POST | `/api/profile/update` | `update_user_profile` | owner | Allows user to update profile anytime, increasing completeness to 100%. |
| GET | `/api/profile/{tsap_id}` | `get_user_profile_for_edit` | owner | Fetch full profile data for self-editing and view completeness meter. |
| POST | `/api/profile/{tsap_id}/delete` | `delete_user_account` | owner | User self-service account deletion & marriage fixed celebration flow. |
| GET | `/api/profile/{tsap_id}/quality` | `profile_quality` | — | ⭐ Profile completeness % + trust score + Telugu next steps (register/profile improve కి). |

## `/api/profiles` — Profiles listing (similar profiles) (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/profiles/{tsap_id}/similar` | `similar_profiles` | — | Privacy-safe alternatives ranked by caste, location, age, job and education. |

## `/api/promo` — Vendor promo content generator (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/promo/apply` | `api_promo_apply` | admin | 🎟️ Promo preview — pay కి ముందు discount chudu (public, no charge). |

## `/api/publish` — Auto-publish worker status/control (5)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/publish/digest` | `publish_digest` | admin | Digest ని Telegram live channels + WhatsApp queue కి (anti-ban gap తో) pampu. |
| GET | `/api/publish/log` | `publish_log_endpoint` | admin, admin(soft) | ఈ varaku publish అయిన profiles log (audit). 🔒 WAVE 9: public కి PII mask. |
| POST | `/api/publish/now/{tsap_id}` | `publish_now` | admin | Manual re-post (admin) — already register అయిన profile ని మళ్లీ channels కి pampu. |
| POST | `/api/publish/preview` | `publish_preview` | — | Post avvakunda — caption + WhatsApp text + targets chudu. |
| GET | `/api/publish/status` | `publish_status_endpoint` | admin, admin(soft) | Telegram + WhatsApp auto-publish status (dry-run? tokens unnai? enni targets?). |

## `/api/push` — Push notifications (4)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/push/notify/{tsap_id}` | `push_notify` | admin, admin(soft), owner | 🔔 Notify pampu — owner (self digest) leda admin (broadcast). |
| POST | `/api/push/subscribe` | `push_subscribe` | admin, admin(soft), owner | 🔔 Browser push subscribe (matches page 🔔 button నుంచి). |
| POST | `/api/push/unsubscribe` | `push_unsubscribe` | admin, admin(soft), owner |  |
| GET | `/api/push/vapid` | `push_vapid` | admin(soft), owner | 🔔 VAPID public key (browser subscribe కి) — keys lekapothe preview mode. |

## `/api/recently-viewed` — Recently viewed profiles (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/recently-viewed/{viewer_id}` | `recently_viewed_profiles` | owner | Profiles this member viewed recently — private, deduplicated, safe fields only. |

## `/api/referral` — Referral program (codes, clicks, payouts, share-kit) (18)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/referral/click/{code}` | `referral_click` | owner | /r/<code> link click — funnel tracking (clicks → registrations → payments). |
| GET | `/api/referral/earnings-card` | `referral_earnings_card_public` | — |  |
| GET | `/api/referral/leaderboard` | `leaderboard` | — | 🏆 Top referrers — period: all \| week \| month \| today (telugu labels తో). |
| GET | `/api/referral/lookup` | `referral_lookup` | — | Quick lookup by mobile phone number, TSAP ID, or referral code. |
| POST | `/api/referral/partner/click/{pid}` | `referral_partner_click` | admin | 🤝 Partner link click tracking. |
| POST | `/api/referral/partner/payout` | `referral_partner_payout` | admin | 🤝 Partner payout request (wallet → UPI/bank, min ₹100). No login — phone OTP verify. |
| POST | `/api/referral/partner/register` | `referral_partner_register` | — | 🤝🌊 WAVE 19 — Partner profile create (name/phone/phonepe/address/state/district) → ID + link + sheet. |
| GET | `/api/referral/partner/{pid}` | `referral_partner_public` | admin | 🤝 Partner dashboard (public-safe): link + joins + earnings. |
| POST | `/api/referral/payout` | `referral_payout` | owner |  |
| GET | `/api/referral/terms` | `referral_terms` | owner | 📜 Referral rules (Telugu) — అందరికీ ₹50, tiers, payout, fraud rules. |
| GET | `/api/referral/validate/{code}` | `referral_validate` | owner | Register form / landing page — 'ee code pani chestunda?' + bonus info. |
| GET | `/api/referral/{tsap_id}` | `referral_home` | owner |  |
| GET | `/api/referral/{tsap_id}/earnings-card.png` | `referral_earnings_card_user` | — | 🖼️ User tsap_id referral earnings proof card (live wallet/stats నుండి auto-generate). |
| GET | `/api/referral/{tsap_id}/fraud-check` | `referral_fraud_check` | admin, owner | 🕵️ Self-check: మీ account లో emanna referral issue unda? |
| GET | `/api/referral/{tsap_id}/payouts` | `referral_payouts` | admin, owner | మీ payout history — request → paid/rejected + UTR. |
| GET | `/api/referral/{tsap_id}/poster` | `api_referral_poster_alias` | — |  |
| GET | `/api/referral/{tsap_id}/poster.png` | `referral_poster` | — | 🖼️ Referral poster (QR తో) — square (1080×1080) leda status (1080×1920). |
| GET | `/api/referral/{tsap_id}/share-kit` | `referral_share` | — | 📲 5 ready WhatsApp messages + Telegram + SMS + poster text (Telugu). |

## `/api/remarriage` — Second-marriage/remarriage section (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/remarriage/profiles` | `api_second_marriage_profiles` | — | Returns verified remarriage / second marriage profiles. |

## `/api/report` — Report a profile (trust & safety) (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/report` | `api_report` | admin, owner |  |

## `/` — Root / service info (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/` | `root` | — |  |

## `/api/safety` — Safety center info (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/safety/tips` | `api_safety_tips` | admin, owner |  |

## `/api/save` — Save/shortlist a profile (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/save` | `toggle_save` | owner | ❤️ Shortlist — profile save/remove (top matrimony sites లో idi must feature). |

## `/api/saved` — Saved profiles listing (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/saved/{tsap_id}` | `saved_list` | owner |  |

## `/api/saved-searches` — Saved search alerts (4)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/saved-searches` | `saved_search_create` | owner | 🔔 Search save చెయ్యండి — కొత్త profiles వస్తే WhatsApp alert (advanced feature). |
| GET | `/api/saved-searches/{tsap_id}` | `saved_search_list` | owner |  |
| POST | `/api/saved-searches/{tsap_id}/alerts` | `saved_search_alerts` | owner | కొత్త matches ని WhatsApp కి pampu (anti-ban gap తో) — 'saved search alert'. |
| DELETE | `/api/saved-searches/{tsap_id}/{search_id}` | `saved_search_delete` | owner |  |

## `/api/search` — Search (the core profile-browse feature) (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/search` | `advanced_search` | — |  |
| GET | `/api/search/{tsap_id}` | `search_profile` | — |  |

## `/api/second-marriage` — Second-marriage section (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/second-marriage/profiles` | `api_second_marriage_profiles` | — | Returns verified remarriage / second marriage profiles. |

## `/api/security` — Security posture/abuse snapshot (admin) (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/security/posture` | `security_posture_endpoint` | admin(soft) | Public security posture (trust page కి): auth, headers, rate limit, numbers policy. |

## `/api/share` — Share-kit (WhatsApp/social share assets) (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/share/kit/{tsap_id}` | `api_share_kit` | admin |  |

## `/api/showcase` — Weekly/featured showcase (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/showcase` | `showcase_public` | admin | 🎊 Public — ఈ వారం caste showcase (ఆ caste best profiles). |
| GET | `/api/showcase/caste` | `api_featured_caste_showcase` | admin | Alias for weekly showcase. |

## `/api/smart-alerts` — Smart match alerts (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/smart-alerts` | `smart_matches_alerts` | — | 🔔 Smart Match Alerts & Re-engagement Digest Engine (High Compatibility, Fresh Joins, WhatsApp Reminders). |

## `/api/spotlight` — Spotlight (premium placement) (5)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/spotlight/active` | `spotlight_active` | — | Public — Live & approved Profiles of the Day for Homepage & Matches. |
| POST | `/api/spotlight/apply` | `spotlight_apply` | — | Registered user applies for paid spotlight promotion. |
| GET | `/api/spotlight/rates` | `spotlight_rates` | — | Public — Spotlight / Profiles of the Day tier rates & perks. |
| GET | `/api/spotlight/today` | `spotlight_active` | — | Public — Live & approved Profiles of the Day for Homepage & Matches. |
| POST | `/api/spotlight/track/{promo_id}` | `spotlight_track` | admin | Track view/click/interest for analytics. |

## `/api/stats` — Public stats counters (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/stats` | `api_platform_stats` | — | Returns live public platform stats for homepage tickers and trust badges. |

## `/api/stories` — Success stories (3)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/stories` | `stories_list` | admin, owner | 💑 Approved success stories (public — trust + viral, numbers లేదు). |
| POST | `/api/stories/submit` | `story_submit` | admin, owner | 💑 పెళ్లి అయిన janta success story pampu (admin approve తర్వాత public). |
| POST | `/api/stories/{story_id}/like` | `story_like` | admin, owner |  |

## `/api/streak` — Engagement streak gamification (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/streak/claim` | `streak_claim` | owner | 🔥 Daily bonus claim — rojoo okasari (streak penchithe bonus ఎక్కువ). |
| GET | `/api/streak/{tsap_id}` | `streak_get` | owner | 🔥 Streak status (count, best, repu bonus). |

## `/api/support` — Support/contact (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/support/faq` | `support_faq` | owner | 💬 Telugu support Q&A — ?q=price అని search (widget + bot common). |

## `/api/system` — System status (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/system/health` | `system_health` | admin |  |

## `/api/templates` — Message templates (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/templates/interest` | `interest_template_list` | owner | 💬 Ready-made Telugu interest messages (spam తక్కువ, response ఎక్కువ). |

## `/api/top-matches` — Top matches for a profile (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/top-matches` | `api_top_matches_default` | — |  |
| GET | `/api/top-matches/{tsap_id}` | `api_top_matches` | owner |  |

## `/api/track` — Analytics tracking pixel (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/track` | `api_track` | — |  |

## `/api/trust` — Trust score (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/trust/board` | `trust_board` | — | 🏅 Public trust leaderboard — complete + verified profiles (encourages form fill). |

## `/api/unblock` — Unblock a profile (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/unblock` | `api_unblock` | owner |  |

## `/api/unlock` — Unlock a contact (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/unlock` | `api_unlock` | admin, owner |  |

## `/api/unlocks` — Unlocks listing (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/unlocks/{viewer_id}` | `api_my_unlocks` | admin, owner | 📋 నా unlocked list — MASKED (full number per-unlock మాత్రమే, logged). |

## `/api/user` — User account actions (delete, etc.) (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/user/delete-account` | `delete_user_account` | owner | User self-service account deletion & marriage fixed celebration flow. |

## `/api/vendors` — Vendor directory (photographers/caterers/etc. marketplace) (15)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/vendors` | `vendor_list` | — |  |
| GET | `/api/vendors/ads` | `vendor_ads` | — | 📢 Ad rotation (paid-first weighted). Site home/strips లో vaadutunnam. |
| GET | `/api/vendors/categories` | `vendor_categories` | — | 18 vendor categories (Telugu names తో) + active counts. |
| GET | `/api/vendors/packages` | `vendor_packages` | — | 🏷️ Ad packages (₹149 నుంచి ₹3999) + add-ons + slots. |
| POST | `/api/vendors/register` | `vendor_register` | — |  |
| GET | `/api/vendors/stats` | `vendor_stats_api` | — |  |
| GET | `/api/vendors/{vendor_id}` | `vendor_detail` | vendor | 🏪 Vendor public detail (contact WhatsApp CTA తో). |
| GET | `/api/vendors/{vendor_id}/campaigns` | `api_vendor_campaigns` | admin, vendor |  |
| POST | `/api/vendors/{vendor_id}/campaigns` | `api_vendor_campaign_create` | admin, vendor | 📢 Vendor campaign request (payment + admin approve తర్వాత live). |
| POST | `/api/vendors/{vendor_id}/click` | `vendor_click` | admin |  |
| GET | `/api/vendors/{vendor_id}/dashboard` | `vendor_dash` | vendor | 📊 Vendor performance: impressions, clicks, enquiries, days left, upsell. |
| POST | `/api/vendors/{vendor_id}/lead` | `vendor_lead_api` | — | 📩 Enquiry → vendor కి instant WhatsApp + admin alert (+ customer ko 3 more options). |
| GET | `/api/vendors/{vendor_id}/poster` | `vendor_poster_alias` | — |  |
| GET | `/api/vendors/{vendor_id}/poster.png` | `vendor_poster_png` | — | 🖼️ Vendor promo poster (QR తో) — square / status. |
| GET | `/api/vendors/{vendor_id}/promo` | `vendor_promo` | — | 📝 Telugu promo post (Telegram + WhatsApp ready) + poster text. |

## `/api/verification` — Verification badge status (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/verification/{tsap_id}` | `api_verification` | owner |  |

## `/api/verify` — Selfie/identity verification upload (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/verify/request` | `api_verify_request` | owner | Phone / Photo / ID verification level penchadam (photo/ID కి admin approve కావాలి — dev లో auto). |
| POST | `/api/verify/selfie` | `verify_selfie` | admin, owner | 🤳 Live-selfie verification upload — technical checks + admin review → trust badge. |

## `/api/view` — Record a profile view (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/view` | `record_view` | owner |  |

## `/api/views` — Views listing (1)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/views/{tsap_id}` | `views_for` | owner |  |

## `/api/voice` — Voice intro upload/playback (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| POST | `/api/voice/upload` | `voice_upload` | owner |  |
| GET | `/api/voice/{tsap_id}` | `voice_get` | owner |  |

## `/api/wa` — WhatsApp integration (webhooks, anti-ban pacing) (6)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/wa/dead` | `wa_dead` | admin | 💀 Dead-letter list — 3 tries అయ్యాక కూడా deliver కానీ messages (bridge problem). |
| POST | `/api/wa/dead/requeue` | `wa_dead_requeue` | admin | Bridge fix అయ్యాక dead-letters ని మళ్లీ queue లో vey. |
| POST | `/api/wa/pause` | `wa_pause` | admin |  |
| POST | `/api/wa/reset_day` | `wa_reset_day` | admin | Test tip: ee రోజు counters reset (caps fresh). Production లో వద్దు. |
| POST | `/api/wa/resume` | `wa_resume` | admin |  |
| GET | `/api/wa/status` | `wa_status` | admin | Anti-ban live status: gap, caps, queue, quiet hours, cooldown + per-number instances. |

## `/api/welcome-pack` — New-user welcome pack (2)

| Method | Path | Function | Auth | Purpose |
|---|---|---|---|---|
| GET | `/api/welcome-pack/{tsap_id}` | `welcome_pack_get` | owner |  |
| POST | `/api/welcome-pack/{tsap_id}/resend` | `welcome_pack_resend` | admin, owner | 🔁 3 profiles + caste channel links ని మళ్లీ మీ WhatsApp కి pampu (owner-only). |


## Open follow-ups for this file
1. ~~Enumerate all frontend routes with auth/robots state~~ — done above.
2. Trace login/logout/unauthorized redirect destinations end-to-end
   (Journey D in `TEST_PLAN.md`) — not yet walked click-by-click.
3. Check for duplicate-URL risk from query-string filter combinations on
   `/matches`, `/search`, `/channels` (canonical tag correctness).
4. Regenerate the backend table above if routes are added/removed — it was
   produced by a repeatable extraction script (see commit history), not
   hand-maintained prose.
