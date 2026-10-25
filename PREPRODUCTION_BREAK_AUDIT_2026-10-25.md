# Mana Vivaha — adversarial pre-production break audit

**Audit date:** 2026-10-25 (Asia/Calcutta)  
**Reviewed revision:** `ee7621ab7f6b67c862f7399cb4b929f524f4d22a`  
**Audit branch:** `arena/9f6d3785-shubhalagnam`  
**Decision:** **NO-GO for public production traffic, live payments, live publishing, or live WhatsApp operations**  
**Audit posture:** Break the product. This is not an approval, certification, penetration-test attestation, legal opinion, or 100%-coverage claim.

## 1. Executive verdict

Mana Vivaha has unusually strong honesty and safety intent for this revision: registration requires consent and a real photo, public serializers suppress contact numbers, accepted-interest consent gates contact access, the public astrology/Porutham path fails closed without reviewed evidence, payment order creation computes amounts server-side, the modern Razorpay webhook has HMAC/idempotency/capture checks, control-plane roles exist, and the local regression suites cover many abuse and privacy contracts.

That strength is not enough for launch. The audit found **4 substantiated P0/critical blockers, 9 P1/high issues, and 3 P2/medium issues**. It did **not** find or manufacture 100 critical/high issues.

The most serious confirmed break is an old payment route that remains reachable in the application:

```text
POST /api/payment/webhook
no authentication + no provider configured + fake payment_id + valid plan/amount
→ HTTP 200 → credits and plan granted
```

A local isolated runtime reproduction changed a user from 3 to 8 credits with `pay_fake_audit_001`, without a signed provider event. The reproduction used `APP_ENV` unset; it is not evidence that a correctly booted production process accepts the route, and the production-equivalent startup/reachability test remains a gate. It is evidence that the route is not intrinsically fail-closed and must be disabled or made provider-authenticated before launch. The newer `/api/pay/webhook` is materially safer, but the legacy route means the unsafe state machine remains reachable in an allowed no-gateway configuration.

The second launch blocker is operational: supplied live-deployment evidence shows the backend, frontend, and all WhatsApp bridge ports bound on `0.0.0.0`, the live service reporting an older `2.0-w26` build while the reviewed source identifies itself as `2.1-hardened`, and the live health response exposing operational counts/payment/queue state. The production Compose cutover has not completed because `CONTROL_ACCOUNTS_JSON` is missing. No safe cutover may replace or initialize the existing data volume.

The third blocker is scale architecture. The authoritative runtime is one Uvicorn worker with process-local lists and JSON/JSONL state. The measured 100-registration isolated run produced an average persisted user payload of **11,080.56 bytes** and took **80.12 seconds**. At exactly 1,000,000 users, the users collection alone extrapolates to **11,080,560,000 bytes / 11.08 GB decimal**, already above the Compose backend's 4 GB memory limit before Python object overhead, indexes, interests, payments, media, queues, and backups. Because registration and many mutations force a full JSON snapshot, the cumulative registration write volume extrapolates to **5,540,285,540,280,000 bytes / 5.54 PB**. This is a mathematical forecast from observed local data and current code, not a claim that a million-user load test was completed.

### Launch decision

Do not promote the live checkout, legacy payment webhook, direct bridge ports, or old PM2 release. Preserve the existing production volume. Complete the P0 gates below, then run provider-backed staging, restore, rollback, perimeter, and load tests before considering a limited cohort.

## 2. Evidence standard and limitations

### Evidence labels

- **E0 — source evidence:** direct review of the pinned repository revision, including line locations.
- **E1 — isolated runtime evidence:** local FastAPI/TestClient or module execution using disposable state outside the repository. No customer data, live payment, live WhatsApp, Telegram destination, or production volume was used.
- **E2 — supplied live evidence:** SSH/deployment output supplied during the audit. It was not independently re-run from this sandbox.
- **E3 — test/build evidence:** commands and results recorded below. Passing a test proves its assertion in its harness; it does not prove production readiness.
- **A — assumption/model:** clearly labeled projection or policy question, not a confirmed exploit.

### What was not claimed

- No live customer records were inspected or invented.
- No live payment was made or captured.
- No real OTP, SMS, WhatsApp, Telegram, or publishing destination was contacted.
- No backup was restored into production and no production volume was deleted, renamed, or replaced.
- No TLS, OCI ingress, host firewall, Caddy certificate, DNS propagation, or live rollback was independently verified from this sandbox.
- No mobile browser/real-device or axe browser scan was completed because the Playwright Chromium binary was not installed; those checks are explicitly **skipped, not passed**.
- No compatibility, Jathakam, Porutham, trust, investor, or market claim was fabricated.

## 3. Scope and architecture map

### 3.1 System map

```text
Browser / mobile web
  └─ Next.js 16 frontend (relative /api calls; production rewrite)
       ├─ public marketing, search, profile, referral, vendor, story, legal pages
       ├─ member session helpers, HttpOnly cookie option, CSRF headers
       └─ control/admin workspace UI
             │
             ▼
       FastAPI backend / one Uvicorn worker
       ├─ auth/hardening.py: HMAC tokens, cookies, CSRF, limits, abuse ledger
       ├─ main.py: ~11,868 lines, 363 AST route decorators / 375 registered routes in test
       ├─ in-memory DB_USERS, DB_INTERESTS, DB_PAYMENTS, OTPs, views, saves, digest
       ├─ db_store.py: authoritative atomic JSON snapshot for core state
       ├─ feature JSON/JSONL stores: payment, referral, ads, CMS, vendors, consent, queues, etc.
       ├─ private media paths: photos, cards, voice, Jathakam, posters
       ├─ publisher / Telegram / WhatsApp bridge pools and anti-ban state
       ├─ PayPro modern order/webhook/refund state machine plus legacy payment route
       └─ control_auth owner/staff operations plane
             │
             ├─ Razorpay or manual UPI, only when explicitly configured
             ├─ SMS / WhatsApp / Telegram OTP providers
             ├─ Telegram channels and WhatsApp queues, delivery not implied
             └─ Caddy / reverse proxy in intended Compose deployment
```

The repository itself states that PostgreSQL/Redis dependencies are not the authoritative runtime stores. The production Compose file intentionally runs the backend with `--workers 1`, exposes backend port 8000 internally, binds the frontend to `127.0.0.1:3000`, and places JSON state/media under a named volume. This is safer than the supplied live PM2 topology but cannot deliver million-user scale.

### 3.2 Data inventory and sensitivity

| Store/data | Examples | Sensitivity | Current persistence/control |
|---|---|---:|---|
| Core profiles | name, phone, DOB, caste/religion, family, work, salary, photo references | Very high | process lists + atomic JSON snapshot |
| Auth | password hash, OTP digest, token versions, session cookies | Very high | mixed JSON/process-local state |
| Trust | photo/selfie status, ID decision metadata, reports, blocks | High | JSON/process-local, staff/admin routes |
| Consent/contact | interests, accepted state, contact unlocks, ledger | Very high | JSON/process-local; deletion does not revoke old access |
| Money | orders, UTR/payment IDs, plans, refunds, referral wallet | Very high | PayPro JSON + core JSON + audit files |
| Media | photos, selfies, cards, voice, Jathakam uploads | Very high | mounted volume; route-level guards vary by media type |
| Growth | visits, referral lookup/share, leads, analytics | High | bounded/in-memory or JSON stores; public surfaces vary |
| Operations | bridge URLs/tokens, recipients, message bodies, channel destinations | Critical secrets/PII | mixed env/state/queues; live perimeter is unverified |

### 3.3 Workflow map and state transitions

1. **Registration:** consent and photo upload → validation/sanitization → pending profile → atomic core save → member cookie/token → staff approval.
2. **Approval/publication:** staff approval regenerates card and queues configured publication. Queueing is not delivery; external channel tests were not run.
3. **Login/recovery:** OTP or password → HMAC token/HttpOnly cookie → owner guard. Password-failure locks are process-local; token-version revocation is persisted.
4. **Search/matches:** approved profiles only in intended search/match routes → `safe_user()` serializer → contact remains locked. Most searches scan Python lists.
5. **Trust:** photo/selfie pending → admin/staff review → recorded badge. The public `verify/request` route is not owner/admin guarded.
6. **Interest/consent:** credits → interest request → owner accepts/declines → accepted account view may reveal contact. Deletion marks the profile hidden but does not revoke accepted contact access.
7. **Payment:** modern order → provider/manual proof → HMAC/provider checks or admin UTR confirmation → idempotent fulfillment. Legacy webhook bypasses this boundary under an unconfigured-provider condition.
8. **Referral:** public lookup/validate/share/poster → registration attachment → qualifying paid plan → wallet ledger → manual payout review. Public lookup/share can reach non-public profiles.
9. **Operations:** owner/staff control account → profiles/moderation/publishing/WhatsApp tools. Staff profile queue currently contains raw phone and a pre-filled WhatsApp URL.
10. **Deletion/retention:** account status becomes deleted/married-fixed; retention archives older records. It is not an immediate erasure or contact-revocation workflow.

## 4. Confirmed issue register

### P0 / critical blockers — 4 confirmed

#### MV-P0-001 — Legacy payment webhook grants paid credits without provider authentication

- **Severity:** Critical / P0
- **Category:** Payment security, authorization, revenue integrity
- **Location:** `backend/main.py:4437-4620`, `POST /api/payment/webhook`; compare safer `POST /api/pay/webhook` at `main.py:10679`.
- **Risk:** An unauthenticated caller can submit a valid plan code/amount and an attacker-chosen payment ID when no Razorpay webhook secret/provider key is configured. The route logs an unsigned-no-gateway condition but continues to `apply_payment()`.
- **Business/customer/technical impact:** Free plan upgrades, direct revenue leakage, referral commission manipulation, false finance records, trust damage, support/refund burden, and a bypass around the modern payment order state machine.
- **Likelihood:** High whenever the legacy route is reachable with an unconfigured or misconfigured provider; exploit requires only a profile ID and a plan amount.
- **Reproduction:** In a disposable TestClient runtime with authentication enforcement on and `APP_ENV` unset, no payment provider, user credits `3`, call:
  ```text
  POST /api/payment/webhook?user_id=MV1001&amount=99&razorpay_payment_id=pay_fake_audit_001&plan_code=S_99
  ```
  The response was HTTP 200 with `success: true`, `profiles_added: 5`; credits changed from `3` to `8` and plan changed to `S_99`. No signature, admin key, provider call, or real payment was supplied. A correctly booted production-equivalent process was not used for this reproduction because its durable token-version/startup gates require additional configuration; production reachability is therefore an explicit follow-up, not silently assumed.
- **Evidence:** E1 runtime reproduction; E0 route source; Compose permits Razorpay keys/secret to be empty and payment can be unconfigured/manual. The source path allows unsigned no-gateway fulfillment unless an outer startup/configuration gate prevents that process from booting.
- **Fix:** Immediately return 410/404 for the legacy route, or route it into the modern PayPro state machine. In every non-test environment require a configured provider, raw-body HMAC, allowed captured event, provider-side payment/order/amount/currency verification, durable unique payment ID, and a valid internal order. Add a regression test asserting the exact reproduction returns 401/403/503 and does not mutate credits.
- **Effort:** 1–2 engineering days for kill-switch and regression; 1–2 weeks for safe compatibility migration and reconciliation.
- **Priority:** Before any payment CTA, provider credential, or production traffic is enabled.

#### MV-P0-002 — Live perimeter reportedly exposes backend and WhatsApp bridge ports

- **Severity:** Critical / P0
- **Category:** Production security, network perimeter, secrets/PII
- **Location:** Supplied live SSH/process/port evidence; intended Compose controls are in `docker-compose.prod.yml`.
- **Risk:** Live ports `3001–3003` (bridges), `8000` (backend), and `3000` (frontend) reportedly bind to `0.0.0.0`; only Caddy 80/443 should be public. If OCI ingress or host firewall permits them, attackers can bypass TLS/proxy controls and probe internal APIs or bridge surfaces directly.
- **Business/customer/technical impact:** Bridge token/session attack surface, direct API/auth bypass opportunities, origin/header inconsistencies, operational metadata exposure, and possible WhatsApp account compromise. The exact exploitability depends on OCI and host firewall rules, which were not independently tested.
- **Likelihood:** High if cloud security lists allow the bound ports; medium if ingress blocks them but host-local exposure remains operationally unsafe.
- **Reproduction/evidence:** E2 supplied live output shows `0.0.0.0` bindings. This is confirmed topology evidence, not a claim that every port was internet-reachable from this sandbox.
- **Fix:** Bind bridges/backend/frontend to loopback/private Docker networks; expose only Caddy 80/443; verify OCI security list, `iptables`/`nftables`, IPv6, Docker published ports, and external scans from a separate network. Rotate bridge tokens if direct exposure cannot be ruled out. Add a CI/deploy check that rejects public bindings for 3000, 3001–3003, 8000.
- **Effort:** 0.5–2 days for perimeter remediation and verification; 1 day for token-rotation/incident review.
- **Priority:** Immediate containment before traffic or WhatsApp login.

#### MV-P0-003 — The authoritative data architecture is structurally incompatible with 1,000,000 users

- **Severity:** Critical / P0
- **Category:** Database, scalability, availability, architecture
- **Location:** `backend/main.py` in-memory collections; `backend/db_store.py:41-114`; `docker-compose.prod.yml` backend `--workers 1`, `mem_limit: 4g`.
- **Risk:** One process owns all profiles, interests, payments, OTPs, views, and saves. Core search/match/facet/stats paths repeatedly scan Python lists. Durable state is a single JSON snapshot with no database transactions, indexes, row-level concurrency, cross-process locking, or horizontal read/write model.
- **Business/customer/technical impact:** Startup/load failure, OOM, long writes, lost updates across replicas, stale reads, inability to fail over safely, search timeouts, registration/payment unavailability, and unsafe recovery.
- **Likelihood:** Certain as the system approaches the requested scale; this is a capacity/architecture fact, not a hypothetical exploit.
- **Reproduction/evidence:** E0 source and Compose; E3 measured isolated 100-registration run: `80.12s`, `1,169,387` byte core JSON, `100` users, `1,108,056` user bytes, average `11,080.56` bytes/user. See the exact forecast in section 6.
- **Fix:** Preserve the JSON store as read-only migration input; after backup/restore rehearsal, migrate authoritative state to PostgreSQL with normalized profiles, immutable payment ledger, consent/contact grants, unique constraints, transactions, indexes, audited migrations, and connection pooling. Put media in object storage with private signed URLs. Add Redis/distributed rate/idempotency state and a queue for notifications/publication.
- **Effort:** 6–12+ weeks for a safe dual-read/dual-write or migration program, including restore/reconciliation/load tests.
- **Priority:** Architecture gate before claiming million-user readiness; do not “scale out” the current JSON worker.

#### MV-P0-004 — Production is running a different, older release and the intended Compose cutover is blocked

- **Severity:** Critical / P0
- **Category:** Release integrity, DevOps, change management, data safety
- **Location:** Supplied live output reports API `2.0-w26`; reviewed source/Compose identify `2.1-hardened`; Compose validation failed because `CONTROL_ACCOUNTS_JSON` is required but missing.
- **Risk:** Security fixes and route behavior reviewed here are not necessarily the behavior serving users. A blind cutover risks data replacement, missing control accounts, failed startup, or bypassing the existing PM2 data path.
- **Business/customer/technical impact:** False security confidence, inconsistent payment/privacy behavior, downtime, data loss, rollback confusion, and inability to prove which artifact handled a customer event.
- **Likelihood:** Certain from the supplied version/config evidence until a verified release is promoted.
- **Reproduction/evidence:** E2 supplied live output; E0 `docker-compose.prod.yml` required environment; Compose `config`/startup failed at the missing `CONTROL_ACCOUNTS_JSON` gate. No `up` completed.
- **Fix:** Freeze current traffic configuration; capture hashes/config/volume inventory; complete a non-destructive backup and restore test; provision `CONTROL_ACCOUNTS_JSON` through a secret manager; deploy the exact reviewed commit to staging; compare route/version/health fingerprints; perform a canary and tested rollback. Do not delete/rename/replace the live volume.
- **Effort:** 1–3 days for controlled release preparation, longer if data migration/drift is found.
- **Priority:** Release gate; no production approval until artifact parity is proven.

### P1 / high issues — 9 confirmed

#### MV-P1-001 — Legacy payment idempotency is process-local and replays after restart

- **Severity:** High / P1
- **Category:** Payment integrity, durability
- **Location:** `backend/main.py:4437+`; `hardening.py:782-801` `_SEEN_KEYS`; legacy route calls `idem_seen("pay:" + payment_id)` but does not use a durable unique payment ledger.
- **Risk:** The same provider/payment ID is rejected only while the process-local dictionary survives. After restart or on another worker, the route can apply the same payment again; `DB_PAYMENTS` is not used as a unique replay constraint for this route.
- **Impact:** Double credits, duplicate referral rewards, finance reconciliation mismatch, chargeback exposure.
- **Likelihood:** Medium/high on restart, failover, or multi-worker deployment.
- **Reproduction:** E0 code path; clear/restart process state between two otherwise identical calls. The first call applies credits; `_SEEN_KEYS` is not persisted, so the second process treats the same payment ID as new. This restart reproduction was reasoned from the direct code path; a full two-process provider test remains unexecuted.
- **Evidence:** E0; separate modern PayPro route has a stronger order/receipt path, demonstrating the legacy route is inconsistent.
- **Fix:** Remove the route or make payment ID a durable unique key in one transactional ledger; fulfill only an internal order; test replay in same process, after restart, and across two workers.
- **Effort:** 2–5 days after the P0 route decision.
- **Priority:** Same release as MV-P0-001.

#### MV-P1-002 — Public referral lookup and share assets enumerate non-public member data

- **Severity:** High / P1
- **Category:** Privacy, authorization, trust/safety, abuse
- **Location:** `main.py:4614-4649` `/api/referral/lookup`; `main.py:4809-4834` `/api/referral/{tsap_id}/share-kit` and poster routes.
- **Risk:** Lookup accepts a phone fragment of seven or more digits, exact TSAP ID, or referral code and returns `full_name`, `referral_code`, and `referral_link`. It does not require authentication or approved-profile status. Share-kit/poster routes resolve any profile ID, including pending records, and produce named referral material. These GET paths are not included in the explicit GET rate-limit set.
- **Impact:** Registration enumeration, confirmation of a phone's presence, targeted phishing/impersonation, unwanted disclosure of a pending member's name/referral identity, and referral abuse. This is especially sensitive in a matrimonial context.
- **Likelihood:** High; IDs are short/sequential enough to discover and the endpoint is public.
- **Reproduction:** E1 with a pending fixture `MV4001`, `Pending Member`, phone `9876543210`, referral code `REFMV4001`: `GET /api/referral/lookup?q=7654321` returned HTTP 200 with full name/code/link; `GET /api/referral/MV4001/share-kit` returned HTTP 200; `GET /api/referral/MV4001/poster.png` returned HTTP 200 PNG. No auth header was sent.
- **Evidence:** E1; E0 route bodies; middleware GET rate-limit allowlist at `main.py:2559+` excludes these paths.
- **Fix:** Make phone-fragment lookup unavailable publicly. Require owner authentication for dashboards/share-kit generation, or issue a short-lived, consented share capability from the owner. For public referral landing, expose only an opaque referral code and generic landing copy; never resolve pending/banned/deleted profiles. Add route-specific rate limits, enumeration-resistant responses, and abuse telemetry without storing raw phone fragments.
- **Effort:** 2–4 days plus product copy/CTA review.
- **Priority:** Before referral promotion or public launch.

#### MV-P1-003 — Account deletion hides a profile but does not erase records or revoke prior contact access

- **Severity:** High / P1
- **Category:** Privacy/compliance, consent, trust/safety
- **Location:** `main.py:4212-4259` deletion; `main.py:9770-9805` `/api/unlock`; `interest.py` accepted-request access logic.
- **Risk:** Delete changes status/visibility but explicitly retains profile, payment, audit, and archive records. It also leaves accepted interests usable: a viewer with an accepted request can still call unlock after the target profile is marked deleted and receive the target phone.
- **Impact:** A member who deletes or withdraws may remain identifiable/contactable through previously granted account flows; data-subject erasure, consent withdrawal, support, and regulatory obligations become manual and ambiguous.
- **Likelihood:** High for any accepted request followed by deletion; exact legal consequence needs counsel, but the technical behavior is confirmed.
- **Reproduction:** E1 with accepted interest `MV5002 → MV5001`: delete `MV5001` via `/api/user/delete-account`; then post `/api/unlock` with viewer `MV5002`, target `MV5001`. Delete returned 200/hidden/deleted; unlock returned 200 and phone `9876543210`.
- **Evidence:** E1; E0 comment explicitly says the action does not erase all records and does not revoke accepted contact access.
- **Fix:** Define retention/legal-hold policy; on deletion immediately revoke all active contact grants and future unlocks, invalidate cached contact access, redact/minimize non-required profile/contact fields, preserve only documented financial/audit records, and implement an authenticated erasure-request workflow with status/SLA/audit. Do not promise instant deletion if a lawful retention exception applies; explain exactly what remains.
- **Effort:** 1–2 weeks including policy/legal review and migration of existing deleted rows.
- **Priority:** Before broad member acquisition.

#### MV-P1-004 — Staff profile queue exposes raw member phone numbers and pre-filled WhatsApp recipient URLs

- **Severity:** High / P1
- **Category:** Internal privacy, trust, operational messaging
- **Location:** `main.py:10743+` `/api/admin/profiles`; `require_admin(request, staff_ok=True)` and row fields `phone`/`wa_followup_url`.
- **Risk:** A staff-key holder, not only the owner role, receives raw phone data and a ready-to-send `wa.me/91...?...text=` URL. This violates the standing operational rule that recipient numbers/message bodies must not leak into worker views unless a narrowly justified, audited action requires them.
- **Impact:** Insider exposure, accidental copy/paste to the wrong recipient, URL/history/log/referrer leakage, unauthorized outreach, and breach blast radius.
- **Likelihood:** High for every staff queue request; E1 confirmed it is returned.
- **Reproduction:** With a disposable `STAFF_KEY`, call `GET /api/admin/profiles?status=approved` using `X-Admin-Key: staff-audit-key`. HTTP 200 contained `"phone":"9876543210"` and a full WhatsApp URL containing the recipient and message.
- **Evidence:** E1; E0 row construction.
- **Fix:** Staff responses must contain masked phone only and no recipient URL/message body. Separate owner-only contact disclosure from review queue. Queue an audited, consent-checked action server-side using opaque lead/profile IDs; show only masked target and delivery state. Ensure logs/analytics/worker UIs redact numbers, bridge tokens, QR/pairing codes, and message bodies.
- **Effort:** 2–4 days plus UI/test changes.
- **Priority:** Before granting staff access or enabling WhatsApp.

#### MV-P1-005 — Rate limits, abuse ledger, and legacy payment idempotency do not provide distributed protection

- **Severity:** High / P1
- **Category:** Abuse prevention, reliability, scalability
- **Location:** `hardening.py:406-538` process-local `_RL_BUCKETS`/`ABUSE`; `hardening.py:782-801` `_SEEN_KEYS`; `main.py` middleware.
- **Risk:** Limits and replay state live in one process. A second worker/replica has an independent bucket; restart clears buckets and abuse history. The Compose deployment deliberately uses one worker because the rest of the app is not multi-process safe, but that is a capacity ceiling rather than a control.
- **Impact:** OTP/register/referral/payment abuse scales with replica count, incident history disappears on restart, and failover changes security behavior.
- **Likelihood:** Certain once replicas or replacement processes are used; high under a restart-heavy production service.
- **Fix:** Move rate-limit counters, idempotency keys, cooldowns, and abuse event durability to Redis/PostgreSQL with atomic TTL operations and a privacy-safe event store. Add per-account, per-phone, per-payment, per-device, and network dimensions; do not trust spoofed forwarding headers without verified proxy configuration.
- **Effort:** 1–2 weeks.
- **Priority:** Before horizontal scaling or provider traffic.

#### MV-P1-006 — Sensitive matrimonial data is stored as broad JSON snapshots without field-level encryption

- **Severity:** High / P1
- **Category:** Privacy/compliance, database, backup security
- **Location:** `db_store.py:41-114`; feature JSON/JSONL stores; Compose named volume and backup paths.
- **Risk:** Names, phones, DOB, caste/religion, family details, income, photos/references, contact/consent history, UPI/UTR and operational records are co-located in broad files. Atomic file permissions protect against some local users but are not encryption at rest, key management, tenant isolation, or backup encryption.
- **Impact:** A volume, backup, host, container, or operator compromise becomes a broad matrimonial-data breach; backups amplify the blast radius.
- **Likelihood:** Medium; the control is absent in source, while host/storage access is an operational threat rather than an exploit demonstrated here.
- **Evidence:** E0 source, including the public posture copy that explicitly says at-rest/backups encryption is not guaranteed; no live backup encryption/restore evidence.
- **Fix:** Use PostgreSQL column/access controls and envelope encryption/tokenization for high-risk fields, object storage private media with KMS-managed keys, encrypted backups with tested key recovery, separate operator roles, retention/purge jobs, and access audit. Minimize raw phones in logs/queues.
- **Effort:** 3–6 weeks alongside the database migration.
- **Priority:** Before storing meaningful production volume.

#### MV-P1-007 — Expensive public image/share endpoints lack specific throttling and cache protection

- **Severity:** High / P1
- **Category:** Availability, abuse, privacy
- **Location:** `/api/referral/{tsap_id}/poster.png`, `/api/og/profile/{tsap_id}.png`, referral share routes; GET rate-limit allowlist in `hardening.py:431-456`.
- **Risk:** Public ID-addressable Pillow/QR generation is not in the explicit GET rate-limit set; repeated requests can consume CPU and produce/access member-named assets. Generic GET behavior is not applied by the middleware, which only rate-limits selected GET paths.
- **Impact:** CPU exhaustion, queue starvation, storage churn, referral enumeration, and elevated media service cost.
- **Likelihood:** Medium/high under scraping or a sequential-ID campaign.
- **Evidence:** E0 route/middleware code; E1 poster generation succeeded for a pending profile without auth. A high-volume load test was not run.
- **Fix:** Require signed/approved share capabilities, add per-IP/profile/token limits and concurrency budgets, deterministic immutable caching with bounded storage, CDN/object-storage transforms, and a hard generation timeout. Do not generate poster material for pending/banned/deleted profiles.
- **Effort:** 2–5 days for guards/limits; longer for CDN pipeline.
- **Priority:** Before public referral/SEO promotion.

#### MV-P1-008 — Supplied live health endpoint exposes operational metadata from an older deployment

- **Severity:** High / P1
- **Category:** Information disclosure, deployment drift, observability
- **Location:** Supplied live `/api/health`; current source `main.py:10501+` intends production-minimal health and `/api/admin/health` for detail.
- **Risk:** Live output reportedly included counts, payment mode, and WhatsApp queue state. This leaks inventory and operational configuration and proves the live service is not the reviewed source behavior.
- **Impact:** Enumeration/intelligence for attackers, privacy/competitive leakage, and false confidence in source-level hardening.
- **Likelihood:** Certain on the supplied live release until replaced and re-tested.
- **Evidence:** E2 live API output; not independently re-probed here.
- **Fix:** Promote the reviewed artifact only after parity checks. Keep public health to liveness/version/status; put counts/payment/queue behind owner/admin auth; add a release smoke test that asserts production `/api/health` has no counts, payment mode, queue, phone, token, or recipient fields.
- **Effort:** 1 day plus controlled deployment.
- **Priority:** Same as MV-P0-004.

#### MV-P1-009 — Live version drift makes security and revenue test results non-authoritative

- **Severity:** High / P1
- **Category:** Release management, auditability
- **Location:** Supplied live version `2.0-w26` versus reviewed source/Compose `2.1-hardened`.
- **Risk:** Tests against `ee7621a` cannot be treated as tests of the live service. A fixed endpoint may be absent, and an unsafe legacy route may be active only in one deployment.
- **Impact:** Unprovable change control, missed security patches, incompatible frontend/backend contracts, and incident forensics gaps.
- **Likelihood:** Certain from supplied evidence.
- **Fix:** Embed immutable git SHA/build manifest in API/frontend, record image digests, require deployment attestation, compare route/version/health fingerprints in staging and after canary, and make rollback target explicit.
- **Effort:** 1–3 days.
- **Priority:** Release gate.

### P2 / medium issues — 3 confirmed

#### MV-P2-001 — Verification refresh endpoint mutates any profile without owner/admin authorization

- **Severity:** Medium / P2
- **Category:** Authorization, trust/safety integrity
- **Location:** `main.py:8600-8620`, `POST /api/verify/request`.
- **Risk:** The endpoint accepts an arbitrary `tsap_id` and calls `safety.set_verification()` without `require_owner` or admin authorization. Evidence requirements prevent a caller from fabricating phone/photo/ID proof in the tested case, but the caller can trigger a cross-account trust-state refresh/mutation when evidence already exists.
- **Impact:** Unauthorized state changes, audit ambiguity, possible moderation/race abuse, and inconsistent trust UX. It was not a direct badge-forgery in the tested runtime.
- **Likelihood:** Medium; profile IDs are discoverable through public surfaces.
- **Reproduction:** E1 fixture with `MV2001.phone_verified=True`: unauthenticated `POST /api/verify/request` JSON `{"tsap_id":"MV2001","kind":"phone"}` returned HTTP 200 and changed `verification_level` from `none` to `phone`.
- **Evidence:** E1; E0 route and `safety.py` evidence checks.
- **Fix:** Require owner token plus CSRF for member refresh; permit admin/verified moderation service only for staff actions; make derived badge calculation side-effect-free or persist an auditable owner/admin action.
- **Effort:** 0.5–1 day plus regression tests.
- **Priority:** Before trust badges are marketed.

#### MV-P2-002 — Public partner registration lacks proof of phone/business control

- **Severity:** Medium / P2
- **Category:** Trust, referral abuse, vendor/partner integrity
- **Location:** `main.py:4940+` `/api/referral/partner/register`; `refpartners.py` registration state.
- **Risk:** Anyone can submit a partner name, phone, address and package request without OTP or business verification. Later dashboard/payout access has an OTP path, but the initial registry and identity/link are created before proof of control.
- **Impact:** Fake partner listings/links, spam and impersonation, support burden, and referral attribution pollution.
- **Likelihood:** Medium; generic POST rate limit reduces but does not eliminate abuse.
- **Fix:** Verify phone before issuing durable partner identity, add business-review status and duplicate/abuse controls, minimize returned PII, require explicit partner terms/consent, and separate public landing code from private wallet identity.
- **Effort:** 2–5 days.
- **Priority:** Before partner/referral scale-up.

#### MV-P2-003 — Operational/production verification coverage remains incomplete even though local suites pass

- **Severity:** Medium / P2
- **Category:** QA, mobile/accessibility, production readiness
- **Risk:** Local static and backend suites do not cover real browser layout, real providers, live Caddy/TLS, multi-process races, restore/rollback, or a million-user workload. The missing browser binary caused responsive/axe suites to skip.
- **Impact:** Unknown mobile overflow/touch/focus issues, provider failures, and production-only regressions can pass the current gate.
- **Likelihood:** High for at least one untested environmental defect; no specific UI vulnerability is asserted.
- **Evidence:** E3: `npm run test:visual` and `npm run test:axe` explicitly reported “Playwright browser not installed — ... SKIPPED”; provider and live gates were not executed.
- **Fix:** Install/pin Chromium in CI, require `REQUIRE_VISUAL_TESTS=1`, run 8 viewport/axe routes, execute provider sandboxes, two-process concurrency, restore/rollback, and staged load tests.
- **Effort:** 2–10 days depending on provider/staging setup.
- **Priority:** Before a production acceptance claim.

## 5. Audit results by discipline

### 5.1 Functional and workflow audit

**Substantiated strengths:**

- The isolated 100-registration E2E flow completed with zero ID collisions and exercised approval, profile completeness, preferences, matching, referral assets, admin directory, photo counts, and owner-only comparisons.
- Registration requires consent and a real validated image; the client cannot attest `phone_verified` by form field alone.
- Duplicate phone/composite identity checks, gender/age/district validation, password hashing, and failed persistence rollback paths are covered.
- Modern payment order creation fails closed without a configured provider or merchant UPI destination in local tests.
- Public profiles/search use a contact-lock serializer; paid credits do not bypass owner consent.
- Report/block/moderation and owner guards have focused tests.
- Astrology/Porutham code and tests avoid fabricated scores or missing-evidence results.

**Functional breaks/gaps:**

- The legacy payment route bypasses the safe payment workflow.
- Delete is a visibility state, not a complete consent/revocation/erasure state.
- There is no in-site moderated conversation system; the product explicitly relies on interest requests and external WhatsApp/Telegram links. This is a product gap, not a hidden defect.
- Public referral identity/share behavior is not consistently separated into “public referral code” versus “private member profile.”

### 5.2 Red-team/security audit

| Attack path | Result |
|---|---|
| Fake paid upgrade through legacy webhook | **Confirmed, P0** |
| Replay legacy payment after process restart | **Code-confirmed risk, P1; two-process provider test pending** |
| Phone/profile enumeration through referral lookup | **Confirmed, P1** |
| Public pending-profile referral share/poster | **Confirmed, P1** |
| Cross-account verification refresh | **Confirmed mutation, P2** |
| IDOR on core profile/payment/contact routes | Existing focused tests passed for reviewed routes; not a claim of every route |
| Private photo traversal/direct path bypass | Guarded photo route and focused tests passed; live perimeter/media mount still unverified |
| XSS through JSON-LD/print output | Shared JSON-LD serializer and print escaping are present; taint/browser exploit not independently completed |
| CORS/CSRF/session controls | Static/focused tests passed; live origin/proxy behavior unverified |
| bridge/QR/token/recipient leakage | Source has masking and protected admin intent, but live worker/log/perimeter review is incomplete; staff phone/URL leak is confirmed |

### 5.3 Privacy/compliance audit

The data set includes highly sensitive matrimonial information: direct identifiers, contact details, age/DOB, caste/religion, family and income details, photos/selfies, astrology fields, consent history, payment references, and operational outreach data.

Positive controls include explicit profile/photo consent copy, masked public serializers, no raw phone in normal public profile/search responses, owner/admin guards, and an honest privacy page. The following remain launch gaps or risks:

1. Public referral lookup/share exposes a non-public member identity.
2. Deletion does not revoke previously granted contact access or immediately erase broad records.
3. Staff queue exposes raw recipient numbers and pre-filled outbound message URLs.
4. JSON snapshots/backups lack demonstrated encryption/key lifecycle.
5. A formal data inventory, retention schedule, processor register, access-review cadence, breach response, and DSAR workflow were not verified from live operations.

This report does not determine whether a specific statute has been violated. Counsel should review the India DPDP Act/Rules, applicable cross-border processing, consent/notice language, financial retention, grievance process, and deletion exceptions before launch.

### 5.4 Trust and safety audit

**Good:** phone OTP is described as an access check rather than universal identity proof; photo/selfie review is separate; ID review stores decision metadata; reports/blocks and consent-led contact access exist; fabricated trust leaderboards and unsupported astrology scores were retired.

**Not ready:** verification refresh authorization, deletion/contact revocation, referral identity proof, staff recipient exposure, no in-site moderation channel, no demonstrated liveness/face match/government-ID provider, and no live abuse response drill. “Verified” must remain scoped to the exact recorded check, never general identity or character verification.

### 5.5 AI and decisioning audit

No external LLM or generative provider was found in the reviewed runtime path. The product’s “intelligence” is primarily deterministic member-intel, factual comparisons, recency/explicit-filter matching, message templates, and digest generation. This is a positive: tests enforce no compatibility percentage, no invented astrology result, and no unsupported outcome claim.

Before adding a model, require: model/data inventory, consent and opt-out, purpose limitation, sensitive-attribute policy, explainability/appeal, human moderation, prompt/PII redaction, evaluation slices by gender/community/language, hallucination tests, retention controls, provider DPA, and a kill switch. Do not market deterministic factual comparison as AI compatibility or probability.

### 5.6 Database/recovery audit

Atomic replacement and strict production startup validation are good controls. Production refuses missing/corrupt/incomplete core state and does not initialize a blank replacement volume during ordinary startup. The unresolved architectural risks are authoritative JSON state, no relational constraints/transactions, no distributed lock, broad unencrypted snapshots, unbounded interests/payments, process-local rate/idempotency, and no completed live restore evidence.

A backup is not complete until a fresh isolated environment restores it, counts/reconciles profiles/interests/payments/consent/media, and serves a test request without replacing the source volume. That drill was not verified.

### 5.7 Performance and scalability audit

The observed local 100-registration benchmark is valuable evidence, but it is not a load test. Current hotspots:

- full Python-list scans for search, facets, matches, stats, referral/leaderboard and admin filters;
- forced full core JSON serialization for registration and important mutations;
- process-local queues and workers;
- Pillow/QR generation on request;
- broad state files for payment/referral/vendor/CMS/consent and publisher logs;
- one backend worker and 4 GB memory limit;
- no measured p95/p99, concurrency, connection pool, queue depth, or provider latency at scale.

### 5.8 Mobile, accessibility, and UX

Static design, touch-target, route-frame, media-layout and link tests passed. Next build compiled TypeScript and generated 53 routes. The local registration tests passed, and mobile-first single-column intent is visible in source.

The real-browser suite did not run because Chromium was absent. Therefore no claim is made about real-device Safari/Chrome, keyboard/focus behavior, screen-reader semantics, 8 viewport overflow, slow-network registration, camera permissions, media fallback, back-button/session recovery, or touch target behavior in rendered CSS. Install the browser and make the visual/axe suite blocking.

### 5.9 SEO and growth audit

`npm run lint` passed the link audit: 50 app routes, 209 static internal links, and 70 new-tab links. Build generated sitemap/robots and public content routes. Referral/share and Telugu community/district/caste landing surfaces are growth differentiators.

Growth risk is not lack of routes; it is unsafe public identity discovery, unbounded share image generation, and live deployment drift. SEO crawler validation for canonical tags, noindex privacy pages, structured-data rendering, profile removal propagation, and large sitemap behavior remains untested.

### 5.10 Revenue/product audit

The modern pricing/payment design has honest off states and server-computed prices. However, the legacy webhook is a direct revenue leak and can corrupt referral commissions. Manual UPI/plan activation is operator-heavy and needs bank reconciliation, refund/chargeback, duplicate-proof and audit drills. There is no evidence of a live provider/rollback test.

The product’s regional Telugu/Telangana/Andhra focus, caste/district taxonomy, referral/partner/vendor ecosystem, and trust-oriented copy are potential differentiation. Off-platform messaging, manual trust review, no scalable search, and lack of proof of provider delivery reduce retention and monetization confidence.

### 5.11 DevOps/production readiness

| Gate | Status | Evidence/action |
|---|---|---|
| Preserve existing data; no initializer/cutover deletion | **RED / mandatory** | Live volume/data exists; source gates are good; no destructive action permitted |
| Exact artifact parity | **RED** | Live reports old `2.0-w26`, reviewed source is `2.1-hardened` |
| Compose config | **RED** | Missing required `CONTROL_ACCOUNTS_JSON`; no `up` completed |
| Private bridge/backend ports | **RED** | Supplied live bindings are public; firewall not proven |
| Secrets/recipient/message redaction | **RED/AMBER** | Staff raw phone/WA URL confirmed; bridge/log live audit incomplete |
| Provider configuration/sandbox | **RED** | No live payment/OTP/WhatsApp/provider test completed |
| Backup and restore | **RED** | Source has backup gates; completed restore drill not evidenced |
| TLS/Caddy/DNS | **UNVERIFIED** | DNS propagation/cert/firewall not independently checked |
| Health/readiness | **RED** | Live old health leaks metadata; current source has better route but is not live |
| Monitoring/alerting | **AMBER/UNVERIFIED** | Private metrics design exists; scrape/alert/PII review not run live |
| Rollback | **RED** | No tested previous-image/data rollback drill |
| Local backend regression | **GREEN for executed harnesses** | 71 standalone scripts passed; 22 focused pytest tests passed |
| Frontend lint/build/static | **GREEN** | lint/static/security passed; build passed with React 18 deprecation warning |
| Browser visual/axe | **UNTESTED** | Chromium missing; suites explicitly skipped |

### 5.12 Surface coverage and technical-debt report

The audit inventory identified approximately 46 source-level frontend routes covering public marketing, registration, login/recovery, search/matches, member, pricing/payment, verification, referral, vendor, content, control/admin and legal surfaces. The Next build emitted 53 generated routes, while the link audit counted 50 app routes; these counts are different inventories (source pages versus generated/static/runtime routes) and should not be presented as a coverage percentage. The backend has approximately 363 AST route decorators and 375 registered routes in the local test process, including aliases and operational endpoints.

The following workflows were exercised through focused API/E2E tests or static checks: registration/profile completion, authentication/OTP/password paths, photo validation, approval/admin profile access, search/facets/matches, interest/consent/unlock, report/block, payment order/modern webhook guards, referral assets, vendor/partner paths, control/finance serialization, security headers, JSON-LD/print escaping, media fallback, link integrity and build output. The following were **not** individually clicked in a real browser: every page button, all rendered form error states, camera/file-picker UX, mobile back-button/session restoration, actual provider callbacks, and live external publication. This is why browser/provider gates remain red or unverified.

Material technical debt:

- `backend/main.py` is a roughly 11,868-line monolith containing unrelated routes, startup side effects, serializers, payment fulfillment, moderation, referrals, media, publishing and operational health.
- Legacy and modern payment routes coexist with different trust/idempotency contracts; aliases and duplicate operational endpoints increase route-discovery and test-drift risk.
- Global mutable lists and module-level state make route behavior, tests, restart recovery and multi-worker behavior difficult to reason about.
- JSON/JSONL feature stores have inconsistent schemas, retention, locking, and transaction semantics; cross-store payment/referral/consent invariants are application conventions rather than database constraints.
- Auth and authorization are expressed through several helpers and optional `request=None` parameters; every new route needs an explicit owner/staff/admin/public policy review.
- Tests are numerous but many scripts execute at import time or call `sys.exit`, so broad pytest collection is invalid and test isolation depends on each script's environment setup.
- Bilingual inline strings, magic environment flags, and startup worker behavior make configuration drift and safe localization harder.
- External side effects (publisher/bridge/queue startup and maintenance) are close to application startup, increasing blast radius when credentials or state are malformed.

The debt is manageable only if treated as an architecture migration, not as more route-level patches. The immediate rule should be: no new payment, contact, referral, bridge, or trust route without a threat-model entry, explicit authorization contract, durable state model, and focused/E2E regression.

## 6. Exact 1-million-user failure forecast

This section separates measured facts from projections.

### Measured baseline (E1/E3)

- 100 isolated registrations: **80.12 seconds**.
- Persisted core JSON after 100 users: **1,169,387 bytes**.
- Serialized users collection: **1,108,056 bytes**.
- Average serialized user payload: **11,080.56 bytes**.
- Test run was isolated, used synthetic test media, did not contact external providers, and is not a production throughput claim.

### Deterministic 1,000,000-user projection

Using the measured average user payload and assuming the average remains constant:

```text
users JSON = 1,000,000 × 11,080.56 bytes
            = 11,080,560,000 bytes
            = 11.08056 GB decimal
```

This is only the serialized users collection. It excludes Python object overhead, indexes/references, interests, payments, OTPs, views, saves, referral/vendor/CMS state, backups, logs, and media.

The Compose backend memory limit is 4 GB. Ignoring Python overhead entirely, the measured serialized user payload crosses 4 GB at approximately:

```text
4,000,000,000 / 11,080.56 = 360,992 users
```

Real failure occurs earlier or later depending on memory pressure, profile shape, allocator, swap, and runtime behavior; the exact OOM point was not load-tested. At 1M, the serialized user data alone is **2.77× the 4 GB memory limit**.

### Registration write amplification

The registration path forces a full core snapshot. If each new registration serializes all profiles, cumulative user bytes written through 1,000,000 registrations are:

```text
11,080.56 × (1 + 2 + ... + 1,000,000)
= 5,540,285,540,280,000 bytes
= 5.54028554028 PB decimal
```

A constant-time lower bound using the observed 80.12 seconds per 100 registrations is:

```text
0.8012 sec/profile × 1,000,000 = 801,200 sec = 9.273 days
```

That lower bound is intentionally optimistic because it assumes later snapshots cost no more than early snapshots. A linear-with-snapshot-size extrapolation calibrated to the 100-user run yields approximately **7,932,681,200 seconds / 91,813 days / 251.5 years** of serialized-write time. That is a model, not a measured wall-clock prediction; it demonstrates the quadratic shape, not a promised date.

### Other exact bounds and unknowns

- Registration requires a photo and accepts up to approximately 5 MiB before validation. A worst-case 1M-photo upload ceiling is approximately **5.24 TB binary** before thumbnails/derivatives/backups. Actual average media size was not measured.
- Search/facets/matches/stats are O(N) scans/sorts over Python state. No 1M p95/p99 was measured; a numeric latency claim would be invented.
- Interests and payments are not capped in `db_store.snapshot()` the way views/saves/digest are capped. At 1M members, interaction history can exceed profile storage; the exact count depends on behavior.
- Default WhatsApp daily caps and provider limits are per configured instance/queue; capacity for 1M members was not tested.

**Forecast conclusion:** under the current Compose memory and single-worker architecture, 1,000,000 live members is not a “tune the limits” problem. The system will hit memory/startup/write/latency or recovery failure before that target. PostgreSQL/object storage/distributed controls and a staged migration are required.

## 7. Competitor and investor view

This is a qualitative capability benchmark, not a current vendor-by-vendor scrape. Competitor feature claims were not independently verified in this audit.

| Capability | Mana Vivaha current posture | Competitive/investor implication |
|---|---|---|
| Telugu/local community depth | Strong taxonomy and bilingual copy | Differentiated wedge if data quality and moderation scale |
| Profile discovery | Explicit filters/recency, factual comparisons | Less sophisticated than indexed/ranked marketplace discovery; honest but less “magic” |
| Trust | OTP/photo/selfie/manual ID evidence with scoped language | Trust foundation exists; no demonstrated identity/liveness provider or revocation model |
| Messaging | Interest + external WhatsApp/Telegram; no in-site chat | Lower moderation/control/retention; external delivery cannot be proven |
| Privacy | Public contact lock and honest copy | Good position, undermined by referral/worker/delete findings |
| Payments | Server-priced modern path plus manual UPI | Monetization is not investable until legacy route is disabled and reconciliation tested |
| Referral/vendor revenue | Potentially differentiated growth loop | Fraud and PII enumeration could turn the loop into a liability |
| Mobile | Responsive source/static checks | Browser/device proof missing |
| Scale | JSON/single-process | Fundamental diligence blocker for a “millions of users” thesis |

### Investor diligence questions that must be answered

1. Which exact binary/commit is serving traffic, and can the operator prove it automatically?
2. Can a fake payment ever change credits? The current answer is yes through MV-P0-001.
3. What is the lawful retention/deletion policy for phone/photos/contact grants?
4. What is the unit economics and capacity plan for photo storage, OTP, WhatsApp, search, moderation and support at 1M users?
5. What percentage of profiles have scoped checks, and how are those checks audited/revoked?
6. What is the tested restore RTO/RPO and rollback procedure?
7. What happens when an accepted member deletes, blocks, or reports after contact is revealed?
8. Which metrics are source-of-truth and which are live only? The old health drift makes this urgent.

## 8. Missing-feature report

These are product capabilities not confirmed as complete; they are not padded security findings.

**P0/P1 before growth:**

- In-product, consent-aware, reportable/moderated messaging or an explicit product decision that external-only contact is a deliberate limitation with safety controls.
- Durable contact-grant/revocation model and deletion/DSAR workflow.
- Real identity/liveness/ID verification provider or a clear “recorded check only” product boundary; no generic “verified” marketing.
- Indexed scalable search/matching and asynchronous notification/publication jobs.
- Provider-backed payment/refund/chargeback/reconciliation workflow.
- Centralized rate-limit/idempotency/abuse state.
- Private media object storage, signed URLs, revocation and malware/content scanning at scale.
- Operational recipient approval, templating, opt-out, delivery audit and redacted worker view.

**P2/P3:**

- Member-visible security/session history and account recovery management.
- Explicit notification preferences and per-channel consent ledger.
- Appeals and transparency for photo/report/moderation decisions.
- Data export and deletion-request status tracking.
- Reliable native/PWA offline/camera behavior validated on real devices.
- Experiment/feature-flag governance and growth attribution that cannot store raw PII in URLs.

## 9. Remediation plan and release gates

### First 24 hours — contain

1. Disable/retire `/api/payment/webhook` in every environment except a quarantined test fixture; add a reverse-proxy deny rule while deploying the fix.
2. Disable live payment/publishing/WhatsApp CTAs until provider and rollback tests pass.
3. Block public ports 3000, 3001–3003, and 8000 at host and OCI layers; restrict bridges to private interfaces.
4. Preserve the live volume and capture an access-controlled backup; do not initialize or replace it.
5. Freeze the PM2/live release and produce an artifact/config/volume inventory; reconcile the live version against the reviewed SHA.
6. Remove raw phone/WhatsApp URLs from staff responses and rotate any bridge/API credentials whose exposure cannot be ruled out.

### First 3 days — close direct defects

1. Add owner/admin + CSRF protection to `/api/verify/request`.
2. Make referral lookup/share/poster capabilities owner/signed-token/approved-profile constrained and route-rate-limited.
3. Revoke contact grants on deletion and define retained financial/audit fields.
4. Put payment idempotency and payment state behind durable unique constraints.
5. Add regression tests for every reproduction above, including restart/two-process cases.
6. Complete `CONTROL_ACCOUNTS_JSON` provisioning and stage the exact release.

### First 2 weeks — prove production safety

1. Execute real provider sandboxes: OTP, Razorpay capture/authorized/failed/refund/chargeback, manual UPI reconciliation, WhatsApp queue/bridge failover, publishing dry-run/live opt-in and rollback.
2. Run backup/restore and rollback drills against a copy, recording RTO/RPO and reconciliation counts.
3. Install Chromium in CI and make visual/axe suites blocking.
4. Run concurrency tests with two backend processes and a distributed limiter/idempotency store.
5. Build the PostgreSQL/object-storage migration plan and benchmark indexed search with production-shaped synthetic fixtures.

### Release acceptance criteria

A release is not accepted until all are true:

- zero unauthenticated paid-benefit mutation paths;
- exact artifact SHA/version parity across staging/live;
- current data backup and verified restore completed;
- no public bridge/backend ports;
- TLS/Caddy/DNS/health/readiness/monitoring/rollback verified;
- provider and failure-path tests complete;
- raw secrets, recipient numbers, QR/pairing codes, bridge tokens and message bodies absent from public APIs/logs/worker views;
- deletion/contact-revocation behavior tested;
- visual/axe browser suites executed, not skipped;
- load test results for registration, search, interests, payment callbacks, media and queues recorded;
- no known local test failures and every repaired function covered by focused/E2E regression.

## 10. Test and build ledger

Executed without changing tracked source or production data:

- **Backend standalone suites:** `71` `test_*.py` scripts passed when each suite was run in its own process with its own documented test environment and isolated stores. This includes the 100-registration E2E suite and security/assault/wave suites.
- **Focused pytest suite:** `22 passed` in `backend/tests` with auth enforcement and isolated state.
- **Frontend lint/static/security:** `npm run lint` passed, including link, design, accessibility-static, route-frame, media-layout, control-finance, registration, matching, community, member-intel, API-client, observability and security checks.
- **Frontend production build:** `npm run build` passed; TypeScript compiled and 53 routes were generated. Warning: React 18 support is deprecated in Next.js 16.
- **Browser visual/axe:** both commands exited with an explicit Chromium-not-installed skip. This is **not a pass**.
- **Adversarial E1 runtime reproductions:** payment forgery, pending referral lookup/share, verification mutation, deletion/contact unlock, and staff raw phone/WhatsApp URL exposure all reproduced as described above.

The local tests are evidence of the tested contracts, not proof that the live PM2 deployment, real providers, TLS perimeter, backup, or million-user workload are safe.

## Final conclusion

Mana Vivaha should not be approved for public production scale in the reviewed state. The project has a credible safety-oriented foundation and many honest product decisions, but the current release boundary is broken by a real payment-forgery path, live deployment drift/perimeter exposure, privacy/consent defects, and a data architecture that cannot approach the stated scale. Fix the direct P0/P1 issues, preserve the live data, migrate the source of truth, and prove provider/perimeter/restore/rollback/load behavior before reopening launch consideration.
