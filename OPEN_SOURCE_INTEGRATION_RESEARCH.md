# Mana Vivaha — open-source integration research

**Research date:** 2026-10-20
**Decision status:** reviewed for the current JSON/PM2 application and the merged production Compose target; no third-party source was copied into the repository.

This document separates **useful infrastructure** from attractive but unsafe rewrites. The member-submitted JSON store remains the current system of record until a separately backed-up relational migration is completed. Search, AI, analytics, and queues must be projections or opt-in services first; they must never silently become a second source of truth.

## What was adopted in this change

### Prometheus Python client — operational metrics

- Repository: <https://github.com/prometheus/client_python>
- License reported by GitHub: Apache-2.0
- Use: low-cardinality request counters, latency histograms, and a readiness gauge.
- Boundary: `/metrics` is disabled and returns 404 unless an operator provisions `METRICS_TOKEN`; an authorized scrape uses the token or a bearer header.
- Privacy: labels contain only method, bounded route template, and status. No profile ID, phone, query string, referrer, request body, or payment data is recorded.
- Why now: it gives OCI/Caddy/Prometheus-compatible operational evidence without adding another always-on service to the Always Free pilot.

The API also now exposes `/api/ready`. It remains `503` until the application lifespan completes storage, database, provider, and worker startup checks, and returns only a minimal readiness response.

## Recommended integration map

| Capability | Project | License / status | Decision | Safe Mana Vivaha boundary |
|---|---|---|---|---|
| Traces and cross-service correlation | [OpenTelemetry Python](https://github.com/open-telemetry/opentelemetry-python) and [OpenTelemetry JS](https://github.com/open-telemetry/opentelemetry-js) | Apache-2.0 | **Phase 1 adopt** after exporter/PII policy review | Trace IDs and timings only; never attributes containing member data. Keep `X-Request-ID` as the support correlation ID. |
| Full-text and faceted search | [Meilisearch](https://github.com/meilisearch/meilisearch) | MIT community edition | **Phase 1 projection** | Index only approved/public profiles, use opaque IDs, keep JSON/SQL authoritative, rebuild index from a versioned projection. Never index phone, password, OTP, private photo, or hidden fields. |
| Semantic/vector retrieval | [Qdrant](https://github.com/qdrant/qdrant) | Apache-2.0 | **Phase 2, opt-in AI** | Separate tenant/region collections or payload filters; store opaque profile IDs and consented embeddings only. No inferred caste, religion, health, intent, identity, or astrology compatibility. |
| Embeddings and reranking | [sentence-transformers](https://github.com/huggingface/sentence-transformers) | Apache-2.0 | **Phase 2, offline first** | Embed member-controlled biography/preferences only after consent and redaction. Version every model, record explanations, and provide deletion/rebuild jobs. |
| Transactional database and vector extension | [pgvector](https://github.com/pgvector/pgvector) | Review the project license at the pinned release; GitHub metadata did not provide an SPDX assertion | **Phase 1 architecture, later migration** | PostgreSQL becomes the authoritative store only after a clone migration, dual-read comparison, write cutover, rollback, and concurrency test. Do not combine it with the current deployment without a migration ticket. |
| Async jobs | [Taskiq](https://github.com/taskiq-python/taskiq) | MIT | **Phase 1 candidate** | Use for media processing, index projection, digest creation, and provider retries. Jobs must be idempotent, bounded, observable, and safe to replay. |
| Async jobs considered but rejected for now | [ARQ](https://github.com/python-arq/arq) | MIT; project README currently says maintenance-only mode | **Do not adopt now** | Do not add a maintenance-only queue to the production path. Re-evaluate only if its maintenance status changes. |
| Feature flags | [OpenFeature specification](https://github.com/open-feature/spec), [Python SDK](https://github.com/open-feature/python-sdk), [JS SDK](https://github.com/open-feature/js-sdk) | Apache-2.0 | **Phase 1 candidate** | Flags must default closed for payments, publishing, AI, and contact reveal; every flag needs an owner, expiry, audit event, and safe fallback. |
| Privacy-first product analytics | [Umami](https://github.com/umami-software/umami) | MIT | **Phase 1 candidate** | Prefer self-hosted/first-party analytics with consent, coarse events, no phone/profile identifiers, and retention limits. Do not replace server abuse logs with analytics. |
| Policy authorization | [Casbin Python](https://github.com/apache/casbin-pycasbin) | Apache-2.0 | **Phase 2 evaluation** | Current server-side owner/staff/member guards remain authoritative. Evaluate Casbin only when tenant/partner policies exceed the current explicit guards; do not replace working auth during a deployment. |

## Deliberately not adopted

- **PostHog**: useful product tooling, but this application already has privacy-sensitive analytics and the GitHub API did not provide a simple SPDX assertion for the repository. Revisit only after a legal/licensing and data-processing review.
- **A second database immediately**: adding PostgreSQL/Redis/Meilisearch/Qdrant to the current single-node host would increase failure modes and storage pressure without migrating the source of truth.
- **Generic AI match scoring**: it would conflict with the product promise that astrology and compatibility results are evidence-only and that member-entered facts are not suitability verdicts.
- **Copying repository code**: use released packages and documented APIs, pin versions, review advisories and licenses, and keep the integration behind an internal adapter.

## Integration rules for the vision

1. **Truth before intelligence.** AI/search may rank or retrieve approved facts; it may not manufacture profiles, Jathakam, Porutham, verification, delivery, or compatibility claims.
2. **Consent before personalization.** Search, saved alerts, embeddings, WhatsApp, push, and analytics each need their own clear purpose and withdrawal path.
3. **Authoritative-store discipline.** A projection can be deleted and rebuilt. A search index, vector store, cache, queue, or analytics product must never be the only copy of member/payment/consent data.
4. **Tenant isolation from day one.** Every future index/vector/job payload carries a tenant/region namespace and uses server-side filters. A client-supplied tenant is never trusted.
5. **Deletion is a workflow.** Profile deletion must revoke sessions, remove search/vector projections, expire queued notifications, remove media, and record a minimal audit event without retaining unnecessary PII.
6. **Provider honesty.** A queued job is not an external delivery; a search hit is not a verified identity; an embedding similarity is not a marriage recommendation.
7. **No public operational surface.** Metrics, traces, queue details, and provider diagnostics require private network access or a separate operator credential.

## 12-month implementation order

### 0–30 days: production safety

- Use the new `/api/ready` and token-gated `/metrics` endpoints.
- Export metrics to an operator-only Prometheus-compatible collector or OCI Monitoring adapter.
- Complete the live JSON/media backup and isolated restore drill.
- Move the current host-process data into the reviewed durable volume only through a rehearsed migration.
- Add Caddy/OCI alerts for readiness failures, backup age, disk usage, CPU, memory, and certificate expiry.

### 31–90 days: projections and reliable jobs

- Introduce a versioned `public_profile_projection` contract.
- Build a replayable index projection job; keep the JSON store authoritative.
- Evaluate Taskiq only after a Redis ownership, retry, idempotency, and restore plan exists.
- Add OpenFeature-compatible flag semantics for AI, payments, publishing, and experiments.
- Add first-party Umami events for registration start, registration completion, verified-profile view, interest sent, accepted request, and paid conversion; never send phone/profile IDs.

### 4–8 months: relational scale

- Design PostgreSQL schema and migration from a verified JSON snapshot.
- Run dual-read comparisons and shadow writes on a clone; measure p95 latency and lock behavior.
- Consider pgvector for consented embeddings only after the relational cutover is stable.
- Add Meilisearch only as a rebuildable public-search projection.

### 9–12 months: explainable AI

- Evaluate sentence-transformers and Qdrant on a redacted, consented dataset.
- Require model/version, input-scope, explanation, opt-out, deletion, and offline evaluation records.
- Launch recommendations only when precision, safety, fairness, abuse, and conversion metrics beat the transparent baseline.

## Resource and deployment guardrails

The OCI Always Free pilot should not run every candidate service on the first VM. Prometheus-compatible client metrics are cheap; Meilisearch, Qdrant, PostgreSQL, and a job broker each need measured CPU/RAM/storage budgets and a backup/upgrade owner. Start with one authoritative application, one projection worker when required, and external/OCI-managed monitoring where possible. Add a second node or managed service only after p95 latency, memory, backup age, and queue lag demonstrate the need.

No item in this research file authorizes a production launch. The production gate remains `PRODUCTION-DEPLOY.md` plus the live backup, restore, provider, TLS, monitoring, rollback, and owner-approval evidence.
