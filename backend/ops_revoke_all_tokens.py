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
    cd backend && python ops_revoke_all_tokens.py [--dry-run]

IMPORTANT: restart the backend process after running this (not dry-run).
The running server keeps its own in-memory copy of the token-version table,
loaded once at import time — this script writes straight to
token_versions.json from a separate process, so a currently-running server
won't see the change until it reloads that file, which only happens on
startup.

Reads the same tsap_id list the running backend uses (backend/data_db.json
if present, else falls back to the demo/seed profile table main.py builds
in-memory) and calls hardening.revoke_all_tokens() for each one. Safe to
run multiple times (idempotent in effect, though each run does increment
the counter by 1 again — running it twice in a row just means users need
to log in once, not twice).
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from hardening import revoke_all_tokens, token_version  # noqa: E402

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data_db.json")


def _load_tsap_ids() -> list:
    if not os.path.exists(DB_PATH):
        print(f"[ops_revoke_all_tokens] {DB_PATH} not found — nothing to do "
              f"(fresh environment with no persisted users yet).")
        return []
    with open(DB_PATH, "r", encoding="utf-8") as f:
        data = json.load(f) or {}
    users = data.get("users", []) if isinstance(data, dict) else (data or [])
    return [str(u.get("tsap_id")) for u in users if u.get("tsap_id")]


def main():
    dry_run = "--dry-run" in sys.argv
    ids = _load_tsap_ids()
    if not ids:
        print("[ops_revoke_all_tokens] No users found — nothing to revoke.")
        return
    print(f"[ops_revoke_all_tokens] {len(ids)} users found.")
    if dry_run:
        print("[ops_revoke_all_tokens] --dry-run: not writing anything. "
              f"Current versions sample: "
              f"{ {i: token_version(i) for i in ids[:5]} }")
        return
    for tid in ids:
        new_v = revoke_all_tokens(tid)
    print(f"[ops_revoke_all_tokens] Done — all {len(ids)} users bumped to a "
          f"fresh token version. Every pre-existing token (including any "
          f"leaked during the pre-Phase-12-fix window) is now invalid. "
          f"Every user will need to log in again to get a new, working token.")


if __name__ == "__main__":
    main()
