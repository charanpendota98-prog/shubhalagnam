"""
🔐 One-time ops/incident-response script — Phase 14 token-revocation rollout.

WHY THIS EXISTS
----------------
Before this patch, auth tokens were pure stateless HMAC (tsap_id|exp|scope|nonce)
with no server-side way to invalidate one before its natural ~30-day expiry.
A critical IDOR (fixed earlier this audit pass, see SECURITY_AUDIT.md) leaked
live tokens for an unknown window before the fix landed. Any token minted
during that window — including ones an attacker may have scraped — remains
individually "valid" from the HMAC's point of view even after the IDOR itself
was patched, because the token format never changed and nothing forces a
re-issue.

The Phase 14 fix adds a per-user token-version counter (see hardening.py:
sign_token / verify_token / revoke_all_tokens). New logins automatically pick
up the live counter. This script is the one-time remediation step: bump
EVERY existing user's counter once, so every token that exists anywhere in
the wild right now (legitimate or stolen) stops verifying immediately, and
every user simply needs to log in again to get a fresh, valid token.

This is intentionally a separate, explicit, human-run script rather than
something that fires automatically on backend startup — bumping every
user's token version on every restart would force-logout everyone on every
deploy, which is far too disruptive for routine restarts. Run it exactly
once, right after deploying the Phase 14 patch to a given environment.

USAGE
-----
    # Run inside the backend container (or with the exact same durable-volume
    # paths and production secrets as the backend), then restart the service:
    docker compose -f docker-compose.prod.yml exec backend python ops_revoke_all_tokens.py --dry-run
    docker compose -f docker-compose.prod.yml exec backend python ops_revoke_all_tokens.py
    docker compose -f docker-compose.prod.yml restart backend

IMPORTANT: the production token-version file is TSAP_TOKEN_VERSIONS_FILE on the
same durable state volume as the profile database. Never run the production
operation from a host shell using the local default path. The running server
keeps an in-memory copy loaded at import time; restart every backend worker
immediately after the operation before treating revocation as effective.

Reads the profile IDs from TSAP_DB_FILE (or the local backend/data_db.json
default) and calls hardening.revoke_all_tokens() for each persisted user. It
does not read or create demo/seed profiles. Safe to run multiple times in the
sense that tokens remain revoked, though each run increments counters again.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hardening import revoke_all_tokens, token_version, TOKEN_VERSIONS_PATH  # noqa: E402

DB_PATH = os.path.abspath(
    os.getenv("TSAP_DB_FILE", "").strip()
    or os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_db.json")
)


def _load_tsap_ids() -> list:
    if not os.path.exists(DB_PATH):
        print(f"[ops_revoke_all_tokens] {DB_PATH} not found — nothing to do "
              f"(fresh environment with no persisted users yet).")
        return []
    with open(DB_PATH, "r", encoding="utf-8") as f:
        data = json.load(f) or {}
    users = data.get("users", []) if isinstance(data, dict) else (data or [])
    return [str(u.get("tsap_id")) for u in users
            if isinstance(u, dict) and str(u.get("tsap_id", "")).strip()]


def main():
    dry_run = "--dry-run" in sys.argv
    ids = _load_tsap_ids()
    if not ids:
        print("[ops_revoke_all_tokens] No users found — nothing to revoke.")
        return
    print(f"[ops_revoke_all_tokens] {len(ids)} persisted users found.")
    print(f"[ops_revoke_all_tokens] token-version file: {TOKEN_VERSIONS_PATH}")
    if dry_run:
        print("[ops_revoke_all_tokens] --dry-run: not writing anything. "
              f"Current versions sample: "
              f"{ {i: token_version(i) for i in ids[:5]} }")
        return
    for tid in ids:
        new_v = revoke_all_tokens(tid)
    print(f"[ops_revoke_all_tokens] Durable counters written for {len(ids)} users. "
          "Restart every backend worker now; the live process keeps its in-memory "
          "counter until restart. After restart, pre-existing tokens are rejected "
          "and each user must log in again for a fresh token.")


if __name__ == "__main__":
    main()
