-- ============================================================================
-- ManaVivaha Phases 3–12 — Transactional Registration Idempotency, Media
-- Quarantine, Consent/Contact Grants, Notification Outbox, Payment/Refund
-- Ledger & Indexed Search Read-Projection (PostgreSQL 15+ & SQLite 3.35+)
-- ============================================================================

CREATE TABLE IF NOT EXISTS registration_idempotency (
    idem_key       TEXT PRIMARY KEY,
    phone_hash     TEXT NOT NULL,
    tsap_id        TEXT NOT NULL,
    response_json  TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    expires_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_quarantine (
    media_id       TEXT PRIMARY KEY,
    tsap_id        TEXT NOT NULL,
    filename       TEXT NOT NULL,
    sha256         TEXT NOT NULL,
    mime_type      TEXT NOT NULL,
    width          INTEGER NOT NULL DEFAULT 0,
    height         INTEGER NOT NULL DEFAULT 0,
    byte_size      INTEGER NOT NULL DEFAULT 0,
    exif_present   INTEGER NOT NULL DEFAULT 0,
    scan_status    TEXT NOT NULL DEFAULT 'quarantined',
    scan_reason    TEXT NOT NULL DEFAULT '',
    created_at     TEXT NOT NULL,
    reviewed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_quarantine_tsap
    ON media_quarantine (tsap_id, scan_status);

CREATE TABLE IF NOT EXISTS sql_interests (
    request_id     TEXT PRIMARY KEY,
    from_id        TEXT NOT NULL,
    to_id          TEXT NOT NULL,
    status         TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sql_interests_pair
    ON sql_interests (from_id, to_id, status);

CREATE TABLE IF NOT EXISTS sql_blocks (
    blocker_id     TEXT NOT NULL,
    blocked_id     TEXT NOT NULL,
    created_at     TEXT NOT NULL,
    PRIMARY KEY (blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS sql_contact_grants (
    grant_id       TEXT PRIMARY KEY,
    owner_id       TEXT NOT NULL,
    viewer_id      TEXT NOT NULL,
    request_id     TEXT NOT NULL,
    active         INTEGER NOT NULL DEFAULT 1,
    granted_at     TEXT NOT NULL,
    revoked_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_sql_contact_grants_pair
    ON sql_contact_grants (owner_id, viewer_id, active);

CREATE TABLE IF NOT EXISTS notification_outbox (
    event_id         TEXT PRIMARY KEY,
    topic            TEXT NOT NULL,
    recipient_id     TEXT NOT NULL,
    payload_json     TEXT NOT NULL,
    status           TEXT NOT NULL DEFAULT 'queued',
    attempts         INTEGER NOT NULL DEFAULT 0,
    last_error       TEXT NOT NULL DEFAULT '',
    next_attempt_at  TEXT NOT NULL,
    created_at       TEXT NOT NULL,
    dispatched_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_notification_outbox_status
    ON notification_outbox (status, next_attempt_at);

CREATE TABLE IF NOT EXISTS sql_payment_orders (
    order_id          TEXT PRIMARY KEY,
    tsap_id           TEXT NOT NULL,
    plan_code         TEXT NOT NULL,
    amount_inr        INTEGER NOT NULL DEFAULT 0,
    status            TEXT NOT NULL DEFAULT 'created',
    provider_ref      TEXT NOT NULL DEFAULT '',
    webhook_verified  INTEGER NOT NULL DEFAULT 0,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sql_payment_orders_tsap
    ON sql_payment_orders (tsap_id, status);

CREATE TABLE IF NOT EXISTS sql_refund_cases (
    refund_id      TEXT PRIMARY KEY,
    order_id       TEXT NOT NULL,
    tsap_id        TEXT NOT NULL,
    amount_inr     INTEGER NOT NULL DEFAULT 0,
    kind           TEXT NOT NULL DEFAULT 'refund',
    reason         TEXT NOT NULL,
    status         TEXT NOT NULL DEFAULT 'requested',
    handled_by     TEXT NOT NULL DEFAULT '',
    staff_note     TEXT NOT NULL DEFAULT '',
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS search_projection (
    tsap_id              TEXT PRIMARY KEY,
    first_name           TEXT NOT NULL DEFAULT '',
    gender               TEXT NOT NULL DEFAULT '',
    age                  INTEGER NOT NULL DEFAULT 0,
    height               TEXT NOT NULL DEFAULT '',
    marital_status       TEXT NOT NULL DEFAULT '',
    religion             TEXT NOT NULL DEFAULT '',
    caste                TEXT NOT NULL DEFAULT '',
    sub_caste            TEXT NOT NULL DEFAULT '',
    mother_tongue        TEXT NOT NULL DEFAULT '',
    district             TEXT NOT NULL DEFAULT '',
    state                TEXT NOT NULL DEFAULT '',
    country              TEXT NOT NULL DEFAULT '',
    education            TEXT NOT NULL DEFAULT '',
    job                  TEXT NOT NULL DEFAULT '',
    salary               TEXT NOT NULL DEFAULT '',
    salary_min_inr       INTEGER NOT NULL DEFAULT 0,
    salary_max_inr       INTEGER NOT NULL DEFAULT 0,
    is_nri               INTEGER NOT NULL DEFAULT 0,
    has_public_photo     INTEGER NOT NULL DEFAULT 0,
    verification_badges  TEXT NOT NULL DEFAULT '',
    created_at           TEXT NOT NULL,
    etag_hash            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_search_proj_gender_age
    ON search_projection (gender, age);

CREATE INDEX IF NOT EXISTS idx_search_proj_caste_district
    ON search_projection (caste, district);

CREATE INDEX IF NOT EXISTS idx_search_proj_cursor
    ON search_projection (created_at DESC, tsap_id DESC);
