# Mana Vivaha / Shubhalagnam — Principal Engineer Transformation Report

**Review date:** 2026-10-18 (Asia/Calcutta)

**Branch:** `arena/df1156ff-shubhalagnam`

**Decision:** **NO-GO for an unrestricted production launch**

**Scope:** architecture, code quality, registration, security, privacy, database, performance, DevOps, testing, product, AI/automation, and scale readiness.

This is the current engineering assessment, not a marketing document. The repository contains a substantial working product and many real hardening passes. It is not yet an enterprise-grade platform: the authoritative state is still a single-process, in-memory Python model backed by JSON snapshots, the public member session is bearer-token based and stored in browser storage, and several release gates are not verifiable from this sandbox. The right conclusion is **strong local product maturity with an unsafe enterprise-scale architecture**.

---

## 1. Executive decision

### What is genuinely strong

- Registration is now a real, durable workflow rather than a best-effort form submission: required photo, explicit consent, decoded-image validation, durable checkpointing, bounded retry recovery, and cleanup on failure are covered.
- A lost registration response can be retried with the same opaque browser key without creating a second profile. The key is stored as a SHA-256 digest only, and the key is bound to the phone/password pair.
- Photo and card visibility are separated from registration success. Pending/private/rejected media is not publicly served; approval and privacy state control the public card.
- The frontend no longer guesses a card URL or displays a referral-success banner from an input hint. It uses server-confirmed response state.
- OTP send/verify/reset transitions, password-lock state, token revocation, referral mutations, and core registration checkpoints have explicit persistence/rollback paths.
- Public profile serializers keep raw contact details private. Astrology/Porutham paths fail closed without reviewed Jathakam evidence; no synthetic score or guessed result is acceptable.
- Exact channel routing, finance/admin guards, mobile-first form behavior, touch-target checks, and production data-safety documentation are materially better than a superficial prototype.

### Why the launch is still NO-GO

1. **The system of record is not a transactional database.** `backend/main.py` keeps `DB_USERS`, interests, payments, OTPs, views, and other state in process memory and writes JSON snapshots. A second replica would have an independent memory image; last-writer-wins can silently discard the other replica's writes.
2. **The queue, rate limiter, and several security counters are process-local.** Restart or a second worker changes behavior. External messages, moderation publication, payment transitions, and abuse controls need durable/shared primitives before a horizontally scaled launch.
3. **The member bearer token is returned in JSON and stored in `localStorage`.** A future XSS or compromised browser extension can steal it. The backend has token-version revocation, but that does not undo theft before detection.
4. **Provider, backup/restore, browser/device, performance-load, monitoring, and disaster-recovery evidence is not complete.** A local green suite cannot prove SMS/OTP delivery, payment settlement, WhatsApp/Telegram behavior, CDN/object-storage durability, or real-device usability.
5. **There is no visible CI workflow or enforced coverage/load gate.** The standalone test scripts are useful, but release confidence still depends on a person running the right commands.

### Scorecard

Scores are deliberately separated: feature maturity is not production readiness.

| Dimension | Score | Honest interpretation |
|---|---:|---|
| Local functional/product maturity | **78/100** | Broad feature surface, meaningful regression suites, and strong domain-specific behavior. |
| Registration journey (local, controlled dependencies) | **86/100** | Durable retry and privacy/card truth are strong; real provider/browser/device evidence is still absent. |
| Security controls | **69/100** | Good ownership guards, validation, revocation, rate rules, and fail-closed paths; browser token exposure, shared-state gaps, CSP `unsafe-inline`, and dependency/release governance remain. |
| Production readiness | **55/100** | A controlled single-process deployment may be operated with careful runbooks; unrestricted launch is not justified. |
| Enterprise readiness | **32/100** | JSON/in-process state, local media, no HA database/queue, and incomplete SRE evidence are fundamental blockers. |
| FAANG-style engineering maturity | **42/100** | Good hardening intent and regression thinking, but insufficient platform boundaries, CI/CD enforcement, observability, typed contracts, and failure testing. |
| Startup growth readiness | **68/100** | The product can validate demand at low volume with disciplined operations; the growth engine must not be scaled before the data plane is replaced. |

**Meaning of the scores:** they are engineering judgment against the repository as inspected, not a benchmark or a claim of capacity. No score means the production gates are complete.

---

## 2. Evidence and test status

### Current local evidence

- `backend/main.py`: **11,430 lines** at review time, with a very large route/application boundary.
- `backend/requirements.txt` includes SQLAlchemy, psycopg2, and Redis clients, but the runtime system of record is still `db_store.py` plus JSON files; dependency presence is not integration.
- Production Compose intentionally runs Uvicorn with **one worker** and mounts one named local volume. That is consistent with the current architecture but is not high availability.
- Latest complete backend sweep after dependencies were installed in an isolated `.venv`: **68 `test_*.py` scripts passed, 0 failed**, including `backend/test_storage.py`. The complete sweep was run sequentially; the two focused suites were rerun after the final card fail-closed adjustment.
- Focused registration/security suite after the final adjustment: **24/24 checks passed**.
- Required-photo/metadata suite after the final adjustment: **8/8 checks passed**.
- Latest frontend `npm run lint && npm run build` passed, including static/security/accessibility baselines and the 53-page production build. The only build warning was the existing React 18/Next.js support deprecation warning.
- `git diff --check` passed.

### Evidence that is not yet available

- No real SMS/WhatsApp/Telegram provider delivery proof in this sandbox.
- No real payment-provider sandbox settlement/replay/failure sign-off.
- No browser visual/axe run or real-device keyboard, screen-reader, camera, slow-network, and small-screen sign-off because Chromium/system browser tooling is unavailable here.
- No production storage, off-host encrypted backup, restore drill, RPO/RTO measurement, alert routing, or disaster-recovery proof.
- No multi-process/multi-container consistency test against a shared data plane.
- No representative 1k/10k/100k load test with p95/p99, saturation, memory, disk, and recovery results.
- Prior `npm ci` reported five high-severity development-chain audit findings; the dependency audit must be rerun and dispositioned at release. No blind force-upgrade is recommended.

**Release rule:** the local green tests are a prerequisite, not a production declaration.

---

## 3. Material findings — severity, root cause, fix, best practice, risk, ROI

Severity uses **P0 = launch blocker/data or security catastrophe**, **P1 = must fix before meaningful scale or paid growth**, **P2 = important engineering/product debt**, and **P3 = cleanup**. Status says whether this branch implemented the safe portion.

### ARCH-01 — Single-process JSON state of record

- **Severity/status:** **P0 for enterprise scale; open migration.**
- **Problem:** `DB_USERS`, `DB_INTERESTS`, `DB_PAYMENTS`, `DB_OTPS`, views, saves, and related module state are loaded into Python collections. `backend/db_store.py` makes atomic JSON replacements, which prevents a torn file but does not provide SQL transactions, row locks, indexes, MVCC, replicas, or multi-writer correctness.
- **Impact:** Two processes can read the same snapshot and overwrite one another. Multi-step money/referral/interest operations can be interrupted between mutations. Search/matching is generally linear in profile count. A large JSON snapshot makes every durable write increasingly expensive and startup increasingly fragile.
- **Root cause:** The product grew feature-by-feature around module globals and independent JSON files. PostgreSQL/Redis dependencies and dev Compose services exist, but the application has not been migrated to them.
- **Exact fix:** Introduce a versioned persistence boundary, then migrate domain by domain:
  1. PostgreSQL tables for members, credentials, media references, interests/consent, payments/ledger, referrals, moderation, and audit events.
  2. Unique constraints on normalized phone, registration idempotency binding, referral code, payment provider id, and webhook event id.
  3. Explicit transactions for registration checkpoint, OTP consumption, password reset, interest credit deduction, referral reward, and payment verification.
  4. Read models/search indexes for public profiles; keyset pagination instead of offset scans.
  5. An idempotent JSON-to-Postgres migration with dry-run, checksums, duplicate report, shadow reads, canary cutover, and rollback to the preserved volume.
- **Implementation path:** Keep the JSON adapter behind `repositories/` temporarily. Add contract tests that run against both adapters. Do not have 30 modules call JSON globals after the first migration phase.
- **Best practice:** Database schema/migrations in version control, expand/contract migrations, connection pooling, read/write timeouts, transaction boundaries, and an explicit consistency model per endpoint.
- **Future risk if deferred:** Silent lost updates and unrecoverable divergence become more likely than visible exceptions. A database migration becomes harder after more data shapes and side effects accumulate.
- **Priority/ROI:** **P0 / highest ROI.** It unlocks replicas, reliable backups, indexes, analytics, and safe monetization.

### ARCH-02 — In-process queues and process-local abuse state

- **Severity/status:** **P0 for multi-instance operation; open.**
- **Problem:** rate buckets (`_RL_BUCKETS`), idempotency memory, background publisher/WhatsApp pools, and several counters are process-local or file-local. A worker restart loses transient decisions; a second worker does not share them.
- **Impact:** Duplicate OTPs/messages/payment work, uneven rate enforcement, lost jobs, and inconsistent status reporting. An attacker can rotate across replicas to bypass a limit.
- **Root cause:** Synchronous FastAPI routes and in-process worker evolution without a shared coordination layer.
- **Exact fix:** Redis for short-lived rate/idempotency keys and distributed locks; a durable queue (Redis Streams, RabbitMQ, SQS, or Kafka according to delivery requirements) for external side effects; an outbox table written in the same database transaction as the business mutation. Workers claim jobs with leases, exponential backoff, dead-letter queues, deduplication keys, and provider delivery state.
- **Improved contract:** `business_transaction -> outbox(event_id, aggregate_id, kind, payload_version) -> worker -> provider -> delivery_attempt`. A local queue insertion must never be described as provider delivery.
- **Best practice:** At-least-once delivery plus idempotent consumers, not an unprovable exactly-once claim.
- **Future risk:** Duplicate WhatsApp/payment notifications or unreconciled external state; rate limiting becomes cosmetic under horizontal scaling.
- **Priority/ROI:** **P0/P1, very high.** Shared abuse controls and an outbox should ship with the first database slice.

### AUTH-01 — Member bearer token exposed to JavaScript storage

- **Severity/status:** **P1 security; partially fixed.**
- **Problem:** The member `auth_token` is returned in the response and `frontend/src/app/register/page-client.tsx` stores it in `localStorage`; `frontend/src/lib/api.ts` attaches it as `X-Tsap-Token`. The default token TTL is 720 hours. Admin/vendor credentials also use browser storage in parts of the frontend.
- **Impact:** Any XSS, injected third-party script, malicious browser extension, or shared-machine compromise can exfiltrate a reusable account credential. Token-version revocation helps after detection but not before it.
- **Root cause:** A stateless header-token design was chosen to avoid ambient-cookie CSRF, and the frontend grew around local storage.
- **Exact fix:** Move the member session to an `HttpOnly; Secure; SameSite=Lax/Strict` cookie set by the backend or a same-origin BFF. Keep the TSAP id as non-secret UI state only. Add origin-checked CSRF tokens for every state-changing cookie-auth request, short idle/absolute TTLs, refresh rotation, logout invalidation, and cookie clearing. Do not put the bearer token in JSON after migration. Keep the legacy header in a time-boxed compatibility period with telemetry, then remove it.
- **Best practice:** HttpOnly cookies for browser sessions, no tokens in local/session storage, strict CSP with nonces, dependency pinning, and XSS regression tests.
- **Future risk:** A single frontend injection becomes account takeover rather than a contained UI bug.
- **Priority/ROI:** **P1 / high.** It is a high-value security reduction, but requires coordinated backend/frontend migration and CSRF testing.

### AUTH-02 — Token, password, and auth transition consistency

- **Severity/status:** **P1; safe portion implemented.**
- **Problem fixed here:** Registration no longer persists `auth_token` inside the user record; retry keys are hashed. OTP send/verify/reset and password failure counters are serialized and rollback-aware. The response still intentionally returns a token for the current compatibility contract.
- **Residual risk:** Existing legacy snapshots may contain old `auth_token` fields; all serializers/exporters must continue to exclude them. Password reset and token-version persistence remain dependent on the single local state volume.
- **Exact remaining fix:** Add a startup scrub/validation report for forbidden credential fields (without silently rewriting live data), rotate compromised legacy sessions, complete cookie migration, and move credential/session metadata to the transactional store.
- **Best practice:** Never persist response credentials in profile rows; versioned credentials, server-side session inventory or refresh-token rotation, and forced rotation after password/phone/security changes.
- **Priority/ROI:** **P1 / high.** The implemented change closes a concrete durable-secret leak; the cookie migration is the remaining larger step.

### SEC-01 — Rate limiting is not distributed

- **Severity/status:** **P1; local race hardening implemented, distributed fix open.**
- **Problem fixed here:** `backend/hardening.py` now protects the sliding-window check/append with `_RL_LOCK`, adds route-specific limits, and ignores spoofed forwarding headers unless the immediate peer is in `TRUSTED_PROXY_CIDRS`.
- **Residual problem:** `_RL_BUCKETS` is still memory-local. Restart clears it, and separate replicas do not coordinate.
- **Exact fix:** Redis token bucket/sliding-window keys with atomic Lua or a tested Redis library primitive. Key by trusted client identity plus account/phone where appropriate; add global/provider quotas for SMS and payment endpoints. Fail closed or degrade to a conservative local limit when Redis is unavailable; never silently disable limits in production.
- **Best practice:** Separate IP, account, device, and provider-cost controls; rate-limit expensive password hashing and image decode work; alert on provider-cost spikes.
- **Future risk:** OTP cost abuse, credential stuffing, referral poisoning, and denial of service.
- **Priority/ROI:** **P1 / high.** The current local fix is valuable for one worker; Redis is mandatory before replicas or paid acquisition.

### SEC-02 — Uploads were validated but not privacy-sanitized

- **Severity/status:** **P1 privacy; fixed in this branch, malware scanning remains open.**
- **Problem:** Saving accepted JPEG/PNG/WebP bytes verbatim can disclose EXIF/GPS/device metadata after moderation.
- **Exact fix implemented:** `backend/photo_validate.py:sanitize_photo()` decodes and re-encodes accepted media without EXIF/XMP/user metadata. Registration, profile upload, and selfie paths call it before `atomic_write_bytes`. A focused test creates embedded metadata and verifies the stored file has no EXIF.
- **Residual gap:** No antivirus/content-disarm service or asynchronous human/CV moderation is proven. A valid image is not identity verification, face matching, consent proof, or legal-identity proof.
- **Best practice:** Object storage quarantine, MIME/content sniffing, decode limits, metadata stripping, malware scanning, signed private URLs, immutable versioned media, and explicit human approval.
- **Future risk:** PII leakage, malicious image parser exposure, or a compromised media volume.
- **Priority/ROI:** **P1 / high.** Metadata stripping is low-risk and shipped; quarantine/scanning/object storage are scale work.

### PRIV-01 — Retention/deletion semantics are incomplete for regulated data

- **Severity/status:** **P1 compliance/product trust; open policy gate.**
- **Problem:** The account-delete docstring explicitly says deactivation does not erase all profile, payment, audit, or archive records. That may be correct for fraud/financial records, but no verified data-retention matrix, export workflow, erasure exception policy, or consent withdrawal SLA is established in this review.
- **Impact:** Privacy requests, minors/incorrect uploads, support incidents, and regulator inquiries become manual and inconsistent.
- **Root cause:** Feature state is spread across many JSON domains and media directories without one data inventory/subject index.
- **Exact fix:** Publish a data inventory mapping each field/file/media object to purpose, lawful basis/consent, retention period, access role, deletion/anonymization rule, legal hold, and processor. Implement a durable subject-deletion job with tombstones, media deletion, token revocation, referral/payment retention exceptions, audit evidence, and retry-safe completion status.
- **Best practice:** Data minimization, purpose limitation, privacy-by-design review for each new field, and an owner-approved legal policy before launch. This report does not provide legal advice.
- **Future risk:** Trust damage and non-compliance despite technically strong auth.
- **Priority/ROI:** **P1 / high for a public matrimonial service.**

### DB-01 — Multiple independent JSON stores and backup fragility

- **Severity/status:** **P1; atomic-write hardening exists, managed backup/restore open.**
- **Problem:** Core state plus referrals, vendors, stories, consent, retention, saved searches, promotions, WhatsApp pools, channel setup, and other domains have separate files and save paths. Atomic replace protects individual files but not a cross-file transaction or a point-in-time consistent set.
- **Impact:** A backup taken between file writes can represent incompatible versions. Restoring one file without its related media/ledger can produce false statuses.
- **Exact fix:** Until Postgres cutover, add a manifest with generation id, per-file hashes, media manifest, and a quiesced/snapshot backup procedure. Encrypt off-host backups, retain immutable copies, test restore into a separate volume, and record RPO/RTO. Do not call a ZIP export a disaster-recovery system until restore is proven.
- **Best practice:** Managed database PITR/WAL plus versioned object storage and a tested restore runbook.
- **Future risk:** Undetected recovery failure after disk loss, ransomware, operator error, or container replacement.
- **Priority/ROI:** **P1 / very high.** A restore drill is cheaper than data loss.

### API-01 — Weakly typed request contracts and a 11k-line application boundary

- **Severity/status:** **P1 maintainability/security; open refactor.**
- **Problem:** Many endpoints accept `payload: dict`, validate fields ad hoc, and share global mutable state in `main.py`. A single file has routing, auth, persistence, media, payments, moderation, referrals, matching, and external integration behavior.
- **Impact:** New fields can bypass validation, response contracts drift, review becomes difficult, and a local change can affect unrelated domains. Security invariants are harder to prove.
- **Root cause:** Organic feature accumulation without bounded contexts and contract ownership.
- **Exact fix:** Split into routers/services/repositories: `auth`, `members`, `media`, `moderation`, `interests`, `payments`, `referrals`, `admin`, and `integrations`. Define Pydantic request/response models with strict extra-field policy, shared validators, service-level authorization, and repository interfaces. Generate OpenAPI from those contracts and run schema compatibility tests.
- **Best practice:** Small modules, one transaction boundary per use case, dependency-injected repositories, typed errors, and architecture tests preventing cross-domain imports.
- **Future risk:** Security regressions hidden in copy/paste and unreviewable blast radius.
- **Priority/ROI:** **P1/P2 / high long-term.** Refactor incrementally behind contract tests; do not big-bang rewrite.

### PERF-01 — Linear scans and full JSON serialization

- **Severity/status:** **P1 at 10k+; open.**
- **Problem:** Search/matching/admin aggregation commonly iterates Python lists. A durable mutation serializes a broad snapshot. The existing local latency check is useful but only at fixture scale.
- **Impact:** Latency and CPU grow with member count; concurrent writes serialize; large responses risk memory spikes. A passing 2.9 ms local check is not a capacity result.
- **Exact fix:** PostgreSQL indexes and query plans for normalized gender/status/caste/state/district/age/approval/privacy; full-text/search engine only where justified; keyset pagination; bounded projections; Redis cache for safe public aggregates; async background recomputation for expensive dashboards.
- **Best practice:** Define p50/p95/p99 SLOs, load with realistic anonymized distributions, use `EXPLAIN ANALYZE`, and cap every page/export.
- **Future risk:** A growth campaign can turn a healthy small site into a self-inflicted outage.
- **Priority/ROI:** **P1 / very high after 10k.**

### PERF-02 — CPU-heavy password/image paths need a cost budget

- **Severity/status:** **P1 abuse resilience; partly implemented.**
- **Problem:** PBKDF2 is intentionally 600,000 iterations and images are decoded/analysed synchronously. That is defensible for security/quality but expensive under concurrent abuse.
- **Impact:** Login/register/upload bursts can exhaust worker CPU and increase tail latency.
- **Exact fix:** Keep the 600k KDF and migrate legacy hashes on successful login; use per-IP/account concurrency limits, queue large media processing, isolate CPU workers, set request/body/decode timeouts, and instrument CPU saturation. Evaluate Argon2id with a measured memory/time budget during a controlled migration, not a blind algorithm swap.
- **Best practice:** Benchmark on production-class hardware, cap concurrent expensive work, and alert on queue age/CPU.
- **Future risk:** Security controls themselves become an availability attack surface.
- **Priority/ROI:** **P1 / high before paid traffic.**

### SEC-03 — CSP is present but still permits inline script/style

- **Severity/status:** **P1 defense-in-depth; open.**
- **Problem:** `frontend/next.config.*` has a production CSP, but `script-src` and `style-src` include `'unsafe-inline'` to support current Next/inline content.
- **Impact:** CSP is materially weaker against injection than a nonce/hash-based policy.
- **Exact fix:** Add per-request nonces through the Next middleware/BFF, attach them to framework-required inline scripts/styles, replace inline event/style patterns, and run a report-only phase before enforcement. Preserve the explicit Razorpay and same-origin allowlist; do not add `*` for convenience.
- **Best practice:** Strict CSP with nonces/hashes, Trusted Types where practical, SRI for static third-party assets, and no unreviewed third-party scripts.
- **Future risk:** A future sanitization mistake has a larger blast radius.
- **Priority/ROI:** **P1 / medium-high.**

### SEC-04 — Admin/automation credentials and cookie CSRF need one coherent model

- **Severity/status:** **P1; open migration.**
- **Problem:** Owner control sessions use secure cookies, while legacy admin/API/vendor paths also accept header keys/browser-stored credentials. SameSite protection is useful but is not a complete formal CSRF strategy for every deployment/origin configuration.
- **Exact fix:** Make control-panel BFF routes the only browser path; use server-side role sessions, strict origin checks, CSRF tokens on mutations, key rotation/versioning, audit trails, and no admin secret in local storage. Keep automation keys server-to-server only and scoped per integration.
- **Best practice:** Separate human sessions from machine credentials; never use one global admin key for routine automation.
- **Future risk:** A leaked shared key has fleet-wide impact and weak attribution.
- **Priority/ROI:** **P1 / high for operations.**

### OBS-01 — Health is not observability

- **Severity/status:** **P1 SRE; open.**
- **Problem:** Health endpoints and logs exist, but no verified metrics/traces/central structured logs/alert routes/SLO dashboards are part of this release evidence. A 200 health response does not prove provider, queue, backup, or data freshness health.
- **Exact fix:** Add request metrics (route/status/latency), DB pool saturation, queue depth/age, OTP/payment provider outcomes, media failures, auth denials, rate-limit events, backup age/checksum, and dependency health. Use correlation/request ids with PII-safe logging. Define alerts with owners and runbooks.
- **Best practice:** RED metrics for APIs, USE metrics for resources, trace external calls, sample safely, and never log OTP/password/raw tokens.
- **Future risk:** Incidents are discovered by members and cannot be reconstructed.
- **Priority/ROI:** **P1 / very high.**

### DEVOPS-01 — No enforced CI/release supply-chain gate

- **Severity/status:** **P1; open.**
- **Problem:** No `.github` workflow is present in the inspected checkout. Tests are standalone scripts rather than an enforced CI matrix; frontend browser tests cannot run here; dependency audit findings are not dispositioned in code.
- **Exact fix:** Add CI on every PR: Python compile, isolated dependency install, all backend scripts, frontend lint/static/TypeScript/build, dependency audit with an allowlisted expiry, secret scan, SAST, container scan, SBOM, migration dry-run, and artifact signing. Add staging smoke and Playwright/axe jobs on a browser runner.
- **Best practice:** Reproducible lockfiles, pinned base images, least-privilege build, provenance/attestation, protected branch checks, and canary/rollback automation.
- **Future risk:** A green local branch can ship a known vulnerable dependency or an untested regression.
- **Priority/ROI:** **P1 / very high.**

### TEST-01 — Broad feature tests are not capacity or real-device tests

- **Severity/status:** **P1; open.**
- **Problem:** The 68-script sweep is valuable but mostly in-process API/invariant testing. It does not replace browser/device/provider/load/restart/multi-worker tests, and there is no measured coverage threshold.
- **Exact fix:** Add a test pyramid: unit/property tests for validators and ledger math; API contract tests; browser E2E for registration/OTP/payment/consent; Playwright mobile/keyboard/slow-network/camera tests; k6/Locust load stages; chaos tests for process kill/disk full/provider timeout; restart/restore tests; and mutation testing for critical authorization.
- **Best practice:** Every repaired function gets a focused regression (done for the current registration changes); every release gets an automated smoke and capacity gate.
- **Future risk:** Race, layout, and recovery defects appear only after launch.
- **Priority/ROI:** **P1 / high.**

### PROD-01 — External provider and DR gates are not verified

- **Severity/status:** **P0 launch gate; open by evidence, not necessarily code defect.**
- **Problem:** Local stubs/dry-run behavior cannot establish SMS delivery, WhatsApp/Telegram sender permissions, payment webhook settlement, backup integrity, restore timing, or real TLS/proxy configuration.
- **Exact fix:** In a production-like staging environment, use controlled provider sandbox accounts and test handsets. Record request ids and outcomes for OTP expiry/replay, payment signature/amount/currency/replay/refund, queue retries, provider outage, and operator-visible status. Take an encrypted off-host backup, destroy only the disposable clone, restore it, verify counts/media/permissions, and record measured RPO/RTO.
- **Best practice:** No fake payment proof, no guessed channel URL, no “sent” claim for a queued job, and no production launch without an owner-signed checklist.
- **Future risk:** False success messages, financial loss, or irreversible member-data loss.
- **Priority/ROI:** **P0 / mandatory before launch.**

### PROD-02 — Local media volume is not an enterprise media plane

- **Severity/status:** **P1; open.**
- **Problem:** Photos/cards are on the named application volume. One volume can be durable enough for a single host but is not object-storage durability, cross-zone replication, CDN delivery, signed access, or lifecycle management.
- **Exact fix:** Upload to a private quarantine bucket, sanitize/scan, store immutable object version and metadata in the database, approve by state transition, serve short-lived signed URLs through a CDN, and replicate media. Keep the current local path as a migration adapter only.
- **Best practice:** No public bucket, no permanent filesystem path in records, separate private originals from transformed public derivatives, and deletion/versioning tied to retention policy.
- **Future risk:** Host loss, disk exhaustion, slow media responses, and inconsistent restore.
- **Priority/ROI:** **P1 / high once volume grows.**

### PROD-03 — Secrets/configuration can be correctly documented but still operationally unsafe

- **Severity/status:** **P1; open operational gate.**
- **Problem:** `.env.example` and deployment documentation are careful, but environment configuration is still the deployment operator's responsibility; there is no demonstrated secret manager, rotation rehearsal, config schema validation in CI, or stale-secret alert.
- **Exact fix:** Use a secret manager/KMS, inject at runtime, validate a typed configuration object at startup, prohibit production defaults, rotate each provider key in staging, and test rollback with old/new key overlap. Scan commits and images for secrets.
- **Best practice:** Least privilege, one credential per service, short-lived cloud identity, no secrets in frontend build args unless genuinely public.
- **Future risk:** Key reuse, accidental exposure, or an emergency rotation that breaks all integrations.
- **Priority/ROI:** **P1 / high.**

### CODE-01 — Documentation and historical audit drift

- **Severity/status:** **P2; open.**
- **Problem:** The repository contains many wave/plan/audit documents with different historical dates and claims. Some accurately say they are historical, but engineers can still mistake a prior count or readiness statement for current truth.
- **Exact fix:** Add `docs/` with current architecture decision records, a single release status page, an evidence timestamp, and an archive banner on historical reports. Make route/schema ownership discoverable.
- **Best practice:** Documentation-as-code checked for stale commands and status claims.
- **Future risk:** Operators follow obsolete deployment or privacy instructions.
- **Priority/ROI:** **P2 / medium.**

### CODE-02 — Accidental runtime fixture mutation during tests

- **Severity/status:** **P2; managed but worth enforcing.**
- **Problem:** Test execution modified `backend/weekly_showcase.json` in the working tree; it was restored before delivery. This shows a test isolation boundary can still be violated by a module that reads its environment too early or writes a repository fixture.
- **Exact fix:** Make every test set all state paths before imports, add a repository-write guard in test setup, run tests in a disposable container/worktree, and assert `git diff --exit-code` for tracked runtime files after the suite.
- **Best practice:** No test writes tracked files; fixtures are immutable; runtime state is always outside the checkout.
- **Future risk:** CI artifacts or production-like data accidentally enter a release commit.
- **Priority/ROI:** **P2 / medium.**

---

## 4. What was transformed in this branch

### Registration and authorization

- Added synchronous client submit locking and disabled alternate submit controls while a request is active.
- Added XHR upload progress, bounded response handling, draft/retry recovery, and a single opaque registration key retained only while the journey is recoverable.
- Added server-side registration-key hashing, same-key phone/password binding, rejection of key reuse for another profile, and safe recovery before re-upload when a browser refresh loses the in-memory File object.
- Added a durable registration checkpoint before enrichment/side effects and cleanup of photo/card artifacts when the checkpoint fails.
- Removed guessed card URLs in the success UI; only a server-confirmed URL is rendered.
- Made nested referral-success UI depend on server truth rather than a referral input hint.
- Added card replacement serialization, privacy/moderation-aware regeneration, and fail-closed handling when an approved photo is missing.
- Added OTP send serialization, durable send/attempt/consume checkpoints, password-lock synchronization, and rollback of user/OTP/token mutations on persistence failure.
- Removed the registration response token from the durable user record; it remains a response credential only until the cookie migration is shipped.
- Added trusted-proxy CIDR configuration and right-to-left forwarded-chain parsing. Direct clients cannot rotate their identity by sending arbitrary `X-Forwarded-For` headers.
- Tightened referral code/source validation, replay handling, and dual-member locking.

### Media/privacy

- Added metadata-stripping re-encoding for accepted profile/selfie images.
- Added an explicit regression proving embedded EXIF is absent from stored media.
- Kept pending/private/rejected photos non-public and maintained evidence-only moderation language.

### Coverage

- Added `backend/test_registration_security_deep.py` with 24 focused checks.
- Expanded the required-photo suite to 8 checks, including EXIF removal.
- Added `frontend/scripts/registration-submit.test.mjs` and wired it into `test:static`.

These are safe incremental changes. They do **not** pretend to complete the database/queue/object-storage migration.

---

## 5. Scale handling analysis

This table is an architecture decision aid, not a capacity promise. Actual limits must be measured with representative traffic, profile sizes, media sizes, provider latency, and operational SLOs.

| Registered users | What the current design can likely handle | Dominant risks | Required decision |
|---:|---|---|---|
| **1,000** | A single carefully operated instance can plausibly serve low/moderate traffic if the volume is healthy, snapshots are small, and external jobs are limited. This is a qualitative judgment, not a benchmark. | Full scans, manual backup, local queue loss, single-host failure, token/local-rate state. | Pilot only with strict backup/restore and provider staging gates. |
| **10,000** | May remain usable for low traffic on one process, but the absence of indexed queries and shared state makes growth campaigns risky. | Snapshot/write latency, search scans, CPU from KDF/uploads, growing media, operational contention. | Begin Postgres/Redis/object-storage/outbox migration before paid acquisition. |
| **100,000** | **Not safe to claim.** The one-process JSON architecture becomes a reliability bottleneck. | Multi-minute/large snapshots, memory, O(N) matching, lost concurrent writes, disk/restore windows, queue and rate bypass. | Database and queue migration is mandatory; introduce stateless API replicas and load testing. |
| **1,000,000** | **Not viable with the current data plane.** | Everything above plus search/indexing, analytics, moderation throughput, media delivery, partitioning, abuse/fraud, regional latency. | Distributed architecture: partitioned/managed Postgres, search index, Redis, object storage/CDN, worker fleet, event pipeline, SRE on-call. |
| **10,000,000** | **Requires a different platform architecture, not tuning.** | Regional failover, data residency/privacy, high-cardinality abuse, recommendation retrieval, event volume, multi-tenant operations, cost controls. | Cell/region architecture, sharded or partitioned transactional data, dedicated search/recommendation platform, streaming/event infrastructure, formal platform team. |

### Target architecture by growth phase

**Phase A — controlled pilot (0–10k):** one API replica is acceptable only as a temporary constraint; Postgres, Redis, object storage, outbox worker, structured logs, and tested backups should be introduced before the upper end of this band.

**Phase B — growth (10k–100k):** stateless API replicas behind a load balancer; PgBouncer/managed Postgres; Redis for limits/cache; object storage/CDN; durable job workers; indexed search; separate admin/worker plane; provider circuit breakers; k6/Locust capacity gates.

**Phase C — scale (100k–1m):** read replicas and query-specific read models; OpenSearch/Typesense only where PostgreSQL search is insufficient; partition event/ledger tables; moderation queues with SLA; data warehouse/event pipeline; regional media delivery; fraud/risk service.

**Phase D — 1m–10m:** cell-based isolation, regional failover, partition/shard strategy, multi-region object storage, privacy/data-residency controls, dedicated reliability/security/product platform teams, and an ML feature store/retrieval layer that remains evidence-based.

---

## 6. Performance plan and measurable SLOs

### Baseline to establish

For each release candidate, measure p50/p95/p99 and error rate for: home, public search/profile, register without/with media, OTP send/verify, login, interest send/respond, payment order/verify, admin moderation, and card/photo delivery. Record CPU, RSS, disk I/O, JSON size, media size, queue depth, provider latency, and restart recovery time.

### Suggested initial targets

- Public read API: p95 < 300 ms, p99 < 800 ms at agreed load.
- Registration with a 5 MB upload: p95 < 5 s excluding provider delivery; no request should hold a worker indefinitely.
- OTP provider acknowledgment: expose `queued/accepted/failed`, not `delivered`, unless provider confirms delivery.
- Error budget: start with 99.5% monthly availability for pilot, move to 99.9% only after managed state/observability/restore evidence.
- RPO/RTO: pilot target RPO 15 minutes/RTO 1 hour; enterprise target RPO 5 minutes/RTO 30 minutes, subject to provider and budget sign-off.

### High-ROI implementation order

1. Stop full-state writes for hot paths by moving the registration/OTP/payment/interest slices to Postgres.
2. Add query indexes and bounded projections before adding a separate search engine.
3. Move media to quarantine/object storage/CDN.
4. Add Redis/shared rate limits and a durable outbox.
5. Load test the real staging topology, then tune workers/connection pools based on measurements rather than guesses.

---

## 7. Security and privacy audit summary

### Controls that should be preserved

- Server-side ownership checks and admin/staff role separation.
- Constant-time comparison for secrets and signed-token verification.
- 600k PBKDF2-HMAC-SHA256 current password hashes with legacy compatibility and future migration path.
- OTP attempt limits, expiry, single-use consumption, and token revocation on password reset.
- Photo decoded-format/dimension/size/quality checks, metadata stripping, human moderation, and private media access.
- Strict profile serializers, masked phone display, consent ledger language, and no public number unlock merely because a user paid.
- No fabricated astrology, horoscope, Jathakam, Porutham, trust score, or verification claim.
- Trusted proxy configuration that fails closed rather than trusting arbitrary forwarding headers.

### Security tests still required

- XSS/DOM injection scan against every member-entered field and every rendered Markdown/HTML path.
- Browser token-theft regression after the cookie migration.
- CSRF and origin tests for control sessions.
- Multipart decompression/CPU/memory fuzzing and image parser CVE exercise.
- Authorization matrix generated from OpenAPI: anonymous/member-owner/other-member/staff/owner/automation.
- Payment webhook property tests for signatures, amount/currency, provider event idempotency, replay, timeout, and out-of-order events.
- Secret/key rotation and compromised-token incident drill.
- Restore-from-backup authorization and media privacy test.

---

## 8. AI and automation strategy — useful, evidence-only, and safe

The product must not use AI to invent compatibility, horoscope, verification, or identity conclusions. AI can reduce operator work only when its evidence and uncertainty are visible.

### Safe near-term automations

1. **Moderation assist:** classify blur/duplicate/group/unsafe-content signals and route to a human. Never auto-approve identity or consent solely from a model.
2. **Fraud/risk triage:** detect velocity anomalies, duplicate-device patterns, referral rings, OTP abuse, and payment mismatch. Use a risk flag plus reason codes; do not silently ban without an appeal path.
3. **Support/operator copilot:** summarize an auditable member timeline, provider failures, and consent events. Redact phone/password/token/photo data by default.
4. **Search/matching explanations:** retrieve only member-entered facts and explicit preferences. Show the evidence fields and say when data is missing; never turn a model score into a matrimonial truth claim.
5. **Content operations:** draft Telugu/English messages from approved templates and exact supplied channel mappings. An owner must approve new destinations/copy before external publication.

### AI governance required before use

- Data-processing/vendor review, retention and opt-out controls.
- Prompt/response redaction, tenant isolation, encryption, and no training on private member data without explicit lawful permission.
- Golden evaluation sets for Telugu/English, caste/religion sensitivity, false positives, and safety.
- Versioned prompts/models, reason codes, audit logs, human override, kill switch, cost/latency budgets, and rollback.
- A hard policy: a model may not fabricate a Jathakam/Porutham result or claim identity/phone/photo verification without evidence.

---

## 9. Product and startup-growth assessment

### Product strengths

The registration CTA remains prominent, the journey is mobile-first, referral and community pathways are preserved, privacy and verification copy is honest, and the result screen avoids claiming a card or referral success that the server did not confirm. This is the right trust posture for a matrimonial product.

### Product risks

- A successful local registration is not yet proof that a real OTP provider, media CDN, or follow-up notification works.
- “Top matches” must remain factual observations/filters, not an unexplained compatibility score. The current evidence-only direction should be protected by response-schema tests.
- Growth loops (referral clicks, channel posting, welcome messages) must be measured by durable event ids and provider-confirmed outcomes, not queued counts.
- Payment conversion should be optimized only after contact-consent semantics, refund/chargeback handling, and support ownership are verified.

### Metrics to add

Funnel: landing -> start -> photo accepted -> consent -> submit -> durable success -> OTP verified -> profile approved -> first search -> first interest -> accepted consent -> paid plan -> repeat/referral.

Trust: photo rejection reason, abuse rate, report response time, false-positive moderation, deletion completion time.

Reliability: provider success, queue age, duplicate suppression, restore age, p95/p99, crash/restart recovery.

Growth experiments must be cohort-based, privacy-minimized, reversible, and never remove the prominent registration path or pressure users to bypass consent.

---

## 10. DevOps, release, and incident checklist

### Before a controlled pilot

- [ ] Use `APP_ENV=production`, real high-entropy secrets from a secret manager, and exact trusted-proxy CIDRs.
- [ ] Run `docker compose ... config --quiet`, build both images, and scan the images/SBOM.
- [ ] Run all 68 backend scripts, frontend lint/static/type/build, and browser E2E on a browser runner.
- [ ] Stage real OTP/payment sandbox credentials and verify honest queued/accepted/failed states.
- [ ] Exercise registration retries across slow upload, browser refresh, dropped response, timeout, and restart.
- [ ] Perform owner/staff/anonymous authorization matrix and a real mobile/device pass.
- [ ] Take encrypted off-host backup, restore a disposable clone, verify records/media, and record RPO/RTO.
- [ ] Configure metrics/logs/alerts/on-call and a rollback image.

### Before paid acquisition or multiple API replicas

- [ ] Postgres schema/migration/cutover plan approved.
- [ ] Redis/shared limits and idempotency deployed.
- [ ] Durable outbox and worker delivery state deployed.
- [ ] Object storage quarantine/scan/CDN/signing deployed.
- [ ] Load test passed at projected peak plus headroom.
- [ ] Cookie session migration and strict CSP completed.
- [ ] Data-retention/deletion matrix and support workflow approved.

### Incident priorities

1. Member data exposure or credential theft: revoke versions, rotate secrets, disable public media, preserve forensics, notify the owner/privacy lead.
2. Payment mismatch: stop fulfillment, quarantine the event, reconcile provider ids and ledger transactionally, never “fix” by manual credit without audit.
3. Provider outage: show unavailable/queued status, do not claim delivery, apply circuit breaker and retry policy.
4. Data corruption: stop writes, preserve source volume, restore a clone, compare manifests, then cut over only with owner approval.

---

## 11. Final verdict

**Do not call this production-ready or enterprise-ready yet.**

The current branch has earned a stronger claim: it is a **well-tested, security-conscious single-process pilot foundation with a hardened registration path**. That is valuable and materially different from a superficial demo. The next highest-return work is not another UI feature; it is the transactional data-plane migration, shared queue/rate controls, object-storage/backup evidence, browser/provider gates, and CI enforcement.

Once those gates are completed and measured, the score can move honestly:

- Production readiness can move from 55 toward 80+ after provider/DR/browser/observability gates.
- Enterprise readiness cannot move above the mid-50s without Postgres/Redis/object storage/outbox and a tested HA topology.
- The 1m/10m user targets require the Phase C/D architecture; they are not reachable by adding more Uvicorn workers to the current JSON store.

The honest product promise should remain: **privacy and consent are enforced, verification is described only when evidence exists, queued work is not called delivered, and astrology results are never invented.**
