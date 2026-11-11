"""Shared production validation. Importing this module never starts the application.

Configuration checks are not delivery tests, backup verification or permission to deploy.
"""
from __future__ import annotations
import os, json, secrets
from typing import Optional, Dict
from db_store import STORAGE_FORMAT

def is_synthetic_profile(profile: Optional[Dict]) -> bool:
    """Recognize legacy fixtures so they cannot enter member-facing data paths."""
    if not isinstance(profile, dict):
        return True
    return bool(
        profile.get("demo") is True or profile.get("is_demo") is True
        or profile.get("seed_source") or profile.get("source") == "demo_seed"
        or profile.get("profile_note") == "TSAP demo profile"
        or profile.get("inventory_status") or profile.get("seed")
    )

def validate_storage(paths, token_path: str) -> dict:
    """Fail closed unless every durable store/media path is on the mounted data root."""
    root_value = os.getenv("MANA_VIVAHA_PERSISTENT_ROOT", "").strip()
    state_value = os.getenv("MANA_VIVAHA_STATE_DIR", "").strip()
    if not root_value or not os.path.isabs(root_value):
        raise RuntimeError("MANA_VIVAHA_PERSISTENT_ROOT must be an absolute durable-volume path")
    if not state_value or not os.path.isabs(state_value):
        raise RuntimeError("MANA_VIVAHA_STATE_DIR must be an absolute durable state path")

    root = os.path.realpath(root_value)
    state_root = os.path.realpath(state_value)
    if root == "/" or root == "/tmp" or root.startswith("/tmp/"):
        raise RuntimeError("Production persistence cannot use the container root or ephemeral /tmp")
    try:
        token_state_is_backed_up = os.path.commonpath((state_root, os.path.realpath(token_path))) == state_root
    except ValueError:
        token_state_is_backed_up = False
    if not token_state_is_backed_up:
        raise RuntimeError("Production token-revocation state must be inside MANA_VIVAHA_STATE_DIR for durable backup")


    writable_dirs = {root}
    for label, value, is_directory in paths:
        if not value or not os.path.isabs(value):
            raise RuntimeError(f"Production storage path for {label} must be absolute and configured")
        resolved = os.path.realpath(value)
        try:
            within_root = os.path.commonpath((root, resolved)) == root
        except ValueError:
            within_root = False
        if not within_root:
            raise RuntimeError(f"Production storage path for {label} is outside the durable volume")
        target_dir = resolved if is_directory else os.path.dirname(resolved)
        os.makedirs(target_dir, mode=0o700, exist_ok=True)
        writable_dirs.add(target_dir)

    for directory in writable_dirs:
        try:
            probe = os.path.join(directory, ".mana-vivaha-write-check-" + secrets.token_hex(8))
            fd = os.open(probe, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            os.close(fd)
            os.unlink(probe)
        except OSError as exc:
            raise RuntimeError(f"Production data volume is not writable: {directory}") from exc

    return {"root": root, "durable_paths": len(paths)}

def validate_core_database(db_path: str) -> dict:
    """Validate the core registration store before any production workers start.

    A missing/corrupt/incomplete store is never interpreted as an empty database.
    A genuinely new installation must use the separate one-shot bootstrap command;
    ordinary server startup can never initialize or authorize an empty replacement volume.
    """
    path = os.path.abspath(db_path)
    collections = {
        "users": list,
        "interests": list,
        "payments": list,
        "otps": dict,
        "verified_phones": list,
        "views": list,
        "saves": list,
        "digest": list,
    }

    def _read_store() -> dict:
        try:
            with open(path, encoding="utf-8") as handle:
                value = json.load(handle)
        except Exception as exc:
            raise RuntimeError(
                "Production core database is unreadable or corrupt; preserve the file and restore a verified backup"
            ) from exc
        if not isinstance(value, dict):
            raise RuntimeError("Production core database must be a JSON object; file was not modified")
        missing = [key for key in collections if key not in value]
        if missing:
            raise RuntimeError(
                "Production core database is missing required fields (%s); preserve it and migrate/restore a verified backup"
                % ", ".join(missing)
            )
        wrong_types = [key for key, expected in collections.items() if not isinstance(value.get(key), expected)]
        if wrong_types:
            raise RuntimeError(
                "Production core database has invalid collection types (%s); file was not modified"
                % ", ".join(wrong_types)
            )
        if any(not isinstance(row, dict) for key in ("users", "interests", "payments", "views", "saves", "digest")
               for row in value[key]):
            raise RuntimeError("Production core database contains malformed rows; file was not modified")
        if any(not isinstance(phone, str) for phone in value["verified_phones"]):
            raise RuntimeError("Production core database contains malformed verified-phone values; file was not modified")
        if any(not isinstance(phone, str) or not isinstance(record, dict)
               for phone, record in value["otps"].items()):
            raise RuntimeError("Production core database contains malformed OTP state; file was not modified")
        return value

    if not os.path.exists(path):
        raise RuntimeError(
            "Production core database is missing at %s; startup is blocked to protect registrations. "
            "Restore the existing database, or use bootstrap_core_db.py --confirm-new-install only "
            "for a verified brand-new installation" % path
        )

    payload = _read_store()
    has_records = any(bool(payload[key]) for key in collections)
    if not has_records and payload.get("storage_format") != STORAGE_FORMAT:
        raise RuntimeError(
            "Production core database is empty and has no initialization marker; startup is blocked. "
            "After a verified backup, use the one-shot --confirm-existing-empty command only if every collection is truly empty"
        )

    seen_ids = set()
    seen_phones = set()
    for row_number, profile in enumerate(payload["users"], start=1):
        if not isinstance(profile, dict):
            raise RuntimeError("Production profile row %d is malformed; no records were discarded" % row_number)
        if is_synthetic_profile(profile):
            raise RuntimeError(
                "Production database contains a demo/seed profile at row %d; review it offline without deleting real registrations"
                % row_number
            )
        tsap_id = str(profile.get("tsap_id") or "").strip().upper()
        if not tsap_id or tsap_id in seen_ids:
            raise RuntimeError(
                "Production database contains a missing/duplicate profile ID at row %d; no records were discarded"
                % row_number
            )
        seen_ids.add(tsap_id)
        phone = str(profile.get("phone") or "").strip()
        if phone and phone in seen_phones:
            raise RuntimeError(
                "Production database contains a duplicate profile phone at row %d; no records were discarded"
                % row_number
            )
        if phone:
            seen_phones.add(phone)

    return {"file": path, "users": len(payload["users"]), "has_records": has_records}

# Deployment path resolution mirrors module defaults. Startup passes its actual
# module-resolved values; parity tests compare this manifest with that list.
def configured_paths(env):
    base = os.path.dirname(os.path.abspath(__file__))
    def val(key, default): return env.get(key, default)
    state = val('MANA_VIVAHA_STATE_DIR', base)
    media = os.path.realpath(val('MANA_VIVAHA_MEDIA_DIR', '/tmp'))
    token = env.get('TSAP_TOKEN_VERSIONS_FILE', '').strip() or os.path.join(base, 'token_versions.json')
    entries = [('state directory', state, True),
               ('core profiles/payments database', env.get('TSAP_DB_FILE') or os.path.join(base, 'data_db.json'), False),
               ('token-revocation versions', os.path.abspath(token), False)]
    for label, key, default, directory in PATH_SPECS:
        entries.append((label, val(key, os.path.join(base, default)), directory))
    entries.extend([
        ('consent ledger', os.path.join(state, 'consent_ledger_state.json'), False),
        ('saved searches', os.path.join(state, 'saved_searches_state.json'), False),
        ('stories', os.path.join(val('MANA_VIVAHA_APP_STATE_DIR', base), 'stories_state.json'), False),
        ('push subscriptions', os.path.join(val('MANA_VIVAHA_APP_STATE_DIR', base), 'push_state.json'), False),
        ('control audit', env.get('CONTROL_AUDIT_FILE', '').strip(), False),
        ('media root', media, True),
        *[(label, os.path.join(media, sub), True) for label, sub in (
            ('profile cards','cards'), ('profile photos','photos'), ('voice introductions','voice'), ('jathakam uploads','jathakam'))],
        ('vendor poster output', env.get('VENDOR_POSTER_DIR', '').strip(), True),
        ('referral poster output', env.get('REFERRAL_POSTER_DIR', '').strip(), True),
    ])
    return entries

PATH_SPECS = [
 ('payment/offer state','MANA_VIVAHA_PAYPRO_FILE','paypro14.json',False),
 ('ad campaigns','MANA_VIVAHA_ADS_FILE','ads13.json',False),
 ('astrology records','MANA_VIVAHA_ASTRO_FILE','astro13.json',False),
 ('CMS content','MANA_VIVAHA_CMS_FILE','cms15.json',False),
 ('channel overrides','MANA_VIVAHA_CHANMAP_FILE','chanmap15.json',False),
 ('money audit','MANA_VIVAHA_MONEY_AUDIT_FILE','money_audit26.jsonl',False),
 ('publisher log','MANA_VIVAHA_PUBLISH_LOG_FILE','publish_log.jsonl',False),
 ('referrals','MANA_VIVAHA_REFERRAL_FILE','referral_state.json',False),
 ('referral partners','MANA_VIVAHA_REF_PARTNERS_FILE','refpartners19.json',False),
 ('referral partner export','MANA_VIVAHA_REF_PARTNERS_CSV','referral_partners.csv',False),
 ('retention log','MANA_VIVAHA_RETENTION_LOG_FILE','retention_log.json',False),
 ('retention archives','MANA_VIVAHA_RETENTION_BACKUP_DIR','backups',True),
 ('smart reveal state','MANA_VIVAHA_SMART12_FILE','unlocks12.json',False),
 ('spotlight state','MANA_VIVAHA_SPOTLIGHT_FILE','spotlight_promotions.json',False),
 ('vendor state','MANA_VIVAHA_VENDOR_STATE_FILE','vendor_state.json',False),
 ('WhatsApp anti-abuse state','MANA_VIVAHA_WA_STATE_FILE','wa_state.json',False),
 ('WhatsApp instance state','WA_INSTANCE_STATE','wa_pool_state.json',False),
 ('daily matches','MANA_VIVAHA_DAILY_MATCHES_FILE','daily_matches.json',False),
 ('weekly showcase','MANA_VIVAHA_WEEKLY_SHOWCASE_FILE','weekly_showcase.json',False),
 ('backup snapshots','MANA_VIVAHA_BACKUP_DIR','backups',True),
]


def validate_operator_config(env, auth_enabled, control_accounts):
    if str(env.get('APP_ENV', '')).strip().lower() not in {'production','prod','live'}:
        raise RuntimeError('APP_ENV must explicitly select production')
    if not auth_enabled:
        raise RuntimeError('Authentication bypass flags are forbidden in production')
    if str(env.get('TSAP_RATE_LIMIT', '')).strip().lower() in {'0','false','no','off'}:
        raise RuntimeError('Rate limiting cannot be disabled in production')
    if str(env.get('MANA_TEST_PAYMENT_FIXTURES', '')).strip().lower() in {'1','true','yes','on'}:
        raise RuntimeError('Test payment fixtures are forbidden in production')
    for key in ('TSAP_AUTH_SECRET','ADMIN_KEY'):
        if len(str(env.get(key, '')).strip()) < 32:
            raise RuntimeError(key + ' (32+ random chars) is required in production')
    if not control_accounts:
        raise RuntimeError('No CONTROL owner/worker account configured in production')
    from auth_policy import validate_production_email
    validate_production_email(env)
