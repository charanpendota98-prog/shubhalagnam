# Mana Vivaha — Oracle Cloud Free Tier Transformation Plan

**Operating brief:** Build a category-leading Telugu matrimony platform without pretending that a single free VM is a hyperscale system. Ship a trusted, low-cost pilot first; make every state transition transactional; keep privacy/consent/verification claims honest; and migrate the data plane before growth outruns it.

**Date:** 2026-10-18
**Current implementation branch:** `arena/df1156ff-shubhalagnam`
**Delivery mode:** incremental, test-gated, reversible

> OCI Always Free capacity, ARM availability, Load Balancer availability, Object Storage quotas, and regional capacity vary by tenancy and region. The resource numbers below are a planning baseline to verify in the OCI Console before provisioning—not a promise of quota.

---

## 1. Product blueprint

### 1.1 Purpose

Mana Vivaha is a Telugu-first matrimony and family-assisted introduction service for people and families connected to Telangana and Andhra Pradesh. Members submit profiles, choose privacy settings, browse factual profile information, send limited interest requests, and exchange contact details only through an owner-consent flow. Community directories, referrals, moderation, optional provider messaging, and vendor services support the core introduction journey.

### 1.2 Target users

1. **Primary members:** adults seeking a Telugu matrimony introduction, including first-marriage, remarriage, NRI, and cross-region profiles.
2. **Family decision-makers:** parents/guardians who need clear profile facts, privacy boundaries, and a safe handoff to the member.
3. **Trust operators:** owner, moderation, support, and fraud-review staff with least-privilege roles.
4. **Referral partners:** members and approved local partners who share a tracked invitation without receiving private contact data.
5. **Vendors:** wedding ecosystem businesses requiring clearly scoped listings or promotional packages.
6. **Future B2B customers:** bureaus and community organizations that need a tenant-isolated, consent-aware workflow—not an unrestricted data export.

### 1.3 Core value proposition

> **A Telugu-first, evidence-led introduction workflow where privacy and consent are enforced by the system, not left to copy or operator memory.**

The defensible product promise is not “guaranteed match,” “perfect Porutham,” or “verified every detail.” It is:

- better local language and community context;
- a clear, mobile-first registration journey;
- factual, member-submitted profile information;
- explicit photo/moderation/verification states;
- no public phone-number exposure;
- an auditable interest-to-consent handoff;
- honest delivery states for OTP, payment, and messaging.

### 1.4 Shipped capability map

| Area | Current capability | Product rule to preserve |
|---|---|---|
| Registration | Multi-step bilingual form, required photo, consent, password, referral, durable retry | Never lose a committed registration or create a false success |
| Profiles | Member-submitted facts, completeness guidance, privacy-safe public serializer | Missing data is unknown; not a guessed fact |
| Photos | Decoded format/quality validation, moderation, private/pending/public states, sanitized media | Approval is not identity verification |
| Search/matching | Explicit filters and factual observations | No synthetic compatibility or trust score |
| Interest | Limited requests, accept/decline/withdraw/expiry, consent ledger | Payment does not bypass consent |
| Auth | Password/OTP, ownership guards, token versions, rate controls | Move browser sessions to HttpOnly cookies in the next auth phase |
| Referrals | Code validation, credit reward, qualifying payment commission rules, replay controls | Never imply cash eligibility/delivery before durable evidence |
| Payments | Provider-oriented plans and manual/admin controls | No fake payment proof or auto-approval in production |
| Moderation | Owner/staff roles, photo/profile actions, audit paths | Staff cannot access owner-only money/PII operations |
| Astrology | Evidence-only Jathakam/Porutham paths | Never fabricate a score, verdict, or birth fact |
| Channels | Canonical configured mappings and route reasons | Supplied URLs only; external availability is not inferred |
| Media | Stable wedding media/fallbacks and mobile layout tests | Never let a failed asset collapse the journey |
| Admin | Directory, moderation, finance/referral/retention controls | Every sensitive action is role-gated and auditable |

### 1.5 Missing capabilities that block category leadership

- transactional relational data plane and migrations;
- shared rate-limit/idempotency/queue infrastructure;
- object-storage media pipeline with quarantine, scanning, CDN, and lifecycle;
- browser session cookie migration and nonce CSP;
- complete data-retention/erasure/export workflow;
- real provider sandbox and device certification;
- multi-tenant isolation and bureau administration;
- measurable SLOs, traces, metrics, alerts, and incident runbooks;
- experiment/feature-flag system with privacy-safe analytics;
- search index/read model for large catalogs;
- human-in-the-loop fraud/moderation work queues;
- automated CI/CD, SBOM, provenance, dependency disposition, and rollback;
- customer support case management and dispute/refund workflows.

### 1.6 Hidden opportunities

1. **Family-safe workflow:** allow a family representative to assist without granting them permanent access to the member's phone/password or consent decisions.
2. **Trust passport:** a transparent, evidence ledger showing photo review, phone OTP, self-reported fields, and optional document review as separate badges.
3. **Community quality network:** local moderators and verified bureau partners can improve response quality without exporting the directory.
4. **Low-bandwidth excellence:** resumable image upload, aggressive derivative sizing, server-rendered public pages, and a text-first fallback can outperform heavier incumbents for regional mobile users.
5. **Consent graph:** explain exactly who requested contact, what was accepted, when access expires, and how to revoke future access.
6. **Provider-independent messaging:** an outbox model can switch SMS/WhatsApp/Telegram providers without changing the member workflow.
7. **Evidence-based recommendations:** retrieve shared preferences and member-entered facts, then explain the evidence instead of producing a black-box “match score.”
8. **Bureau SaaS:** tenant-scoped pipelines, not a copied marketplace directory, can create recurring revenue while preserving member privacy.
9. **Wedding-services marketplace:** introduce vendors only after the core trust funnel works; keep vendor promotion separate from member ranking.
10. **Data moat with consent:** aggregate demand/supply and funnel analytics without exposing individual profiles or inventing outcomes.

### 1.7 Business model options

Prioritize the least trust-destructive models:

1. consumer request-credit plans;
2. optional assisted onboarding/photo/document review with explicit deliverables;
3. bureau subscription with tenant-isolated seats and audit;
4. vendor listings and clearly labeled sponsored placements;
5. referral acquisition with a capped, auditable reward;
6. premium privacy/convenience features that do not bypass consent;
7. APIs for a bureau's own tenant data, never a public member-data resale API.

Do not monetize contact privacy violations, fabricated verification, undisclosed ranking, or unrequested messaging.

### 1.8 Competitive and category benchmark

This is a capability benchmark, not a claim that any competitor has a particular internal implementation. Benchmark against the strongest patterns in Indian matrimony, Telugu-local directories, family-assisted services, and trusted SaaS:

| Benchmark | What to learn | Mana Vivaha counter-position |
|---|---|---|
| National matrimony marketplaces | large supply, paid contact workflows, search breadth | local Telugu depth, privacy-by-default, evidence ledger |
| Telugu/community directories | language, geography, community trust | structured consent and moderation instead of static listings |
| Assisted matchmakers/bureaus | family context, human follow-up, high-touch conversion | bureau-ready workflow with operator audit and tenant isolation |
| Airbnb-style discovery | fast filters, availability/quality explanations, mobile clarity | factual filter reasons and no invented compatibility |
| Stripe-style checkout | explicit states, idempotency, reconciliation | payment state machine and honest provider outcomes |
| WhatsApp/referral growth | low-friction sharing and network effects | per-person invite consent, dedupe, capped reward |
| Netflix/experimentation practice | measurable cohorts and rollback | privacy-safe experiments with trust/error-budget guardrails |
| Modern SaaS admin consoles | roles, audit, queues, operational visibility | owner/staff separation and evidence-linked moderation |

Win on **trust density per interaction**, not on the biggest unverified directory or the loudest compatibility claim.

### 1.9 Exact scorecard

Scores are directional launch-planning scores from 0–100. They are not user research, uptime evidence, or an independent security certification. The denominator and decision use are explicit so the scores can be re-scored after each gate.

| Dimension | Score | Evidence/meaning |
|---|---:|---|
| Telugu/local value proposition | 84 | language, districts, community workflows exist |
| Registration journey | 86 | durable retry, photo/consent gates, focused E2E coverage |
| Trust/privacy posture | 88 | safe serializers, consent, moderation honesty, cookie migration |
| Accessibility/mobile foundation | 82 | static a11y/touch/media gates; real-device gate pending |
| Search/discovery experience | 73 | factual filters/reasons; indexed scale read model pending |
| Monetization readiness | 68 | plans/ledger guards exist; provider reconciliation gate pending |
| Growth/referral readiness | 76 | dedupe/qualification controls; cohort economics pending |
| AI readiness | 61 | evidence rules documented; async job/evaluation plane pending |
| API/modularity | 64 | modular monolith seams; relational repositories pending |
| Performance at 10k | 49 | one-writer JSON is a hard ceiling; indexed store pending |
| Security hardening | 79 | authorization/rate/body/cookie-CSRF controls; external review pending |
| Observability/operations | 58 | request IDs/deploy artifacts; live OCI alarms pending |
| Disaster recovery | 55 | guarded scripts/runbook; real restore drill pending |
| OCI pilot fit | 86 | resource-capped single-node design; quota/provider gates pending |
| Public production readiness | 32 | intentionally NO-GO until external gates pass |

**Weighted launch score:** 67/100 for a controlled pilot build; **public-production score: 32/100**. The lower production score is intentional: local tests cannot prove provider delivery, domain/TLS, OCI quota, browser/device behavior, backup restore, or incident response.

---

## 2. Target architecture

### 2.1 Free Tier deployment: now through 10k members

```text
Internet
   |
OCI DNS / optional Always Free Load Balancer (only when a second ingress exists)
   |
Caddy on one OCI Ampere A1 VM :80/:443
   |--------------------------|
Next.js standalone          FastAPI one worker
:3000 loopback              :8000 internal only
                                  |
                         transactional store adapter
                         (migration phase: JSON single-writer)
                                  |
                 private block volume: state + media during pilot
                                  |
           OCI Object Storage backup/restore copies, never live source
```

**Do not expose:** backend port, PostgreSQL/Redis ports, Docker socket, management panels, media directories, or provider credentials.

**Pilot constraint:** one writer is a deliberate safety constraint while the JSON adapter remains. Do not add Uvicorn workers or replicas until the relational store, shared idempotency, and queue are live.

### 2.2 Target modular architecture

```text
apps/web                  Next.js public/member/control UI
apps/api                  FastAPI routers + typed contracts
services/identity         sessions, OTP, credential lifecycle
services/member           profile, privacy, consent, moderation state
services/discovery        indexed search and explainable retrieval
services/ledger           credits, payments, referrals, refunds
services/media            quarantine, scan, derivatives, signed URLs
services/communications   outbox workers and provider adapters
services/operations       moderation, support, audit, retention
platform/config           typed environment and feature flags
platform/events           outbox/event schemas and consumers
repositories/*            PostgreSQL/Redis/object-storage adapters
```

Begin as a modular monolith. Extract a service only when it has an independent scaling/failure boundary and an owner. “Microservices” without transactions, observability, and operational capacity is a downgrade.

### 2.3 Clean architecture boundaries

- **Domain:** entities, value objects, state machines, policy decisions; no FastAPI, Redis, Pillow, or provider imports.
- **Application:** use cases such as `RegisterMember`, `ApprovePhoto`, `SendInterest`, `AcceptInterest`, `VerifyPayment`; owns transaction boundaries and idempotency.
- **Adapters:** SQL repositories, Redis limits, S3-compatible media, SMS/WhatsApp/Razorpay clients, queue workers.
- **API:** Pydantic request/response contracts, authentication dependencies, status/error mapping, request id.
- **UI:** server-rendered public pages, client interactivity only where necessary, API client with typed results and safe media paths.

### 2.4 Plugin architecture

Every external capability receives a narrow interface:

```python
class OtpProvider(Protocol):
    def send(self, *, phone: str, purpose: str, request_id: str) -> ProviderResult: ...

class MessageProvider(Protocol):
    def enqueue(self, *, destination: str, body: str, event_id: str) -> ProviderResult: ...

class MediaScanner(Protocol):
    def scan(self, *, object_key: str, sha256: str) -> ScanResult: ...

class PaymentGateway(Protocol):
    def verify(self, *, provider_event: Mapping[str, Any]) -> PaymentResult: ...
```

Adapters must return `accepted`, `queued`, `delivered`, `failed`, or `unknown`; never collapse those states into `True`.

### 2.5 API architecture

- `/api/v1` for stable member contracts; preserve compatibility aliases only with sunset dates.
- Pydantic models with `extra="forbid"` for sensitive commands.
- Idempotency key required for registration, payment creation, webhook event, interest send, payout, and moderation mutation.
- Problem-details error shape: `code`, `message_en`, `message_te`, `request_id`, `retryable`, `field_errors`.
- Cursor pagination for profiles/events; hard maximum page size.
- ETags for versioned public catalogs and immutable card/media derivatives.
- OpenAPI contract diff in CI.
- No private contact fields in a public response type.

### 2.6 Database architecture

**Core tables:**

- `tenants`, `tenant_memberships`, `roles`
- `members`, `member_private`, `member_preferences`
- `credentials`, `sessions`, `otp_challenges`, `security_events`
- `media_objects`, `media_derivatives`, `media_reviews`
- `interests`, `interest_events`, `contact_grants`
- `plans`, `entitlements`, `payment_orders`, `payment_events`, `ledger_entries`
- `referral_codes`, `referral_events`, `referral_rewards`, `payout_requests`
- `outbox_events`, `delivery_attempts`, `dead_letters`
- `reports`, `blocks`, `moderation_cases`, `audit_events`
- `retention_jobs`, `deletion_requests`, `legal_holds`

**Required constraints:** normalized phone uniqueness per tenant, immutable provider event id, unique idempotency scope/key, check constraints for state transitions, foreign keys, `created_at`/`updated_at`, optimistic version, encrypted/private columns where needed.

**Indexes:** approval/privacy/gender/state/district/caste; normalized search fields; interest owner/status; payment provider id/status; outbox status/next attempt; moderation status/priority.

### 2.7 AI service architecture

Keep AI off the critical registration/payment path. Use an asynchronous `ai_jobs` table/queue with:

- tenant/member data classification;
- redaction and consent policy;
- model/prompt version;
- input/output hashes and cost/latency;
- evidence references;
- human decision/override;
- retention and deletion linkage;
- kill switch and provider timeout.

AI can summarize or retrieve evidence; it cannot invent astrological results, identity verification, consent, or contact information.

### 2.8 Multi-tenant architecture

Use `tenant_id` in every tenant-owned row and repository method. Enforce tenant context from the authenticated session, not a user-provided body field. Start with shared tables plus PostgreSQL row-level security; move high-value bureaus to separate schemas/cells if needed. Never use a global admin key to access all tenants without an audited break-glass path.

---

## 3. OCI Free Tier architecture and operating budget

### 3.1 Resource plan

Design baseline for an Oracle Always Free Ampere A1 shape of up to **4 OCPU / 24 GB RAM**, subject to regional quota. If only a smaller shape is available, reduce the limits proportionally.

| Component | CPU budget | RAM budget | Storage/network rule |
|---|---:|---:|---|
| FastAPI one writer | 1.75 OCPU | 4 GB | No host port; JSON/media volume only during pilot |
| Next standalone server | 1 OCPU | 1.5 GB | Read-only image, loopback port |
| Caddy + host agents | 0.25 OCPU | 512 MB | 80/443 only |
| Postgres migration slice | 0.75 OCPU | 2–4 GB | Add only after measuring; do not run unused services |
| Redis/shared limits | 0.25 OCPU | 256–512 MB | Maxmemory + eviction policy for ephemeral keys |
| OS/page cache/headroom | — | 6+ GB | Never allocate the whole VM to containers |

Use Compose `cpus`, `mem_limit`, `pids_limit`, read-only root filesystems, bounded JSON logs, and no development bind mounts in production. The current branch now includes those limits and standalone Next runtime packaging.

### 3.2 Network

- VCN with public subnet only for the ingress VM during the single-node phase.
- Security list/NSG: TCP 80/443 from the internet; SSH only from an operator IP or VPN; deny 3000/8000/5432/6379/3001–3003.
- Caddy terminates TLS and adds trusted proxy headers.
- Set `TRUSTED_PROXY_CIDRS` to the exact immediate proxy/container peer range.
- Do not use `0.0.0.0/0` for admin/database ports.
- When adding a second node, put app nodes in a private subnet and use the OCI Load Balancer or a dedicated ingress VM.

### 3.3 Storage

- Keep the live block volume for state/media only; never bake member data into images.
- Separate `state`, `media`, `backups`, and temporary processing directories.
- Apply quotas and alerts before media reaches 70%.
- Store only encrypted, versioned backup archives in Object Storage; test restore to a disposable path.
- Keep public derivatives small (WebP/AVIF where compatible), originals private, and delete according to retention policy.
- Do not use Object Storage as a database without a transactional manifest.

### 3.4 Monitoring/logging

On the free VM:

- OCI Monitoring alarms for CPU, memory, disk, volume I/O, instance reachability, and outbound bandwidth.
- Caddy access logs with PII redaction and bounded rotation.
- Application JSON logs with request id, route, status, latency, tenant id hash, and error code—never password/OTP/raw token.
- A daily backup-age/checksum job with a loud alert.
- `/api/health` for liveness and `/api/ready` for storage/config readiness; provider health must be a separate dependency signal.

### 3.5 Disaster recovery

**Pilot target:** RPO 15 minutes, RTO 1 hour.
**Scale target:** RPO 5 minutes, RTO 30 minutes after managed database/object storage.

1. Quiesce or snapshot the single writer.
2. Export JSON state plus full media manifest and SHA-256 checksums.
3. Encrypt before off-host upload.
4. Verify archive listing and checksum.
5. Restore to a new disposable volume.
6. Start an isolated stack with provider sends disabled.
7. Compare users/payments/referrals/media counts and sample privacy rules.
8. Record elapsed restore time and owner approval.

Never test restore over the only live volume.

### 3.6 Cost controls

- Do not run Postgres, Redis, bot, three WhatsApp bridges, observability stacks, and a load balancer on day one just because they exist in development Compose.
- Run optional integrations only through profiles and explicit environment flags.
- Use one image build, one writer, one Caddy process, and scheduled backups for the pilot.
- Put hard caps on SMS, provider retries, media uploads, referral rewards, and log retention.
- Upgrade only the bottleneck: database first, media second, queue third, replicas fourth.

---

## 4. Performance war room

### P0/P1 performance actions

1. Keep one writer until transactions replace JSON snapshots.
2. Add request/body limits before parser/CPU work.
3. Rate-limit expensive search and media routes, not only POST mutations.
4. Move full-text/search filters to indexed queries before 10k members.
5. Replace offset scans with keyset cursors.
6. Return projected public rows, never whole member dictionaries.
7. Move card/image generation to a bounded worker after durable registration.
8. Use media derivatives and CDN cache headers.
9. Cache immutable catalogs with ETags/version hashes.
10. Measure p50/p95/p99, RSS, CPU, JSON size, disk I/O, queue age, provider latency.
11. Do not increase Uvicorn workers while using a JSON memory store.
12. Use standalone Next runtime packaging to reduce image size and startup work.
13. Keep Next public pages statically generated where possible.
14. Use `AbortController`/timeouts for every browser API call.
15. Cancel stale search requests when filters change.
16. Avoid duplicate profile fetches across route components.
17. Lazy-load payment/AI/vendor widgets.
18. Compress network responses at Caddy; do not compress already-compressed media.
19. Set explicit image dimensions/aspect ratios to prevent layout shift.
20. Add load tests with low-memory limits matching OCI, not a developer laptop.

### Budget and SLOs

- Public GET p95 <300 ms, p99 <800 ms at pilot peak.
- Registration upload p95 <5 s excluding provider delivery.
- Search p95 <500 ms at 10k indexed profiles.
- Error rate <1% on public reads and <0.5% on registration in a healthy provider window.
- No unbounded response or export; page size 100 public / 500 owner maximum.
- Memory headroom >30% under peak test; disk <70%; backup age within RPO.

---

## 5. Security roadmap

### Identity/session

1. Replace localStorage member bearer tokens with Secure/HttpOnly/SameSite cookies.
2. Add CSRF token + Origin/Referer validation for cookie-auth mutations.
3. Short access session and rotating refresh session; revoke on password/phone/privacy events.
4. Keep token-version invalidation during migration.
5. Separate human, staff, owner, vendor, and automation credentials.
6. Rotate secrets with overlap and audit.
7. Use Argon2id after benchmarked migration; keep PBKDF2 legacy verification during transition.
8. Add device/session list and “sign out all devices.”

### API/OWASP controls

1. Strict Pydantic models and `extra=forbid` for mutations.
2. Authorization matrix tests for every private route.
3. Object-level ownership checks before reads and writes.
4. Distributed IP/account/device limits through Redis.
5. Body/decode/time limits and content sniffing for uploads.
6. EXIF stripping, malware scan, quarantine, signed private media URLs.
7. Strict CSP nonces and Trusted Types where practical.
8. No third-party script without inventory/SRI/CSP review.
9. SQL parameterization and migration checks when relational store lands.
10. Webhook signature, event idempotency, amount/currency, and replay checks.
11. SSRF allowlist for provider/webhook URLs; no arbitrary server fetch.
12. No raw PII in logs, analytics, URLs, query strings, or error details.
13. Secrets scan, SBOM, dependency patch SLA, image scan.
14. Data inventory, consent version, retention/deletion, legal hold.
15. Security incident playbook and evidence preservation.

### OWASP mapping

- **Broken access control:** repository/service authorization plus generated route matrix.
- **Cryptographic failures:** cookie sessions, KMS/secret manager, encrypted backups, no raw token persistence.
- **Injection:** strict schemas, safe serializers, parameterized queries, safe Markdown/JSON-LD.
- **Insecure design:** state machines, outbox, explicit consent, no payment bypass.
- **Security misconfiguration:** typed startup config, no default production secrets, private ports, read-only containers.
- **Vulnerable components:** lockfiles, audit artifact, SBOM, upgrade policy.
- **Identification/auth failures:** OTP limits, session rotation, Argon2id migration, device revocation.
- **Software/data integrity:** signed builds, protected CI, immutable event ids, backup manifests.
- **Logging/monitoring failures:** request ids, structured security events, alerts, restore-age monitoring.
- **SSRF:** provider URL allowlist, no user-controlled internal fetch.

---

## 6. UI/UX blueprint

### Non-negotiable journeys

1. Landing -> language choice -> search/register CTA in one viewport.
2. Register -> progress indicator -> field-level error -> photo preview/consent -> upload progress -> durable success.
3. Lost response -> retry same form/key -> recover same profile; no duplicate.
4. Search -> filters -> factual result reason -> privacy status -> interest preview.
5. Interest -> explain cost/consent -> send -> timeline -> owner decision -> contact grant.
6. Photo review -> clear pending/rejected reason -> re-upload -> public visibility toggle.
7. Login/recovery -> OTP/password fallback -> session status -> sign out all devices.
8. Control room -> role-specific navigation -> destructive confirmation -> audit receipt.

### Design direction

- Telugu first, English parallel, never mixed-language error ambiguity.
- One primary action per viewport; secondary actions visibly secondary.
- 44 px minimum touch target; one-column under 640 px; sticky bottom CTA only when it does not cover inputs.
- Explain privacy next to the field that creates risk—not buried in terms.
- Use skeletons only for known loading states; never show fake profiles or fake score placeholders.
- Every upload has a retry, cancel, size, format, and privacy explanation.
- Every irreversible action has confirmation and recoverability language.
- Every provider action shows `queued`, `accepted`, `delivered`, `failed`, or `unknown`.
- Focus management and screen-reader live regions for step transitions/errors.
- Compress media and reserve stable aspect ratios to protect low-end devices.

### Conversion improvements that preserve trust

- Show “3 free interest requests” with exact rules, not a pressure timer.
- Show profile completeness as a member-controlled checklist, not a trust score.
- Explain that match observations are facts/preferences, not outcomes.
- Let a member preview what is public before submitting.
- Ask for phone/email only when the reason and retention are visible.
- Use referral share copy that says “invite” rather than promising a reward before eligibility.

---

## 7. AI power-up ranked by impact, effort, and ROI

Scores: impact/effort/ROI are 1–5; higher is better. All AI work is asynchronous, evidence-linked, privacy-reviewed, and kill-switchable.

| # | Feature | Impact | Effort | ROI | Build rule |
|---:|---|---:|---:|---:|---|
| 1 | Moderation triage for blur/group/unsafe media | 5 | 3 | 5 | Human approval remains authoritative |
| 2 | Fraud/referral ring anomaly queue | 5 | 4 | 5 | Reason codes and appeal, no silent ban |
| 3 | Evidence-based match explanation | 5 | 3 | 5 | Retrieve only stored facts/preferences |
| 4 | Support timeline summarizer | 4 | 2 | 5 | Redact phone/token/photo data |
| 5 | Telugu/English message draft assistant | 4 | 2 | 5 | Approved templates and human send |
| 6 | Duplicate profile review assist | 4 | 3 | 4 | Never merge/delete automatically |
| 7 | Photo quality feedback before upload | 4 | 2 | 4 | Deterministic checks first |
| 8 | Search query normalization in Telugu/English | 4 | 3 | 4 | Map to allowlisted filters |
| 9 | Saved-search alert relevance explanation | 4 | 3 | 4 | No fabricated compatibility |
| 10 | Provider failure classifier | 4 | 2 | 4 | Route to retry/manual lane |
| 11 | Admin queue prioritization | 4 | 3 | 4 | Operators can override |
| 12 | Safe onboarding field assistant | 3 | 2 | 4 | Suggest, never auto-submit sensitive facts |
| 13 | Consent/support FAQ copilot | 3 | 2 | 4 | Retrieval from approved policy docs |
| 14 | Member profile language polish | 3 | 2 | 4 | Preserve meaning; show diff |
| 15 | Catalog/district typo normalization | 3 | 1 | 4 | Deterministic allowlist preferred |
| 16 | Moderation workload forecast | 3 | 3 | 3 | Aggregate counts only |
| 17 | Churn-risk support queue | 3 | 3 | 3 | No discriminatory eligibility decision |
| 18 | Referral copy personalization | 3 | 2 | 3 | No false reward claim |
| 19 | Vendor lead summarization | 3 | 2 | 3 | Tenant-scoped and consented |
| 20 | Provider cost anomaly detection | 3 | 2 | 3 | Alert, do not silently drop OTPs |
| 21 | Offline low-bandwidth content summarization | 2 | 2 | 3 | Keep critical facts complete |
| 22 | Human review disagreement analytics | 3 | 3 | 3 | Use for training/evaluation, not punishment |
| 23 | Experiment insight assistant | 3 | 3 | 3 | Privacy-safe cohorts |
| 24 | AI-powered operator runbook search | 3 | 2 | 3 | Read-only initially |
| 25 | Model/evidence quality dashboard | 4 | 3 | 4 | Required foundation for every AI feature |

**Do not build:** AI-generated Jathakam/Porutham, identity claims from a selfie, caste/religion inference, undisclosed “marriage success” score, automated denial from opaque model output, or LLM access to raw member data without redaction/consent.

---

## 8. Monetization ranked by trust and ROI

| # | Feature | Primary buyer | Priority |
|---:|---|---|---|
| 1 | Transparent request-credit plans | Member | Now |
| 2 | Assisted onboarding package | Member/family | Now |
| 3 | Photo-quality/review assistance | Member | Now |
| 4 | Privacy/convenience subscription | Member | Now |
| 5 | Bureau seats with tenant isolation | Bureau | Phase 2 |
| 6 | Bureau workflow/API subscription | Bureau | Phase 2 |
| 7 | Sponsored vendor directory listing | Vendor | Phase 2 |
| 8 | Vendor lead inbox with consent | Vendor | Phase 2 |
| 9 | Verified community campaign | Community org | Phase 2 |
| 10 | Referral acquisition reward | Member/partner | Now, capped |
| 11 | Profile promotion with disclosure | Member | Phase 2 |
| 12 | Family account seat | Family | Phase 2 |
| 13 | Document review fee | Member | Phase 2 |
| 14 | Assisted matchmaker appointment | Family | Phase 2 |
| 15 | Wedding vendor bundle | Family/vendor | Phase 3 |
| 16 | API usage for a bureau's own tenant | Bureau | Phase 3 |
| 17 | White-label community portal | Organization | Phase 3 |
| 18 | Aggregate demand insights | Vendor/community | Phase 3, privacy review |
| 19 | Premium saved searches/alerts | Member | Phase 2 |
| 20 | Family shortlist workspace | Family | Phase 2 |
| 21 | Private profile review link | Member | Phase 2 |
| 22 | Renewal/assisted follow-up | Member | Phase 2 |
| 23 | Verified event registration | Community/vendor | Phase 3 |
| 24 | Partner CRM integration | Bureau | Phase 3 |
| 25 | Enterprise support/SLA tier | Bureau/org | Phase 3 |

Never sell raw member lists, unconsented phone numbers, fake verification, or guaranteed match outcomes.

---

## 9. Growth features ranked by trust

1. one-tap referral link with server-side dedupe;
2. shareable privacy-safe profile card;
3. bilingual referral landing page;
4. community-specific SEO pages from canonical data;
5. district/caste demand insights without PII;
6. family invitation flow;
7. saved search with explicit opt-in alerts;
8. profile completeness nudges;
9. photo re-upload reminders;
10. moderation turnaround status;
11. first-interest onboarding coach;
12. accepted-interest follow-up checklist;
13. report/block safety education;
14. response-rate education without ranking people;
15. local event landing pages;
16. vendor co-marketing with disclosure;
17. verified community ambassador program;
18. Telugu educational content;
19. low-bandwidth PWA caching;
20. install prompt only after value is demonstrated;
21. controlled A/B experiments with consent-safe cohorts;
22. lifecycle reminders with quiet hours and opt-out;
23. win-back flow that does not expose profile activity;
24. support referral for family members;
25. transparent success stories only with documented consent.

Growth guardrail: optimize completed, consented introductions and member trust—not raw clicks, contact unlocks, or external message volume.

---

## 10. Top 100 improvements

### Data/platform (1–20)

1. Freeze JSON schema and create a migration manifest.
2. Add repository interfaces behind current JSON state.
3. Introduce PostgreSQL for members/credentials first.
4. Add unique normalized phone constraint.
5. Add transactional interest/consent tables.
6. Add transactional payment ledger.
7. Add outbox table.
8. Add Redis shared limits.
9. Add cursor pagination.
10. Add search indexes.
11. Add media object manifest.
12. Move media to private object storage.
13. Add derivative generation worker.
14. Add backup manifest/checksum.
15. Add restore drill automation.
16. Add retention/deletion job state.
17. Add tenant id to future domain records.
18. Add optimistic version columns.
19. Add schema migration CI.
20. Remove direct global-list mutation from routes.

### Security (21–40)

21. Migrate member tokens to HttpOnly cookies.
22. Add CSRF tokens/origin checks.
23. Add device/session management.
24. Add Argon2id migration benchmark.
25. Add Redis account/device/IP rate limits.
26. Add strict Pydantic command models.
27. Add generated authorization matrix.
28. Add strict CSP nonces.
29. Add media malware scanning.
30. Add signed media URLs.
31. Add provider SSRF allowlist.
32. Add webhook event idempotency table.
33. Add secret-manager injection.
34. Add automated secret rotation test.
35. Add SBOM and image scan.
36. Add dependency SLA and exceptions.
37. Add audit event hash chain where required.
38. Add privacy data inventory.
39. Add deletion/export workflow.
40. Add security incident drill.

### Performance/reliability (41–60)

41. Add request IDs.
42. Add body-size guards.
43. Add GET search rate limits.
44. Add request timeouts everywhere.
45. Add bounded image decode concurrency.
46. Add background card generation.
47. Add public catalog ETags.
48. Add cache-control contract tests.
49. Add p95/p99 metrics.
50. Add queue age metrics.
51. Add provider circuit breakers.
52. Add dead-letter replay UI.
53. Add graceful drain on deploy.
54. Add readiness endpoint.
55. Add structured JSON logs.
56. Add bounded log rotation.
57. Add OCI disk alarms.
58. Add load test at OCI limits.
59. Add process restart test.
60. Add chaos provider timeout test.

### UX/accessibility (61–80)

61. Cookie-session login UX.
62. Registration resumable state machine.
63. Photo retry without duplicate.
64. Public-preview privacy checklist.
65. Field-level bilingual errors.
66. Keyboard-only registration test.
67. Camera permission fallback.
68. Slow-network upload test.
69. Stable media aspect ratios.
70. Reduce initial JS on public pages.
71. Defer payment widget.
72. Accessible live regions.
73. Screen-reader heading audit.
74. Focus restoration per step.
75. Visible provider status.
76. Explainable filter reasons.
77. Consent timeline UI.
78. Session/device UI.
79. Family-assisted role UI.
80. Support case handoff.

### Product/growth/operations (81–100)

81. Funnel event taxonomy.
82. Consent-safe analytics.
83. Experiment feature flags.
84. Moderation SLA dashboard.
85. Fraud triage queue.
86. Referral cohort dashboard.
87. Payment reconciliation dashboard.
88. Provider delivery dashboard.
89. Vendor tenant dashboard.
90. Bureau subscription model.
91. Refund/dispute workflow.
92. Help center from approved policy.
93. Telugu content governance.
94. Success-story consent workflow.
95. Community ambassador program.
96. Profile quality nudges.
97. Saved-search alerts.
98. Low-bandwidth PWA cache.
99. AI evidence dashboard.
100. Quarterly disaster-recovery exercise.

---

## 11. Top 50 critical fixes

1. Do not add replicas while JSON is authoritative.
2. Add a transactional member store.
3. Add a shared idempotency store.
4. Add an outbox before external side effects.
5. Move browser bearer tokens out of localStorage.
6. Add CSRF for cookie sessions.
7. Keep OTP/password transitions atomic.
8. Enforce provider webhook idempotency.
9. Enforce payment amount/currency/state transitions.
10. Add Redis abuse controls.
11. Add media quarantine and scanning.
12. Use private object storage/signed URLs.
13. Run off-host encrypted backups.
14. Prove restore on a clone.
15. Add readiness separate from liveness.
16. Add request/body/time limits.
17. Add strict typed API commands.
18. Add authorization matrix CI.
19. Add strict CSP nonces.
20. Patch/disposition dependency advisories.
21. Add CI branch protection.
22. Add SBOM/image scan.
23. Add request correlation ids.
24. Redact logs and error bodies.
25. Rotate secrets and sessions.
26. Add data inventory/retention policy.
27. Implement deletion/export workflow.
28. Add provider sandbox sign-off.
29. Add browser/device sign-off.
30. Add low-memory load test.
31. Add graceful deploy drain.
32. Add rollback image pinning.
33. Add queue dead-letter operations.
34. Add provider circuit breaker.
35. Add media storage quota alerts.
36. Add DB migration dry-run.
37. Add shadow-read comparison.
38. Add canary cutover.
39. Add tenant isolation before bureau sales.
40. Add human review for AI actions.
41. Ban fabricated astrology/verification.
42. Ban contact-data resale.
43. Add refund/chargeback process.
44. Add incident response ownership.
45. Add SLO/error-budget review.
46. Add privacy threat modeling.
47. Add abuse/fraud appeal path.
48. Add contract compatibility tests.
49. Add cost/provider budget alerts.
50. Launch only after signed gates.

---

## 12. Scale roadmap

### 1,000 members

- One A1 VM, one FastAPI writer, standalone Next, Caddy, private block volume.
- Current JSON adapter may operate under strict backups and low traffic.
- Add request limits, request IDs, CI, restore drill, provider sandbox.
- No extra Uvicorn workers.

### 10,000 members

- Complete member/credential/interest/payment migration to PostgreSQL.
- Redis for limits/cache/idempotency.
- Object storage/CDN for media.
- Durable outbox worker.
- Indexed search and cursor pagination.
- Load test with 2x projected peak.
- Two API replicas only after consistency tests pass.

### 100,000 members

- Managed/HA PostgreSQL or carefully operated primary/replica.
- Separate read models/search index.
- Worker fleet for media/moderation/messaging.
- CDN and object lifecycle.
- Dedicated operations/control plane.
- Fraud/risk and moderation queue SLAs.
- Partition event/ledger tables and add warehouse exports.

### 1,000,000 members

- Cell/region architecture, read replicas, partitioned transactional data.
- Search platform with indexed filters and relevance explanations.
- Streaming event pipeline and warehouse.
- Multi-region media and disaster recovery.
- Dedicated identity, ledger, media, discovery, and communications ownership.
- Formal privacy/data residency and 24/7 incident response.

### 10,000,000 members

- Regional cells with independent failure domains.
- Sharded/partitioned member and event data.
- Global CDN/object storage replication.
- Dedicated fraud, search, recommendation, analytics, and platform infrastructure.
- Multi-region control plane, tested failover, cost governance, and platform SRE.
- The current monolith remains only as a domain-contract reference, not the runtime.

---

## 13. Twelve-month implementation plan

### Phase 1 / Month 1 — protect trust and operations

- Ship current request-size/request-id guards, CI, multi-stage images, OCI resource limits.
- Set up OCI VM, private volume, Caddy, firewall, secrets, and backup manifest.
- Run provider sandbox, browser/device, and restore gates.
- Freeze current API contracts and data inventory.

### Phase 2 / Month 2 — transactional identity slice

- Create PostgreSQL schema/migrations for members, credentials, sessions, OTP challenges.
- Build JSON export/import and reconciliation tool.
- Shadow-write/read in staging; no production cutover yet.
- Begin cookie-session migration.

### Phase 3 / Month 3 — registration and media cutover

- Transactional registration/idempotency.
- Object-storage quarantine, scanning, derivatives, signed URLs.
- Background card generation and media restore drill.
- Canary a small internal cohort.

### Phase 4 / Month 4 — interest and consent

- Move interests, blocks, contact grants, consent ledger to PostgreSQL.
- Add outbox for notifications.
- Add member session/device UI.
- Run authorization matrix and concurrency tests.

### Phase 5 / Month 5 — payments/referrals

- Transactional order/payment/webhook/ledger state.
- Provider sandbox and reconciliation dashboard.
- Referral event/reward/payout tables and fraud flags.
- Add refund/chargeback support.

### Phase 6 / Month 6 — discovery performance

- Indexed search, cursor pagination, read projections, ETags.
- Redis shared cache/limits.
- Load test 10k distribution on OCI-shaped limits.
- Upgrade SLOs and alerts.

### Phase 7 / Month 7 — operations and safety

- Moderation queue, support cases, deletion/export, retention/legal holds.
- Image scanning and abuse/fraud triage.
- Structured audit and incident drills.

### Phase 8 / Month 8 — product/growth system

- Consent-safe funnel analytics, experiments, saved searches, community pages.
- Family-assisted workflow and ambassador program.
- No dark patterns; every metric has a privacy definition.

### Phase 9 / Month 9 — AI assist, not AI authority

- Moderation triage, evidence-based explanations, support summarizer.
- Evaluation sets, redaction, audit, kill switch, budget.
- Human review and appeal paths.

### Phase 10 / Month 10 — bureau/multi-tenant foundation

- Tenant context, RLS, roles/seats, tenant-scoped exports and billing.
- Contract/API versioning.
- Pilot one bureau in an isolated staging tenant.

### Phase 11 / Month 11 — resilience and scale

- Second API node, worker node, optional OCI Load Balancer.
- Failover/restore/chaos tests.
- Media/CDN and provider outage exercises.
- 100k projection load test, not a claim of 100k capacity.

### Phase 12 / Month 12 — category leadership launch decision

- Independent security/privacy review.
- SLO/error-budget and cost review.
- Real-device/browser/provider sign-off.
- Disaster-recovery proof and rollback rehearsal.
- Launch only the capabilities with evidence; publish a transparent status page.

---

## 14. Combined CTO/Architect/Growth/QA/Security launch decision

### Build

- A modular monolith with a transactional data plane, explicit state machines, typed APIs, outbox events, object-storage media, shared limits, and tenant-ready boundaries.
- A Telugu-first, low-bandwidth, family-safe product whose trust features are visible and testable.
- A provider-independent integration layer and a small AI assist layer that cannot invent evidence.

### Remove

- Any synthetic profile, fake payment proof, guessed card URL, fabricated astrology result, implicit verification claim, global admin shortcut, raw token persistence, unbounded export, and external delivery claim without provider evidence.
- Unused always-on services from the free VM.
- Historical deployment assumptions from the active runbook.

### Improve

- Registration recovery, cookie sessions, consent UX, media reliability, search speed, provider status, support operations, and restore confidence.
- The database and queue before adding microservices or more marketing.

### Automate

- CI gates, schema migrations, backup verification, provider retries/idempotency, moderation triage, fraud alerts, funnel metrics, support summaries, and OCI alarms.

### Secure

- Identity, object authorization, media, webhook/payment ledger, secrets, backups, logs, tenant boundaries, and AI data processing.

### Optimize

- One writer and small images first; indexed queries, Redis, CDN, and workers next; replicas only after consistency proof.

### Launch

- First as a controlled, measured Oracle Free Tier pilot.
- Then as a paid-growth product after provider/restore/browser/security gates.
- Then as a multi-node relational platform after 10k demand, not before.

**The category-leading advantage is not pretending to be a giant platform on a free VM. It is building the most trustworthy, evidence-based, Telugu-first introduction workflow, then scaling the data plane exactly when the evidence says to.**
