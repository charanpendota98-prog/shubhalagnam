"""Temporary persistence paths for backend integration-test scripts.

Call ``isolate_test_stores("suite-name")`` before importing application modules.
Every write goes to a disposable directory outside the repository so a test can
never clear or replace a live/tracked store by accident.
"""
from __future__ import annotations

import atexit
import os
import shutil
import tempfile
from pathlib import Path


def isolate_test_stores(suite: str = "backend-test") -> str:
    root = tempfile.mkdtemp(prefix=f"mana-vivaha-{suite}-")
    atexit.register(shutil.rmtree, root, ignore_errors=True)
    base = Path(root)

    files = {
        "TSAP_DB_FILE": "data_db.json",
        "MANA_VIVAHA_PAYPRO_FILE": "paypro14.json",
        "MANA_VIVAHA_ADS_FILE": "ads13.json",
        "MANA_VIVAHA_CMS_FILE": "cms15.json",
        "MANA_VIVAHA_CHANMAP_FILE": "chanmap15.json",
        "MANA_VIVAHA_REFERRAL_FILE": "referral_state.json",
        "MANA_VIVAHA_SMART12_FILE": "unlocks12.json",
        "MANA_VIVAHA_VENDOR_STATE_FILE": "vendor_state.json",
        "MANA_VIVAHA_ASTRO_FILE": "astro13.json",
        "MANA_VIVAHA_WA_STATE_FILE": "wa_state.json",
        "WA_INSTANCE_STATE": "wa_pool_state.json",
        "MANA_VIVAHA_REF_PARTNERS_FILE": "refpartners19.json",
        "MANA_VIVAHA_REF_PARTNERS_CSV": "referral_partners.csv",
        "MANA_VIVAHA_SPOTLIGHT_FILE": "spotlight_promotions.json",
        "MANA_VIVAHA_DAILY_MATCHES_FILE": "daily_matches.json",
        "MANA_VIVAHA_WEEKLY_SHOWCASE_FILE": "weekly_showcase.json",
        "MANA_VIVAHA_RETENTION_LOG_FILE": "retention_log.json",
        "MANA_VIVAHA_MONEY_AUDIT_FILE": "money_audit26.jsonl",
        "MANA_VIVAHA_PUBLISH_LOG_FILE": "publish_log.jsonl",
        "MANA_VIVAHA_CHANNEL_SETUP_STATE_FILE": "channel_setup_state.json",
    }
    for name, filename in files.items():
        path = base / filename
        path.parent.mkdir(parents=True, exist_ok=True)
        os.environ[name] = str(path)

    os.environ["CONTROL_AUDIT_FILE"] = str(base / "control-audit.jsonl")
    os.environ["MANA_VIVAHA_STATE_DIR"] = str(base / "quality-state")
    os.environ["MANA_VIVAHA_APP_STATE_DIR"] = str(base / "app-state")
    os.environ["MANA_VIVAHA_RETENTION_BACKUP_DIR"] = str(base / "retention-backups")
    os.environ["MANA_VIVAHA_TEST_DATA_DIR"] = root
    return root
