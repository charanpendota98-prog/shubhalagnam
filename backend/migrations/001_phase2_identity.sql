-- ============================================================================
-- ManaVivaha Phase 2 — Transactional Identity, Credentials, Sessions & OTP DDL
-- Compatible with PostgreSQL 15+ and SQLite 3.35+
-- ============================================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version     TEXT PRIMARY KEY,
    applied_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS identity_members (
    tsap_id           TEXT PRIMARY KEY,
    normalized_phone  TEXT UNIQUE,
    email             TEXT,
    full_name         TEXT NOT NULL DEFAULT '',
    gender            TEXT NOT NULL DEFAULT '',
    status            TEXT NOT NULL DEFAULT 'pending',
    account_status    TEXT NOT NULL DEFAULT 'active',
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL,
    json_checksum     TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_identity_members_status
    ON identity_members (status, account_status);

CREATE TABLE IF NOT EXISTS identity_credentials (
    tsap_id        TEXT PRIMARY KEY REFERENCES identity_members(tsap_id) ON DELETE CASCADE,
    password_hash  TEXT NOT NULL DEFAULT '',
    token_version  INTEGER NOT NULL DEFAULT 0,
    updated_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS member_sessions (
    session_id     TEXT PRIMARY KEY,
    tsap_id        TEXT NOT NULL REFERENCES identity_members(tsap_id) ON DELETE CASCADE,
    device_label   TEXT NOT NULL DEFAULT 'Web Browser',
    ip_prefix      TEXT NOT NULL DEFAULT '',
    user_agent     TEXT NOT NULL DEFAULT '',
    cookie_mode    INTEGER NOT NULL DEFAULT 0,
    token_version  INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL,
    last_seen_at   TEXT NOT NULL,
    expires_at     TEXT NOT NULL,
    revoked_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_member_sessions_tsap_id
    ON member_sessions (tsap_id, created_at);

CREATE TABLE IF NOT EXISTS otp_challenges (
    challenge_id   TEXT PRIMARY KEY,
    phone_hash     TEXT NOT NULL,
    purpose        TEXT NOT NULL DEFAULT 'login',
    attempts       INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL,
    expires_at     TEXT NOT NULL,
    consumed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_otp_challenges_phone_hash
    ON otp_challenges (phone_hash, created_at);
